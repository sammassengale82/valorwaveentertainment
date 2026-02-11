// ------------------------------------------------------------
// Valor Wave CMS - Cloudflare Pages Worker (FINAL FIXED VERSION)
// ------------------------------------------------------------

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    // ------------------------------------------------------------
    // ROUTING
    // ------------------------------------------------------------
    if (path === "/login") return handleLogin(url, env);
    if (path === "/callback") return handleCallback(url, env);

    if (path.startsWith("/api/")) {
      const token = getToken(request);
      if (!token) return unauthorized();

      if (path === "/api/files") return listFiles(env, token);
      if (path === "/api/file") return getFile(env, token, url);
      if (path === "/api/save") return saveFile(env, token, request);
      if (path === "/api/delete") return deleteFile(env, token, request);
      if (path === "/api/new") return newFile(env, token, request);
      if (path === "/api/upload") return uploadFile(env, token, request);

      if (path === "/api/theme") {
        if (request.method === "GET") return getTheme(env);
        if (request.method === "POST") return saveTheme(env, request);
      }
    }

    // Static assets
    return env.ASSETS.fetch(request);
  }
};

// ------------------------------------------------------------
// HELPERS
// ------------------------------------------------------------

function unauthorized() {
  return new Response("Unauthorized", { status: 401 });
}

function getToken(request) {
  const cookie = request.headers.get("Cookie") || "";
  const match = cookie.match(/gh_token=([^;]+)/);
  return match ? match[1] : null;
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}

// ------------------------------------------------------------
// OAUTH: LOGIN
// ------------------------------------------------------------

function handleLogin(url, env) {
  const redirect = `https://github.com/login/oauth/authorize?client_id=${env.GITHUB_CLIENT_ID}&redirect_uri=${env.CALLBACK_URL}&scope=repo`;
  return Response.redirect(redirect, 302);
}

// ------------------------------------------------------------
// OAUTH: CALLBACK
// ------------------------------------------------------------

async function handleCallback(url, env) {
  const code = url.searchParams.get("code");
  if (!code) return new Response("Missing code", { status: 400 });

  const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: { Accept: "application/json" },
    body: new URLSearchParams({
      client_id: env.GITHUB_CLIENT_ID,
      client_secret: env.GITHUB_CLIENT_SECRET,
      code
    })
  });

  const tokenData = await tokenRes.json();
  const token = tokenData.access_token;

  if (!token) return new Response("OAuth failed", { status: 400 });

  const cookie = `gh_token=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=2592000`;

  return new Response(null, {
    status: 302,
    headers: {
      "Set-Cookie": cookie,
      Location: "/admin"
    }
  });
}

// ------------------------------------------------------------
// GITHUB API HELPER (FINAL FIXED)
// ------------------------------------------------------------

async function gh(env, token, endpoint, method = "GET", body = null) {
  return fetch(
    `https://api.github.com/repos/${env.GITHUB_OWNER}/${env.GITHUB_REPO}/${endpoint}`,
    {
      method,
      headers: {
        Authorization: `token ${token}`,
        "Content-Type": "application/json",
        Accept: "application/vnd.github.v3+json",
        "User-Agent": "ValorwaveCMS"
      },
      body: body ? JSON.stringify(body) : null
    }
  );
}

// ------------------------------------------------------------
// API: LIST FILES (FINAL FIXED)
// ------------------------------------------------------------

async function listFiles(env, token) {
  const res = await gh(env, token, "contents/content");

  if (!res.ok) {
    return json({ error: "GitHub API error", status: res.status }, 500);
  }

  const files = await res.json();

  if (!Array.isArray(files)) {
    return json({ error: "Unexpected GitHub response", data: files }, 500);
  }

  return json(files.map(f => f.path));
}

// ------------------------------------------------------------
// API: GET FILE
// ------------------------------------------------------------

async function getFile(env, token, url) {
  const path = url.searchParams.get("path");
  const res = await gh(env, token, `contents/${path}`);

  if (!res.ok) {
    return json({ error: "GitHub API error", status: res.status }, 500);
  }

  const data = await res.json();
  const content = atob(data.content);

  return json({
    content,
    sha: data.sha,
    visible: content.includes("visible: true"),
    approved: content.includes("approved: true")
  });
}

// ------------------------------------------------------------
// API: SAVE FILE
// ------------------------------------------------------------

async function saveFile(env, token, request) {
  const body = await request.json();
  const content = btoa(body.content);

  const res = await gh(env, token, `contents/${body.path}`, "PUT", {
    message: `Update ${body.path}`,
    content,
    sha: body.sha
  });

  if (!res.ok) {
    return json({ error: "GitHub save failed", status: res.status }, 500);
  }

  return json({ ok: true });
}

// ------------------------------------------------------------
// API: DELETE FILE
// ------------------------------------------------------------

async function deleteFile(env, token, request) {
  const body = await request.json();

  const res = await gh(env, token, `contents/${body.path}`, "DELETE", {
    message: `Delete ${body.path}`,
    sha: body.sha
  });

  if (!res.ok) {
    return json({ error: "GitHub delete failed", status: res.status }, 500);
  }

  return json({ ok: true });
}

// ------------------------------------------------------------
// API: NEW FILE (FINAL FIXED)
// ------------------------------------------------------------

async function newFile(env, token, request) {
  const body = await request.json();

  const res = await gh(env, token, `contents/${body.path}`, "PUT", {
    message: `Create ${body.path}`,
    content: btoa("# New file")
  });

  if (!res.ok) {
    return json({ error: "GitHub create failed", status: res.status }, 500);
  }

  return json({ ok: true });
}

// ------------------------------------------------------------
// API: UPLOAD IMAGE
// ------------------------------------------------------------

async function uploadFile(env, token, request) {
  const body = await request.json();

  const res = await gh(env, token, `contents/${body.path}`, "PUT", {
    message: `Upload ${body.path}`,
    content: body.base64
  });

  if (!res.ok) {
    return json({ error: "GitHub upload failed", status: res.status }, 500);
  }

  return json({ ok: true });
}

// ------------------------------------------------------------
// API: THEME
// ------------------------------------------------------------

async function getTheme(env) {
  const theme = await env.THEME.get("theme");
  return json({ theme: theme || "original" });
}

async function saveTheme(env, request) {
  const body = await request.json();
  await env.THEME.put("theme", body.theme);
  return json({ ok: true });
}