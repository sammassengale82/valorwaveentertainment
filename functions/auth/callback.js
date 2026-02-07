export async function onRequestGet(context) {
  const { GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET } = context.env;
  const code = new URL(context.request.url).searchParams.get("code");
  
  const response = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: { "content-type": "application/json", "accept": "application/json" },
    body: JSON.stringify({ client_id: GITHUB_CLIENT_ID, client_secret: GITHUB_CLIENT_SECRET, code }),
  });
  
  const result = await response.json();

  // This is the "Magic" string that tells Static CMS the login worked
  const content = `
    <!DOCTYPE html>
    <html>
    <head><title>Authorizing...</title></head>
    <body>
      <script>
        (function() {
          function receiveMessage(e) {
            console.log("Receiving message:", e.data);
          }
          window.addEventListener("message", receiveMessage, false);
          
          const response = {
            token: "${result.access_token}",
            provider: "github"
          };
          
          window.opener.postMessage(
            "authorization:github:success:" + JSON.stringify(response),
            window.location.origin
          );
        })();
      </script>
    </body>
    </html>`;

  return new Response(content, { headers: { "content-type": "text/html" } });
}
