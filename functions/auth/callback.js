export async function onRequestGet(context) {

const { searchParams } = new URL(context.request.url);

const code = searchParams.get("code");

const { GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET } = context.env;

if (!code) return new Response("Error: No code received", { status: 400 });

try {

const response = await fetch("", {

method: "POST",

headers: {

"content-type": "application/json",

"user-agent": "cloudflare-pages-static-cms",

accept: "application/json",

},

body: JSON.stringify({

client_id: GITHUB_CLIENT_ID,

client_secret: GITHUB_CLIENT_SECRET,

code,

}),

});

const result = await response.json();

const content = <html><body><script>(function(){const token="${result.access_token}";const message="authorization:github:success:"+JSON.stringify({token:token,provider:"github"});window.opener.postMessage(message,"https://valorwaveentertainment.com");window.close();})()</script></body></html>;

return new Response(content, { headers: { "content-type": "text/html;charset=UTF-8" } });

} catch (error) {

return new Response(error.message, { status: 500 });

}

}
