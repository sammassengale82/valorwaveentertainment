// _worker.js

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    // Static files are served by Pages; Worker handles backend routes only
    if (path === "/login") {
      return handleLogin(request, env);
    }

    if (path === "/callback") {
      return handleCallback(request, env);
    }

    if (path.startsWith("/api/")) {
      return handleApi(request, env);
    }

    // For anything else, let Pages handle it (static)
    return new Response("Not found", { status: 404 });
  },
};

// ---------- Helpers ----------

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
    },
  });
}

function redirectResponse(location, cookies = []) {
  const headers = new Headers({ Location: location });
  for (const cookie of cookies) {
    headers.append("Set-Cookie", cookie);
  }
  return new Response(null, {
    status: 302,
    headers,
  });
}

function parseCookies(request) {
  const header = request.headers.get("Cookie") || "";
  const cookies = {};
  header.split(";").forEach((part) => {
    const [k, v] = part.split("=").map((s) => s && s.trim());
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
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

// ---------- Auth session helpers ----------

async function createSessionCookie(userLogin, env) {
  const payload = {
    login: userLogin,
    ts: Date.now(),
  };
  const payloadStr = JSON.stringify(payload);
  const payloadB64 = base64UrlEncode(encoder.encode(payloadStr));
  const sig = await hmacSign(payloadB64, env.SESSION_SECRET);
  const value = `${payloadB64}.${sig}`;

  // HttpOnly session cookie
  return `session=${encodeURIComponent(value)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=604800`;
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
    const payload = JSON.parse(payloadStr);
    return payload; // { login, ts }
  } catch {
    return null;
  }
}

// ---------- OAuth: /login ----------

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

// ---------- OAuth: /callback ----------

async function handleCallback(request, env) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  if (!code || !state) {
    return jsonResponse({ error: "Missing code or state" }, 400);
  }

  const cookies = parseCookies(request);
  const storedState = cookies["oauth_state"];
  if (!storedState || storedState !== state) {
    return jsonResponse({ error: "Invalid OAuth state" }, 400);
  }

  // Exchange code for access token
  const tokenRes = await fetch(
    "https://github.com/login/oauth/access_token",
    {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        client_id: env.GITHUB_CLIENT_ID,
        client_secret: env.GITHUB_CLIENT_SECRET,
        code,
        redirect_uri: env.GITHUB_REDIRECT_URI,
      }),
    }
  );

  if (!tokenRes.ok) {
    const text = await tokenRes.text();
    return jsonResponse(
      { error: "Failed to exchange code", details: text },
      500
    );
  }

  const tokenJson = await tokenRes.json();
  const accessToken = tokenJson.access_token;
  if (!accessToken) {
    return jsonResponse(
      { error: "No access token in response", details: tokenJson },
      500
    );
  }

  // Fetch user info
  const userRes = await fetch("https://api.github.com/user", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "User-Agent": "valorwave-cms",
      Accept: "application/vnd.github+json",
    },
  });

  if (!userRes.ok) {
    const text = await userRes.text();
    return jsonResponse(
      { error: "Failed to fetch user", details: text },
      500
    );
  }

  const user = await userRes.json();
  const login = user.login;

  const sessionCookie = await createSessionCookie(login, env);
  const clearStateCookie =
    "oauth_state=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax";

  // Redirect back to /admin after successful login
  return redirectResponse("/admin", [sessionCookie, clearStateCookie]);
}

// ---------- API router ----------

async function handleApi(request, env) {
  const url = new URL(request.url);
  const path = url.pathname;

  // Require auth for all /api/* routes
  const session = await verifySession(request, env);
  if (!session) {
    return jsonResponse({ error: "Unauthorized" }, 401);
  }

  if (path === "/api/me" && request.method === "GET") {
    return jsonResponse({ login: session.login });
  }

  if (path === "/api/files" && request.method === "GET") {
    return listContentFiles(env);
  }

  if (path === "/api/content" && request.method === "GET") {
    const filePath = url.searchParams.get("path");
    if (!filePath) {
      return jsonResponse({ error: "Missing path" }, 400);
    }
    return getContentFile(env, filePath);
  }

  if (path === "/api/content" && request.method === "PUT") {
    const filePath = url.searchParams.get("path");
    if (!filePath) {
      return jsonResponse({ error: "Missing path" }, 400);
    }
    const body = await request.json().catch(() => null);
    if (!body || typeof body.content !== "string") {
      return jsonResponse({ error: "Missing content" }, 400);
    }
    const message =
      typeof body.message === "string"
        ? body.message
        : `Update ${filePath} via CMS`;
    return updateContentFile(env, filePath, body.content, message);
  }

  return jsonResponse({ error: "Not found" }, 404);
}

// ---------- GitHub content helpers ----------

function githubApiHeaders(env) {
  return {
    Authorization: `Bearer ${env.GITHUB_TOKEN}`,
    "User-Agent": "valorwave-cms",
    Accept: "application/vnd.github+json",
  };
}

async function listContentFiles(env) {
  const base = `https://api.github.com/repos/${env.GITHUB_OWNER}/${env.GITHUB_REPO}/contents/content?ref=${env.GITHUB_BRANCH}`;
  const res = await fetch(base, {
    headers: githubApiHeaders(env),
  });

  if (!res.ok) {
    const text = await res.text();
    return jsonResponse(
      { error: "Failed to list content", details: text },
      500
    );
  }

  const json = await res.json();
  return jsonResponse(json);
}

async function getContentFile(env, filePath) {
  const base = `https://api.github.com/repos/${env.GITHUB_OWNER}/${env.GITHUB_REPO}/contents/${filePath}?ref=${env.GITHUB_BRANCH}`;
  const res = await fetch(base, {
    headers: githubApiHeaders(env),
  });

  if (res.status === 404) {
    return jsonResponse({ error: "Not found" }, 404);
  }

  if (!res.ok) {
    const text = await res.text();
    return jsonResponse(
      { error: "Failed to fetch file", details: text },
      500
    );
  }

  const json = await res.json();

  // GitHub returns base64 content
  if (json && json.content && json.encoding === "base64") {
    const raw = atob(json.content.replace(/\n/g, ""));
    return jsonResponse({
      path: filePath,
      content: raw,
      sha: json.sha,
    });
  }

  return jsonResponse(json);
}

async function updateContentFile(env, filePath, content, message) {
  // First, get current file (to obtain SHA)
  const getRes = await fetch(
    `https://api.github.com/repos/${env.GITHUB_OWNER}/${env.GITHUB_REPO}/contents/${filePath}?ref=${env.GITHUB_BRANCH}`,
    {
      headers: githubApiHeaders(env),
    }
  );

  let sha = undefined;
  if (getRes.status === 200) {
    const current = await getRes.json();
    sha = current.sha;
  } else if (getRes.status !== 404) {
    const text = await getRes.text();
    return jsonResponse(
      { error: "Failed to read existing file", details: text },
      500
    );
  }

  const contentB64 = btoa(content);

  const body = {
    message,
    content: contentB64,
    branch: env.GITHUB_BRANCH,
  };
  if (sha) body.sha = sha;

  const putRes = await fetch(
    `https://api.github.com/repos/${env.GITHUB_OWNER}/${env.GITHUB_REPO}/contents/${filePath}`,
    {
      method: "PUT",
      headers: {
        ...githubApiHeaders(env),
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    }
  );

  if (!putRes.ok) {
    const text = await putRes.text();
    return jsonResponse(
      { error: "Failed to update file", details: text },
      500
    );
  }

  const json = await putRes.json();
  return jsonResponse(json);
}
