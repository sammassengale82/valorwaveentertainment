/* ============================================================
   VALOR WAVE — VISUAL EDITOR ENGINE (PHASE 13)
   Responsive Grid Editing + Table Movement + Resizing
   ------------------------------------------------------------
   Features:
   - Auto-detect sections containing 2+ tables
   - Auto-wrap tables into responsive grid containers
   - Grid items get drag handles + resize handles (RH1)
   - Resize changes grid-column span (R4-A)
   - Vertical resizing supported
   - Table column resizing supported
   - Drag tables to reorder inside grid (M1)
   - DOM sync to CMS
   - Full Phase 12 block editing
   - Full Phase 11 element editing
   ============================================================ */

/* -----------------------------
   GLOBAL CONSTANTS
----------------------------- */
const ELEMENT_HIGHLIGHT = "rgba(59, 130, 246, 0.35)";
const BLOCK_HIGHLIGHT = "rgba(16, 185, 129, 0.25)";
const GRID_HIGHLIGHT = "rgba(96, 165, 250, 0.25)";

/* -----------------------------
   STATE
----------------------------- */
let currentElement = null;
let currentBlock = null;
let dragItem = null;
let dragPlaceholder = null;
let resizeTarget = null;
let resizeMode = null; // "right", "bottom", "corner"
let startX = 0;
let startY = 0;
let startWidth = 0;
let startHeight = 0;
let startColSpan = 1;

/* ============================================================
   UTILITY: UNIQUE SELECTOR
============================================================ */
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

/* ============================================================
   PHASE 13 — AUTO-GRID DETECTION + WRAPPING
============================================================ */
function autoWrapTablesIntoGrid() {
    const sections = document.querySelectorAll("[data-editable-block]");

    sections.forEach(section => {
        const tables = Array.from(section.querySelectorAll("table"));

        if (tables.length < 2) return; // Only gridify if 2+ tables

        // Avoid double-wrapping
        if (section.querySelector("[data-grid-container]")) return;

        // Create grid container
        const grid = document.createElement("div");
        grid.className = "cms-grid";
        grid.setAttribute("data-grid-container", "");

        // Move tables into grid items
        tables.forEach(table => {
            const wrapper = document.createElement("div");
            wrapper.className = "cms-grid-item";
            wrapper.setAttribute("data-grid-item", "");

            table.parentNode.insertBefore(wrapper, table);
            wrapper.appendChild(table);
        });

        // Move grid into section
        section.appendChild(grid);

        // Move wrappers into grid
        const wrappers = section.querySelectorAll("[data-grid-item]");
        wrappers.forEach(w => grid.appendChild(w));
    });
}

/* ============================================================
   PHASE 13 — GRID ITEM DRAGGING
============================================================ */
function enableGridDragging() {
    document.addEventListener("mousedown", (e) => {
        const handle = e.target.closest(".grid-drag-handle");
        if (!handle) return;

        dragItem = handle.closest("[data-grid-item]");
        if (!dragItem) return;

        e.preventDefault();

        dragPlaceholder = document.createElement("div");
        dragPlaceholder.className = "cms-grid-placeholder";
        dragPlaceholder.style.height = dragItem.offsetHeight + "px";

        dragItem.classList.add("dragging");
        dragItem.parentNode.insertBefore(dragPlaceholder, dragItem.nextSibling);
    });

    document.addEventListener("mousemove", (e) => {
        if (!dragItem || !dragPlaceholder) return;

        e.preventDefault();

        const grid = dragItem.closest("[data-grid-container]");
        const items = Array.from(grid.querySelectorAll("[data-grid-item]"))
            .filter(i => i !== dragItem);

        let closest = null;
        let closestDist = Infinity;

        items.forEach(item => {
            const rect = item.getBoundingClientRect();
            const dist = Math.abs(e.clientY - (rect.top + rect.height / 2));
            if (dist < closestDist) {
                closestDist = dist;
                closest = item;
            }
        });

        if (closest) {
            const rect = closest.getBoundingClientRect();
            if (e.clientY < rect.top + rect.height / 2) {
                closest.parentNode.insertBefore(dragPlaceholder, closest);
            } else {
                closest.parentNode.insertBefore(dragPlaceholder, closest.nextSibling);
            }
        }
    });

    document.addEventListener("mouseup", () => {
        if (!dragItem || !dragPlaceholder) return;

        dragPlaceholder.parentNode.insertBefore(dragItem, dragPlaceholder);
        dragItem.classList.remove("dragging");
        dragPlaceholder.remove();

        dragItem = null;
        dragPlaceholder = null;

        sendDomUpdated();
    });
}

/* ============================================================
   PHASE 13 — GRID ITEM RESIZING (RH1)
============================================================ */
function enableGridResizing() {
    document.addEventListener("mousedown", (e) => {
        const handle = e.target.closest(".grid-resize-handle");
        if (!handle) return;

        resizeTarget = handle.closest("[data-grid-item]");
        if (!resizeTarget) return;

        resizeMode = handle.dataset.resize;
        startX = e.clientX;
        startY = e.clientY;
        startWidth = resizeTarget.offsetWidth;
        startHeight = resizeTarget.offsetHeight;

        const grid = resizeTarget.closest("[data-grid-container]");
        const style = window.getComputedStyle(grid);
        const colWidth = parseFloat(style.gridTemplateColumns.split(" ")[0]);
        startColSpan = Math.round(startWidth / colWidth);

        e.preventDefault();
    });

    document.addEventListener("mousemove", (e) => {
        if (!resizeTarget || !resizeMode) return;

        e.preventDefault();

        const dx = e.clientX - startX;
        const dy = e.clientY - startY;

        if (resizeMode === "right" || resizeMode === "corner") {
            const newWidth = startWidth + dx;
            const grid = resizeTarget.closest("[data-grid-container]");
            const style = window.getComputedStyle(grid);
            const colWidth = parseFloat(style.gridTemplateColumns.split(" ")[0]);
            const newSpan = Math.max(1, Math.round(newWidth / colWidth));
            resizeTarget.style.gridColumn = `span ${newSpan}`;
        }

        if (resizeMode === "bottom" || resizeMode === "corner") {
            const newHeight = Math.max(50, startHeight + dy);
            resizeTarget.style.height = newHeight + "px";
        }
    });

    document.addEventListener("mouseup", () => {
        if (resizeTarget) sendDomUpdated();
        resizeTarget = null;
        resizeMode = null;
    });
}

/* ============================================================
   PHASE 13 — TABLE COLUMN RESIZING
============================================================ */
function enableTableColumnResizing() {
    document.addEventListener("mousedown", (e) => {
        const colHandle = e.target.closest(".table-col-resize");
        if (!colHandle) return;

        resizeTarget = colHandle.closest("th, td");
        if (!resizeTarget) return;

        resizeMode = "table-col";
        startX = e.clientX;
        startWidth = resizeTarget.offsetWidth;

        e.preventDefault();
    });

    document.addEventListener("mousemove", (e) => {
        if (resizeMode !== "table-col" || !resizeTarget) return;

        e.preventDefault();

        const dx = e.clientX - startX;
        const newWidth = Math.max(40, startWidth + dx);
        resizeTarget.style.width = newWidth + "px";
    });

    document.addEventListener("mouseup", () => {
        if (resizeMode === "table-col") sendDomUpdated();
        resizeTarget = null;
        resizeMode = null;
    });
}

/* ============================================================
   PHASE 12 — BLOCK EDITING (unchanged)
============================================================ */
function highlightBlock(block) {
    if (currentBlock === block) return;
    removeBlockHighlight();
    currentBlock = block;
    block.style.outline = `2px dashed ${BLOCK_HIGHLIGHT}`;
}

function removeBlockHighlight() {
    if (!currentBlock) return;
    currentBlock.style.outline = "";
    currentBlock = null;
}

/* ============================================================
   ELEMENT EDITING (Phase 11)
============================================================ */
function highlightElement(el) {
    if (currentElement === el) return;
    removeElementHighlight();
    currentElement = el;
    el.style.outline = `2px solid ${ELEMENT_HIGHLIGHT}`;
}

function removeElementHighlight() {
    if (!currentElement) return;
    currentElement.style.outline = "";
    currentElement = null;
}

/* ============================================================
   APPLY EDITS FROM CMS
============================================================ */
window.addEventListener("message", (event) => {
    const data = event.data;
    if (!data) return;

    if (data.type === "apply-edit") {
        const el = document.querySelector(data.targetSelector);
        if (!el) return;

        if (data.editType === "text" || data.editType === "list") {
            el.innerHTML = data.content;
        } else if (data.editType === "image") {
            el.src = data.imageUrl;
        } else if (data.editType === "link") {
            el.textContent = data.label;
            el.href = data.url;
        }

        sendDomUpdated();
    }

    if (data.type === "insert-block") {
        const temp = document.createElement("div");
        temp.innerHTML = data.html.trim();
        const newBlock = temp.firstElementChild;

        const blocks = document.querySelectorAll("[data-editable-block]");
        let target = null;

        if (data.targetBlockId) {
            target = Array.from(blocks).find(
                b => b.getAttribute("data-block-id") === data.targetBlockId
            );
        }

        if (!target && blocks.length > 0) {
            target = blocks[blocks.length - 1];
        }

        if (target) {
            if (data.position === "before") {
                target.parentNode.insertBefore(newBlock, target);
            } else {
                target.parentNode.insertBefore(newBlock, target.nextSibling);
            }
        } else {
            document.body.appendChild(newBlock);
        }

        autoWrapTablesIntoGrid();
        enhanceGridItems();
        sendDomUpdated();
    }
});

/* ============================================================
   SEND DOM UPDATE TO CMS
============================================================ */
function sendDomUpdated() {
    const html = "<!DOCTYPE html>\n" + document.documentElement.outerHTML;
    window.parent.postMessage(
        { type: "dom-updated", html },
        "*"
    );
}

/* ============================================================
   GRID ITEM ENHANCEMENT (drag + resize handles)
============================================================ */
function enhanceGridItems() {
    const items = document.querySelectorAll("[data-grid-item]");

    items.forEach(item => {
        if (!item.querySelector(".grid-drag-handle")) {
            const dragHandle = document.createElement("div");
            dragHandle.className = "grid-drag-handle";
            dragHandle.textContent = "⋮⋮";
            item.appendChild(dragHandle);
        }

        if (!item.querySelector(".grid-resize-right")) {
            const right = document.createElement("div");
            right.className = "grid-resize-handle grid-resize-right";
            right.dataset.resize = "right";
            item.appendChild(right);
        }

        if (!item.querySelector(".grid-resize-bottom")) {
            const bottom = document.createElement("div");
            bottom.className = "grid-resize-handle grid-resize-bottom";
            bottom.dataset.resize = "bottom";
            item.appendChild(bottom);
        }

        if (!item.querySelector(".grid-resize-corner")) {
            const corner = document.createElement("div");
            corner.className = "grid-resize-handle grid-resize-corner";
            corner.dataset.resize = "corner";
            item.appendChild(corner);
        }

        // Add table column resize handles
        const table = item.querySelector("table");
        if (table) {
            const headers = table.querySelectorAll("th, td");
            headers.forEach(cell => {
                if (!cell.querySelector(".table-col-resize")) {
                    const colHandle = document.createElement("div");
                    colHandle.className = "table-col-resize";
                    cell.appendChild(colHandle);
                }
            });
        }
    });
}

/* ============================================================
   HOVER + CLICK HANDLERS
============================================================ */
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
    if (!e.target.closest("[data-editable-block]")) removeBlockHighlight();
    if (!e.target.closest("[data-editable]")) removeElementHighlight();
});

document.addEventListener("click", (e) => {
    const el = e.target.closest("[data-editable]");
    if (!el) return;

    e.preventDefault();
    e.stopPropagation();

    const selector = getUniqueSelector(el);
    const type = el.getAttribute("data-edit-type") || "text";

    const payload = {
        type: "open-editor",
        targetSelector: selector,
        editType: type
    };

    if (type === "text" || type === "list") {
        payload.content = el.innerHTML;
    } else if (type === "image") {
        payload.imageUrl = el.src;
    } else if (type === "link") {
        payload.label = el.textContent;
        payload.url = el.href;
    }

    window.parent.postMessage(payload, "*");
});

/* ============================================================
   INIT
============================================================ */
document.addEventListener("DOMContentLoaded", () => {
    autoWrapTablesIntoGrid();
    enhanceGridItems();
    enableGridDragging();
    enableGridResizing();
    enableTableColumnResizing();
});
