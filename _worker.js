// ---------------------------------------------------------
// Valor Wave CMS 2.0 - Cloudflare Pages Advanced Mode Worker
// ---------------------------------------------------------

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    // OAuth routes
    if (path === "/login") return handleLogin(request, env);
    if (path === "/callback") return handleCallback(request, env);

    // API routes
    if (path.startsWith("/api/")) {
      return handleApi(request, env);
    }

    // -----------------------------------------------------
    // FIX: Ensure /admin loads /admin/index.html properly
    // -----------------------------------------------------
    if (path === "/admin") {
      return env.ASSETS.fetch(new Request(url.origin + "/admin/"));
    }

    // STATIC FALLBACK
    return env.ASSETS.fetch(request);
  },
};

// ---------------------------------------------------------
// Utility helpers
// ---------------------------------------------------------

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}

function redirectResponse(location, cookies = []) {
  const headers = new Headers({ Location: location });
  cookies.forEach((c) => headers.append("Set-Cookie", c));
  return new Response(null, { status: 302, headers });
}

function parseCookies(request) {
  const header = request.headers.get("Cookie") || "";
  const cookies = {};
  header.split(";").forEach((part) => {
    const [k, v] = part.split("=").map((s) => s.trim());
    if (k && v !== undefined) cookies[k] = decodeURIComponent(v);
  });
  return cookies;
}

const encoder = new TextEncoder();
const decoder = new TextDecoder();

async function hmacSign(data, secret) {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(data));
  return base64UrlEncode(new Uint8Array(sig));
}

async function hmacVerify(data, signature, secret) {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"]
  );
  const sigBytes = base64UrlDecode(signature);
  return crypto.subtle.verify("HMAC", key, sigBytes, encoder.encode(data));
}

function base64UrlEncode(bytes) {
  let str = btoa(String.fromCharCode(...bytes));
  return str.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlDecode(str) {
  str = str.replace(/-/g, "+").replace(/_/g, "/");
  const pad = str.length % 4;
  if (pad) str += "=".repeat(4 - pad);
  const bin = atob(str);
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

// ---------------------------------------------------------
// Session helpers
// ---------------------------------------------------------

async function createSessionCookie(userLogin, env) {
  const payload = { login: userLogin, ts: Date.now() };
  const payloadStr = JSON.stringify(payload);
  const payloadB64 = base64UrlEncode(encoder.encode(payloadStr));
  const sig = await hmacSign(payloadB64, env.SESSION_SECRET);
  const value = `${payloadB64}.${sig}`;

  return `session=${encodeURIComponent(
    value
  )}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=604800`;
}

async function verifySession(request, env) {
  const cookies = parseCookies(request);
  const raw = cookies["session"];
  if (!raw) return null;

  const [payloadB64, sig] = raw.split(".");
  if (!payloadB64 || !sig) return null;

  const ok = await hmacVerify(payloadB64, sig, env.SESSION_SECRET);
  if (!ok) return null;

  const payloadBytes = base64UrlDecode(payloadB64);
  const payloadStr = decoder.decode(payloadBytes);

  try {
    return JSON.parse(payloadStr);
  } catch {
    return null;
  }
}

// ---------------------------------------------------------
// OAuth: /login
// ---------------------------------------------------------

async function handleLogin(request, env) {
  const state = crypto.randomUUID();

  const authorizeUrl = new URL("https://github.com/login/oauth/authorize");
  authorizeUrl.searchParams.set("client_id", env.GITHUB_CLIENT_ID);
  authorizeUrl.searchParams.set("redirect_uri", env.GITHUB_REDIRECT_URI);
  authorizeUrl.searchParams.set("scope", "read:user");
  authorizeUrl.searchParams.set("state", state);

  const stateCookie = `oauth_state=${encodeURIComponent(
    state
  )}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=600`;

  return redirectResponse(authorizeUrl.toString(), [stateCookie]);
}

// ---------------------------------------------------------
// OAuth: /callback
// ---------------------------------------------------------

async function handleCallback(request, env) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  if (!code || !state) return jsonResponse({ error: "Missing code/state" }, 400);

  const cookies = parseCookies(request);
  if (cookies["oauth_state"] !== state)
    return jsonResponse({ error: "Invalid OAuth state" }, 400);

  // Exchange code for token
  const tokenRes = await fetch(
    "https://github.com/login/oauth/access_token",
    {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: env.GITHUB_CLIENT_ID,
        client_secret: env.GITHUB_CLIENT_SECRET,
        code,
        redirect_uri: env.GITHUB_REDIRECT_URI,
      }),
    }
  );

  const tokenJson = await tokenRes.json();
  const accessToken = tokenJson.access_token;
  if (!accessToken) return jsonResponse({ error: "No access token" }, 500);

  // Fetch user
  const userRes = await fetch("https://api.github.com/user", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "User-Agent": "valorwave-cms",
      Accept: "application/vnd.github+json",
    },
  });

  const user = await userRes.json();
  const login = user.login;

  const sessionCookie = await createSessionCookie(login, env);
  const clearState = "oauth_state=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax";

  return redirectResponse("/admin", [sessionCookie, clearState]);
}

// ---------------------------------------------------------
// API Router
// ---------------------------------------------------------

async function handleApi(request, env) {
  const url = new URL(request.url);
  const path = url.pathname;

  const session = await verifySession(request, env);
  if (!session) return jsonResponse({ error: "Unauthorized" }, 401);

  // /api/me
  if (path === "/api/me") return jsonResponse({ login: session.login });

  // /api/files
  if (path === "/api/files") return listContentFiles(env);

  // /api/content GET
  if (path === "/api/content" && request.method === "GET") {
    const filePath = url.searchParams.get("path");
    return getContentFile(env, filePath);
  }

  // /api/content PUT
  if (path === "/api/content" && request.method === "PUT") {
    const filePath = url.searchParams.get("path");
    const body = await request.json();
    return updateContentFile(env, filePath, body.content, body.message);
  }

  // /api/new-file
  if (path === "/api/new-file") {
    const body = await request.json();
    return createOrUpdateFile(env, body.path, body.content, body.message);
  }

  // /api/new-folder
  if (path === "/api/new-folder") {
    const body = await request.json();
    return createOrUpdateFile(env, body.path, body.content, body.message);
  }

  // /api/upload-image
  if (path === "/api/upload-image") return handleImageUpload(request, env);

  // /api/theme
  if (path === "/api/theme") {
    const body = await request.json();
    return createOrUpdateFile(env, "theme.txt", body.theme + "\n", body.message);
  }

  return jsonResponse({ error: "Not found" }, 404);
}

// ---------------------------------------------------------
// GitHub Helpers
// ---------------------------------------------------------

function githubHeaders(env) {
  return {
    Authorization: `Bearer ${env.GITHUB_TOKEN}`,
    "User-Agent": "valorwave-cms",
    Accept: "application/vnd.github+json",
  };
}

async function listContentFiles(env) {
  const url = `https://api.github.com/repos/${env.GITHUB_OWNER}/${env.GITHUB_REPO}/git/trees/${env.GITHUB_BRANCH}?recursive=1`;

  const res = await fetch(url, { headers: githubHeaders(env) });
  const json = await res.json();

  const files = (json.tree || [])
    .filter((i) => i.type === "blob" && i.path.startsWith("content/") && i.path.endsWith(".md"))
    .map((i) => ({ path: i.path }));

  return jsonResponse(files);
}

async function getContentFile(env, filePath) {
  const url = `https://api.github.com/repos/${env.GITHUB_OWNER}/${env.GITHUB_REPO}/contents/${filePath}?ref=${env.GITHUB_BRANCH}`;

  const res = await fetch(url, { headers: githubHeaders(env) });
  if (res.status === 404) return jsonResponse({ error: "Not found" }, 404);

  const json = await res.json();
  const raw = atob(json.content.replace(/\n/g, ""));
  return jsonResponse({ path: filePath, content: raw, sha: json.sha });
}

async function updateContentFile(env, filePath, content, message) {
  return createOrUpdateFile(env, filePath, content, message);
}

async function createOrUpdateFile(env, filePath, content, message) {
  const getUrl = `https://api.github.com/repos/${env.GITHUB_OWNER}/${env.GITHUB_REPO}/contents/${filePath}?ref=${env.GITHUB_BRANCH}`;
  const getRes = await fetch(getUrl, { headers: githubHeaders(env) });

  let sha;
  if (getRes.status === 200) sha = (await getRes.json()).sha;

  const body = {
    message,
    content: btoa(content),
    branch: env.GITHUB_BRANCH,
    ...(sha && { sha }),
  };

  const putUrl = `https://api.github.com/repos/${env.GITHUB_OWNER}/${env.GITHUB_REPO}/contents/${filePath}`;
  const putRes = await fetch(putUrl, {
    method: "PUT",
    headers: { ...githubHeaders(env), "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const json = await putRes.json();
  return jsonResponse(json);
}

// ---------------------------------------------------------
// Image Upload (/images)
// ---------------------------------------------------------

async function handleImageUpload(request, env) {
  const form = await request.formData();
  const file = form.get("file");

  const bytes = new Uint8Array(await file.arrayBuffer());
  const binary = String.fromCharCode(...bytes);

  // Folder-based organization
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const imagePath = `images/${year}/${month}/${day}/${safeName}`;

  await createOrUpdateFile(
    env,
    imagePath,
    binary,
    `Upload image ${imagePath} via CMS`
  );

  return jsonResponse({
    original: `/${imagePath}`,
    optimized: `/cdn-cgi/image/quality=85/${imagePath}`,
    webp: `/cdn-cgi/image/format=webp/${imagePath}`,
    thumb: `/cdn-cgi/image/width=200,quality=70/${imagePath}`
  });
}

}
