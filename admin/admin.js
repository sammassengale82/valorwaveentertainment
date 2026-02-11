/* -------------------------------------------------------
   VALOR WAVE CMS — ADMIN LOGIC
   ------------------------------------------------------- */

const loginScreen = document.getElementById("login-screen");
const dashboard = document.getElementById("dashboard");

const fileTree = document.getElementById("file-tree");
const editor = document.getElementById("editor");
const saveBtn = document.getElementById("save-btn");
const deleteBtn = document.getElementById("delete-btn");
const newFileBtn = document.getElementById("new-file-btn");

const visibleToggle = document.getElementById("visible-toggle");
const approvedToggle = document.getElementById("approved-toggle");

const uploadModal = document.getElementById("upload-modal");
const uploadInput = document.getElementById("upload-input");
const uploadConfirmBtn = document.getElementById("upload-confirm-btn");
const uploadCancelBtn = document.getElementById("upload-cancel-btn");

const uploadImageBtn = document.getElementById("upload-image-btn");
const themeSelect = document.getElementById("theme-select");
const logoutBtn = document.getElementById("logout-btn");

let currentPath = null;
let currentSHA = null;

/* -------------------------------------------------------
   COOKIE CHECK
   ------------------------------------------------------- */

function hasToken() {
  return document.cookie.includes("gh_token=");
}

async function init() {
  if (!hasToken()) {
    loginScreen.classList.remove("hidden");
    dashboard.classList.add("hidden");
    return;
  }

  loginScreen.classList.add("hidden");
  dashboard.classList.remove("hidden");

  await loadTheme();
  await loadFileTree();
}

/* -------------------------------------------------------
   LOGIN FLOW (POPUP)
   ------------------------------------------------------- */

document.getElementById("login-btn").addEventListener("click", () => {
  const popup = window.open("/login", "oauth", "width=600,height=700");

  const timer = setInterval(() => {
    if (popup.closed) {
      clearInterval(timer);
      window.location = "/admin/";
    }
  }, 500);
});

/* -------------------------------------------------------
   LOGOUT
   ------------------------------------------------------- */

logoutBtn.addEventListener("click", () => {
  document.cookie = "gh_token=; Max-Age=0; Path=/;";
  window.location.reload();
});

/* -------------------------------------------------------
   FILE TREE
   ------------------------------------------------------- */

async function loadFileTree() {
  fileTree.innerHTML = "Loading...";

  const res = await fetch("/api/files");
  if (!res.ok) {
    fileTree.innerHTML = "Failed to load files.";
    return;
  }

  const files = await res.json();
  fileTree.innerHTML = "";

  files.forEach(path => {
    const item = document.createElement("div");
    item.className = "file-item";
    item.textContent = path.replace("content/", "");
    item.addEventListener("click", () => openFile(path, item));
    fileTree.appendChild(item);
  });
}

/* -------------------------------------------------------
   OPEN FILE
   ------------------------------------------------------- */

async function openFile(path, element) {
  currentPath = path;

  document.querySelectorAll(".file-item").forEach(i => i.classList.remove("active"));
  element.classList.add("active");

  const res = await fetch(`/api/file?path=${encodeURIComponent(path)}`);
  if (!res.ok) {
    alert("Failed to load file.");
    return;
  }

  const data = await res.json();
  editor.value = data.content;
  currentSHA = data.sha;

  visibleToggle.checked = data.visible;
  approvedToggle.checked = data.approved;
}

/* -------------------------------------------------------
   SAVE FILE
   ------------------------------------------------------- */

saveBtn.addEventListener("click", async () => {
  if (!currentPath) return alert("No file selected.");

  const body = {
    path: currentPath,
    content: editor.value,
    visible: visibleToggle.checked,
    approved: approvedToggle.checked
  };

  const res = await fetch("/api/save", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    alert("Failed to save file.");
    return;
  }

  alert("Saved!");
});

/* -------------------------------------------------------
   DELETE FILE
   ------------------------------------------------------- */

deleteBtn.addEventListener("click", async () => {
  if (!currentPath) return alert("No file selected.");

  if (!confirm("Delete this file?")) return;

  const res = await fetch("/api/delete", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path: currentPath })
  });

  if (!res.ok) {
    alert("Failed to delete file.");
    return;
  }

  currentPath = null;
  editor.value = "";
  await loadFileTree();
});

/* -------------------------------------------------------
   NEW FILE
   ------------------------------------------------------- */

newFileBtn.addEventListener("click", async () => {
  const name = prompt("Enter new filename (e.g. newfile.md):");
  if (!name) return;

  const res = await fetch("/api/new", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path: name })
  });

  if (!res.ok) {
    alert("Failed to create file.");
    return;
  }

  await loadFileTree();
});

/* -------------------------------------------------------
   IMAGE UPLOAD
   ------------------------------------------------------- */

uploadImageBtn.addEventListener("click", () => {
  uploadModal.classList.remove("hidden");
});

uploadCancelBtn.addEventListener("click", () => {
  uploadModal.classList.add("hidden");
  uploadInput.value = "";
});

uploadConfirmBtn.addEventListener("click", async () => {
  const file = uploadInput.files[0];
  if (!file) return alert("No file selected.");

  const reader = new FileReader();
  reader.onload = async () => {
    const base64 = reader.result.split(",")[1];

    const uploadPath = `uploads/${file.name}`;

    const res = await fetch("/api/upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        path: uploadPath,
        base64
      })
    });

    if (!res.ok) {
      alert("Upload failed.");
      return;
    }

    alert("Uploaded!");
    uploadModal.classList.add("hidden");
    uploadInput.value = "";
  };

  reader.readAsDataURL(file);
});

/* -------------------------------------------------------
   THEME
   ------------------------------------------------------- */

async function loadTheme() {
  const res = await fetch("/api/theme");
  if (!res.ok) return;

  const data = await res.json();
  themeSelect.value = data.theme || "original";
}

themeSelect.addEventListener("change", async () => {
  const theme = themeSelect.value;

  const res = await fetch("/api/theme", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ theme })
  });

  if (!res.ok) {
    alert("Failed to save theme.");
    return;
  }

  alert("Theme updated.");
});

/* -------------------------------------------------------
   INIT
   ------------------------------------------------------- */

init();