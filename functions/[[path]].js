export async function onRequest(context) {
  return context.env.jolly_voice_2fd4.fetch(context.request);
}
