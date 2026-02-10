export async function onRequest(context) {
  const url = new URL(context.request.url);

  // Only proxy OAuth routes to your Worker
  if (url.pathname.startsWith("/oauth/")) {
    return context.env.jolly_voice_2fd4.fetch(context.request);
  }

  // Everything else: serve static site normally
  return context.next();
}
