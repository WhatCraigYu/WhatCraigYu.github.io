
/*
 * Shared paper renderer for index.html and research.html.
 *
 * Paper information: papers.json
 * Page-specific settings: window.paperPageConfig
 *
 * Features:
 * - Select up to three featured papers for the homepage
 * - Display all papers on the Research page
 * - Show coauthors and version date inline with the title
 * - Keep the Job Market Paper badge homepage-specific
 * - Display abstract buttons inline with the title
 * - Show one-sentence overviews when enabled
 * - Display submission status after the overview
 * - Display presentations and additional notes
 */

(() => {
  "use strict";

  // --------------------------------------------------
  // 1. Helper functions
  // --------------------------------------------------

  function createElement(tag, className, text) {
    const element = document.createElement(tag);

    if (className) {
      element.className = className;
    }

    if (text !== undefined) {
      element.textContent = text;
    }

    return element;
  }

  function formatNames(names) {
    if (names.length === 1) {
      return names[0];
    }

    if (names.length === 2) {
      return `${names[0]} and ${names[1]}`;
    }

    return (
      `${names.slice(0, -1).join(", ")}, ` +
      `and ${names[names.length - 1]}`
    );
  }

  // --------------------------------------------------
  // 2. Abstract toggle
  // --------------------------------------------------

  function addAbstractToggle(paper) {
    const toggle = createElement(
      "span",
      "abstract-toggle",
      "Abstract"
    );

    const abstract = createElement(
      "div",
      "abstract-content",
      paper.abstract
    );

    const abstractId = `abstract-${paper.id}`;

    abstract.id = abstractId;

    toggle.setAttribute("role", "button");
    toggle.setAttribute("tabindex", "0");
    toggle.setAttribute("aria-controls", abstractId);
    toggle.setAttribute("aria-expanded", "false");

    function switchAbstract() {
      const isOpen = abstract.classList.toggle("open");

      toggle.setAttribute(
        "aria-expanded",
        String(isOpen)
      );
    }

    toggle.addEventListener(
      "click",
      switchAbstract
    );

    toggle.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        switchAbstract();
      }
    });

    return { toggle, abstract };
  }

  // --------------------------------------------------
  // 3. Additional notes
  // --------------------------------------------------

  function addNote(item, text) {
    const note = createElement("div", "paper-note");

    // Avoid duplicating "Note:" if already included.
    if (!/^Note:/i.test(text.trim())) {
      note.append(
        document.createTextNode("Note: ")
      );
    }

    // Italicise paper titles enclosed in curly quotes.
    const quotedTitlePattern = /“[^”]+”/g;

    let lastIndex = 0;

    for (const match of text.matchAll(quotedTitlePattern)) {
      note.append(
        document.createTextNode(
          text.slice(lastIndex, match.index)
        )
      );

      note.append(
        createElement("em", "", match[0])
      );

      lastIndex = match.index + match[0].length;
    }

    note.append(
      document.createTextNode(
        text.slice(lastIndex)
      )
    );

    item.append(note);
  }

  // --------------------------------------------------
  // 4. Render an individual paper
  // --------------------------------------------------

  function renderPaper(paper, settings) {
    const item = createElement("li");

    // 4.1 Paper title: linked if PDF is available.
    const hasPdf =
      typeof paper.pdf === "string" &&
      paper.pdf.trim() !== "";

    const title = createElement(
      hasPdf ? "a" : "span",
      "paper-title",
      paper.title
    );

    if (hasPdf) {
      title.href = paper.pdf.trim();
    }

    item.append(title);

    // 4.2 Coauthors: inline after the title.
    if (
      settings.showCoauthors !== false &&
      Array.isArray(paper.coauthors)
    ) {
      const names = paper.coauthors.filter(
        (name) =>
          typeof name === "string" &&
          name.trim()
      );

      if (names.length > 0) {
        item.append(
          document.createTextNode(
            `, with ${formatNames(names)}`
          )
        );
      }
    }

    // 4.3 Version date: inline, without a heading.
    if (
      settings.showVersionDate !== false &&
      typeof paper.versionDate === "string" &&
      paper.versionDate.trim()
    ) {
      item.append(
        document.createTextNode(
          `, ${paper.versionDate.trim()}`
        )
      );
    }

    // Optional inline note after paper title information
    if (
      typeof paper.titleNote === "string" &&
      paper.titleNote.trim()
    ) {
      const titleNote = createElement(
        "span",
        "title-note",
        paper.titleNote.trim()
      );

      item.append(
        document.createTextNode(" "),
        titleNote
      );
    }  

    // 4.4 Job Market Paper badge.
    // Controlled by the homepage configuration.
    if (settings.jobMarketPaper === paper.id) {
      const badge = createElement(
        "span",
        "jmp-badge",
        "Job Market Paper"
      );

      // Preserve the original homepage appearance.
      badge.style.cssText =
        "font-size: 0.82rem; " +
        "font-weight: 700; " +
        "color: #fff; " +
        "background: var(--accent); " +
        "padding: 0.1rem 0.5rem; " +
        "border-radius: 3px; " +
        "margin-left: 0.4rem;";

      item.append(
        document.createTextNode(" "),
        badge
      );
    }

    // 4.5 Abstract button: inline with title information.
    let abstractContent = null;

    if (
      settings.showAbstractToggle !== false &&
      paper.abstract
    ) {
      const elements = addAbstractToggle(paper);

      item.append(
        document.createTextNode(" "),
        elements.toggle
      );

      abstractContent = elements.abstract;
    }

    // 4.6 Expanded abstract immediately below title line.
    if (abstractContent) {
      item.append(abstractContent);
    }

    // 4.7 One-sentence overview.
    // Normally enabled only on the Research page.
    if (
      settings.showOverview === true &&
      paper.overview
    ) {
      item.append(
        createElement(
          "div",
          "paper-detail",
          paper.overview
        )
      );
    }

    // 4.8 Submission status.
    // Appears after the overview when it is displayed.
    // CSS: black, bold, italic.
    if (
      settings.showSubmissionStatus !== false &&
      paper.submission?.status?.trim()
    ) {
      const status = paper.submission.status.trim();

      const journal =
        paper.submission.journal?.trim();

      const line = journal
        ? `${status} at ${journal}`
        : status;

      item.append(
        createElement(
          "div",
          "submission-status",
          line
        )
      );
    }

    // 4.9 Conference presentations.
    if (
      settings.showPresentations !== false &&
      Array.isArray(paper.presentations)
    ) {
      const presentations =
        paper.presentations.filter(Boolean);

      if (presentations.length > 0) {
        item.append(
          createElement(
            "div",
            "presentations",
            `Presentations: ${presentations.join(", ")}`
          )
        );
      }
    }

    // 4.10 Additional notes.
    if (
      settings.showNotes !== false &&
      typeof paper.note === "string" &&
      paper.note.trim()
    ) {
      addNote(item, paper.note.trim());
    }

    return item;
  }

  // --------------------------------------------------
  // 5. Load papers.json and render the paper list
  // --------------------------------------------------

  async function loadPapers() {
    const settings = window.paperPageConfig;

    if (!settings?.containerId) {
      return;
    }

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

      // Homepage: select up to three specified papers.
      if (Array.isArray(settings.featuredPapers)) {
        const byId = new Map(
          data.papers.map(
            (paper) => [paper.id, paper]
          )
        );

        const chosenIds = [
          ...new Set(settings.featuredPapers)
        ].slice(0, 3);

        papersToShow = chosenIds
          .map((id) => {
            if (!byId.has(id)) {
              console.warn(
                `Featured paper ID not found: ${id}`
              );
            }

            return byId.get(id);
          })
          .filter(Boolean);
      }

      // Display paper entries.
      container.replaceChildren(
        ...papersToShow.map(
          (paper) => renderPaper(paper, settings)
        )
      );

    } catch (error) {
      console.error(
        "Unable to display research papers:",
        error
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

  // --------------------------------------------------
  // 6. Initialise when the page is ready
  // --------------------------------------------------

  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      loadPapers
    );
  } else {
    loadPapers();
  }

})();
