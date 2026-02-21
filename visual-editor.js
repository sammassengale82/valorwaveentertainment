// ======================================================
// VALOR WAVE — VISUAL EDITOR ENGINE (PHASE 12)
// Runs inside the editable iframe loaded by the CMS
// Supports:
// - data-editable elements (text/image/link/list)
// - data-editable-block blocks (any tag)
// - drag-reorder blocks
// - delete blocks
// - insert blocks from CMS
// - DOM sync back to CMS
// ======================================================

const HIGHLIGHT_COLOR = "rgba(59, 130, 246, 0.35)";
const BLOCK_HIGHLIGHT_COLOR = "rgba(16, 185, 129, 0.25)";

let currentElementHighlight = null;
let currentBlockHighlight = null;
let dragBlock = null;
let dragPlaceholder = null;

// -------------------------------
// Utility: unique selector for elements
// -------------------------------
function getUniqueSelector(el) {
    if (!el) return null;
    if (el.id) return `#${el.id}`;

    const path = [];
    let node = el;

    while (node && node.nodeType === 1 && node !== document.body) {
        let selector = node.tagName.toLowerCase();
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

// -------------------------------
// Element-level editing
// -------------------------------
function isEditableElement(el) {
    return el && el.hasAttribute("data-editable");
}

function highlightElement(el) {
    if (currentElementHighlight === el) return;
    removeElementHighlight();
    currentElementHighlight = el;
    el.style.outline = `2px solid ${HIGHLIGHT_COLOR}`;
    el.style.cursor = "pointer";
}

function removeElementHighlight() {
    if (!currentElementHighlight) return;
    currentElementHighlight.style.outline = "";
    currentElementHighlight.style.cursor = "";
    currentElementHighlight = null;
}

function extractElementContent(el) {
    const type = el.getAttribute("data-edit-type") || "text";

    switch (type) {
        case "text":
        case "list":
            return { editType: type, content: el.innerHTML };
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

// -------------------------------
// Block-level editing (Phase 12)
// -------------------------------
function getAllBlocks() {
    return Array.from(document.querySelectorAll("[data-editable-block]"));
}

function highlightBlock(block) {
    if (currentBlockHighlight === block) return;
    removeBlockHighlight();
    currentBlockHighlight = block;
    block.style.outline = `2px dashed ${BLOCK_HIGHLIGHT_COLOR}`;
    block.style.position = block.style.position || "relative";
}

function removeBlockHighlight() {
    if (!currentBlockHighlight) return;
    currentBlockHighlight.style.outline = "";
    currentBlockHighlight = null;
}

// Inject drag handle + delete button into each block
function enhanceBlocks() {
    const blocks = getAllBlocks();

    blocks.forEach(block => {
        if (block.querySelector(".cms-block-handle")) return; // already enhanced

        const handle = document.createElement("div");
        handle.className = "cms-block-handle";
        handle.textContent = "⋮⋮";
        handle.title = "Drag to reorder section";
        handle.draggable = true;

        const del = document.createElement("button");
        del.className = "cms-block-delete";
        del.type = "button";
        del.textContent = "×";
        del.title = "Delete section";

        block.insertBefore(handle, block.firstChild);
        block.insertBefore(del, block.firstChild);

        // Drag events
        handle.addEventListener("dragstart", (e) => {
            dragBlock = block;
            dragPlaceholder = document.createElement(block.tagName);
            dragPlaceholder.className = "cms-block-placeholder";
            dragPlaceholder.style.height = `${block.offsetHeight}px`;
            dragPlaceholder.style.border = "2px dashed rgba(148, 163, 184, 0.8)";
            dragPlaceholder.style.margin = getComputedStyle(block).margin;

            block.parentNode.insertBefore(dragPlaceholder, block.nextSibling);
            block.classList.add("cms-block-dragging");

            e.dataTransfer.effectAllowed = "move";
        });

        handle.addEventListener("dragend", () => {
            if (dragBlock) dragBlock.classList.remove("cms-block-dragging");
            if (dragPlaceholder && dragPlaceholder.parentNode) {
                dragPlaceholder.parentNode.removeChild(dragPlaceholder);
            }
            dragBlock = null;
            dragPlaceholder = null;
            sendDomUpdated();
        });

        // Delete
        del.addEventListener("click", () => {
            const blockId = block.getAttribute("data-block-id") || "(unnamed)";
            const ok = window.confirm(`Delete section "${blockId}"? This cannot be undone.`);
            if (!ok) return;

            block.parentNode.removeChild(block);
            sendDomUpdated();
        });
    });
}

// Handle dragover at document level
document.addEventListener("dragover", (e) => {
    if (!dragBlock || !dragPlaceholder) return;

    e.preventDefault();
    const blocks = getAllBlocks().filter(b => b !== dragBlock && b !== dragPlaceholder);

    let closest = null;
    let closestOffset = Number.NEGATIVE_INFINITY;

    blocks.forEach(block => {
        const rect = block.getBoundingClientRect();
        const offset = e.clientY - rect.top - rect.height / 2;
        if (offset < 0 && offset > closestOffset) {
            closestOffset = offset;
            closest = block;
        }
    });

    if (!closest) {
        // Place at end
        const parent = dragPlaceholder.parentNode || dragBlock.parentNode;
        parent.appendChild(dragPlaceholder);
    } else {
        closest.parentNode.insertBefore(dragPlaceholder, closest);
    }
});

// On drop, move block to placeholder position
document.addEventListener("drop", (e) => {
    if (!dragBlock || !dragPlaceholder) return;
    e.preventDefault();

    dragPlaceholder.parentNode.insertBefore(dragBlock, dragPlaceholder);
});

// -------------------------------
// Messaging: apply edits from CMS
// -------------------------------
window.addEventListener("message", (event) => {
    const data = event.data;
    if (!data) return;

    // Apply element-level edits
    if (data.type === "apply-edit") {
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

        sendDomUpdated();
        return;
    }

    // Theme sync
    if (data.type === "set-theme") {
        document.body.className = `theme-${data.theme}`;
        return;
    }

    // Insert block from CMS
    if (data.type === "insert-block") {
        const { html, position, targetBlockId } = data;
        if (!html) return;

        const temp = document.createElement("div");
        temp.innerHTML = html.trim();
        const newBlock = temp.firstElementChild;
        if (!newBlock) return;

        const blocks = getAllBlocks();
        let targetBlock = null;

        if (targetBlockId) {
            targetBlock = blocks.find(
                b => b.getAttribute("data-block-id") === targetBlockId
            );
        }

        if (!targetBlock && blocks.length > 0) {
            targetBlock = blocks[blocks.length - 1];
        }

        if (!targetBlock) {
            // No existing blocks, append to body
            document.body.appendChild(newBlock);
        } else {
            if (position === "before") {
                targetBlock.parentNode.insertBefore(newBlock, targetBlock);
            } else {
                targetBlock.parentNode.insertBefore(newBlock, targetBlock.nextSibling);
            }
        }

        enhanceBlocks();
        sendDomUpdated();
        return;
    }

    // Delete block by ID from CMS (optional)
    if (data.type === "delete-block") {
        const { blockId } = data;
        if (!blockId) return;

        const block = document.querySelector(
            `[data-editable-block][data-block-id="${blockId}"]`
        );
        if (!block) return;

        block.parentNode.removeChild(block);
        sendDomUpdated();
        return;
    }
});

// -------------------------------
// Messaging: send DOM updates to CMS
// -------------------------------
function sendDomUpdated() {
    const html = "<!DOCTYPE html>\n" + document.documentElement.outerHTML;
    window.parent.postMessage(
        {
            type: "dom-updated",
            html
        },
        "*"
    );
}

// -------------------------------
// Hover + click behavior
// -------------------------------
document.addEventListener("mouseover", (e) => {
    const block = e.target.closest("[data-editable-block]");
    if (block) {
        highlightBlock(block);
        return;
    }

    const el = e.target.closest("[data-editable]");
    if (el) {
        highlightElement(el);
    } else {
        removeElementHighlight();
    }
});

document.addEventListener("mouseout", (e) => {
    const block = e.target.closest("[data-editable-block]");
    if (!block) removeBlockHighlight();

    const el = e.target.closest("[data-editable]");
    if (!el) removeElementHighlight();
});

document.addEventListener("click", (e) => {
    const el = e.target.closest("[data-editable]");
    if (!el) return;

    e.preventDefault();
    e.stopPropagation();

    const selector = getUniqueSelector(el);
    const extracted = extractElementContent(el);

    window.parent.postMessage(
        {
            type: "open-editor",
            targetSelector: selector,
            ...extracted
        },
        "*"
    );
});

// -------------------------------
// Init
// -------------------------------
document.addEventListener("DOMContentLoaded", () => {
    enhanceBlocks();
});
