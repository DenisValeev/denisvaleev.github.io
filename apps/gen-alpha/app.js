(function () {
  const termEl = document.getElementById('slang-term');
  const meaningEl = document.getElementById('slang-meaning');
  const prevButton = document.getElementById('prev-button');
  const nextButton = document.getElementById('next-button');
  const revealButton = document.getElementById('reveal-button');
  const shuffleButton = document.getElementById('shuffle-button');
  const exampleWrapper = document.getElementById('slang-example-wrapper');
  const exampleText = document.getElementById('slang-example');

  if (!termEl || !meaningEl || !prevButton || !nextButton || !revealButton || !shuffleButton) {
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
          if (!term) {
            return null;
          }
          return { id, term, definition, example };
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

      if (hasExample) {
        exampleWrapper.classList.toggle('is-visible', visible);
        exampleWrapper.hidden = !visible;
        exampleWrapper.setAttribute('aria-hidden', visible ? 'false' : 'true');
      } else {
        exampleWrapper.classList.remove('is-visible');
        exampleWrapper.hidden = true;
        exampleWrapper.setAttribute('aria-hidden', 'true');
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
      shuffleButton.disabled = true;
      currentEntry = null;

      if (exampleWrapper && exampleText) {
        exampleWrapper.classList.remove('is-visible');
        exampleWrapper.hidden = true;
        exampleWrapper.setAttribute('aria-hidden', 'true');
        exampleText.textContent = '';
      }
      return;
    }

    ensureDeck();
    const current = deck[index];
    currentEntry = current;
    const hasDefinition = typeof current.definition === 'string' && current.definition.trim().length > 0;
    const definitionText = hasDefinition ? current.definition : 'Meaning coming soon.';
    const hasExample = typeof current.example === 'string' && current.example.length > 0;

    termEl.textContent = current.term;
    meaningEl.textContent = definitionText;
    revealButton.hidden = false;

    if (exampleWrapper && exampleText) {
      if (hasExample) {
        exampleText.textContent = current.example;
      } else {
        exampleText.textContent = '';
      }
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
