export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    console.log("WORKER IS RUNNING", path);

    // ============================
    // ADMIN UI ROUTING (FIXED)
    // ============================
    if (path === "/admin" || path.startsWith("/admin")) {
      const assetUrl = new URL("/admin/index.html", request.url);
      const assetRequest = new Request(assetUrl.toString(), request);
      return env.ASSETS.fetch(assetRequest, {
        cf: { cacheEverything: false, cacheTtl: 0 }
      });
    }

    // ============================
    // API: READ FILE
    // ============================
    if (path === "/api/read-file" && request.method === "POST") {
      const { filePath } = await request.json();

      const apiUrl = `https://api.github.com/repos/${env.GITHUB_OWNER}/${env.GITHUB_REPO}/contents/${filePath}?ref=${env.GITHUB_BRANCH}`;
      const ghRes = await fetch(apiUrl, {
        headers: {
          "User-Agent": "ValorWaveCMS",
          "Accept": "application/vnd.github.v3.raw"
        }
      });

      if (!ghRes.ok) {
        return new Response(JSON.stringify({ error: "Failed to read file" }), { status: 500 });
      }

      const content = await ghRes.text();
      return new Response(JSON.stringify({ content }), {
        headers: { "Content-Type": "application/json" }
      });
    }

    // ============================
    // API: WRITE FILE
    // ============================
    if (path === "/api/write-file" && request.method === "POST") {
      const { filePath, content, message } = await request.json();

      const getUrl = `https://api.github.com/repos/${env.GITHUB_OWNER}/${env.GITHUB_REPO}/contents/${filePath}`;
      const getRes = await fetch(getUrl, {
        headers: { "User-Agent": "ValorWaveCMS" }
      });

      let sha = null;
      if (getRes.ok) {
        const data = await getRes.json();
        sha = data.sha;
      }

      const putRes = await fetch(getUrl, {
        method: "PUT",
        headers: {
          "User-Agent": "ValorWaveCMS",
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          message: message || `Update ${filePath}`,
          content: btoa(unescape(encodeURIComponent(content))),
          sha
        })
      });

      if (!putRes.ok) {
        return new Response(JSON.stringify({ error: "Failed to write file" }), { status: 500 });
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { "Content-Type": "application/json" }
      });
    }

    // ============================
    // API: CREATE FOLDER
    // ============================
    if (path === "/api/create-folder" && request.method === "POST") {
      const { folderPath } = await request.json();

      const placeholderFile = `${folderPath}/.keep`;
      const apiUrl = `https://api.github.com/repos/${env.GITHUB_OWNER}/${env.GITHUB_REPO}/contents/${placeholderFile}`;

      const res = await fetch(apiUrl, {
        method: "PUT",
        headers: {
          "User-Agent": "ValorWaveCMS",
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          message: `Create folder ${folderPath}`,
          content: btoa("placeholder")
        })
      });

      if (!res.ok) {
        return new Response(JSON.stringify({ error: "Failed to create folder" }), { status: 500 });
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { "Content-Type": "application/json" }
      });
    }

    // ============================
    // API: UPLOAD IMAGE
    // ============================
    if (path === "/api/upload-image" && request.method === "POST") {
      const form = await request.formData();
      const file = form.get("file");
      const filePath = form.get("filePath");

      const arrayBuffer = await file.arrayBuffer();
      const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));

      const apiUrl = `https://api.github.com/repos/${env.GITHUB_OWNER}/${env.GITHUB_REPO}/contents/${filePath}`;

      const res = await fetch(apiUrl, {
        method: "PUT",
        headers: {
          "User-Agent": "ValorWaveCMS",
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          message: `Upload image ${filePath}`,
          content: base64
        })
      });

      if (!res.ok) {
        return new Response(JSON.stringify({ error: "Failed to upload image" }), { status: 500 });
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { "Content-Type": "application/json" }
      });
    }

    // ============================
    // FALLBACK: STATIC ASSETS
    // ============================
    return env.ASSETS.fetch(request);
  }
};