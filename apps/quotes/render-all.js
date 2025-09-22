(function () {
  const tbody = document.querySelector('tbody');
  const countTarget = document.querySelector('[data-count]');
  const totalTarget = document.querySelector('[data-total]');
  const filterForm = document.querySelector('[data-filter-form]');
  const filterInput = document.querySelector('[data-filter-input]');

  if (!tbody) {
    return;
  }

  if (filterForm) {
    filterForm.addEventListener('submit', (event) => {
      event.preventDefault();
    });
  }

  const categories = Array.isArray(window.quotesData)
    ? window.quotesData
        .map((entry) => ({
          label: entry && typeof entry.label === 'string' ? entry.label.trim() : '',
          quotes: Array.isArray(entry && entry.quotes)
            ? entry.quotes
                .map((quote) => {
                  const text = quote && typeof quote.text === 'string' ? quote.text.trim() : '';
                  const author = quote && typeof quote.author === 'string' ? quote.author.trim() : '';
                  return text && author ? { text, author } : null;
                })
                .filter(Boolean)
            : [],
        }))
        .filter((entry) => entry.label && entry.quotes.length > 0)
    : [];

  const rows = categories.reduce((list, category) => {
    const items = category.quotes.map((quote) => ({
      category: category.label,
      text: quote.text,
      author: quote.author,
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

  const deck = shuffle(
    rows.map((entry) => {
      const searchText = [entry.text, entry.author, entry.category].filter(Boolean).join(' ').toLowerCase();
      return {
        category: entry.category,
        text: entry.text,
        author: entry.author,
        searchText,
      };
    })
  );

  const totalCount = deck.length;
  if (totalTarget) {
    totalTarget.textContent = totalCount.toLocaleString();
  }

  function updateCount(value) {
    if (countTarget) {
      countTarget.textContent = value.toLocaleString();
    }
  }

  function renderRows(list, term) {
    tbody.textContent = '';

    if (!list.length) {
      const emptyRow = document.createElement('tr');
      const emptyCell = document.createElement('td');
      emptyCell.textContent = term ? `No quotes match “${term}”.` : 'No quotes available.';
      emptyRow.appendChild(emptyCell);
      tbody.appendChild(emptyRow);
      return;
    }

    const fragment = document.createDocumentFragment();

    list.forEach((entry) => {
      const quoteRow = document.createElement('tr');
      quoteRow.className = 'quote-row';

      const quoteCell = document.createElement('td');
      quoteCell.className = 'quote-cell';
      quoteCell.textContent = entry.text;
      quoteRow.appendChild(quoteCell);

      const metaRow = document.createElement('tr');
      metaRow.className = 'meta-row';

      const metaCell = document.createElement('td');
      metaCell.className = 'meta-cell';

      metaCell.appendChild(document.createTextNode('— '));

      const authorSpan = document.createElement('span');
      authorSpan.className = 'meta-author';
      authorSpan.textContent = entry.author;
      metaCell.appendChild(authorSpan);

      if (entry.category) {
        metaCell.appendChild(document.createTextNode(' · '));
        const categorySpan = document.createElement('span');
        categorySpan.className = 'meta-category';
        categorySpan.textContent = entry.category;
        metaCell.appendChild(categorySpan);
      }

      metaRow.appendChild(metaCell);

      fragment.appendChild(quoteRow);
      fragment.appendChild(metaRow);
    });

    tbody.appendChild(fragment);
  }

  function applyFilter(term) {
    const trimmed = typeof term === 'string' ? term.trim() : '';
    const normalized = trimmed.toLowerCase();
    const keywords = normalized ? normalized.split(/\s+/).filter(Boolean) : [];
    const filtered = keywords.length
      ? deck.filter((entry) => keywords.every((keyword) => entry.searchText.includes(keyword)))
      : deck;

    updateCount(filtered.length);
    renderRows(filtered, trimmed);
  }

  applyFilter(filterInput ? filterInput.value : '');

  if (filterInput) {
    filterInput.addEventListener('input', () => {
      applyFilter(filterInput.value);
    });
  }
})();
