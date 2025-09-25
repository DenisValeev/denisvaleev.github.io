(function () {
  const tbody = document.querySelector('tbody');
  const countTarget = document.querySelector('[data-count]');
  const totalTarget = document.querySelector('[data-total]');
  const filterForm = document.querySelector('[data-filter-form]');
  const filterInput = document.querySelector('[data-filter-input]');
  const categorySelect = document.querySelector('[data-category-select]');
  const isCompact = document.body && document.body.dataset.compact === 'true';
  const categorize =
    window.jokeCategoryHelper && typeof window.jokeCategoryHelper.categorize === 'function'
      ? window.jokeCategoryHelper.categorize
      : null;
  const fallbackCategory =
    window.jokeCategoryHelper && typeof window.jokeCategoryHelper.fallback === 'string'
      ? window.jokeCategoryHelper.fallback
      : 'Classic Dad';

  if (!tbody) {
    return;
  }

  if (filterForm) {
    filterForm.addEventListener('submit', (event) => {
      event.preventDefault();
    });
  }

  const formatPunchline = (value) => {
    if (typeof value === 'string' && value.trim().length > 0) {
      return value;
    }
    return '💩';
  };

  function shuffle(array) {
    const copy = array.slice();
    for (let i = copy.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  const rawJokes = Array.isArray(window.jokes)
    ? window.jokes
        .map((entry) => {
          const setup = entry && typeof entry.joke === 'string' ? entry.joke.trim() : '';
          const rawPunchline = entry && typeof entry.punchline === 'string' ? entry.punchline.trim() : '';
          if (!setup) {
            return null;
          }
          const categories = categorize
            ? categorize(setup, rawPunchline)
            : [fallbackCategory];
          return { setup, rawPunchline, categories };
        })
        .filter(Boolean)
    : [];

  const deck = shuffle(
    rawJokes.map((entry) => {
      const punchline = formatPunchline(entry.rawPunchline);
      const categoryList = Array.isArray(entry.categories) && entry.categories.length
        ? entry.categories
        : [fallbackCategory];
      const searchText = `${entry.setup} ${entry.rawPunchline} ${categoryList.join(' ')}`.toLowerCase();
      return {
        setup: entry.setup,
        punchline,
        searchText,
        categories: categoryList,
      };
    })
  );

  const totalCount = deck.length;
  if (totalTarget) {
    totalTarget.textContent = totalCount.toLocaleString();
  }

  const categorySet = new Set();
  deck.forEach((entry) => {
    entry.categories.forEach((label) => {
      categorySet.add(label);
    });
  });

  const sortedCategories = Array.from(categorySet).sort((a, b) => a.localeCompare(b));

  if (categorySelect) {
    const optionFragment = document.createDocumentFragment();
    const allOption = document.createElement('option');
    allOption.value = 'any';
    allOption.textContent = 'All categories';
    optionFragment.appendChild(allOption);

    sortedCategories.forEach((label) => {
      const option = document.createElement('option');
      option.value = label;
      option.textContent = label;
      optionFragment.appendChild(option);
    });

    categorySelect.textContent = '';
    categorySelect.appendChild(optionFragment);
    categorySelect.value = 'any';
    if (sortedCategories.length) {
      categorySelect.disabled = false;
    }
  }

  let activeCategory = 'any';
  let activeTerm = filterInput ? filterInput.value : '';

  function updateCount(value) {
    if (countTarget) {
      countTarget.textContent = value.toLocaleString();
    }
  }

  function buildCategoryList(categories) {
    const list = document.createElement('ul');
    list.className = 'category-list';
    const items = Array.isArray(categories) && categories.length ? categories : [fallbackCategory];
    items.forEach((label) => {
      const pill = document.createElement('li');
      pill.className = 'category-pill';
      pill.textContent = label;
      list.appendChild(pill);
    });
    return list;
  }

  function renderRows(list, term) {
    tbody.textContent = '';

    if (!list.length) {
      const emptyRow = document.createElement('tr');
      const emptyCell = document.createElement('td');
      if (isCompact) {
        emptyCell.colSpan = 4;
      }
      emptyCell.textContent = term ? `No jokes match “${term}”.` : 'No jokes available.';
      emptyRow.appendChild(emptyCell);
      tbody.appendChild(emptyRow);
      return;
    }

    const fragment = document.createDocumentFragment();

    list.forEach((entry, index) => {
      if (isCompact) {
        const row = document.createElement('tr');

        const indexCell = document.createElement('th');
        indexCell.scope = 'row';
        indexCell.textContent = (index + 1).toLocaleString();
        row.appendChild(indexCell);

        const compactSetupCell = document.createElement('td');
        compactSetupCell.className = 'setup-cell';
        compactSetupCell.textContent = entry.setup;
        row.appendChild(compactSetupCell);

        const compactPunchlineCell = document.createElement('td');
        compactPunchlineCell.className = 'punchline-cell';
        compactPunchlineCell.textContent = entry.punchline;
        row.appendChild(compactPunchlineCell);

        const categoriesCell = document.createElement('td');
        categoriesCell.className = 'category-cell';
        categoriesCell.appendChild(buildCategoryList(entry.categories));
        row.appendChild(categoriesCell);

        fragment.appendChild(row);
        return;
      }

      const setupRow = document.createElement('tr');

      const setupCell = document.createElement('td');
      setupCell.className = 'setup-cell';
      const setupText = document.createElement('div');
      setupText.textContent = entry.setup;
      setupCell.appendChild(setupText);
      const setupCategories = buildCategoryList(entry.categories);
      setupCategories.setAttribute('aria-label', 'Joke categories');
      setupCell.appendChild(setupCategories);

      setupRow.appendChild(setupCell);

      const punchlineRow = document.createElement('tr');
      punchlineRow.className = 'punchline-row';

      const punchlineCell = document.createElement('td');
      punchlineCell.className = 'punchline-cell';
      punchlineCell.textContent = entry.punchline;

      punchlineRow.appendChild(punchlineCell);

      fragment.appendChild(setupRow);
      fragment.appendChild(punchlineRow);
    });

    tbody.appendChild(fragment);
  }

  function applyFilter() {
    const trimmed = typeof activeTerm === 'string' ? activeTerm.trim() : '';
    const normalized = trimmed.toLowerCase();
    const keywords = normalized ? normalized.split(/\s+/).filter(Boolean) : [];
    const categoryFiltered = activeCategory === 'any'
      ? deck
      : deck.filter((entry) => entry.categories.includes(activeCategory));
    const filtered = keywords.length
      ? categoryFiltered.filter((entry) => keywords.every((keyword) => entry.searchText.includes(keyword)))
      : categoryFiltered;

    updateCount(filtered.length);
    renderRows(filtered, trimmed);
  }

  applyFilter();

  if (filterInput) {
    filterInput.addEventListener('input', () => {
      activeTerm = filterInput.value;
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
