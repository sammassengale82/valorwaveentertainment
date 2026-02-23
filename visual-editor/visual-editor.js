/* ============================================================
   VALOR WAVE VISUAL EDITOR (runs inside GitHub Pages iframe)
   Phase 14 — message-driven, cross-origin safe
============================================================ */

/* -----------------------------
   STATE
----------------------------- */
let veInitialized = false;

/* -----------------------------
   ENTRY POINT
----------------------------- */
function initializeVisualEditor() {
    if (veInitialized) return;
    veInitialized = true;

    console.log("[VE] Initializing Visual Editor...");

    attachEditableClickHandlers();
}

/* -----------------------------
   THEME APPLICATION (STUB)
   You can expand this to actually
   toggle classes, data-theme, etc.
----------------------------- */
function applyTheme(themeName) {
    console.log("[VE] Applying theme:", themeName);
    // Example: document.documentElement.setAttribute("data-site-theme", themeName);
}

/* -----------------------------
   ATTACH CLICK HANDLERS
   Looks for elements marked as editable.
   You can adjust the selector to match
   your markup strategy.
----------------------------- */
function attachEditableClickHandlers() {
    // Example strategy:
    // Any element with data-ve-edit="text" or data-ve-edit="hero" etc.
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
                innerHTML: el.innerHTML,
                // You can add more structured data here later if needed
            };

            console.log("[VE] Sending open-editor payload to CMS:", payload);

            window.parent.postMessage(payload, "*");
        });
    });

    console.log("[VE] Click handlers attached to editable elements.");
}

/* -----------------------------
   MESSAGE LISTENER
   Receives commands from CMS:
   - ve-init: initialize VE
   - set-theme: apply theme
----------------------------- */
window.addEventListener("message", (event) => {
    const data = event.data || {};

    if (!data.type) return;

    switch (data.type) {
        case "ve-init":
            initializeVisualEditor();
            break;

        case "set-theme":
            if (data.theme) {
                applyTheme(data.theme);
            }
            break;

        default:
            // Ignore unknown messages
            break;
    }
});

/* -----------------------------
   OPTIONAL: AUTO-INIT FOR LOCAL
   If you ever load this directly
   without CMS, you can uncomment:

document.addEventListener("DOMContentLoaded", () => {
    initializeVisualEditor();
});

----------------------------- */
