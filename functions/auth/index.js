export async function onRequestGet(context) {
  const { GITHUB_CLIENT_ID } = context.env;
  const url = new URL("https://github.com/login/oauth/authorize");
  url.searchParams.set("client_id", GITHUB_CLIENT_ID);
  url.searchParams.set("scope", "repo,user");
  // Explicitly setting the redirect ensures the handshake is valid
  url.searchParams.set("redirect_uri", "https://valorwaveentertainment.com/auth/callback");

  return Response.redirect(url.href, 302);
}
