// Simple markdown-to-HTML (very minimal, enough for preview)
function simpleMarkdownToHtml(md) {
  if (!md) return "";

  let html = md;

  // Escape basic HTML
  html = html.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  // Headings
  html = html.replace(/^###### (.*)$/gm, "<h6>$1</h6>");
  html = html.replace(/^##### (.*)$/gm, "<h5>$1</h5>");
  html = html.replace(/^#### (.*)$/gm, "<h4>$1</h4>");
  html = html.replace(/^### (.*)$/gm, "<h3>$1</h3>");
  html = html.replace(/^## (.*)$/gm, "<h2>$1</h2>");
  html = html.replace(/^# (.*)$/gm, "<h1>$1</h1>");

  // Bold and italic
  html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/\*(.+?)\*/g, "<em>$1</em>");

  // Inline code
  html = html.replace(/`([^`]+)`/g, "<code>$1</code>");

  // Links [text](url)
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');

  // Paragraphs
  html = html.replace(/^(?!<h\d>|<ul>|<ol>|<li>|<pre>|<code>)(.+)$/gm, "<p>$1</p>");

  return html;
}

const appEl = document.getElementById("app");
const loginScreenEl = document.getElementById("loginScreen");
const loginBtn = document.getElementById("loginBtn");
const logoutBtn = document.getElementById("logoutBtn");
const fileListEl = document.getElementById("fileList");
const editorEl = document.getElementById("editor");
const previewEl = document.getElementById("preview");
const currentFileNameEl = document.getElementById("currentFileName");
const newFileBtn = document.getElementById("newFileBtn");
const saveBtn = document.getElementById("saveBtn");
const deleteBtn = document.getElementById("deleteBtn");
const fileUploadInput = document.getElementById("fileUpload");

let currentFilePath = null;
let filesCache = [];

// --- Auth / Init ---

async function checkAuthAndInit() {
  try {
    const res = await fetch("/api/files", { method: "GET" });
    if (res.status === 401) {
      showLogin();
      return;
    }
    if (!res.ok) {
      console.error("Failed to load files:", res.status);
      showLogin();
      return;
    }
    const data = await res.json();
    filesCache = data.files || data || [];
    renderFileList();
    showApp();
  } catch (err) {
    console.error("Error checking auth:", err);
    showLogin();
  }
}

function showLogin() {
  appEl.classList.add("hidden");
  loginScreenEl.classList.remove("hidden");
}

function showApp() {
  loginScreenEl.classList.add("hidden");
  appEl.classList.remove("hidden");
}

// --- UI Rendering ---

function renderFileList() {
  fileListEl.innerHTML = "";
  if (!filesCache || filesCache.length === 0) {
    const empty = document.createElement("div");
    empty.className = "file-item";
    empty.innerHTML = `<span class="file-name">No files yet</span>`;
    fileListEl.appendChild(empty);
    return;
  }

  filesCache.forEach((file) => {
    const item = document.createElement("div");
    item.className = "file-item";
    if (file.path === currentFilePath) {
      item.classList.add("active");
    }

    const nameSpan = document.createElement("span");
    nameSpan.className = "file-name";
    nameSpan.textContent = file.name || file.path || "Untitled";

    const metaSpan = document.createElement("span");
    metaSpan.className = "file-meta";
    metaSpan.textContent = file.path || "";

    item.appendChild(nameSpan);
    item.appendChild(metaSpan);

    item.addEventListener("click", () => {
      loadFile(file.path || file.name);
    });

    fileListEl.appendChild(item);
  });
}

function updatePreview() {
  const md = editorEl.value;
  const html = simpleMarkdownToHtml(md);
  previewEl.innerHTML = html || '<p class="preview-placeholder">Live preview will appear here as you type.</p>';
}

// --- File Operations ---

async function loadFile(path) {
  if (!path) return;
  try {
    const res = await fetch(`/api/file?path=${encodeURIComponent(path)}`);
    if (res.status === 401) {
      showLogin();
      return;
    }
    if (!res.ok) {
      console.error("Failed to load file:", res.status);
      return;
    }
    const data = await res.json();
    currentFilePath = path;
    currentFileNameEl.textContent = path;
    editorEl.value = data.content || "";
    updatePreview();
    renderFileList();
  } catch (err) {
    console.error("Error loading file:", err);
  }
}

async function saveCurrentFile() {
  if (!currentFilePath) {
    alert("No file selected.");
    return;
  }
  try {
    const res = await fetch("/api/file", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        path: currentFilePath,
        content: editorEl.value || "",
      }),
    });
    if (res.status === 401) {
      showLogin();
      return;
    }
    if (!res.ok) {
      console.error("Failed to save file:", res.status);
      alert("Failed to save file.");
      return;
    }
    const updated = await res.json();
    filesCache = updated.files || filesCache;
    renderFileList();
  } catch (err) {
    console.error("Error saving file:", err);
    alert("Error saving file.");
  }
}

async function deleteCurrentFile() {
  if (!currentFilePath) {
    alert("No file selected.");
    return;
  }
  if (!confirm(`Delete file "${currentFilePath}"?`)) return;

  try {
    const res = await fetch(`/api/file?path=${encodeURIComponent(currentFilePath)}`, {
      method: "DELETE",
    });
    if (res.status === 401) {
      showLogin();
      return;
    }
    if (!res.ok) {
      console.error("Failed to delete file:", res.status);
      alert("Failed to delete file.");
      return;
    }
    const updated = await res.json();
    filesCache = updated.files || filesCache;
    currentFilePath = null;
    currentFileNameEl.textContent = "No file selected";
    editorEl.value = "";
    updatePreview();
    renderFileList();
  } catch (err) {
    console.error("Error deleting file:", err);
    alert("Error deleting file.");
  }
}

async function createNewFile() {
  const name = prompt("New file name (e.g., content/new-page.md):");
  if (!name) return;

  try {
    const res = await fetch("/api/file", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        path: name,
        content: "# New Page\n\nStart writing...",
      }),
    });
    if (res.status === 401) {
      showLogin();
      return;
    }
    if (!res.ok) {
      console.error("Failed to create file:", res.status);
      alert("Failed to create file.");
      return;
    }
    const updated = await res.json();
    filesCache = updated.files || filesCache;
    await loadFile(name);
  } catch (err) {
    console.error("Error creating file:", err);
    alert("Error creating file.");
  }
}

async function uploadFile(file) {
  const text = await file.text();
  const name = file.name.endsWith(".md") ? file.name : `${file.name}.md`;
  const path = `uploads/${name}`;

  try {
    const res = await fetch("/api/file", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        path,
        content: text,
      }),
    });
    if (res.status === 401) {
      showLogin();
      return;
    }
    if (!res.ok) {
      console.error("Failed to upload file:", res.status);
      alert("Failed to upload file.");
      return;
    }
    const updated = await res.json();
    filesCache = updated.files || filesCache;
    await loadFile(path);
  } catch (err) {
    console.error("Error uploading file:", err);
    alert("Error uploading file.");
  }
}

// --- Auth actions ---

loginBtn.addEventListener("click", () => {
  window.location.href = "/login";
});

logoutBtn.addEventListener("click", () => {
  // If you have a /logout route in the Worker, use it.
  // Otherwise, just clear cookie client-side by expiring it and reload.
  document.cookie = "gh_token=; Max-Age=0; path=/; Secure; SameSite=Lax";
  window.location.href = "/admin";
});

// --- UI events ---

editorEl.addEventListener("input", () => {
  updatePreview();
});

saveBtn.addEventListener("click", () => {
  saveCurrentFile();
});

deleteBtn.addEventListener("click", () => {
  deleteCurrentFile();
});

newFileBtn.addEventListener("click", () => {
  createNewFile();
});

fileUploadInput.addEventListener("change", (e) => {
  const file = e.target.files && e.target.files[0];
  if (!file) return;
  uploadFile(file);
  fileUploadInput.value = "";
});

// Theme button (placeholder for now)
const themeBtn = document.getElementById("themeBtn");
themeBtn.addEventListener("click", () => {
  alert("Theme switching is wired to your backend THEME setting. We can hook this to /api/theme if you’d like.");
});

// --- Init ---

checkAuthAndInit();