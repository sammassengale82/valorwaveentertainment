/* ============================================================
   VISUAL EDITOR — POPUP HYBRID SYSTEM
============================================================ */

(function () {

    window.addEventListener("message", (event) => {
        const msg = event.data || {};
        if (!msg.type) return;

        if (msg.type === "ve-init") enableClickToEdit();
        if (msg.type === "set-theme") applyTheme(msg.theme);
        if (msg.type === "ve-apply-edit") applyEdit(msg);
        if (msg.type === "insert-block") insertBlock(msg);
    });

    function enableClickToEdit() {
        document.body.addEventListener("click", (e) => {
            const target = e.target.closest("[data-ve-edit]");
            if (!target) return;

            window.parent.postMessage(
                {
                    type: "open-editor",
                    blockId: target.getAttribute("data-ve-edit"),
                    html: target.innerHTML
                },
                "*"
            );
        });
    }

    function applyTheme(theme) {
        document.body.classList.remove("theme-original", "theme-acu", "theme-patriotic");
        document.body.classList.add(`theme-${theme}`);
    }

    function applyEdit({ blockId, html, design, settings }) {
        const el = document.querySelector(`[data-ve-edit="${blockId}"]`);
        if (!el) return;

        /* CONTENT */
        el.innerHTML = html;

        /* DESIGN */
        if (design) {
            Object.entries(design).forEach(([key, value]) => {
                if (value !== "") el.style[key] = value;
            });
        }

        /* SETTINGS */
        if (settings) {
            if (settings.id) el.id = settings.id;
            if (settings.class) el.className = settings.class;
            if (settings.visibility) el.style.visibility = settings.visibility;
        }

        /* SEND UPDATED DOM BACK */
        window.parent.postMessage(
            {
                type: "dom-updated",
                html: document.documentElement.outerHTML
            },
            "*"
        );
    }

    function insertBlock({ html, position, targetBlockId }) {
        const target = document.querySelector(`[data-ve-edit="${targetBlockId}"]`);

        if (!target) {
            document.body.insertAdjacentHTML("beforeend", html);
        } else {
            target.insertAdjacentHTML(position === "before" ? "beforebegin" : "afterend", html);
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