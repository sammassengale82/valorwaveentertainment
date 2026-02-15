export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    console.log("WORKER IS RUNNING", path);

    // ADMIN ROOT
    if (path === "/admin" || path === "/admin/") {
      const assetUrl = new URL("/admin/index.html", request.url);
      return env.ASSETS.fetch(new Request(assetUrl, request), {
        cf: { cacheEverything: false, cacheTtl: 0 }
      });
    }

    // ADMIN ASSETS
    if (path.startsWith("/admin/")) {
      const assetUrl = new URL(path, request.url);
      return env.ASSETS.fetch(new Request(assetUrl, request), {
        cf: { cacheEverything: false, cacheTtl: 0 }
      });
    }

    // API ROUTES (unchanged)
    // ... your API code ...

    // FALLBACK
    return env.ASSETS.fetch(request);
  }
};