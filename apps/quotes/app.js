(function () {
  const textEl = document.getElementById('quote-text');
  const prevButton = document.getElementById('prev-button');
  const nextButton = document.getElementById('next-button');
  const selectEl = document.getElementById('category-select');

  if (!textEl || !prevButton || !nextButton || !selectEl) {
    return;
  }

  const categories = Array.isArray(window.quotesData)
    ? window.quotesData
        .map((entry) => ({
          id: entry && typeof entry.id === 'string' ? entry.id : '',
          label: entry && typeof entry.label === 'string' ? entry.label : '',
          quotes: Array.isArray(entry && entry.quotes)
            ? entry.quotes
                .map((quote) => (typeof quote === 'string' ? quote.trim() : ''))
                .filter((quote) => quote.length > 0)
            : [],
        }))
        .filter((entry) => entry.id && entry.label && entry.quotes.length > 0)
    : [];

  const optionFragment = document.createDocumentFragment();
  const allOption = document.createElement('option');
  allOption.value = 'any';
  allOption.textContent = 'All quotes';
  optionFragment.appendChild(allOption);

  categories.forEach((category) => {
    const option = document.createElement('option');
    option.value = category.id;
    option.textContent = category.label;
    optionFragment.appendChild(option);
  });

  selectEl.appendChild(optionFragment);
  selectEl.value = 'any';
  if (!categories.length) {
    selectEl.disabled = true;
  }

  let deck = [];
  let index = 0;
  let activeCategory = 'any';

  function shuffle(array) {
    const copy = array.slice();
    for (let i = copy.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  function getQuotes(categoryId) {
    if (categoryId === 'any') {
      return categories.reduce((all, category) => all.concat(category.quotes), []);
    }

    const match = categories.find((category) => category.id === categoryId);
    return match ? match.quotes : [];
  }

  function resetDeck() {
    const quotes = getQuotes(activeCategory);
    deck = shuffle(quotes);
    index = 0;
  }

  function ensureDeck() {
    if (!deck.length) {
      resetDeck();
    }
  }

  function render() {
    const available = getQuotes(activeCategory);

    if (!available.length) {
      textEl.textContent = 'No quotes available.';
      prevButton.disabled = true;
      nextButton.disabled = true;
      return;
    }

    ensureDeck();
    textEl.textContent = deck[index];

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

  selectEl.addEventListener('change', (event) => {
    activeCategory = event.target.value;
    resetDeck();
    render();
  });

  prevButton.addEventListener('click', showPrev);
  nextButton.addEventListener('click', showNext);

  document.addEventListener('keydown', (event) => {
    const targetTag = event.target && event.target.tagName;
    if (targetTag && ['INPUT', 'TEXTAREA', 'SELECT'].includes(targetTag)) {
      return;
    }

    if (event.key === 'ArrowRight') {
      showNext();
    } else if (event.key === 'ArrowLeft') {
      showPrev();
    } else if (event.key === ' ' || event.key === 'Spacebar') {
      event.preventDefault();
      showNext();
    }
  });

  render();
})();
