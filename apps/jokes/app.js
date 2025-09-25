(function () {
  const setupEl = document.getElementById('joke-setup');
  const punchlineEl = document.getElementById('joke-punchline');
  const prevButton = document.getElementById('prev-button');
  const nextButton = document.getElementById('next-button');
  const revealButton = document.getElementById('reveal-button');
  const categoryList = document.getElementById('joke-categories');

  if (!setupEl || !punchlineEl || !prevButton || !nextButton || !revealButton) {
    return;
  }

  const jokes = Array.isArray(window.jokes)
    ? window.jokes.filter((entry) => entry && entry.joke)
    : [];

  let deck = [];
  let index = 0;
  let punchlineVisible = false;

  const categorize =
    window.jokeCategoryHelper && typeof window.jokeCategoryHelper.categorize === 'function'
      ? window.jokeCategoryHelper.categorize
      : null;

  const fallbackCategory =
    window.jokeCategoryHelper && typeof window.jokeCategoryHelper.fallback === 'string'
      ? window.jokeCategoryHelper.fallback
      : 'Classic Dad';

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
      deck = shuffle(jokes);
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
    if (!jokes.length) {
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
    const hasPunchline = typeof current.punchline === 'string' && current.punchline.trim().length > 0;
    const punchlineText = hasPunchline ? current.punchline : '💩';
    const categories = categorize
      ? categorize(current.joke, current.punchline)
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
    index = (index + 1) % deck.length;
    render();
  }

  function showPrev() {
    ensureDeck();
    index = (index - 1 + deck.length) % deck.length;
    render();
  }

  function togglePunchline() {
    if (!deck.length) {
      return;
    }
    setPunchlineVisible(!punchlineVisible);
  }

  prevButton.addEventListener('click', showPrev);
  nextButton.addEventListener('click', showNext);
  revealButton.addEventListener('click', togglePunchline);

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
      togglePunchline();
    }
  });

  render();
})();
