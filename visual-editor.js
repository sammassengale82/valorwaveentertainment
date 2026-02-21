// ======================================================
// VALOR WAVE — VISUAL EDITOR ENGINE
// Runs inside the editable iframe loaded by the CMS
// ======================================================

// Highlight color for editable elements
const HIGHLIGHT_COLOR = "rgba(59, 130, 246, 0.35)";

// Track currently highlighted element
let currentHighlight = null;

// Utility: generate a unique CSS selector for an element
function getUniqueSelector(el) {
    if (!el) return null;

    // If element has an ID, that's the best selector
    if (el.id) return `#${el.id}`;

    // Build a path of tag names + nth-child
    const path = [];
    let node = el;

    while (node && node.nodeType === 1 && node !== document.body) {
        let selector = node.tagName.toLowerCase();

        // Add nth-child for uniqueness
        const parent = node.parentNode;
        if (parent) {
            const index = Array.from(parent.children).indexOf(node) + 1;
            selector += `:nth-child(${index})`;
        }

        path.unshift(selector);
        node = parent;
    }

    return path.join(" > ");
}

// Highlight element on hover
function highlightElement(el) {
    if (currentHighlight === el) return;

    removeHighlight();

    currentHighlight = el;
    el.style.outline = `3px solid ${HIGHLIGHT_COLOR}`;
    el.style.cursor = "pointer";
}

// Remove highlight
function removeHighlight() {
    if (!currentHighlight) return;
    currentHighlight.style.outline = "";
    currentHighlight.style.cursor = "";
    currentHighlight = null;
}

// Detect editable elements
function isEditable(el) {
    if (!el) return false;
    return el.hasAttribute("data-editable");
}

// Extract content depending on type
function extractContent(el) {
    const type = el.getAttribute("data-edit-type") || "text";

    switch (type) {
        case "text":
            return { editType: "text", content: el.innerHTML };
        case "list":
            return { editType: "list", content: el.innerHTML };
        case "image":
            return { editType: "image", imageUrl: el.src };
        case "link":
            return {
                editType: "link",
                label: el.textContent,
                url: el.href
            };
        default:
            return { editType: "text", content: el.innerHTML };
    }
}

// Apply edits sent from CMS
window.addEventListener("message", (event) => {
    const data = event.data;
    if (!data || data.type !== "apply-edit") return;

    const selector = data.targetSelector;
    if (!selector) return;

    const el = document.querySelector(selector);
    if (!el) return;

    switch (data.editType) {
        case "text":
        case "list":
            el.innerHTML = data.content;
            break;

        case "image":
            if (data.imageUrl) el.src = data.imageUrl;
            break;

        case "link":
            if (data.label) el.textContent = data.label;
            if (data.url) el.href = data.url;
            break;
    }
});

// Theme syncing from CMS
window.addEventListener("message", (event) => {
    const data = event.data;
    if (!data || data.type !== "set-theme") return;

    document.body.className = `theme-${data.theme}`;
});

// Hover + click listeners
document.addEventListener("mouseover", (e) => {
    const el = e.target.closest("[data-editable]");
    if (el) highlightElement(el);
    else removeHighlight();
});

document.addEventListener("mouseout", (e) => {
    const el = e.target.closest("[data-editable]");
    if (!el) removeHighlight();
});

document.addEventListener("click", (e) => {
    const el = e.target.closest("[data-editable]");
    if (!el) return;

    e.preventDefault();
    e.stopPropagation();

    const selector = getUniqueSelector(el);
    const extracted = extractContent(el);

    window.parent.postMessage(
        {
            type: "open-editor",
            targetSelector: selector,
            ...extracted
        },
        "*"
    );
});
