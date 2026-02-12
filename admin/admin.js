// --- SIMPLE MARKDOWN PARSER ---
function mdToHtml(md) {
  if (!md) return "";
  let html = md;

  html = html.replace(/^# (.*)$/gm, "<h1>$1</h1>");
  html = html.replace(/^## (.*)$/gm, "<h2>$1</h2>");
  html = html.replace(/^### (.*)$/gm, "<h3>$1</h3>");
  html = html.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/\*(.*?)\*/g, "<em>$1</em>");
  html = html.replace(/`([^`]+)`/g, "<code>$1</code>");
  html = html.replace(/\n/g, "<br>");

  return html;
}

// --- ELEMENTS ---
const app = document.getElementById("app");
const loginScreen = document.getElementById("loginScreen");
const loginBtn = document.getElementById("loginBtn");
const logoutBtn = document.getElementById("logoutBtn");

const folderTreeEl = document.getElementById("folderTree");
const editorEl = document.getElementById("editor");
const previewEl = document.getElementById("preview");
const currentFileNameEl = document.getElementById("currentFileName");

const newFileBtn = document.getElementById("newFileBtn");
const saveBtn = document.getElementById("saveBtn");
const deleteBtn = document.getElementById("deleteBtn");
const fileUploadInput = document.getElementById("fileUpload");

let files = [];
let currentPath = null;

// --- AUTH CHECK ---
async function init() {
  try {
    const res = await fetch("/api/files");
    if (res.status === 401) return showLogin();

    files = await res.json();
    showApp();
    buildFolderTree();
  } catch (err) {
    showLogin();
  }
}

function showLogin() {
  loginScreen.classList.remove("hidden");
  app.classList.add("hidden");
}

function showApp() {
  loginScreen.classList.add("hidden");
  app.classList.remove("hidden");
}

// --- FOLDER TREE ---
function buildFolderTree() {
  const tree = {};

  files.forEach(f => {
    const parts = f.path.split("/");
    let node = tree;

    parts.forEach((part, i) => {
      if (!node[part]) {
        node[part] = { __files: [], __folders: {} };
      }
      if (i === parts.length - 1) {
        node[part].__files.push(f.path);
      } else {
        node = node[part].__folders;
      }
    });
  });

  folderTreeEl.innerHTML = "";
  renderTree(tree, folderTreeEl);
}

function renderTree(node, container) {
  Object.keys(node).forEach(key => {
    const item = node[key];

    // FOLDER
    if (Object.keys(item.__folders).length || item.__files.length > 1) {
      const folder = document.createElement("div");
      folder.className = "folder";

      const name = document.createElement("div");
      name.className = "folder-name";
      name.textContent = key;

      const children = document.createElement("div");
      children.className = "folder-children";

      name.addEventListener("click", () => {
        children.style.display = children.style.display === "block" ? "none" : "block";
      });

      folder.appendChild(name);
      folder.appendChild(children);
      container.appendChild(folder);

      // Render children
      Object.keys(item.__folders).forEach(sub => {
        renderTree({ [sub]: item.__folders[sub] }, children);
      });

      item.__files.forEach(path => {
        const file = document.createElement("div");
        file.className = "file";
        file.textContent = path.split("/").pop();
        file.addEventListener("click", () => loadFile(path));
        children.appendChild(file);
      });

    } else {
      // SINGLE FILE
      const file = document.createElement("div");
      file.className = "file";
      file.textContent = key;
      file.addEventListener("click", () => loadFile(key));
      container.appendChild(file);
    }
  });
}

// --- LOAD FILE ---
async function loadFile(path) {
  const res = await fetch(`/api/file?path=${encodeURIComponent(path)}`);
  if (res.status === 401) return showLogin();

  const data = await res.json();
  currentPath = path;
  currentFileNameEl.textContent = path;
  editorEl.value = data.content;
  previewEl.innerHTML = mdToHtml(data.content);
}

// --- SAVE FILE ---
async function saveFile() {
  if (!currentPath) return alert("No file selected.");

  await fetch("/api/file", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path: currentPath, content: editorEl.value })
  });

  previewEl.innerHTML = mdToHtml(editorEl.value);
}

// --- DELETE FILE ---
async function deleteFile() {
  if (!currentPath) return alert("No file selected.");
  if (!confirm(`Delete ${currentPath}?`)) return;

  await fetch(`/api/file?path=${encodeURIComponent(currentPath)}`, {
    method: "DELETE"
  });

  currentPath = null;
  editorEl.value = "";
  previewEl.innerHTML = "";
  currentFileNameEl.textContent = "No file selected";

  init();
}

// --- NEW FILE ---
async function newFile() {
  const name = prompt("Enter new file path (e.g., content/new.md):");
  if (!name) return;

  await fetch("/api/file", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path: name, content: "# New File" })
  });

  init();
  loadFile(name);
}

// --- UPLOAD ---
fileUploadInput.addEventListener("change", async e => {
  const file = e.target.files[0];
  if (!file) return;

  const text = await file.text();
  const path = `content/${file.name}`;

  await fetch("/api/file", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path, content: text })
  });

  init();
  loadFile(path);
});

// --- EDITOR LIVE PREVIEW ---
editorEl.addEventListener("input", () => {
  previewEl.innerHTML = mdToHtml(editorEl.value);
});

// --- BUTTONS ---
loginBtn.onclick = () => (window.location.href = "/login");
logoutBtn.onclick = () => {
  document.cookie = "gh_token=; Max-Age=0; path=/;";
  window.location.reload();
};

saveBtn.onclick = saveFile;
deleteBtn.onclick = deleteFile;
newFileBtn.onclick = newFile;

// --- INIT ---
init();
