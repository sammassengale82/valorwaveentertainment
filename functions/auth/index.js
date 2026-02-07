export async function onRequestGet(context) {
  const { GITHUB_CLIENT_ID } = context.env;
  const url = `https://github.com/login/oauth/authorize?client_id=${GITHUB_CLIENT_ID}&scope=repo,user`;
  return Response.redirect(url);
}
