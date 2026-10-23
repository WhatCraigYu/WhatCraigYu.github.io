
/*
 * Shared paper renderer for index.html and research.html.
 * Content: papers.json
 * Page-specific choices: window.paperPageConfig in each HTML page
 */
(() => {
  "use strict";

  function createElement(tag, className, text) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
  }

  function formatNames(names) {
    if (names.length === 1) return names[0];
    if (names.length === 2) return `${names[0]} and ${names[1]}`;
    return `${names.slice(0, -1).join(", ")}, and ${names[names.length - 1]}`;
  }

  function addAbstractToggle(item, paper) {
    const toggle = createElement("span", "abstract-toggle", "Abstract");
    const abstract = createElement("div", "abstract-content", paper.abstract);
    const abstractId = `abstract-${paper.id}`;

    abstract.id = abstractId;
    toggle.setAttribute("role", "button");
    toggle.setAttribute("tabindex", "0");
    toggle.setAttribute("aria-controls", abstractId);
    toggle.setAttribute("aria-expanded", "false");

    function switchAbstract() {
      const isOpen = abstract.classList.toggle("open");
      toggle.setAttribute("aria-expanded", String(isOpen));
    }

    toggle.addEventListener("click", switchAbstract);
    toggle.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        switchAbstract();
      }
    });

    return { toggle, abstract };
  }

  function addNote(item, text) {
    const note = createElement("div", "paper-note");
    note.append(document.createTextNode(
      /^Note:/i.test(text) ? "" : "Note: "
    ));

    const quotedTitlePattern = /“[^”]+”/g;
    let lastIndex = 0;

    for (const match of text.matchAll(quotedTitlePattern)) {
      note.append(document.createTextNode(
        text.slice(lastIndex, match.index)
      ));
      note.append(createElement("em", "", match[0]));
      lastIndex = match.index + match[0].length;
    }

    note.append(document.createTextNode(
      text.slice(lastIndex)
    ));
    item.append(note);
  }

  function renderPaper(paper, settings) {
    const item = createElement("li");

    // 1. Inline title, coauthors, version date, badge and buttons.
    const title = createElement("a", "paper-title", paper.title);
    title.href = paper.pdf;
    item.append(title);

    if (
      settings.showCoauthors !== false &&
      Array.isArray(paper.coauthors)
    ) {
      const names = paper.coauthors.filter(
        (name) => typeof name === "string" && name.trim()
      );

      if (names.length > 0) {
        item.append(document.createTextNode(
          `, with ${formatNames(names)}`
        ));
      }
    }

    if (
      settings.showVersionDate !== false &&
      paper.versionDate?.trim()
    ) {
      item.append(document.createTextNode(
        `, ${paper.versionDate.trim()}`
      ));
    }

    // Job Market Paper badge: homepage-specific.
    if (settings.jobMarketPaper === paper.id) {
      const badge = createElement(
        "span", "", "Job Market Paper"
      );

      badge.style.cssText =
        "font-size: 0.82rem; font-weight: 700; color: #fff; " +
        "background: var(--accent); padding: 0.1rem 0.5rem; " +
        "border-radius: 3px; margin-left: 0.4rem;";

      item.append(document.createTextNode(" "), badge);
    }

    // Abstract button remains inline with the title.
    let abstractContent = null;

    if (
      settings.showAbstractToggle !== false &&
      paper.abstract
    ) {
      const elements = addAbstractToggle(item, paper);

      item.append(
        document.createTextNode(" "),
        elements.toggle
      );

      abstractContent = elements.abstract;
    }

    // 2. One-sentence overview (Research page).
    if (settings.showOverview && paper.overview) {
      item.append(createElement(
        "div", "paper-detail", paper.overview
      ));
    }

    // 3. Submission status, after overview if displayed.
    if (
      settings.showSubmissionStatus !== false &&
      paper.submission?.status?.trim()
    ) {
      const status = paper.submission.status.trim();
      const journal = paper.submission.journal?.trim();

      const line = journal
        ? `${status} at ${journal}`
        : status;

      item.append(createElement(
        "div", "submission-status", line
      ));
    }

    // 4. Expanded abstract content.
    if (abstractContent) {
      item.append(abstractContent);
    }

    // 5. Presentations.
    if (
      settings.showPresentations !== false &&
      Array.isArray(paper.presentations)
    ) {
      const presentations = paper.presentations.filter(Boolean);

      if (presentations.length > 0) {
        item.append(createElement(
          "div",
          "presentations",
          `Presentations: ${presentations.join(", ")}`
        ));
      }
    }

    // 6. Additional notes.
    if (settings.showNotes !== false && paper.note) {
      addNote(item, paper.note);
    }

    return item;
  }

  async function loadPapers() {
    const settings = window.paperPageConfig;
    if (!settings?.containerId) return;

    const container = document.getElementById(
      settings.containerId
    );

    if (!container) {
      console.error(
        `Paper list container not found: ${settings.containerId}`
      );
      return;
    }

    try {
      const response = await fetch(
        "papers.json",
        { cache: "no-cache" }
      );

      if (!response.ok) {
        throw new Error(
          `Could not load papers.json: HTTP ${response.status}`
        );
      }

      const data = await response.json();

      if (!Array.isArray(data.papers)) {
        throw new Error(
          "papers.json must contain a 'papers' array."
        );
      }

      let papersToShow = data.papers;

      // Homepage: display selected papers in specified order.
      if (Array.isArray(settings.featuredPapers)) {
        const byId = new Map(
          data.papers.map((paper) => [paper.id, paper])
        );

        const chosenIds = [
          ...new Set(settings.featuredPapers)
        ].slice(0, 3);

        papersToShow = chosenIds.map((id) => {
          if (!byId.has(id)) {
            console.warn(
              `Featured paper ID not found: ${id}`
            );
          }
          return byId.get(id);
        }).filter(Boolean);
      }

      container.replaceChildren(
        ...papersToShow.map(
          (paper) => renderPaper(paper, settings)
        )
      );

    } catch (error) {
      console.error(
        "Unable to display research papers:", error
      );

      container.replaceChildren(
        createElement(
          "li",
          "",
          "Research papers could not be loaded. Please refresh the page."
        )
      );
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded", loadPapers
    );
  } else {
    loadPapers();
  }
})();
