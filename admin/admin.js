// ------------------------------
//  Valor Wave CMS - admin.js
// ------------------------------

const loginBtn = document.getElementById("login-btn");
const logoutBtn = document.getElementById("logout-btn");
const fileListEl = document.getElementById("file-list");
const editorEl = document.getElementById("editor");
const saveBtn = document.getElementById("save-btn");
const statusEl = document.getElementById("status");
const currentPathEl = document.getElementById("current-path");

let currentFilePath = null;

// ------------------------------
//  LOGIN
// ------------------------------

async function checkAuth() {
  const res = await fetch("/api/me");
  if (res.status === 401) {
    document.body.classList.add("logged-out");
    document.body.classList.remove("logged-in");
    return false;
  }

  const data = await res.json();
  document.getElementById("user-display").textContent = data.login;
  document.body.classList.add("logged-in");
  document.body.classList.remove("logged-out");
  return true;
}

loginBtn?.addEventListener("click", () => {
  window.location.href = "/login";
});

logoutBtn?.addEventListener("click", () => {
  document.cookie = "session=; Path=/; Max-Age=0";
  window.location.reload();
});

// ------------------------------
//  FILE LIST
// ------------------------------

async function loadFiles() {
  fileListEl.innerHTML = `<div class="loading">Loading files...</div>`;

  const res = await fetch("/api/files");
  if (!res.ok) {
    fileListEl.innerHTML = `<div class="error">Failed to load files.</div>`;
    return;
  }

  const files = await res.json();

  fileListEl.innerHTML = "";
  files.forEach((file) => {
    const item = document.createElement("div");
    item.className = "file-item";
    item.textContent = file.path || file.name;
    item.addEventListener("click", () => openFile(file.path || file.name));
    fileListEl.appendChild(item);
  });
}

// ------------------------------
//  OPEN FILE
// ------------------------------

async function openFile(path) {
  statusEl.textContent = "Loading file...";
  currentFilePath = path;

  const res = await fetch(`/api/content?path=${encodeURIComponent(path)}`);
  if (!res.ok) {
    statusEl.textContent = "Failed to load file.";
    return;
  }

  const data = await res.json();
  editorEl.value = data.content;
  currentPathEl.textContent = path;
  statusEl.textContent = "File loaded.";
}

// ------------------------------
//  SAVE FILE
// ------------------------------

saveBtn?.addEventListener("click", async () => {
  if (!currentFilePath) return;

  statusEl.textContent = "Saving...";

  const res = await fetch(`/api/content?path=${encodeURIComponent(currentFilePath)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      content: editorEl.value,
      message: `Update ${currentFilePath} via CMS`,
    }),
  });

  if (!res.ok) {
    statusEl.textContent = "Save failed.";
    return;
  }

  statusEl.textContent = "Saved!";
});

// ------------------------------
//  INIT
// ------------------------------

(async function init() {
  const authed = await checkAuth();
  if (authed) {
    await loadFiles();
  }
})();
