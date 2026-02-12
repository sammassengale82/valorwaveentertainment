// ---------------------------------------------------------
// Valor Wave CMS 2.0 - Admin Dashboard Script
// ---------------------------------------------------------

// DOM references
const loginBtn = document.getElementById("login-btn");
const userDisplay = document.getElementById("user-display");
const fileList = document.getElementById("file-list");
const editor = document.getElementById("editor");
const saveBtn = document.getElementById("save-btn");
const newFileBtn = document.getElementById("new-file-btn");
const newFolderBtn = document.getElementById("new-folder-btn");
const uploadImageInput = document.getElementById("upload-image");
const themeSelect = document.getElementById("theme-select");

let currentPath = null;

// ---------------------------------------------------------
// Helpers
// ---------------------------------------------------------

async function api(path, options = {}) {
  const res = await fetch(`/api/${path}`, {
    credentials: "include",
    ...options,
  });
  return res.json();
}

function showMessage(msg) {
  alert(msg);
}

// ---------------------------------------------------------
// Login
// ---------------------------------------------------------

if (loginBtn) {
  loginBtn.addEventListener("click", () => {
    window.location.href = "/login";
  });
}

// ---------------------------------------------------------
// Load user
// ---------------------------------------------------------

async function loadUser() {
  const me = await api("me");
  if (me.error) return;

  userDisplay.textContent = `Logged in as ${me.login}`;
}

loadUser();

// ---------------------------------------------------------
// File Browser
// ---------------------------------------------------------

async function loadFiles() {
  const files = await api("files");
  fileList.innerHTML = "";

  files.forEach((f) => {
    const li = document.createElement("li");
    li.textContent = f.path.replace("content/", "");
    li.addEventListener("click", () => openFile(f.path));
    fileList.appendChild(li);
  });
}

loadFiles();

// ---------------------------------------------------------
// Open File
// ---------------------------------------------------------

async function openFile(path) {
  const data = await api(`content?path=${encodeURIComponent(path)}`);
  if (data.error) return showMessage("Error loading file");

  currentPath = path;
  editor.value = data.content;
}

// ---------------------------------------------------------
// Save File
// ---------------------------------------------------------

saveBtn.addEventListener("click", async () => {
  if (!currentPath) return showMessage("No file open");

  const content = editor.value;

  const res = await api(`content?path=${encodeURIComponent(currentPath)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      content,
      message: `Update ${currentPath} via CMS`,
    }),
  });

  if (res.error) return showMessage("Save failed");
  showMessage("Saved!");
});

// ---------------------------------------------------------
// New File
// ---------------------------------------------------------

newFileBtn.addEventListener("click", async () => {
  const name = prompt("Enter new file name (example: new.md):");
  if (!name) return;

  const path = `content/${name}`;

  const res = await api("new-file", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      path,
      content: "# New File\n",
      message: `Create ${path} via CMS`,
    }),
  });

  if (res.error) return showMessage("Failed to create file");

  loadFiles();
  openFile(path);
});

// ---------------------------------------------------------
// New Folder
// ---------------------------------------------------------

newFolderBtn.addEventListener("click", async () => {
  const name = prompt("Enter new folder name:");
  if (!name) return;

  const path = `content/${name}/placeholder.txt`;

  const res = await api("new-folder", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      path,
      content: "placeholder",
      message: `Create folder ${name} via CMS`,
    }),
  });

  if (res.error) return showMessage("Failed to create folder");

  loadFiles();
});

// ---------------------------------------------------------
// Image Upload
// ---------------------------------------------------------

uploadImageInput.addEventListener("change", async () => {
  const file = uploadImageInput.files[0];
  if (!file) return;

  const form = new FormData();
  form.append("file", file);

  const res = await fetch("/api/upload-image", {
    method: "POST",
    body: form,
    credentials: "include",
  });

  const json = await res.json();
  if (json.error) return showMessage("Upload failed");

  showMessage(`Uploaded: ${json.path}`);
});

// ---------------------------------------------------------
// Theme Switcher
// ---------------------------------------------------------

themeSelect.addEventListener("change", async () => {
  const theme = themeSelect.value;

  const res = await api("theme", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      theme,
      message: `Set theme to ${theme}`,
    }),
  });

  if (res.error) return showMessage("Theme update failed");

  document.body.classList.remove("theme-original", "theme-multicam", "theme-patriotic");
  document.body.classList.add(`theme-${theme}`);

  showMessage("Theme updated!");
});
