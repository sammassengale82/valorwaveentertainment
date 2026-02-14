export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    // ============================
    // ADMIN UI ROUTING
    // ============================

    // /admin → /admin/index.html
    if (path === "/admin") {
      return env.ASSETS.fetch("admin/index.html", {
        cf: { cacheEverything: false, cacheTtl: 0 }
      });
    }

    // /admin/ → /admin/index.html
    if (path === "/admin/") {
      return env.ASSETS.fetch("admin/index.html", {
        cf: { cacheEverything: false, cacheTtl: 0 }
      });
    }

    // /admin/* → static assets
    if (path.startsWith("/admin/")) {
      return env.ASSETS.fetch(request, {
        cf: { cacheEverything: false, cacheTtl: 0 }
      });
    }

    // ============================
    // OAuth routes
    // ============================
    if (path === "/login") return handleLogin(request, env);
    if (path === "/callback") return handleCallback(request, env);

    // ============================
    // API routes
    // ============================
    if (path.startsWith("/api/")) {
      return handleApi(request, env);
    }

    // ============================
    // STATIC FALLBACK (public site)
    // ============================
    return env.ASSETS.fetch(request, {
      cf: { cacheEverything: false, cacheTtl: 0 }
    });
  }
};
