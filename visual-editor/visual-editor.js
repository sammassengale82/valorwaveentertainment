/* ============================================================
   PREVENT DOUBLE-LOADING
============================================================ */
if (window.__VE_LOADED__) {
    console.warn("[VE] visual-editor.js already loaded — skipping.");
    // Stop this script from executing again
    throw new Error("VE already loaded");
}
window.__VE_LOADED__ = true;

/* ============================================================
   VALOR WAVE VISUAL EDITOR (runs inside GitHub Pages iframe)
   Phase 14 — message-driven, cross-origin safe
============================================================ */

/* -----------------------------
   GLOBAL STATE (SAFE)
----------------------------- */
window.__VE_INITIALIZED__ = window.__VE_INITIALIZED__ || false;

/* -----------------------------
   ENTRY POINT
----------------------------- */
function initializeVisualEditor() {
    if (window.__VE_INITIALIZED__) {
        console.log("[VE] Already initialized — skipping.");
        return;
    }
    window.__VE_INITIALIZED__ = true;

    console.log("[VE] Initializing Visual Editor...");

    attachEditableClickHandlers();
}

/* -----------------------------
   THEME APPLICATION
----------------------------- */
function applyTheme(themeName) {
    console.log("[VE] Applying theme:", themeName);
    // Example: document.documentElement.setAttribute("data-site-theme", themeName);
}

/* -----------------------------
   ATTACH CLICK HANDLERS
----------------------------- */
function attachEditableClickHandlers() {
    const editableElements = document.querySelectorAll("[data-ve-edit]");

    if (!editableElements.length) {
        console.warn("[VE] No editable elements found with [data-ve-edit].");
        return;
    }

    editableElements.forEach((el) => {
        el.addEventListener("click", (e) => {
            e.preventDefault();
            e.stopPropagation();

            const editType = el.getAttribute("data-ve-edit") || "block";
            const blockId = el.id || null;

            const payload = {
                type: "open-editor",
                editType,
                blockId,
                innerHTML: el.innerHTML
            };

            console.log("[VE] Sending open-editor payload to CMS:", payload);

            window.parent.postMessage(payload, "*");
        });
    });

    console.log("[VE] Click handlers attached to editable elements.");
}

/* -----------------------------
   MESSAGE LISTENER (CMS → VE)
----------------------------- */
window.addEventListener("message", (event) => {
    const data = event.data || {};
    if (!data.type) return;

    switch (data.type) {
        case "ve-init":
            initializeVisualEditor();
            break;

        case "set-theme":
            if (data.theme) applyTheme(data.theme);
            break;

        default:
            break;
    }
});
