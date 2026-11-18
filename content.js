(() => {
  if (window.__highlightBrainContentLoaded || !document.documentElement) {
    return;
  }
  window.__highlightBrainContentLoaded = true;

  const MAX_SELECTION_LENGTH = 2000;
  const MENU_GAP = 8;
  let selectionAtPointerDown = "";
  let pointerDownOutsideMenu = false;
  let latestSelectionData = null;
  let latestRequestId = 0;
  let latestCopyText = "";
  let activeRequestData = null;
  let activeRequestOptions = null;
  let responseSelectionText = "";
  let currentAction = "";
  let copyResetTimeout = null;
  let menuPosition = { left: 8, top: 8 };
  let showCodeBreakdown = true;

  const host = document.createElement("div");
  host.setAttribute("aria-label", "Highlight Brain actions");
  Object.assign(host.style, {
    all: "initial",
    position: "fixed",
    top: "0",
    left: "0",
    width: "0",
    height: "0",
    zIndex: "2147483647",
    pointerEvents: "none"
  });

  const shadow = host.attachShadow({ mode: "closed" });
  const style = document.createElement("style");
  style.textContent = `
    :host {
      all: initial;
      color-scheme: light dark;
      font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", Inter, "Segoe UI", system-ui, sans-serif;
      -webkit-font-smoothing: antialiased;
      color: #1d1d1f;
      --surface: rgba(255, 255, 255, 0.72);
      --text-primary: #1d1d1f;
      --text-secondary: #6e6e73;
      --separator: rgba(0, 0, 0, 0.08);
      --hover: rgba(0, 0, 0, 0.05);
      --accent: #0071e3;
      --focus: #0071e3;
      --shadow: 0 8px 30px rgba(0, 0, 0, 0.12), 0 1px 3px rgba(0, 0, 0, 0.08);
      pointer-events: none;
    }

    *, *::before, *::after {
      box-sizing: border-box;
    }

    *, button {
      font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", Inter, "Segoe UI", system-ui, sans-serif;
      -webkit-font-smoothing: antialiased;
    }

    .menu {
      position: fixed;
      width: 200px;
      max-width: calc(100vw - 16px);
      padding: 6px;
      border: 0.5px solid var(--separator);
      border-radius: 14px;
      background: var(--surface);
      color: var(--text-primary);
      -webkit-backdrop-filter: saturate(180%) blur(24px);
      backdrop-filter: saturate(180%) blur(24px);
      box-shadow: var(--shadow);
      pointer-events: auto;
      animation: appear 140ms cubic-bezier(0.2, 0.8, 0.2, 1) both;
    }

    .menu[hidden], .card[hidden] {
      display: none;
    }

    button {
      appearance: none;
      border: 0;
      background: transparent;
      color: inherit;
      font: inherit;
      cursor: pointer;
    }

    .menu-action {
      display: flex;
      width: 100%;
      height: 32px;
      align-items: center;
      gap: 10px;
      padding: 0 10px;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 500;
      letter-spacing: -0.01em;
      text-align: left;
      transition: background-color 120ms cubic-bezier(0.2, 0.8, 0.2, 1);
    }

    .menu-action:hover {
      background: var(--hover);
    }

    .menu-action:focus-visible,
    .card button:focus-visible {
      outline: 2px solid var(--focus);
      outline-offset: 2px;
    }

    .action-icon {
      display: block;
      width: 16px;
      height: 16px;
      flex: 0 0 16px;
      color: var(--text-secondary);
    }

    .action-icon path {
      fill: none;
      stroke: currentColor;
      stroke-width: 1.5;
      stroke-linecap: round;
      stroke-linejoin: round;
    }

    .action-name {
      flex: 1;
    }

    .card {
      position: fixed;
      display: flex;
      width: min(340px, calc(100vw - 16px));
      max-height: min(320px, calc(100vh - 16px));
      flex-direction: column;
      overflow: hidden;
      border: 0.5px solid var(--separator);
      border-radius: 16px;
      background: var(--surface);
      color: var(--text-primary);
      -webkit-backdrop-filter: saturate(180%) blur(24px);
      backdrop-filter: saturate(180%) blur(24px);
      box-shadow: var(--shadow);
      pointer-events: auto;
      animation: appear 160ms cubic-bezier(0.2, 0.8, 0.2, 1) both;
    }

    .card-header {
      display: flex;
      flex: 0 0 auto;
      align-items: center;
      justify-content: space-between;
      padding: 12px 12px 8px 16px;
    }

    .card-title {
      display: block;
      overflow: hidden;
      font-size: 13px;
      font-weight: 600;
      letter-spacing: -0.01em;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .close-button {
      display: grid;
      width: 22px;
      height: 22px;
      flex: 0 0 22px;
      place-items: center;
      padding: 0;
      border-radius: 50%;
      color: var(--text-secondary);
      font-size: 16px;
      line-height: 1;
    }

    .close-button:hover {
      background: var(--hover);
    }

    .card-body {
      min-height: 40px;
      overflow: auto;
      padding: 4px 16px 12px;
      scrollbar-width: thin;
      scrollbar-color: transparent transparent;
      transition: scrollbar-color 120ms cubic-bezier(0.2, 0.8, 0.2, 1);
    }

    .card-body:hover {
      scrollbar-color: rgba(110, 110, 115, 0.5) transparent;
    }

    .card-body::-webkit-scrollbar {
      width: 6px;
    }

    .card-body::-webkit-scrollbar-thumb {
      border-radius: 6px;
      background: transparent;
    }

    .card-body:hover::-webkit-scrollbar-thumb {
      background: rgba(110, 110, 115, 0.5);
    }

    .selection-pill {
      display: inline-block;
      max-width: 100%;
      overflow: hidden;
      margin: 0 0 10px;
      padding: 4px 8px;
      border-radius: 6px;
      background: var(--hover);
      color: var(--text-secondary);
      font-size: 12px;
      font-weight: 500;
      line-height: 1.4;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .selection-pill[hidden] {
      display: none;
    }

    .response-content {
      color: var(--text-primary);
      font-size: 14px;
      font-weight: 400;
      line-height: 1.5;
      overflow-wrap: anywhere;
      white-space: pre-wrap;
    }

    .card.is-error .response-content {
      color: var(--text-secondary);
    }

    .card.is-loading::before {
      position: absolute;
      z-index: 1;
      top: 0;
      left: 0;
      width: 38%;
      height: 2px;
      background: #8e8e93;
      content: "";
      animation: loading-line 180ms cubic-bezier(0.2, 0.8, 0.2, 1) infinite alternate;
    }

    .loading-skeleton {
      display: grid;
      gap: 8px;
      padding: 4px 0;
    }

    .skeleton-line {
      height: 6px;
      border-radius: 4px;
      background: var(--hover);
    }

    .skeleton-line:nth-child(1) { width: 88%; }
    .skeleton-line:nth-child(2) { width: 72%; }
    .skeleton-line:nth-child(3) { width: 54%; }

    .response-content.markdown p {
      margin: 0 0 8px;
      font: inherit;
    }

    .response-content.markdown p:last-child {
      margin-bottom: 0;
    }

    .response-content.markdown strong {
      font-weight: 500;
    }

    .response-content.markdown ul {
      margin: 0 0 8px;
      padding-left: 20px;
      font: inherit;
    }

    .response-content.markdown pre {
      overflow: auto;
      margin: 0 0 8px;
      padding: 8px;
      border-radius: 6px;
      background: var(--hover);
      font-size: 12px;
      white-space: pre;
    }

    .response-content.markdown code {
      border-radius: 4px;
      padding: 1px 4px;
      background: var(--hover);
      font: 12px/1.5 ui-monospace, SFMono-Regular, Consolas, monospace;
    }

    .response-content.markdown .formula {
      padding: 0 2px;
      font-family: "Times New Roman", "Cambria Math", serif;
      font-size: 1.08em;
      font-style: italic;
      white-space: nowrap;
    }

    .response-content.markdown pre code {
      padding: 0;
      background: transparent;
    }

    .card-footer {
      display: flex;
      flex: 0 0 auto;
      align-items: center;
      gap: 8px;
      justify-content: flex-end;
      padding: 4px 16px 12px;
    }

    .card button {
      min-height: 24px;
      padding: 2px 4px;
      border-radius: 6px;
      font-family: inherit;
      font-size: 13px;
      font-weight: 500;
      line-height: 1.4;
      transition: background-color 120ms cubic-bezier(0.2, 0.8, 0.2, 1);
    }

    .copy-button,
    .retry-button,
    .more-detail-button {
      color: var(--accent);
    }

    .card button:hover {
      background: var(--hover);
    }

    .settings-button {
      color: var(--text-secondary);
    }

    .card button[hidden], .card-footer[hidden] {
      display: none;
    }

    @media (prefers-color-scheme: dark) {
      :host {
        --surface: rgba(30, 30, 32, 0.72);
        --text-primary: #f5f5f7;
        --text-secondary: #a1a1a6;
        --separator: rgba(255, 255, 255, 0.1);
        --hover: rgba(255, 255, 255, 0.08);
        --accent: #0a84ff;
        --focus: #0a84ff;
      }
    }

    @keyframes appear {
      from { opacity: 0; transform: translateY(4px); }
      to { opacity: 1; transform: translateY(0); }
    }

    @keyframes loading-line {
      from { left: 0; }
      to { left: 62%; }
    }

    @media (prefers-reduced-motion: reduce) {
      *, *::before, *::after {
        animation: none !important;
        transition: none !important;
      }
    }
  `;

  const menu = document.createElement("div");
  menu.className = "menu";
  menu.setAttribute("role", "menu");
  menu.setAttribute("aria-label", "Text actions");
  menu.tabIndex = -1;
  menu.hidden = true;

  const card = document.createElement("section");
  card.className = "card";
  card.setAttribute("role", "dialog");
  card.setAttribute("aria-label", "Selected text response");
  card.hidden = true;

  const cardHeader = document.createElement("header");
  cardHeader.className = "card-header";
  const cardTitle = document.createElement("span");
  cardTitle.className = "card-title";
  const closeButton = document.createElement("button");
  closeButton.type = "button";
  closeButton.className = "close-button";
  closeButton.textContent = "×";
  closeButton.setAttribute("aria-label", "Close");
  cardHeader.append(cardTitle, closeButton);

  const cardBody = document.createElement("div");
  cardBody.className = "card-body";
  cardBody.setAttribute("aria-live", "polite");
  const selectionPill = document.createElement("span");
  selectionPill.className = "selection-pill";
  selectionPill.hidden = true;
  const responseContent = document.createElement("div");
  responseContent.className = "response-content";
  cardBody.append(selectionPill, responseContent);

  const cardFooter = document.createElement("footer");
  cardFooter.className = "card-footer";
  const retryButton = document.createElement("button");
  retryButton.type = "button";
  retryButton.className = "retry-button";
  retryButton.textContent = "Try again";
  retryButton.hidden = true;
  const moreDetailButton = document.createElement("button");
  moreDetailButton.type = "button";
  moreDetailButton.className = "more-detail-button";
  moreDetailButton.textContent = "More detail";
  moreDetailButton.hidden = true;
  const openSettingsButton = document.createElement("button");
  openSettingsButton.type = "button";
  openSettingsButton.className = "settings-button";
  openSettingsButton.textContent = "Settings";
  openSettingsButton.hidden = true;
  const copyButton = document.createElement("button");
  copyButton.type = "button";
  copyButton.className = "copy-button";
  copyButton.textContent = "Copy";
  cardFooter.append(moreDetailButton, retryButton, openSettingsButton, copyButton);
  card.append(cardHeader, cardBody, cardFooter);

  function createActionIcon(action) {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("class", "action-icon");
    svg.setAttribute("viewBox", "0 0 16 16");
    svg.setAttribute("aria-hidden", "true");
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    if (action === "Explain") {
      path.setAttribute("d", "M2.25 3.25h11.5v7.5h-6l-3.25 2v-2h-2.25z M5 6h6 M5 8.5h4");
    } else if (action === "Translate") {
      path.setAttribute("d", "M2.25 3.25h11.5v7.5H8l-3.5 2v-2h-2.25z M5 5.75h6 M8 5.75v3 M6.5 8.75c.6 1 1.5 1.6 2.75 2");
    } else if (action === "Code Breakdown") {
      path.setAttribute("d", "M5.5 3.5 2.5 8l3 4.5 M10.5 3.5 13.5 8l-3 4.5 M9 2.5 7 13.5");
    }
    svg.appendChild(path);
    return svg;
  }

  const menuActionDefinitions = [
    ["Explain", "Explain"],
    ["Translate", "Translate"],
    ["Code Breakdown", "Code breakdown"]
  ];
  const menuActions = [];
  function renderMenuActions() {
    menuActions.length = 0;
    menu.replaceChildren();
    for (const [action, label] of menuActionDefinitions) {
      if (action === "Code Breakdown" && !showCodeBreakdown) {
        continue;
      }
      const button = document.createElement("button");
      button.type = "button";
      button.className = "menu-action";
      button.setAttribute("role", "menuitem");
      button.setAttribute("aria-label", label);
      const actionIcon = createActionIcon(action);
      const actionName = document.createElement("span");
      actionName.className = "action-name";
      actionName.textContent = label;
      button.append(actionIcon, actionName);
      button.addEventListener("click", (event) => {
        event.stopPropagation();
        handleAction(action);
      });
      menu.appendChild(button);
      menuActions.push(button);
    }
  }
  renderMenuActions();

  let codeBreakdownSettingChanged = false;
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === "local" && changes.showCodeBreakdown) {
      codeBreakdownSettingChanged = true;
      showCodeBreakdown = changes.showCodeBreakdown.newValue !== false;
      renderMenuActions();
    }
  });
  chrome.storage.local.get({ showCodeBreakdown: true }, (settings) => {
    const runtimeError = chrome.runtime.lastError;
    if (runtimeError) {
      console.error("Highlight Brain could not load the Code breakdown setting.", runtimeError);
      return;
    }
    if (!codeBreakdownSettingChanged) {
      showCodeBreakdown = settings.showCodeBreakdown !== false;
      renderMenuActions();
    }
  });

  menu.addEventListener("keydown", (event) => {
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") {
      return;
    }
    event.preventDefault();
    const currentIndex = menuActions.indexOf(shadow.activeElement);
    const direction = event.key === "ArrowDown" ? 1 : -1;
    const nextIndex = currentIndex < 0
      ? (direction > 0 ? 0 : menuActions.length - 1)
      : (currentIndex + direction + menuActions.length) % menuActions.length;
    menuActions[nextIndex].focus();
  });

  shadow.append(style, menu, card);
  document.documentElement.appendChild(host);

  function hideMenu() {
    menu.hidden = true;
  }

  function dismissOverlays() {
    hideMenu();
    card.hidden = true;
    latestRequestId += 1;
  }

  function positionMenu(selection, fallbackRect) {
    let anchor = fallbackRect;
    if (selection && selection.rangeCount) {
      const range = selection.getRangeAt(selection.rangeCount - 1);
      const rects = range.getClientRects();
      anchor = rects.length ? rects[rects.length - 1] : range.getBoundingClientRect();
    }
    if (!anchor || (!anchor.width && !anchor.height)) {
      hideMenu();
      return;
    }

    menu.hidden = false;
    const viewportWidth = document.documentElement.clientWidth;
    const viewportHeight = document.documentElement.clientHeight;
    const menuBounds = menu.getBoundingClientRect();
    const menuWidth = menuBounds.width;
    const menuHeight = menuBounds.height;
    let left = anchor.right - menuWidth;
    let top = anchor.bottom + MENU_GAP;

    // Range rectangles are viewport-relative, so fixed positioning avoids scroll-offset errors.
    left = Math.max(8, Math.min(left, Math.max(8, viewportWidth - menuWidth - 8)));
    if (top + menuHeight > viewportHeight - 8) {
      top = anchor.top - menuHeight - MENU_GAP;
    }
    top = Math.max(8, Math.min(top, Math.max(8, viewportHeight - menuHeight - 8)));

    menu.style.left = `${left}px`;
    menu.style.top = `${top}px`;
    menuPosition = { left, top: top + menuHeight + MENU_GAP };
  }

  function centeredExcerpt(text, start, end, limit) {
    if (text.length <= limit) {
      return text.trim();
    }
    const midpoint = Math.max(0, Math.min(text.length, (start + end) / 2));
    const excerptStart = Math.max(0, Math.min(text.length - limit, Math.floor(midpoint - limit / 2)));
    return text.slice(excerptStart, excerptStart + limit).trim();
  }

  function getBlockElement(node) {
    while (node && node.nodeType !== Node.ELEMENT_NODE) {
      node = node.parentNode;
    }
    return node && node.closest("p, li, pre, div, h1, h2, h3");
  }

  function getPrecedingHeading(element) {
    if (!element) {
      return "";
    }
    const containingHeading = element.closest("h1, h2, h3");
    if (containingHeading) {
      return containingHeading.textContent.trim().slice(0, 240);
    }
    let precedingHeading = null;
    for (const heading of document.querySelectorAll("h1, h2, h3")) {
      if (heading === element ||
        (heading.compareDocumentPosition(element) & Node.DOCUMENT_POSITION_FOLLOWING)) {
        precedingHeading = heading;
      }
    }
    return precedingHeading ? precedingHeading.textContent.trim().slice(0, 240) : "";
  }

  function getRangeOffset(container, node, offset) {
    try {
      const prefix = document.createRange();
      prefix.selectNodeContents(container);
      prefix.setEnd(node, offset);
      return prefix.toString().length;
    } catch (error) {
      return 0;
    }
  }

  function getRangeContext(range, selectedText) {
    const block = getBlockElement(range.commonAncestorContainer);
    const element = range.startContainer.nodeType === Node.ELEMENT_NODE
      ? range.startContainer
      : range.startContainer.parentElement;
    if (!block) {
      return {
        context: selectedText.slice(0, 1200),
        precedingHeading: getPrecedingHeading(element)
      };
    }
    const text = block.textContent || "";
    const start = getRangeOffset(block, range.startContainer, range.startOffset);
    const end = start + range.toString().length;
    return {
      context: centeredExcerpt(text, start, end, 1200),
      precedingHeading: getPrecedingHeading(element || block)
    };
  }

  function getTextControl(event) {
    const target = event && event.target instanceof Element ? event.target : null;
    const activeElement = document.activeElement;
    const candidate = target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement
      ? target
      : activeElement instanceof HTMLInputElement || activeElement instanceof HTMLTextAreaElement
        ? activeElement
        : null;
    if (!candidate) {
      return null;
    }
    try {
      if (candidate.selectionStart === null || candidate.selectionEnd === null) {
        return null;
      }
      return candidate;
    } catch (error) {
      return null;
    }
  }

  function getTextControlSelection(control) {
    if (!control) {
      return null;
    }
    const start = control.selectionStart;
    const end = control.selectionEnd;
    const selectedText = control.value.slice(start, end).trim();
    if (!selectedText) {
      return null;
    }
    const context = centeredExcerpt(control.value, start, end, 1200);
    return {
      selectedText,
      context,
      precedingHeading: getPrecedingHeading(control),
      range: null,
      anchorRect: control.getBoundingClientRect()
    };
  }

  function getCurrentSelection(event) {
    const control = getTextControl(event);
    if (control) {
      return getTextControlSelection(control);
    }
    const selection = window.getSelection();
    const selectedText = selection ? selection.toString().trim() : "";
    if (!selection || !selectedText || !selection.rangeCount) {
      return null;
    }
    const range = selection.getRangeAt(selection.rangeCount - 1);
    const context = getRangeContext(range, selectedText);
    return {
      selectedText,
      context: context.context,
      precedingHeading: context.precedingHeading,
      range: selection,
      anchorRect: null
    };
  }

  function positionCard() {
    const viewportWidth = document.documentElement.clientWidth;
    const viewportHeight = document.documentElement.clientHeight;
    card.hidden = false;
    const bounds = card.getBoundingClientRect();
    const left = Math.max(8, Math.min(menuPosition.left, viewportWidth - bounds.width - 8));
    let top = menuPosition.top;
    if (top + bounds.height > viewportHeight - 8) {
      top = menuPosition.top - bounds.height - MENU_GAP * 2;
    }
    top = Math.max(8, Math.min(top, viewportHeight - bounds.height - 8));
    card.style.left = `${left}px`;
    card.style.top = `${top}px`;
  }

  function appendInlineMarkdown(parent, text) {
    const tokenPattern = /\*\*([^*]+)\*\*|`([^`]+)`|\$([^$]+)\$/g;
    let cursor = 0;
    let match;
    while ((match = tokenPattern.exec(text)) !== null) {
      if (match.index > cursor) {
        parent.appendChild(document.createTextNode(text.slice(cursor, match.index)));
      }
      if (match[3]) {
        const element = document.createElement("span");
        element.className = "formula";
        appendFormulaText(element, match[3]);
        parent.appendChild(element);
        cursor = tokenPattern.lastIndex;
        continue;
      }
      const element = document.createElement(match[1] ? "strong" : "code");
      element.textContent = match[1] || match[2];
      parent.appendChild(element);
      cursor = tokenPattern.lastIndex;
    }
    if (cursor < text.length) {
      parent.appendChild(document.createTextNode(text.slice(cursor)));
    }
  }

  function appendFormulaText(parent, text) {
    const tokenPattern = /\^\{([^{}]+)\}|\^([0-9A-Za-z+\-=]+)/g;
    let cursor = 0;
    let match;
    while ((match = tokenPattern.exec(text)) !== null) {
      if (match.index > cursor) {
        parent.appendChild(document.createTextNode(text.slice(cursor, match.index)));
      }
      const superscript = document.createElement("sup");
      superscript.textContent = match[1] || match[2];
      parent.appendChild(superscript);
      cursor = tokenPattern.lastIndex;
    }
    if (cursor < text.length) {
      parent.appendChild(document.createTextNode(text.slice(cursor)));
    }
  }

  function renderSafeMarkdown(text) {
    responseContent.replaceChildren();
    responseContent.classList.add("markdown");
    let bulletList = null;
    let codeLines = null;

    function flushBullets() {
      bulletList = null;
    }

    function flushCode() {
      const pre = document.createElement("pre");
      const code = document.createElement("code");
      code.textContent = codeLines.join("\n");
      pre.appendChild(code);
      responseContent.appendChild(pre);
      codeLines = null;
    }

    for (const line of text.split(/\r?\n/)) {
      if (/^\s*```/.test(line)) {
        if (codeLines === null) {
          flushBullets();
          codeLines = [];
        } else {
          flushCode();
        }
        continue;
      }
      if (codeLines !== null) {
        codeLines.push(line);
        continue;
      }
      const bullet = /^\s*[-*]\s+(.+)$/.exec(line);
      if (bullet) {
        if (!bulletList) {
          bulletList = document.createElement("ul");
          responseContent.appendChild(bulletList);
        }
        const item = document.createElement("li");
        appendInlineMarkdown(item, bullet[1]);
        bulletList.appendChild(item);
        continue;
      }
      flushBullets();
      if (!line.trim()) {
        continue;
      }
      const paragraph = document.createElement("p");
      appendInlineMarkdown(paragraph, line);
      responseContent.appendChild(paragraph);
    }

    if (codeLines !== null) {
      flushCode();
    }
  }

  function showCard(action, text, options) {
    const displayAction = action === "More detail"
      ? "Explain"
      : action === "Code Breakdown" ? "Code breakdown" : action;
    cardTitle.textContent = displayAction;
    latestCopyText = text;
    copyButton.textContent = "Copy";
    const selectedText = responseSelectionText.replace(/\s+/g, " ").trim();
    selectionPill.textContent = selectedText.length > 72 ? `${selectedText.slice(0, 69)}...` : selectedText;
    selectionPill.hidden = !selectedText;
    openSettingsButton.hidden = !(options && options.showSettings);
    retryButton.hidden = !(options && options.error && options.retryable !== false);
    moreDetailButton.hidden = !(displayAction === "Explain" && options && options.markdown);
    copyButton.hidden = Boolean(options && (options.loading || options.error));
    cardFooter.hidden = Boolean(options && options.loading);
    card.classList.toggle("is-loading", Boolean(options && options.loading));
    card.classList.toggle("is-error", Boolean(options && options.error));
    if (options && options.loading) {
      responseContent.replaceChildren();
      responseContent.classList.remove("markdown");
      const skeleton = document.createElement("div");
      skeleton.className = "loading-skeleton";
      skeleton.setAttribute("aria-label", "Loading response");
      for (let index = 0; index < 3; index += 1) {
        const line = document.createElement("span");
        line.className = "skeleton-line";
        skeleton.appendChild(line);
      }
      responseContent.appendChild(skeleton);
    } else if (options && options.markdown) {
      renderSafeMarkdown(text);
    } else {
      responseContent.classList.remove("markdown");
      responseContent.textContent = text;
    }
    positionCard();
  }

  function getExtensionRuntime() {
    try {
      return chrome.runtime && chrome.runtime.id ? chrome.runtime : null;
    } catch (error) {
      return null;
    }
  }

  function isInvalidatedContext(error) {
    return !getExtensionRuntime() || (error && /extension context invalidated/i.test(error.message));
  }

  function sendActionMessage(message) {
    return new Promise((resolve, reject) => {
      const runtime = getExtensionRuntime();
      if (!runtime) {
        reject(new Error("Extension context invalidated"));
        return;
      }
      try {
        runtime.sendMessage(message, (response) => {
          try {
            const runtimeError = runtime.lastError;
            if (runtimeError) {
              reject(new Error(runtimeError.message));
            } else {
              resolve(response);
            }
          } catch (error) {
            reject(error);
          }
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  function showConnectionError(action, error) {
    if (isInvalidatedContext(error)) {
      showCard(action, "Highlight Brain was updated. Refresh this page to continue.", {
        error: true,
        retryable: false
      });
    } else {
      showCard(action, "Couldn't reach Highlight Brain. Reload the extension and try again.", {
        error: true,
        showSettings: true
      });
    }
  }

  async function handleAction(action, requestData, requestOptions) {
    const selectedData = requestData || latestSelectionData;
    if (!selectedData) {
      return;
    }
    activeRequestData = selectedData;
    activeRequestOptions = requestOptions || {};
    responseSelectionText = selectedData.selectedText;
    currentAction = action;
    const requestId = ++latestRequestId;
    hideMenu();
    showCard(action, "", { loading: true });
    try {
      const response = await sendActionMessage({
        action,
        ...selectedData,
        ...activeRequestOptions
      });
      if (requestId !== latestRequestId) {
        return;
      }
      if (!response || !response.ok) {
        showCard(
          action,
          response && response.error ? response.error : "Couldn't get a response. Please try again.",
          { error: true, showSettings: true }
        );
        return;
      }
      showCard(action, response.text, { markdown: true });
    } catch (error) {
      if (requestId === latestRequestId) {
        showConnectionError(action, error);
      }
    }
  }

  function getCurrentSelectionText(event) {
    const control = getTextControl(event);
    if (control) {
      return control.value.slice(control.selectionStart, control.selectionEnd).trim();
    }
    const selection = window.getSelection();
    return selection ? selection.toString().trim() : "";
  }

  function updateFromSelection(event) {
    const selected = getCurrentSelection(event);
    if (!selected || !selected.selectedText || selected.selectedText.length > MAX_SELECTION_LENGTH) {
      hideMenu();
      return;
    }
    latestSelectionData = {
      selectedText: selected.selectedText,
      context: selected.context,
      precedingHeading: selected.precedingHeading,
      pageTitle: document.title,
      hostname: location.hostname
    };
    positionMenu(selected.range, selected.anchorRect);
  }

  function isMenuEvent(event) {
    return event.composedPath().includes(host);
  }

  document.addEventListener("mouseup", (event) => {
    if (isMenuEvent(event)) {
      return;
    }
    if (pointerDownOutsideMenu) {
      pointerDownOutsideMenu = false;
      const selectedText = getCurrentSelectionText(event);
      if (!selectedText || selectedText === selectionAtPointerDown) {
        hideMenu();
        return;
      }
    }
    updateFromSelection(event);
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && (!menu.hidden || !card.hidden)) {
      event.preventDefault();
      dismissOverlays();
    }
  });
  document.addEventListener("keyup", (event) => {
    if (event.key === "Escape") {
      return;
    }
    updateFromSelection(event);
  });
  document.addEventListener("mousedown", (event) => {
    if (!isMenuEvent(event)) {
      selectionAtPointerDown = getCurrentSelectionText(event);
      pointerDownOutsideMenu = true;
      dismissOverlays();
    }
  });
  document.addEventListener("click", (event) => {
    if (isMenuEvent(event)) {
      event.stopPropagation();
    }
  });
  closeButton.addEventListener("click", () => {
    latestRequestId += 1;
    card.hidden = true;
  });
  retryButton.addEventListener("click", () => {
    handleAction(currentAction, activeRequestData, activeRequestOptions);
  });
  moreDetailButton.addEventListener("click", () => {
    handleAction("More detail", activeRequestData, { previousAnswer: latestCopyText });
  });
  copyButton.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(latestCopyText);
      copyButton.textContent = "Copied ✓";
      window.clearTimeout(copyResetTimeout);
      copyResetTimeout = window.setTimeout(() => {
        copyButton.textContent = "Copy";
      }, 1500);
    } catch (error) {
      copyButton.textContent = "Copy unavailable";
    }
  });
  openSettingsButton.addEventListener("click", async () => {
    try {
      const response = await sendActionMessage({ action: "openOptionsPage" });
      if (!response || !response.ok) {
        responseContent.textContent = response && response.error
          ? response.error
          : "Couldn't open settings. Use the extension's Details page.";
        responseContent.classList.remove("markdown");
      }
    } catch (error) {
      responseContent.textContent = isInvalidatedContext(error)
        ? "Highlight Brain was updated. Refresh this page to continue."
        : "Couldn't open settings. Use the extension's Details page.";
      responseContent.classList.remove("markdown");
    }
  });
  document.addEventListener("selectionchange", () => {
    if (!getCurrentSelectionText()) {
      hideMenu();
    }
  });
  window.addEventListener("resize", dismissOverlays);
  window.addEventListener("scroll", (event) => {
    if (!isMenuEvent(event)) {
      dismissOverlays();
    }
  }, true);
})();
