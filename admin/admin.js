// ---------------------------------------------
// Valor Wave CMS - Enhanced admin.js
// ---------------------------------------------

// DOM ELEMENTS
const loginBtn = document.getElementById("login-btn");
const logoutBtn = document.getElementById("logout-btn");
const fileListEl = document.getElementById("file-list");
const editorEl = document.getElementById("editor");
const previewEl = document.getElementById("preview");
const saveBtn = document.getElementById("save-btn");
const statusEl = document.getElementById("status");
const currentPathEl = document.getElementById("current-path");
const userDisplayEl = document.getElementById("user-display");

let currentFilePath = null;

// ---------------------------------------------
// AUTH CHECK
// ---------------------------------------------
async function checkAuth() {
  const res = await fetch("/api/me");

  if (res.status === 401) {
    document.body.classList.add("logged-out");
    document.body.classList.remove("logged-in");
    return false;
  }

  const data = await res.json();
  userDisplayEl.textContent = data.login;

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

// ---------------------------------------------
// FILE TREE (NESTED)
// ---------------------------------------------
function buildNestedTree(files) {
  const root = {};

  files.forEach((file) => {
    const parts = file.path.split("/");
    let node = root;

    parts.forEach((part, index) => {
      if (!node[part]) {
        node[part] = {
          __children: {},
          __isFile: index === parts.length - 1,
          __fullPath: file.path
        };
      }
      node = node[part].__children;
    });
  });

  return root;
}

function renderTree(node, container) {
  Object.keys(node).forEach((key) => {
    const item = node[key];
    const wrapper = document.createElement("div");

    if (item.__isFile) {
      wrapper.className = "file-item";
      wrapper.textContent = key;
      wrapper.addEventListener("click", () => openFile(item.__fullPath));
    } else {
      wrapper.className = "folder-item";
      wrapper.innerHTML = `<span class="folder-label">📁 ${key}</span>`;

      const childrenContainer = document.createElement("div");
      childrenContainer.className = "folder-children";

      wrapper.addEventListener("click", (e) => {
        if (e.target.classList.contains("folder-label")) {
          childrenContainer.classList.toggle("open");
        }
      });

      renderTree(item.__children, childrenContainer);
      wrapper.appendChild(childrenContainer);
    }

    container.appendChild(wrapper);
  });
}

async function loadFiles() {
  fileListEl.innerHTML = `<div class="loading">Loading content...</div>`;

  const res = await fetch("/api/files");
  if (!res.ok) {
    fileListEl.innerHTML = `<div class="error">Failed to load files.</div>`;
    return;
  }

  const files = await res.json();
  const tree = buildNestedTree(files);

  fileListEl.innerHTML = "";
  renderTree(tree, fileListEl);
}

// ---------------------------------------------
// OPEN FILE
// ---------------------------------------------
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

  updatePreview();
}

// ---------------------------------------------
// SAVE FILE
// ---------------------------------------------
saveBtn?.addEventListener("click", async () => {
  if (!currentFilePath) return;

  statusEl.textContent = "Saving...";

  const res = await fetch(`/api/content?path=${encodeURIComponent(currentFilePath)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      content: editorEl.value,
      message: `Update ${currentFilePath} via CMS`
    })
  });

  if (!res.ok) {
    statusEl.textContent = "Save failed.";
    return;
  }

  statusEl.textContent = "Saved!";
});

// ---------------------------------------------
// LIVE PREVIEW
// ---------------------------------------------
function markdownToHtml(md) {
  // Minimal Markdown renderer (no dependencies)
  return md
    .replace(/^### (.*$)/gim, "<h3>$1</h3>")
    .replace(/^## (.*$)/gim, "<h2>$1</h2>")
    .replace(/^# (.*$)/gim, "<h1>$1</h1>")
    .replace(/\*\*(.*)\*\*/gim, "<strong>$1</strong>")
    .replace(/\*(.*)\*/gim, "<em>$1</em>")
    .replace(/

\[(.*?)\]

\((.*?)\)/gim, `<a href="$2" target="_blank">$1</a>`)
    .replace(/\n$/gim, "<br>");
}

function updatePreview() {
  previewEl.innerHTML = markdownToHtml(editorEl.value);
}

editorEl.addEventListener("input", updatePreview);

// ---------------------------------------------
// INIT
// ---------------------------------------------
(async function init() {
  const authed = await checkAuth();
  if (authed) {
    await loadFiles();
  }
})();
