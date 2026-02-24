/* ============================================================
   VISUAL EDITOR — PHASE 14 (Hybrid Inspector Panel)
   Runs inside the editable iframe
============================================================ */

(function () {
    let ve = {};
    let currentTheme = "original";

    /* ============================================================
       INIT
    ============================================================= */
    window.addEventListener("message", (event) => {
        const data = event.data || {};
        if (!data.type) return;

        if (data.type === "ve-init") {
            initVisualEditor();
        }

        if (data.type === "set-theme") {
            applyTheme(data.theme);
        }

        if (data.type === "apply-edit") {
            applyEditFromCMS(data);
        }

        if (data.type === "insert-block") {
            insertBlock(data);
        }
    });

    function initVisualEditor() {
        console.log("[VE] Initializing Visual Editor...");

        attachClickHandlers();
        applyTheme(currentTheme);

        console.log("[VE] Click handlers attached to editable elements.");
    }

    /* ============================================================
       CLICK HANDLERS — SEND OPEN-EDITOR PAYLOAD TO CMS
    ============================================================= */
    function attachClickHandlers() {
        const doc = document;

        doc.querySelectorAll("[data-ve-editable]").forEach(el => {
            el.addEventListener("click", (e) => {
                e.preventDefault();
                e.stopPropagation();

                const editType = el.getAttribute("data-ve-editable") || "block";

                const payload = {
                    type: "open-editor",
                    editType,
                    blockId: el.getAttribute("data-ve-block-id") || null,
                    innerHTML: el.innerHTML
                };

                console.log("[VE] Sending open-editor payload to CMS:", payload);
                parent.postMessage(payload, "*");
            });
        });
    }

    /* ============================================================
       APPLY THEME
    ============================================================= */
    function applyTheme(theme) {
    const body = document.body;

    // Remove all theme classes
    body.classList.remove("theme-original", "theme-multicam", "theme-patriotic");

    // Add the new theme class
    body.classList.add(`theme-${theme}`);

    console.log("[VE] Theme applied to body:", `theme-${theme}`);
}

    /* ============================================================
       APPLY EDIT FROM CMS
    ============================================================= */
    function applyEditFromCMS(data) {
        const { editType, html, design, settings } = data;

        const target = findEditableElement(editType);
        if (!target) {
            console.warn("[VE] No target found for editType:", editType);
            return;
        }

        /* -------------------------------
           APPLY CONTENT
        -------------------------------- */
        if (html !== undefined && html !== null) {
            target.innerHTML = html;
        }

        /* -------------------------------
           APPLY DESIGN (inline styles)
        -------------------------------- */
        if (design && typeof design === "object") {
            Object.entries(design).forEach(([key, value]) => {
                if (value === "") return;

                if (key === "padding") {
                    target.style.padding = `${value}px`;
                } else {
                    target.style[key] = value;
                }
            });
        }

        /* -------------------------------
           APPLY SETTINGS (id, class, visibility)
        -------------------------------- */
        if (settings && typeof settings === "object") {
            if (settings.id) target.id = settings.id;

            if (settings.class) {
                target.className = settings.class;
            }

            if (settings.visibility) {
                target.style.visibility = settings.visibility;
            }
        }

        /* -------------------------------
           SEND UPDATED DOM BACK TO CMS
        -------------------------------- */
        const fullHtml = document.documentElement.outerHTML;

        parent.postMessage(
            {
                type: "dom-updated",
                html: fullHtml
            },
            "*"
        );
    }

    /* ============================================================
       FIND TARGET ELEMENT
    ============================================================= */
    function findEditableElement(editType) {
        const doc = document;

        let el = doc.querySelector(`[data-ve-editable="${editType}"]`);
        if (el) return el;

        el = doc.querySelector(`[data-ve-block-id="${editType}"]`);
        if (el) return el;

        return null;
    }

    /* ============================================================
       INSERT BLOCK (TEMPLATES)
    ============================================================= */
    function insertBlock({ html, position, targetBlockId }) {
        const doc = document;

        if (!targetBlockId) {
            doc.body.insertAdjacentHTML("beforeend", html);
        } else {
            const target = doc.querySelector(`[data-ve-block-id="${targetBlockId}"]`);
            if (!target) return;

            if (position === "before") {
                target.insertAdjacentHTML("beforebegin", html);
            } else {
                target.insertAdjacentHTML("afterend", html);
            }
        }

        const fullHtml = document.documentElement.outerHTML;

        parent.postMessage(
            {
                type: "dom-updated",
                html: fullHtml
            },
            "*"
        );
    }
})();
