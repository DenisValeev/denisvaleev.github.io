(function () {
  const tbody = document.querySelector('tbody');
  const countTarget = document.querySelector('[data-count]');
  const totalTarget = document.querySelector('[data-total]');
  const filterForm = document.querySelector('[data-filter-form]');
  const filterInput = document.querySelector('[data-filter-input]');
  const categorySelect = document.querySelector('[data-category-select]');

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
          id: entry && typeof entry.id === 'string' ? entry.id.trim() : '',
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
        .filter((entry) => entry.id && entry.label && entry.quotes.length > 0)
    : [];

  if (categorySelect) {
    const optionFragment = document.createDocumentFragment();
    const allOption = document.createElement('option');
    allOption.value = 'all';
    allOption.textContent = 'All categories';
    optionFragment.appendChild(allOption);

    categories.forEach((category) => {
      const option = document.createElement('option');
      option.value = category.id;
      option.textContent = category.label;
      optionFragment.appendChild(option);
    });

    categorySelect.appendChild(optionFragment);
    categorySelect.value = 'all';
    categorySelect.disabled = categories.length === 0;
  }

  const rows = categories.reduce((list, category) => {
    const items = category.quotes.map((quote) => ({
      categoryId: category.id,
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
        categoryId: entry.categoryId,
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

  function renderRows(list, emptyMessage) {
    tbody.textContent = '';

    if (!list.length) {
      const emptyRow = document.createElement('tr');
      const emptyCell = document.createElement('td');
      emptyCell.textContent = emptyMessage || 'No quotes available.';
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

  let activeCategory = 'all';

  function applyFilter() {
    const term = filterInput ? filterInput.value : '';
    const trimmed = typeof term === 'string' ? term.trim() : '';
    const normalized = trimmed.toLowerCase();
    const keywords = normalized ? normalized.split(/\s+/).filter(Boolean) : [];

    const filtered = deck.filter((entry) => {
      if (activeCategory !== 'all' && entry.categoryId !== activeCategory) {
        return false;
      }

      if (!keywords.length) {
        return true;
      }

      return keywords.every((keyword) => entry.searchText.includes(keyword));
    });

    let emptyMessage = 'No quotes available.';

    if (activeCategory !== 'all' && keywords.length) {
      emptyMessage = `No quotes in this category match “${trimmed}”.`;
    } else if (activeCategory !== 'all') {
      emptyMessage = 'No quotes available in this category yet.';
    } else if (keywords.length) {
      emptyMessage = `No quotes match “${trimmed}”.`;
    }

    updateCount(filtered.length);
    renderRows(filtered, emptyMessage);
  }

  applyFilter();

  if (filterInput) {
    filterInput.addEventListener('input', () => {
      applyFilter();
    });
  }

  if (categorySelect) {
    categorySelect.addEventListener('change', (event) => {
      activeCategory = event.target.value;
      applyFilter();
    });
  }
})();
