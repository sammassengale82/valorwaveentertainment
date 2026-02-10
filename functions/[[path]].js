export async function onRequest(context) {
  const url = new URL(context.request.url);

  if (url.pathname.startsWith("/oauth/")) {
    return context.env.jolly_voice_2fd4.fetch(context.request);
  }

  return context.next();
}
