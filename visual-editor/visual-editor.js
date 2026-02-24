/* ============================================================
   VISUAL EDITOR — PHASE 14 (Popup Editor Version)
   Runs inside the editable iframe
============================================================ */

(function () {
    let currentTheme = "original";

    /* ============================================================
       MESSAGE LISTENER
    ============================================================= */
    window.addEventListener("message", (event) => {
        const msg = event.data || {};
        if (!msg.type) return;

        if (msg.type === "ve-init") {
            initVisualEditor();
        }

        if (msg.type === "set-theme") {
            applyTheme(msg.theme);
        }

        if (msg.type === "ve-apply-edit") {
            applyEdit(msg);
        }

        if (msg.type === "insert-block") {
            insertBlock(msg);
        }
    });

    /* ============================================================
       INIT
    ============================================================= */
    function initVisualEditor() {
        console.log("[VE] Initializing Visual Editor...");
        attachClickHandlers();
        applyTheme(currentTheme);
    }

    /* ============================================================
       CLICK HANDLERS — SEND OPEN-EDITOR TO CMS
    ============================================================= */
    function attachClickHandlers() {
        document.querySelectorAll("[data-ve-edit]").forEach((el) => {
            el.addEventListener("click", (e) => {
                e.preventDefault();
                e.stopPropagation();

                const blockId = el.getAttribute("data-ve-edit");

                const payload = {
                    type: "open-editor",
                    blockId,
                    html: el.innerHTML
                };

                console.log("[VE] Sending open-editor:", payload);
                window.parent.postMessage(payload, "*");
            });
        });
    }

    /* ============================================================
       APPLY THEME
    ============================================================= */
    function applyTheme(theme) {
        currentTheme = theme;
        const body = document.body;

        body.classList.remove("theme-original", "theme-acu", "theme-patriotic");
        body.classList.add(`theme-${theme}`);

        console.log("[VE] Theme applied:", `theme-${theme}`);
    }

    /* ============================================================
       APPLY EDIT FROM CMS (POPUP)
    ============================================================= */
    function applyEdit({ blockId, html }) {
        const target = document.querySelector(`[data-ve-edit="${blockId}"]`);

        if (!target) {
            console.warn("[VE] No element found for blockId:", blockId);
            return;
        }

        target.innerHTML = html;

        // Send updated DOM back to CMS
        window.parent.postMessage(
            {
                type: "dom-updated",
                html: document.documentElement.outerHTML
            },
            "*"
        );
    }

    /* ============================================================
       INSERT BLOCK (TEMPLATES)
    ============================================================= */
    function insertBlock({ html, position, targetBlockId }) {
        if (!targetBlockId) {
            document.body.insertAdjacentHTML("beforeend", html);
        } else {
            const target = document.querySelector(`[data-ve-edit="${targetBlockId}"]`);
            if (!target) return;

            if (position === "before") {
                target.insertAdjacentHTML("beforebegin", html);
            } else {
                target.insertAdjacentHTML("afterend", html);
            }
        }

        window.parent.postMessage(
            {
                type: "dom-updated",
                html: document.documentElement.outerHTML
            },
            "*"
        );
    }
})();