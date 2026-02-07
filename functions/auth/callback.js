export async function onRequestGet(context) {
  const { GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET } = context.env;
  const code = new URL(context.request.url).searchParams.get("code");
  
  const response = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: { "content-type": "application/json", "accept": "application/json" },
    body: JSON.stringify({ client_id: GITHUB_CLIENT_ID, client_secret: GITHUB_CLIENT_SECRET, code }),
  });
  
  const result = await response.json();

  const content = `
    <!DOCTYPE html>
    <html>
    <body>
      <script>
        (function() {
          const message = "authorization:github:success:" + JSON.stringify({
            token: "${result.access_token}",
            provider: "github"
          });
          // Using "*" ensures the message reaches your admin dashboard
          window.opener.postMessage(message, "*");
          window.close();
        })();
      </script>
    </body>
    </html>`;

  return new Response(content, { headers: { "content-type": "text/html" } });
}
