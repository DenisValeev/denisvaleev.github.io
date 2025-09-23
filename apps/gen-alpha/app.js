(function () {
  const termEl = document.getElementById('slang-term');
  const meaningEl = document.getElementById('slang-meaning');
  const prevButton = document.getElementById('prev-button');
  const nextButton = document.getElementById('next-button');
  const revealButton = document.getElementById('reveal-button');
  const exampleWrapper = document.getElementById('slang-example-wrapper');
  const exampleText = document.getElementById('slang-example');
  const hintWrapper = document.getElementById('slang-hint-wrapper');
  const hintText = document.getElementById('slang-hint');

  if (!termEl || !meaningEl || !prevButton || !nextButton || !revealButton) {
    return;
  }

  const entries = Array.isArray(window.genAlphaSlang)
    ? window.genAlphaSlang
        .map((entry) => {
          if (!entry) {
            return null;
          }
          const id = typeof entry.id === 'string' ? entry.id : null;
          const term = typeof entry.term === 'string' ? entry.term.trim() : '';
          const definition = typeof entry.definition === 'string' ? entry.definition.trim() : '';
          const example = typeof entry.example === 'string' ? entry.example.trim() : '';
          const hint = typeof entry.hint === 'string' ? entry.hint.trim() : '';
          if (!term) {
            return null;
          }
          return { id, term, definition, example, hint };
        })
        .filter(Boolean)
    : [];

  let deck = [];
  let index = 0;
  let meaningVisible = false;
  let currentEntry = null;

  function shuffle(array) {
    const copy = array.slice();
    for (let i = copy.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  function ensureDeck() {
    if (deck.length === 0) {
      deck = shuffle(entries);
      index = 0;
    }
  }

  function setMeaningVisible(visible) {
    meaningVisible = visible;
    meaningEl.classList.toggle('is-visible', visible);
    meaningEl.setAttribute('aria-hidden', visible ? 'false' : 'true');
    revealButton.setAttribute('aria-pressed', visible ? 'true' : 'false');

    if (exampleWrapper) {
      const hasExample = currentEntry && typeof currentEntry.example === 'string' && currentEntry.example.length > 0;
      const hasHint = currentEntry && typeof currentEntry.hint === 'string' && currentEntry.hint.length > 0;
      const hasUsage = hasExample || hasHint;
      const shouldShowWrapper = visible && hasUsage;

      exampleWrapper.classList.toggle('is-visible', shouldShowWrapper);
      exampleWrapper.hidden = !shouldShowWrapper;
      exampleWrapper.setAttribute('aria-hidden', shouldShowWrapper ? 'false' : 'true');

      if (hintWrapper) {
        const shouldShowHint = visible && hasHint;
        hintWrapper.hidden = !shouldShowHint;
        hintWrapper.setAttribute('aria-hidden', shouldShowHint ? 'false' : 'true');
      }
    }
  }

  function render() {
    if (!entries.length) {
      termEl.textContent = 'No slang available.';
      meaningEl.textContent = '';
      meaningEl.classList.remove('is-visible');
      meaningEl.setAttribute('aria-hidden', 'true');
      meaningVisible = false;
      revealButton.setAttribute('aria-pressed', 'false');
      revealButton.hidden = true;
      prevButton.disabled = true;
      nextButton.disabled = true;
      if (shuffleButton) {
        shuffleButton.disabled = true;
      }
      currentEntry = null;

      if (exampleWrapper && exampleText) {
        exampleWrapper.classList.remove('is-visible');
        exampleWrapper.hidden = true;
        exampleWrapper.setAttribute('aria-hidden', 'true');
        exampleText.textContent = '';
      }
      if (hintWrapper && hintText) {
        hintWrapper.hidden = true;
        hintWrapper.setAttribute('aria-hidden', 'true');
        hintText.textContent = '';
      }
      return;
    }

    ensureDeck();
    const current = deck[index];
    currentEntry = current;
    const hasDefinition = typeof current.definition === 'string' && current.definition.trim().length > 0;
    const definitionText = hasDefinition ? current.definition : 'Meaning coming soon.';
    const hasExample = typeof current.example === 'string' && current.example.length > 0;
    const hasHint = typeof current.hint === 'string' && current.hint.length > 0;

    termEl.textContent = current.term;
    meaningEl.textContent = definitionText;
    revealButton.hidden = false;
    revealButton.disabled = false;

    if (exampleWrapper && exampleText) {
      if (hasExample) {
        exampleText.textContent = current.example;
      } else {
        exampleText.textContent = '';
      }
    }

    if (hintWrapper && hintText) {
      hintText.textContent = hasHint ? current.hint : '';
    }

    setMeaningVisible(false);

    const buttonsDisabled = deck.length <= 1;
    prevButton.disabled = buttonsDisabled;
    nextButton.disabled = buttonsDisabled;
  }

  function showNext() {
    ensureDeck();
    index = (index + 1) % deck.length;
    render();
  }

  function showPrev() {
    ensureDeck();
    index = (index - 1 + deck.length) % deck.length;
    render();
  }

  function toggleMeaning() {
    if (!deck.length) {
      return;
    }
    setMeaningVisible(!meaningVisible);
  }

  prevButton.addEventListener('click', showPrev);
  nextButton.addEventListener('click', showNext);
  revealButton.addEventListener('click', toggleMeaning);

  document.addEventListener('keydown', (event) => {
    if (event.defaultPrevented) {
      return;
    }

    if (event.key === 'ArrowRight') {
      event.preventDefault();
      showNext();
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      showPrev();
    } else if (event.key === ' ') {
      const active = document.activeElement;
      if (active && active.tagName === 'BUTTON') {
        return;
      }
      event.preventDefault();
      toggleMeaning();
    }
  });

  render();
})();
