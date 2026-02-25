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

  el.innerHTML = html;

  if (design) {
    Object.entries(design).forEach(([key, value]) => {
      if (value !== "") el.style[key] = value;
    });
  }

  if (settings) {
    if (settings.id) el.id = settings.id;
    if (settings.class) el.className = settings.class;
    if (settings.visibility) el.style.visibility = settings.visibility;

    // Button URL
    if (settings.buttonUrl) {
      const btn = el.querySelector("a, button");
      if (btn && btn.tagName === "A") {
        btn.href = settings.buttonUrl;
      }
    }

    // Image fields
    if (settings.imageSrc || settings.imageAlt) {
      const img = el.querySelector("img");
      if (img) {
        if (settings.imageSrc) img.src = settings.imageSrc;
        if (settings.imageAlt) img.alt = settings.imageAlt;
      }
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
