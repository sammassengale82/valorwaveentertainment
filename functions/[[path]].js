export async function onRequest(context) {
  const url = new URL(context.request.url);

  // Forward OAuth routes to the Worker
  if (url.pathname.startsWith("/oauth/")) {
    return context.env.jolly_voice_2fd4.fetch(context.request);
  }

  // Forward API routes to the Worker
  if (url.pathname.startsWith("/api/")) {
    return context.env.jolly_voice_2fd4.fetch(context.request);
  }

  // Everything else: serve static site
  return context.next();
}
