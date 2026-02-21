// visual-editor.js — Valor Wave CMS Visual Editor
// Phase 13 — VE-FULL-CTX
// Features: grid editing, table editing, drag handles, resize handles,
// block selection overlays, duplication, deletion, movement, Webflow-style handles,
// table column resizing, grid snapping, placeholder logic, DOM sync, theme sync, safety guards.

(function () {
  "use strict";

  // =========================
  // Safety & environment guards
  // =========================

  if (typeof window === "undefined" || typeof document === "undefined") {
    // Hard guard for non-DOM environments
    console.warn("[VE] visual-editor.js loaded without DOM — exiting safely.");
    return;
  }

  // Avoid double-initialization
  if (window.__VALOR_WAVE_VE_INITIALIZED__) {
    console.warn("[VE] visual-editor.js already initialized — skipping re-init.");
    return;
  }
  window.__VALOR_WAVE_VE_INITIALIZED__ = true;

  // =========================
  // Constants & selectors
  // =========================

  const VE_ATTR_BLOCK_ID = "data-ve-block-id";
  const VE_ATTR_BLOCK_TYPE = "data-ve-block-type";
  const VE_ATTR_GRID = "data-ve-grid";
  const VE_ATTR_TABLE = "data-ve-table";
  const VE_ATTR_PLACEHOLDER = "data-ve-placeholder";
  const VE_ATTR_THEME = "data-ve-theme";
  const VE_ATTR_LOCKED = "data-ve-locked";

  const BLOCK_TYPE_GRID = "grid";
  const BLOCK_TYPE_TABLE = "table";
  const BLOCK_TYPE_GENERIC = "block";

  const CLASS_VE_ACTIVE = "ve-active";
  const CLASS_VE_SELECTED = "ve-selected";
  const CLASS_VE_OVERLAY = "ve-block-overlay";
  const CLASS_VE_HANDLE = "ve-handle";
  const CLASS_VE_HANDLE_MOVE = "ve-handle-move";
  const CLASS_VE_HANDLE_RESIZE = "ve-handle-resize";
  const CLASS_VE_HANDLE_DUPLICATE = "ve-handle-duplicate";
  const CLASS_VE_HANDLE_DELETE = "ve-handle-delete";
  const CLASS_VE_HANDLE_TABLE_COL = "ve-handle-table-col-resize";
  const CLASS_VE_PLACEHOLDER = "ve-placeholder";
  const CLASS_VE_DRAGGING = "ve-dragging";
  const CLASS_VE_RESIZING = "ve-resizing";
  const CLASS_VE_GRID_GHOST = "ve-grid-ghost";

  const GRID_SNAP_SIZE = 8; // px
  const MIN_BLOCK_WIDTH = 40; // px
  const MIN_BLOCK_HEIGHT = 24; // px;
  const TABLE_MIN_COL_WIDTH = 40; // px

  // =========================
  // Global editor state
  // =========================

  const VEState = {
    initialized: false,
    root: null,
    theme: "light",
    blocks: new Map(), // id -> { el, type, meta }
    selectedBlockId: null,
    overlayEl: null,
    handlesContainer: null,
    dragState: null,
    resizeState: null,
    tableResizeState: null,
    mutationObserver: null,
    lastSyncSnapshot: null,
  };

  // =========================
  // Utility helpers
  // =========================

  function safeQuery(selector, root = document) {
    if (!root) return null;
    try {
      return root.querySelector(selector);
    } catch (e) {
      console.warn("[VE] safeQuery error:", e);
      return null;
    }
  }

  function safeQueryAll(selector, root = document) {
    if (!root) return [];
    try {
      return Array.from(root.querySelectorAll(selector));
    } catch (e) {
      console.warn("[VE] safeQueryAll error:", e);
      return [];
    }
  }

  function isElement(node) {
    return node && node.nodeType === Node.ELEMENT_NODE;
  }

  function getBlockId(el) {
    if (!isElement(el)) return null;
    return el.getAttribute(VE_ATTR_BLOCK_ID);
  }

  function setBlockId(el, id) {
    if (!isElement(el)) return;
    el.setAttribute(VE_ATTR_BLOCK_ID, id);
  }

  function generateBlockId() {
    return "ve-block-" + Math.random().toString(36).slice(2, 10);
  }

  function getBlockType(el) {
    if (!isElement(el)) return null;
    return el.getAttribute(VE_ATTR_BLOCK_TYPE) || BLOCK_TYPE_GENERIC;
  }

  function setBlockType(el, type) {
    if (!isElement(el)) return;
    el.setAttribute(VE_ATTR_BLOCK_TYPE, type);
  }

  function isLocked(el) {
    if (!isElement(el)) return false;
    return el.getAttribute(VE_ATTR_LOCKED) === "true";
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function snapToGrid(value, snapSize = GRID_SNAP_SIZE) {
    return Math.round(value / snapSize) * snapSize;
  }

  function getRect(el) {
    if (!isElement(el)) return null;
    return el.getBoundingClientRect();
  }

  function getRootScrollOffsets() {
    return {
      x: window.pageXOffset || document.documentElement.scrollLeft || 0,
      y: window.pageYOffset || document.documentElement.scrollTop || 0,
    };
  }

  function isPlaceholder(el) {
    if (!isElement(el)) return false;
    return el.hasAttribute(VE_ATTR_PLACEHOLDER) || el.classList.contains(CLASS_VE_PLACEHOLDER);
  }

  function ensureBlockId(el) {
    let id = getBlockId(el);
    if (!id) {
      id = generateBlockId();
      setBlockId(el, id);
    }
    return id;
  }

  function shallowCloneBlock(el) {
    if (!isElement(el)) return null;
    const clone = el.cloneNode(true);
    // Ensure new ID
    setBlockId(clone, generateBlockId());
    return clone;
  }

  function isGridBlock(el) {
    if (!isElement(el)) return false;
    return el.getAttribute(VE_ATTR_GRID) === "true" || getBlockType(el) === BLOCK_TYPE_GRID;
  }

  function isTableBlock(el) {
    if (!isElement(el)) return false;
    return el.getAttribute(VE_ATTR_TABLE) === "true" || getBlockType(el) === BLOCK_TYPE_TABLE;
  }

  function getThemeFromDOM(root) {
    const themed = root && root.querySelector("[" + VE_ATTR_THEME + "]");
    if (themed) {
      return themed.getAttribute(VE_ATTR_THEME) || "light";
    }
    const htmlTheme = document.documentElement.getAttribute("data-theme");
    if (htmlTheme) return htmlTheme;
    return "light";
  }

  function applyThemeToEditor(theme) {
    VEState.theme = theme;
    document.documentElement.setAttribute("data-ve-theme", theme);
  }

  function isInsideRoot(el) {
    if (!VEState.root || !isElement(el)) return false;
    return VEState.root.contains(el);
  }

  // =========================
  // DOM sync & snapshot
  // =========================

  function createDomSnapshot() {
    if (!VEState.root) return null;
    // Lightweight snapshot: list of block IDs and their order + basic meta
    const blocks = [];
    safeQueryAll("[" + VE_ATTR_BLOCK_ID + "]", VEState.root).forEach((el) => {
      const id = getBlockId(el);
      if (!id) return;
      blocks.push({
        id,
        type: getBlockType(el),
        placeholder: isPlaceholder(el),
      });
    });
    return {
      theme: getThemeFromDOM(VEState.root),
      blocks,
    };
  }

  function hasDomChangedSinceLastSnapshot() {
    const current = createDomSnapshot();
    if (!current || !VEState.lastSyncSnapshot) return true;
    try {
      return JSON.stringify(current) !== JSON.stringify(VEState.lastSyncSnapshot);
    } catch (e) {
      console.warn("[VE] Snapshot comparison failed:", e);
      return true;
    }
  }

  function syncDomState() {
    if (!VEState.root) return;
    // Rebuild VEState.blocks map from DOM
    VEState.blocks.clear();
    safeQueryAll("[" + VE_ATTR_BLOCK_ID + "]", VEState.root).forEach((el) => {
      const id = ensureBlockId(el);
      const type = getBlockType(el);
      VEState.blocks.set(id, {
        el,
        type,
        placeholder: isPlaceholder(el),
      });
    });

    const theme = getThemeFromDOM(VEState.root);
    applyThemeToEditor(theme);

    VEState.lastSyncSnapshot = createDomSnapshot();
  }

  // =========================
  // Overlay & handles
  // =========================

  function createOverlay() {
    const overlay = document.createElement("div");
    overlay.className = CLASS_VE_OVERLAY;
    overlay.style.position = "absolute";
    overlay.style.pointerEvents = "none";
    overlay.style.display = "none";
    overlay.style.zIndex = "9999";
    document.body.appendChild(overlay);
    VEState.overlayEl = overlay;
  }

  function createHandlesContainer() {
    const container = document.createElement("div");
    container.className = "ve-handles-container";
    container.style.position = "absolute";
    container.style.pointerEvents = "none";
    container.style.display = "none";
    container.style.zIndex = "10000";

    // Move handle (Webflow-style top-left)
    const moveHandle = document.createElement("div");
    moveHandle.className = `${CLASS_VE_HANDLE} ${CLASS_VE_HANDLE_MOVE}`;
    moveHandle.dataset.veHandleType = "move";
    container.appendChild(moveHandle);

    // Resize handle (bottom-right)
    const resizeHandle = document.createElement("div");
    resizeHandle.className = `${CLASS_VE_HANDLE} ${CLASS_VE_HANDLE_RESIZE}`;
    resizeHandle.dataset.veHandleType = "resize";
    container.appendChild(resizeHandle);

    // Duplicate handle (top-right)
    const dupHandle = document.createElement("div");
    dupHandle.className = `${CLASS_VE_HANDLE} ${CLASS_VE_HANDLE_DUPLICATE}`;
    dupHandle.dataset.veHandleType = "duplicate";
    container.appendChild(dupHandle);

    // Delete handle (top-right, offset)
    const delHandle = document.createElement("div");
    delHandle.className = `${CLASS_VE_HANDLE} ${CLASS_VE_HANDLE_DELETE}`;
    delHandle.dataset.veHandleType = "delete";
    container.appendChild(delHandle);

    document.body.appendChild(container);
    VEState.handlesContainer = container;

    // Pointer events for handles
    container.addEventListener("mousedown", onHandleMouseDown, { passive: false });
    container.addEventListener("click", onHandleClick, { passive: false });
  }

  function positionOverlayAndHandlesForBlock(blockEl) {
    if (!VEState.overlayEl || !VEState.handlesContainer || !isElement(blockEl)) return;

    const rect = getRect(blockEl);
    if (!rect) return;

    const scroll = getRootScrollOffsets();

    const left = rect.left + scroll.x;
    const top = rect.top + scroll.y;
    const width = rect.width;
    const height = rect.height;

    // Overlay
    const overlay = VEState.overlayEl;
    overlay.style.display = "block";
    overlay.style.left = left + "px";
    overlay.style.top = top + "px";
    overlay.style.width = width + "px";
    overlay.style.height = height + "px";

    // Handles container
    const handles = VEState.handlesContainer;
    handles.style.display = "block";
    handles.style.left = left + "px";
    handles.style.top = top + "px";
    handles.style.width = width + "px";
    handles.style.height = height + "px";

    // Position individual handles (relative)
    const moveHandle = handles.querySelector("." + CLASS_VE_HANDLE_MOVE);
    const resizeHandle = handles.querySelector("." + CLASS_VE_HANDLE_RESIZE);
    const dupHandle = handles.querySelector("." + CLASS_VE_HANDLE_DUPLICATE);
    const delHandle = handles.querySelector("." + CLASS_VE_HANDLE_DELETE);

    if (moveHandle) {
      moveHandle.style.position = "absolute";
      moveHandle.style.left = "0px";
      moveHandle.style.top = "-18px";
    }
    if (dupHandle) {
      dupHandle.style.position = "absolute";
      dupHandle.style.right = "24px";
      dupHandle.style.top = "-18px";
    }
    if (delHandle) {
      delHandle.style.position = "absolute";
      delHandle.style.right = "0px";
      delHandle.style.top = "-18px";
    }
    if (resizeHandle) {
      resizeHandle.style.position = "absolute";
      resizeHandle.style.right = "-6px";
      resizeHandle.style.bottom = "-6px";
    }
  }

  function hideOverlayAndHandles() {
    if (VEState.overlayEl) {
      VEState.overlayEl.style.display = "none";
    }
    if (VEState.handlesContainer) {
      VEState.handlesContainer.style.display = "none";
    }
  }

  // =========================
  // Selection logic
  // =========================

  function selectBlockByElement(el) {
    if (!isElement(el) || !isInsideRoot(el)) {
      clearSelection();
      return;
    }
    const id = ensureBlockId(el);
    selectBlockById(id);
  }

  function selectBlockById(id) {
    if (!id || !VEState.blocks.has(id)) {
      clearSelection();
      return;
    }

    // Clear previous
    if (VEState.selectedBlockId && VEState.blocks.has(VEState.selectedBlockId)) {
      const prev = VEState.blocks.get(VEState.selectedBlockId).el;
      if (prev && prev.classList) {
        prev.classList.remove(CLASS_VE_SELECTED);
      }
    }

    VEState.selectedBlockId = id;
    const block = VEState.blocks.get(id);
    if (!block || !block.el) {
      clearSelection();
      return;
    }

    block.el.classList.add(CLASS_VE_SELECTED);
    positionOverlayAndHandlesForBlock(block.el);
  }

  function clearSelection() {
    if (VEState.selectedBlockId && VEState.blocks.has(VEState.selectedBlockId)) {
      const prev = VEState.blocks.get(VEState.selectedBlockId).el;
      if (prev && prev.classList) {
        prev.classList.remove(CLASS_VE_SELECTED);
      }
    }
    VEState.selectedBlockId = null;
    hideOverlayAndHandles();
  }

  // =========================
  // Drag & move logic (blocks)
  // =========================

  function beginBlockDrag(blockEl, startEvent) {
    if (!isElement(blockEl) || isLocked(blockEl)) return;

    const rect = getRect(blockEl);
    if (!rect) return;

    const scroll = getRootScrollOffsets();

    VEState.dragState = {
      blockEl,
      startX: startEvent.clientX,
      startY: startEvent.clientY,
      originLeft: rect.left + scroll.x,
      originTop: rect.top + scroll.y,
      ghostEl: null,
    };

    blockEl.classList.add(CLASS_VE_DRAGGING);

    const ghost = blockEl.cloneNode(true);
    ghost.classList.add(CLASS_VE_GRID_GHOST);
    ghost.style.position = "absolute";
    ghost.style.pointerEvents = "none";
    ghost.style.opacity = "0.6";
    ghost.style.left = VEState.dragState.originLeft + "px";
    ghost.style.top = VEState.dragState.originTop + "px";
    ghost.style.width = rect.width + "px";
    ghost.style.height = rect.height + "px";
    document.body.appendChild(ghost);
    VEState.dragState.ghostEl = ghost;

    document.addEventListener("mousemove", onBlockDragMouseMove, { passive: false });
    document.addEventListener("mouseup", onBlockDragMouseUp, { passive: false });
  }

  function onBlockDragMouseMove(e) {
    const state = VEState.dragState;
    if (!state || !state.ghostEl) return;

    e.preventDefault();

    const dx = e.clientX - state.startX;
    const dy = e.clientY - state.startY;

    const newLeft = snapToGrid(state.originLeft + dx);
    const newTop = snapToGrid(state.originTop + dy);

    state.ghostEl.style.left = newLeft + "px";
    state.ghostEl.style.top = newTop + "px";
  }

  function onBlockDragMouseUp(e) {
    const state = VEState.dragState;
    if (!state) return;

    document.removeEventListener("mousemove", onBlockDragMouseMove);
    document.removeEventListener("mouseup", onBlockDragMouseUp);

    const { blockEl, ghostEl } = state;

    if (ghostEl) {
      const ghostRect = getRect(ghostEl);
      const scroll = getRootScrollOffsets();
      const targetLeft = ghostRect.left + scroll.x;
      const targetTop = ghostRect.top + scroll.y;

      // Apply transform via inline style (non-destructive to layout if positioned)
      const parentRect = getRect(blockEl.offsetParent || blockEl.parentElement || document.body);
      if (parentRect) {
        const relLeft = targetLeft - (parentRect.left + scroll.x);
        const relTop = targetTop - (parentRect.top + scroll.y);

        blockEl.style.position = "absolute";
        blockEl.style.left = snapToGrid(relLeft) + "px";
        blockEl.style.top = snapToGrid(relTop) + "px";
      }

      ghostEl.remove();
    }

    blockEl.classList.remove(CLASS_VE_DRAGGING);
    VEState.dragState = null;

    // Reposition overlay/handles
    positionOverlayAndHandlesForBlock(blockEl);
    VEState.lastSyncSnapshot = createDomSnapshot();
  }

  // =========================
  // Resize logic (blocks)
  // =========================

  function beginBlockResize(blockEl, startEvent) {
    if (!isElement(blockEl) || isLocked(blockEl)) return;

    const rect = getRect(blockEl);
    if (!rect) return;

    VEState.resizeState = {
      blockEl,
      startX: startEvent.clientX,
      startY: startEvent.clientY,
      originWidth: rect.width,
      originHeight: rect.height,
    };

    blockEl.classList.add(CLASS_VE_RESIZING);

    document.addEventListener("mousemove", onBlockResizeMouseMove, { passive: false });
    document.addEventListener("mouseup", onBlockResizeMouseUp, { passive: false });
  }

  function onBlockResizeMouseMove(e) {
    const state = VEState.resizeState;
    if (!state) return;

    e.preventDefault();

    const dx = e.clientX - state.startX;
    const dy = e.clientY - state.startY;

    let newWidth = snapToGrid(state.originWidth + dx);
    let newHeight = snapToGrid(state.originHeight + dy);

    newWidth = clamp(newWidth, MIN_BLOCK_WIDTH, 9999);
    newHeight = clamp(newHeight, MIN_BLOCK_HEIGHT, 9999);

    state.blockEl.style.width = newWidth + "px";
    state.blockEl.style.height = newHeight + "px";

    positionOverlayAndHandlesForBlock(state.blockEl);
  }

  function onBlockResizeMouseUp() {
    const state = VEState.resizeState;
    if (!state) return;

    document.removeEventListener("mousemove", onBlockResizeMouseMove);
    document.removeEventListener("mouseup", onBlockResizeMouseUp);

    state.blockEl.classList.remove(CLASS_VE_RESIZING);
    VEState.resizeState = null;

    VEState.lastSyncSnapshot = createDomSnapshot();
  }

  // =========================
  // Handle interactions
  // =========================

  function onHandleMouseDown(e) {
    const target = e.target;
    if (!isElement(target)) return;

    const type = target.dataset.veHandleType;
    if (!type) return;

    const selectedId = VEState.selectedBlockId;
    if (!selectedId || !VEState.blocks.has(selectedId)) return;

    const blockEl = VEState.blocks.get(selectedId).el;
    if (!blockEl || isLocked(blockEl)) return;

    if (type === "move") {
      e.preventDefault();
      beginBlockDrag(blockEl, e);
    } else if (type === "resize") {
      e.preventDefault();
      beginBlockResize(blockEl, e);
    }
  }

  function onHandleClick(e) {
    const target = e.target;
    if (!isElement(target)) return;

    const type = target.dataset.veHandleType;
    if (!type) return;

    const selectedId = VEState.selectedBlockId;
    if (!selectedId || !VEState.blocks.has(selectedId)) return;

    const blockEl = VEState.blocks.get(selectedId).el;
    if (!blockEl || isLocked(blockEl)) return;

    if (type === "duplicate") {
      e.preventDefault();
      duplicateBlock(blockEl);
    } else if (type === "delete") {
      e.preventDefault();
      deleteBlock(blockEl);
    }
  }

  // =========================
  // Block duplication & deletion
  // =========================

  function duplicateBlock(blockEl) {
    if (!isElement(blockEl) || !blockEl.parentElement) return;

    const clone = shallowCloneBlock(blockEl);
    if (!clone) return;

    blockEl.parentElement.insertBefore(clone, blockEl.nextSibling);
    syncDomState();
    selectBlockByElement(clone);
  }

  function deleteBlock(blockEl) {
    if (!isElement(blockEl) || !blockEl.parentElement) return;
    if (isPlaceholder(blockEl)) {
      console.warn("[VE] Refusing to delete placeholder block.");
      return;
    }

    const parent = blockEl.parentElement;
    blockEl.remove();

    // If parent becomes empty, consider inserting a placeholder
    if (!parent.querySelector("[" + VE_ATTR_BLOCK_ID + "]")) {
      insertPlaceholder(parent);
    }

    syncDomState();
    clearSelection();
  }

  // =========================
  // Placeholder logic
  // =========================

  function insertPlaceholder(containerEl) {
    if (!isElement(containerEl)) return;

    const placeholder = document.createElement("div");
    placeholder.className = CLASS_VE_PLACEHOLDER;
    placeholder.setAttribute(VE_ATTR_PLACEHOLDER, "true");
    placeholder.textContent = "Drop content here";
    containerEl.appendChild(placeholder);
  }

  function removePlaceholderIfNeeded(containerEl) {
    if (!isElement(containerEl)) return;
    const placeholders = safeQueryAll("[" + VE_ATTR_PLACEHOLDER + "]", containerEl);
    placeholders.forEach((ph) => {
      if (ph.parentElement && ph.parentElement.children.length > 1) {
        ph.remove();
      }
    });
  }

  // =========================
  // Grid editing helpers
  // =========================

  function ensureGridMeta(blockEl) {
    if (!isGridBlock(blockEl)) return;
    // For now, rely on CSS grid; this is a hook for future meta if needed.
  }

  function moveBlockWithinGrid(blockEl, direction) {
    if (!isGridBlock(blockEl) || !blockEl.parentElement) return;

    const parent = blockEl.parentElement;
    const children = Array.from(parent.children).filter((child) =>
      child.hasAttribute(VE_ATTR_BLOCK_ID)
    );
    const index = children.indexOf(blockEl);
    if (index === -1) return;

    let newIndex = index;
    if (direction === "up") newIndex = Math.max(0, index - 1);
    if (direction === "down") newIndex = Math.min(children.length - 1, index + 1);

    if (newIndex !== index) {
      parent.insertBefore(blockEl, newIndex > index ? children[newIndex].nextSibling : children[newIndex]);
      syncDomState();
      selectBlockByElement(blockEl);
    }
  }

  // =========================
  // Table editing helpers (col resize etc.)
  // =========================

  function createTableColumnHandles(tableEl) {
    if (!isTableBlock(tableEl)) return;

    // Remove existing handles
    safeQueryAll("." + CLASS_VE_HANDLE_TABLE_COL, tableEl).forEach((h) => h.remove());

    const headerRow = tableEl.querySelector("thead tr") || tableEl.querySelector("tr");
    if (!headerRow) return;

    const cells = Array.from(headerRow.children);
    cells.forEach((cell, index) => {
      if (!isElement(cell)) return;
      const handle = document.createElement("div");
      handle.className = CLASS_VE_HANDLE_TABLE_COL;
      handle.dataset.veColIndex = String(index);
      handle.style.position = "absolute";
      handle.style.cursor = "col-resize";
      handle.style.width = "6px";
      handle.style.top = "0";
      handle.style.bottom = "0";
      handle.style.right = "-3px";
      handle.style.zIndex = "5";
      handle.style.pointerEvents = "auto";

      // Wrap cell content in relative container if needed
      cell.style.position = cell.style.position || "relative";
      cell.appendChild(handle);
    });

    tableEl.addEventListener("mousedown", onTableHandleMouseDown, { passive: false });
  }

  function beginTableColumnResize(tableEl, colIndex, startEvent) {
    if (!isTableBlock(tableEl)) return;

    const headerRow = tableEl.querySelector("thead tr") || tableEl.querySelector("tr");
    if (!headerRow) return;

    const cells = Array.from(headerRow.children);
    const targetCell = cells[colIndex];
    if (!targetCell) return;

    const rect = getRect(targetCell);
    if (!rect) return;

    VEState.tableResizeState = {
      tableEl,
      colIndex,
      startX: startEvent.clientX,
      originWidth: rect.width,
    };

    document.addEventListener("mousemove", onTableColumnResizeMouseMove, { passive: false });
    document.addEventListener("mouseup", onTableColumnResizeMouseUp, { passive: false });
  }

  function onTableColumnResizeMouseMove(e) {
    const state = VEState.tableResizeState;
    if (!state) return;

    e.preventDefault();

    const { tableEl, colIndex, startX, originWidth } = state;
    const dx = e.clientX - startX;
    let newWidth = originWidth + dx;
    newWidth = clamp(newWidth, TABLE_MIN_COL_WIDTH, 9999);

    const headerRow = tableEl.querySelector("thead tr") || tableEl.querySelector("tr");
    if (!headerRow) return;

    const rows = [headerRow, ...Array.from(tableEl.querySelectorAll("tbody tr"))];
    rows.forEach((row) => {
      const cells = Array.from(row.children);
      const cell = cells[colIndex];
      if (cell) {
        cell.style.width = newWidth + "px";
      }
    });
  }

  function onTableColumnResizeMouseUp() {
    const state = VEState.tableResizeState;
    if (!state) return;

    document.removeEventListener("mousemove", onTableColumnResizeMouseMove);
    document.removeEventListener("mouseup", onTableColumnResizeMouseUp);

    VEState.tableResizeState = null;
    VEState.lastSyncSnapshot = createDomSnapshot();
  }

  function onTableHandleMouseDown(e) {
    const target = e.target;
    if (!isElement(target)) return;
    if (!target.classList.contains(CLASS_VE_HANDLE_TABLE_COL)) return;

    const colIndex = parseInt(target.dataset.veColIndex || "0", 10);
    const tableEl = target.closest("table");
    if (!tableEl) return;

    e.preventDefault();
    beginTableColumnResize(tableEl, colIndex, e);
  }

  // =========================
  // Global mouse handling for selection
  // =========================

  function onRootMouseDown(e) {
    const target = e.target;
    if (!isElement(target)) return;

    // If clicking inside handles container, let handle logic manage it
    if (VEState.handlesContainer && VEState.handlesContainer.contains(target)) {
      return;
    }

    // Find nearest block
    const blockEl = target.closest("[" + VE_ATTR_BLOCK_ID + "]");
    if (blockEl && isInsideRoot(blockEl)) {
      selectBlockByElement(blockEl);
    } else {
      clearSelection();
    }
  }

  // =========================
  // Mutation observer & theme sync
  // =========================

  function setupMutationObserver() {
    if (!VEState.root) return;

    if (VEState.mutationObserver) {
      VEState.mutationObserver.disconnect();
    }

    const observer = new MutationObserver((mutations) => {
      let shouldResync = false;
      let themeChanged = false;

      mutations.forEach((m) => {
        if (m.type === "attributes") {
          if (m.attributeName === VE_ATTR_THEME || m.attributeName === "data-theme") {
            themeChanged = true;
          }
          if (m.target.hasAttribute(VE_ATTR_BLOCK_ID)) {
            shouldResync = true;
          }
        } else if (m.type === "childList") {
          shouldResync = true;
        }
      });

      if (themeChanged) {
        const theme = getThemeFromDOM(VEState.root);
        applyThemeToEditor(theme);
      }

      if (shouldResync && hasDomChangedSinceLastSnapshot()) {
        syncDomState();
        if (VEState.selectedBlockId && VEState.blocks.has(VEState.selectedBlockId)) {
          const blockEl = VEState.blocks.get(VEState.selectedBlockId).el;
          positionOverlayAndHandlesForBlock(blockEl);
        } else {
          hideOverlayAndHandles();
        }
      }
    });

    observer.observe(VEState.root, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: [VE_ATTR_BLOCK_ID, VE_ATTR_BLOCK_TYPE, VE_ATTR_THEME, "data-theme"],
    });

    VEState.mutationObserver = observer;
  }

  // =========================
  // Initialization
  // =========================

  function initVisualEditor(rootSelector) {
    if (VEState.initialized) {
      console.warn("[VE] Visual editor already initialized.");
      return;
    }

    const root = safeQuery(rootSelector || "[data-ve-root]");
    if (!root) {
      console.warn("[VE] No visual editor root found.");
      return;
    }

    VEState.root = root;
    VEState.initialized = true;

    syncDomState();
    createOverlay();
    createHandlesContainer();
    setupMutationObserver();

    // Attach root listeners
    root.addEventListener("mousedown", onRootMouseDown, { passive: false });

    // Initialize table column handles for existing tables
    safeQueryAll("[" + VE_ATTR_TABLE + "=true]", root).forEach((tableEl) => {
      createTableColumnHandles(tableEl);
    });

    // Theme sync
    const theme = getThemeFromDOM(root);
    applyThemeToEditor(theme);

    console.log("[VE] Visual editor initialized.");
  }

  // Expose init on window (safe)
  window.ValorWaveVisualEditor = {
    init: initVisualEditor,
    selectBlockById,
    clearSelection,
    syncDomState,
  };

// ===== End of Chunk 5A/5B =====
  // =========================
  // Keyboard shortcuts (movement, duplication, deletion)
  // =========================

  function onKeyDown(e) {
    if (!VEState.selectedBlockId || !VEState.blocks.has(VEState.selectedBlockId)) return;

    const blockEl = VEState.blocks.get(VEState.selectedBlockId).el;
    if (!blockEl || isLocked(blockEl)) return;

    const isGrid = isGridBlock(blockEl);

    // Basic movement in grid (up/down reorders siblings)
    if (isGrid && (e.key === "ArrowUp" || e.key === "ArrowDown")) {
      e.preventDefault();
      moveBlockWithinGrid(blockEl, e.key === "ArrowUp" ? "up" : "down");
      return;
    }

    // Nudge absolute-positioned blocks
    if (!isGrid && (e.key === "ArrowUp" || e.key === "ArrowDown" || e.key === "ArrowLeft" || e.key === "ArrowRight")) {
      e.preventDefault();
      nudgeBlock(blockEl, e.key, e.shiftKey ? GRID_SNAP_SIZE * 2 : GRID_SNAP_SIZE);
      return;
    }

    // Duplicate (Cmd/Ctrl + D)
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "d") {
      e.preventDefault();
      duplicateBlock(blockEl);
      return;
    }

    // Delete (Delete / Backspace)
    if (e.key === "Delete" || e.key === "Backspace") {
      e.preventDefault();
      deleteBlock(blockEl);
      return;
    }
  }

  function nudgeBlock(blockEl, key, amount) {
    const parent = blockEl.offsetParent || blockEl.parentElement || document.body;
    const parentRect = getRect(parent);
    const blockRect = getRect(blockEl);
    if (!parentRect || !blockRect) return;

    const currentLeft = parseFloat(blockEl.style.left || "0");
    const currentTop = parseFloat(blockEl.style.top || "0");

    let newLeft = currentLeft;
    let newTop = currentTop;

    if (key === "ArrowLeft") newLeft -= amount;
    if (key === "ArrowRight") newLeft += amount;
    if (key === "ArrowUp") newTop -= amount;
    if (key === "ArrowDown") newTop += amount;

    const maxLeft = parentRect.width - blockRect.width;
    const maxTop = parentRect.height - blockRect.height;

    newLeft = clamp(newLeft, 0, maxLeft);
    newTop = clamp(newTop, 0, maxTop);

    blockEl.style.position = "absolute";
    blockEl.style.left = snapToGrid(newLeft) + "px";
    blockEl.style.top = snapToGrid(newTop) + "px";

    positionOverlayAndHandlesForBlock(blockEl);
    VEState.lastSyncSnapshot = createDomSnapshot();
  }

  // =========================
  // Public API for external integrations
  // =========================

  function registerBlock(el, options) {
    if (!isElement(el)) return;
    const id = ensureBlockId(el);
    const type = options && options.type ? options.type : getBlockType(el);
    setBlockType(el, type);

    if (options && options.isGrid) {
      el.setAttribute(VE_ATTR_GRID, "true");
    }
    if (options && options.isTable) {
      el.setAttribute(VE_ATTR_TABLE, "true");
      createTableColumnHandles(el);
    }

    VEState.blocks.set(id, {
      el,
      type,
      placeholder: isPlaceholder(el),
    });

    removePlaceholderIfNeeded(el.parentElement || el);
    VEState.lastSyncSnapshot = createDomSnapshot();
  }

  function unregisterBlock(elOrId) {
    let id = null;
    if (typeof elOrId === "string") {
      id = elOrId;
    } else if (isElement(elOrId)) {
      id = getBlockId(elOrId);
    }
    if (!id) return;

    if (VEState.blocks.has(id)) {
      const block = VEState.blocks.get(id);
      if (block.el && block.el.parentElement) {
        block.el.remove();
      }
      VEState.blocks.delete(id);
    }

    if (VEState.selectedBlockId === id) {
      clearSelection();
    }

    VEState.lastSyncSnapshot = createDomSnapshot();
  }

  function setTheme(theme) {
    if (!theme) return;
    applyThemeToEditor(theme);
    if (VEState.root) {
      VEState.root.setAttribute(VE_ATTR_THEME, theme);
    }
    VEState.lastSyncSnapshot = createDomSnapshot();
  }

  function getTheme() {
    return VEState.theme;
  }

  function getSelectedBlock() {
    if (!VEState.selectedBlockId || !VEState.blocks.has(VEState.selectedBlockId)) return null;
    const block = VEState.blocks.get(VEState.selectedBlockId);
    return {
      id: VEState.selectedBlockId,
      type: block.type,
      placeholder: block.placeholder,
      el: block.el,
    };
  }

  function getBlocksSnapshot() {
    return createDomSnapshot();
  }

  // =========================
  // Safety guards & cleanup
  // =========================

  function destroyVisualEditor() {
    if (!VEState.initialized) return;

    if (VEState.mutationObserver) {
      VEState.mutationObserver.disconnect();
      VEState.mutationObserver = null;
    }

    if (VEState.root) {
      VEState.root.removeEventListener("mousedown", onRootMouseDown);
    }

    document.removeEventListener("keydown", onKeyDown);

    if (VEState.overlayEl) {
      VEState.overlayEl.remove();
      VEState.overlayEl = null;
    }

    if (VEState.handlesContainer) {
      VEState.handlesContainer.removeEventListener("mousedown", onHandleMouseDown);
      VEState.handlesContainer.removeEventListener("click", onHandleClick);
      VEState.handlesContainer.remove();
      VEState.handlesContainer = null;
    }

    VEState.blocks.clear();
    VEState.selectedBlockId = null;
    VEState.dragState = null;
    VEState.resizeState = null;
    VEState.tableResizeState = null;
    VEState.lastSyncSnapshot = null;
    VEState.initialized = false;

    window.__VALOR_WAVE_VE_INITIALIZED__ = false;

    console.log("[VE] Visual editor destroyed.");
  }

  // Attach global keydown once
  document.addEventListener("keydown", onKeyDown, { passive: false });

  // Extend public API
  window.ValorWaveVisualEditor = Object.assign(window.ValorWaveVisualEditor || {}, {
    registerBlock,
    unregisterBlock,
    setTheme,
    getTheme,
    getSelectedBlock,
    getBlocksSnapshot,
    destroy: destroyVisualEditor,
  });

  // =========================
  // Auto-init (optional, guarded)
  // =========================

  function autoInitIfConfigured() {
    const autoRoot = safeQuery("[data-ve-root][data-ve-auto-init='true']");
    if (!autoRoot) return;
    initVisualEditor("[data-ve-root][data-ve-auto-init='true']");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", autoInitIfConfigured);
  } else {
    autoInitIfConfigured();
  }

})();
