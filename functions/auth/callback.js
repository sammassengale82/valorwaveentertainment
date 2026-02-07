export async function onRequestGet(context) {
  const { GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET } = context.env;
  const code = new URL(context.request.url).searchParams.get("code");
  
  const response = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: { 
      "content-type": "application/json", 
      "accept": "application/json" 
    },
    body: JSON.stringify({ 
      client_id: GITHUB_CLIENT_ID, 
      client_secret: GITHUB_CLIENT_SECRET, 
      code 
    }),
  });
  
  const result = await response.json();
  
  // This part sends the "Success" signal back to your Admin window
  return new Response(`
    <!DOCTYPE html>
    <html>
    <body>
      <script>
        const message = "authorization:github:success:${JSON.stringify({ token: result.access_token, provider: 'github' })}";
        window.opener.postMessage(message, "*");
        window.close();
      </script>
    </body>
    </html>`, { headers: { "content-type": "text/html" } });
}
