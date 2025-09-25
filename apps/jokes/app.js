(function () {
  const setupEl = document.getElementById('joke-setup');
  const punchlineEl = document.getElementById('joke-punchline');
  const prevButton = document.getElementById('prev-button');
  const nextButton = document.getElementById('next-button');
  const revealButton = document.getElementById('reveal-button');
  const categorySelect = document.getElementById('category-select');
  const categoryList = document.getElementById('joke-categories');

  if (!setupEl || !punchlineEl || !prevButton || !nextButton || !revealButton || !categorySelect) {
    return;
  }

  const jokes = Array.isArray(window.jokes)
    ? window.jokes
        .map((entry) => {
          if (!entry || typeof entry.joke !== 'string') {
            return null;
          }
          const joke = entry.joke;
          const punchline = typeof entry.punchline === 'string' ? entry.punchline : '';
          return { joke, punchline };
        })
        .filter(Boolean)
    : [];

  let deck = [];
  let index = 0;
  let punchlineVisible = false;
  let activeCategory = 'any';

  const categorize =
    window.jokeCategoryHelper && typeof window.jokeCategoryHelper.categorize === 'function'
      ? window.jokeCategoryHelper.categorize
      : null;

  const fallbackCategory =
    window.jokeCategoryHelper && typeof window.jokeCategoryHelper.fallback === 'string'
      ? window.jokeCategoryHelper.fallback
      : 'Classic Dad';

  const normalizedJokes = jokes.map((entry) => {
    const categories = categorize
      ? categorize(entry.joke, entry.punchline)
      : null;
    const list = Array.isArray(categories)
      ? categories
          .map((label) => (typeof label === 'string' ? label.trim() : ''))
          .filter((label, idx, array) => label && array.indexOf(label) === idx)
      : [];
    return {
      joke: entry.joke,
      punchline: entry.punchline,
      categories: list.length ? list : [fallbackCategory],
    };
  });

  const categorySet = new Set();
  normalizedJokes.forEach((entry) => {
    entry.categories.forEach((label) => {
      categorySet.add(label);
    });
  });

  const categoryOptions = Array.from(categorySet).sort((a, b) => a.localeCompare(b));

  const optionFragment = document.createDocumentFragment();
  const allOption = document.createElement('option');
  allOption.value = 'any';
  allOption.textContent = 'All jokes';
  optionFragment.appendChild(allOption);

  categoryOptions.forEach((label) => {
    const option = document.createElement('option');
    option.value = label;
    option.textContent = label;
    optionFragment.appendChild(option);
  });

  categorySelect.appendChild(optionFragment);
  categorySelect.value = 'any';
  if (categoryOptions.length) {
    categorySelect.disabled = false;
  }

  function getActiveCollection() {
    if (activeCategory === 'any') {
      return normalizedJokes;
    }
    return normalizedJokes.filter((entry) => entry.categories.includes(activeCategory));
  }

  function renderCategories(values) {
    if (!categoryList) {
      return;
    }

    categoryList.textContent = '';

    const items = Array.isArray(values) && values.length ? values : [fallbackCategory];

    items.forEach((label) => {
      const pill = document.createElement('li');
      pill.className = 'category-pill';
      pill.textContent = label;
      categoryList.appendChild(pill);
    });

    categoryList.hidden = false;
  }

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
      const available = getActiveCollection();
      deck = shuffle(available);
      index = 0;
    }
  }

  function setPunchlineVisible(visible) {
    punchlineVisible = visible;
    punchlineEl.classList.toggle('is-visible', visible);
    punchlineEl.setAttribute('aria-hidden', visible ? 'false' : 'true');
    revealButton.setAttribute('aria-pressed', visible ? 'true' : 'false');
  }

  function render() {
    const available = getActiveCollection();

    if (!available.length) {
      setupEl.textContent = 'No jokes available.';
      punchlineEl.textContent = '';
      punchlineEl.classList.remove('is-visible');
      punchlineEl.setAttribute('aria-hidden', 'true');
      punchlineVisible = false;
      revealButton.setAttribute('aria-pressed', 'false');
      revealButton.hidden = true;
      prevButton.disabled = true;
      nextButton.disabled = true;
      if (categoryList) {
        categoryList.textContent = '';
        categoryList.hidden = true;
      }
      return;
    }

    ensureDeck();
    const current = deck[index];
    if (!current) {
      return;
    }
    const hasPunchline = typeof current.punchline === 'string' && current.punchline.trim().length > 0;
    const punchlineText = hasPunchline ? current.punchline : '💩';
    const categories = Array.isArray(current.categories) && current.categories.length
      ? current.categories
      : [fallbackCategory];

    setupEl.textContent = current.joke;
    punchlineEl.textContent = punchlineText;
    revealButton.hidden = false;

    setPunchlineVisible(false);
    renderCategories(categories);

    const buttonsDisabled = deck.length <= 1;
    prevButton.disabled = buttonsDisabled;
    nextButton.disabled = buttonsDisabled;
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

  function togglePunchline() {
    if (!deck.length) {
      return;
    }
    setPunchlineVisible(!punchlineVisible);
  }

  function resetDeck() {
    deck = [];
    ensureDeck();
  }

  categorySelect.addEventListener('change', (event) => {
    activeCategory = event.target.value;
    resetDeck();
    render();
  });

  prevButton.addEventListener('click', showPrev);
  nextButton.addEventListener('click', showNext);
  revealButton.addEventListener('click', togglePunchline);

  document.addEventListener('keydown', (event) => {
    if (event.defaultPrevented) {
      return;
    }

    const target = event.target;
    const tagName = target && target.tagName;
    if (tagName && ['INPUT', 'TEXTAREA', 'SELECT'].includes(tagName)) {
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
      togglePunchline();
    }
  });

  render();
})();
