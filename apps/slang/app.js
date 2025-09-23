(function () {
  const termEl = document.getElementById('slang-term');
  const categoryEl = document.getElementById('slang-category');
  const meaningEl = document.getElementById('slang-meaning');
  const prevButton = document.getElementById('prev-button');
  const nextButton = document.getElementById('next-button');
  const revealButton = document.getElementById('reveal-button');
  const categorySelect = document.getElementById('category-select');
  const exampleWrapper = document.getElementById('slang-example-wrapper');
  const exampleText = document.getElementById('slang-example');
  const hintWrapper = document.getElementById('slang-hint-wrapper');
  const hintText = document.getElementById('slang-hint');

  if (
    !termEl ||
    !categoryEl ||
    !meaningEl ||
    !prevButton ||
    !nextButton ||
    !revealButton ||
    !categorySelect
  ) {
    return;
  }

  const entries = Array.isArray(window.slangEntries)
    ? window.slangEntries
        .map((entry) => {
          if (!entry) {
            return null;
          }

          const id = typeof entry.id === 'string' ? entry.id.trim() : '';
          const term = typeof entry.term === 'string' ? entry.term.trim() : '';
          const definition = typeof entry.definition === 'string' ? entry.definition.trim() : '';
          const example = typeof entry.example === 'string' ? entry.example.trim() : '';
          const hint = typeof entry.hint === 'string' ? entry.hint.trim() : '';
          const category = typeof entry.category === 'string' ? entry.category.trim() : '';
          const categoryId = typeof entry.categoryId === 'string' ? entry.categoryId.trim() : '';

          if (!id || !term || !category || !categoryId) {
            return null;
          }

          return { id, term, definition, example, hint, category, categoryId };
        })
        .filter(Boolean)
    : [];

  const categoryMap = new Map();
  entries.forEach((entry) => {
    if (!categoryMap.has(entry.categoryId)) {
      categoryMap.set(entry.categoryId, entry.category);
    }
  });

  const optionFragment = document.createDocumentFragment();
  const allOption = document.createElement('option');
  allOption.value = 'all';
  allOption.textContent = 'All categories';
  optionFragment.appendChild(allOption);

  Array.from(categoryMap.entries())
    .sort((a, b) => a[1].localeCompare(b[1]))
    .forEach(([value, label]) => {
      const option = document.createElement('option');
      option.value = value;
      option.textContent = label;
      optionFragment.appendChild(option);
    });

  categorySelect.appendChild(optionFragment);
  categorySelect.value = 'all';
  categorySelect.disabled = categoryMap.size === 0;

  let deck = [];
  let index = 0;
  let meaningVisible = false;
  let currentEntry = null;
  let activeCategory = 'all';

  function shuffle(array) {
    const copy = array.slice();
    for (let i = copy.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  function getFilteredEntries() {
    if (activeCategory === 'all') {
      return entries;
    }
    return entries.filter((entry) => entry.categoryId === activeCategory);
  }

  function resetDeck() {
    const filtered = getFilteredEntries();
    deck = filtered.length ? shuffle(filtered) : [];
    index = 0;
  }

  function ensureDeck() {
    if (!deck.length) {
      resetDeck();
    }
  }

  function toggleExampleAndHint(visible) {
    const hasExample = currentEntry && typeof currentEntry.example === 'string' && currentEntry.example.length > 0;
    const hasHint = currentEntry && typeof currentEntry.hint === 'string' && currentEntry.hint.length > 0;

    if (exampleWrapper) {
      const shouldShowExample = visible && hasExample;
      exampleWrapper.classList.toggle('is-visible', shouldShowExample);
      exampleWrapper.hidden = !shouldShowExample;
      exampleWrapper.setAttribute('aria-hidden', shouldShowExample ? 'false' : 'true');
      if (exampleText) {
        exampleText.textContent = hasExample ? currentEntry.example : '';
      }
    }

    if (hintWrapper) {
      const shouldShowHint = visible && hasHint;
      hintWrapper.classList.toggle('is-visible', shouldShowHint);
      hintWrapper.hidden = !shouldShowHint;
      hintWrapper.setAttribute('aria-hidden', shouldShowHint ? 'false' : 'true');
      if (hintText) {
        hintText.textContent = hasHint ? currentEntry.hint : '';
      }
    }
  }

  function setMeaningVisible(visible) {
    meaningVisible = visible;
    meaningEl.classList.toggle('is-visible', visible);
    meaningEl.setAttribute('aria-hidden', visible ? 'false' : 'true');
    revealButton.setAttribute('aria-pressed', visible ? 'true' : 'false');
    toggleExampleAndHint(visible);
  }

  function showEmptyState(message) {
    termEl.textContent = message;
    categoryEl.textContent = categoryMap.size ? '—' : 'No categories available';
    meaningEl.textContent = '';
    setMeaningVisible(false);
    revealButton.disabled = true;
    prevButton.disabled = true;
    nextButton.disabled = true;
    currentEntry = null;
    toggleExampleAndHint(false);
  }

  function render() {
    const filtered = getFilteredEntries();

    if (!filtered.length) {
      const emptyMessage = entries.length
        ? 'No slang available in this category yet.'
        : 'No slang available.';
      showEmptyState(emptyMessage);
      return;
    }

    ensureDeck();
    if (!deck.length) {
      showEmptyState('No slang available.');
      return;
    }

    currentEntry = deck[index];
    termEl.textContent = currentEntry.term;
    categoryEl.textContent = currentEntry.category;

    const hasDefinition = typeof currentEntry.definition === 'string' && currentEntry.definition.length > 0;
    meaningEl.textContent = hasDefinition ? currentEntry.definition : 'Meaning coming soon.';

    revealButton.disabled = false;
    setMeaningVisible(false);

    const disableNavigation = deck.length <= 1;
    prevButton.disabled = disableNavigation;
    nextButton.disabled = disableNavigation;
  }

  function showNext() {
    ensureDeck();
    if (!deck.length) {
      return;
    }
    index = (index + 1) % deck.length;
    render();
  }

  function showPrev() {
    ensureDeck();
    if (!deck.length) {
      return;
    }
    index = (index - 1 + deck.length) % deck.length;
    render();
  }

  function toggleMeaning() {
    if (!deck.length) {
      return;
    }
    setMeaningVisible(!meaningVisible);
  }

  categorySelect.addEventListener('change', (event) => {
    activeCategory = event.target.value;
    resetDeck();
    render();
  });

  prevButton.addEventListener('click', showPrev);
  nextButton.addEventListener('click', showNext);
  revealButton.addEventListener('click', toggleMeaning);

  document.addEventListener('keydown', (event) => {
    if (event.defaultPrevented) {
      return;
    }

    const active = document.activeElement;
    if (active && ['BUTTON', 'INPUT', 'SELECT', 'TEXTAREA'].includes(active.tagName)) {
      return;
    }

    if (event.key === 'ArrowRight') {
      event.preventDefault();
      showNext();
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      showPrev();
    } else if (event.key === ' ') {
      event.preventDefault();
      toggleMeaning();
    }
  });

  render();
})();
