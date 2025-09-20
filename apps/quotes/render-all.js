(function () {
  const tbody = document.querySelector('tbody');
  const countTarget = document.querySelector('[data-count]');

  if (!tbody) {
    return;
  }

  const categories = Array.isArray(window.quotesData)
    ? window.quotesData
        .map((entry) => ({
          label: entry && typeof entry.label === 'string' ? entry.label : '',
          quotes: Array.isArray(entry && entry.quotes)
            ? entry.quotes
                .map((quote) => (typeof quote === 'string' ? quote.trim() : ''))
                .filter((quote) => quote.length > 0)
            : [],
        }))
        .filter((entry) => entry.label && entry.quotes.length > 0)
    : [];

  const rows = categories.reduce((list, category) => {
    const items = category.quotes.map((quote) => ({
      category: category.label,
      quote,
    }));
    return list.concat(items);
  }, []);

  function shuffle(array) {
    const copy = array.slice();
    for (let i = copy.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  const deck = shuffle(rows);

  if (countTarget) {
    countTarget.textContent = deck.length.toLocaleString();
  }

  tbody.textContent = '';

  if (!deck.length) {
    const emptyRow = document.createElement('tr');
    const emptyCell = document.createElement('td');
    emptyCell.colSpan = 2;
    emptyCell.textContent = 'No quotes available.';
    emptyRow.appendChild(emptyCell);
    tbody.appendChild(emptyRow);
    return;
  }

  const fragment = document.createDocumentFragment();

  deck.forEach((entry) => {
    const row = document.createElement('tr');

    const categoryCell = document.createElement('td');
    categoryCell.textContent = entry.category;

    const textCell = document.createElement('td');
    textCell.className = 'text-cell';
    textCell.textContent = entry.quote;

    row.appendChild(categoryCell);
    row.appendChild(textCell);

    fragment.appendChild(row);
  });

  tbody.appendChild(fragment);
})();
