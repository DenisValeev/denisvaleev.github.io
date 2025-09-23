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

  const allowedCategories = new Map([
    ['gen-alpha', 'Gen Alpha'],
    ['gen-z', 'Gen Z'],
  ]);

  if (filterForm) {
    filterForm.addEventListener('submit', (event) => {
      event.preventDefault();
    });
  }

  const rawEntries = Array.isArray(window.slangEntries)
    ? window.slangEntries
        .map((entry) => {
          if (!entry) {
            return null;
          }

          const term = typeof entry.term === 'string' ? entry.term.trim() : '';
          const definition = typeof entry.definition === 'string' ? entry.definition.trim() : '';
          const example = typeof entry.example === 'string' ? entry.example.trim() : '';
          const hint = typeof entry.hint === 'string' ? entry.hint.trim() : '';
          const rawCategoryId = typeof entry.categoryId === 'string' ? entry.categoryId.trim() : '';
          const normalizedCategoryId = rawCategoryId.toLowerCase();
          const normalizedCategory = allowedCategories.get(normalizedCategoryId);

          if (!term || !normalizedCategoryId || !normalizedCategory) {
            return null;
          }

          const normalizedDefinition = definition || 'Meaning coming soon.';
          const searchText = [term, normalizedDefinition, example, hint, normalizedCategory]
            .filter(Boolean)
            .join(' ')
            .toLowerCase();

          return {
            term,
            definition: normalizedDefinition,
            example,
            hint,
            category: normalizedCategory,
            categoryId: normalizedCategoryId,
            searchText,
          };
        })
        .filter(Boolean)
    : [];

  function shuffle(array) {
    const copy = array.slice();
    for (let i = copy.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  const deck = shuffle(rawEntries);
  const totalCount = deck.length;

  if (totalTarget) {
    totalTarget.textContent = totalCount.toLocaleString();
  }

  if (categorySelect) {
    const optionFragment = document.createDocumentFragment();
    const allOption = document.createElement('option');
    allOption.value = 'all';
    allOption.textContent = 'All categories';
    optionFragment.appendChild(allOption);

    const categories = Array.from(
      deck.reduce((map, entry) => {
        if (!map.has(entry.categoryId)) {
          map.set(entry.categoryId, entry.category);
        }
        return map;
      }, new Map())
    ).sort((a, b) => a[1].localeCompare(b[1]));

    categories.forEach(([value, label]) => {
      const option = document.createElement('option');
      option.value = value;
      option.textContent = label;
      optionFragment.appendChild(option);
    });

    categorySelect.appendChild(optionFragment);
    categorySelect.value = 'all';
    categorySelect.disabled = categories.length === 0;
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
      emptyCell.textContent = emptyMessage || 'No slang available.';
      emptyRow.appendChild(emptyCell);
      tbody.appendChild(emptyRow);
      return;
    }

    const fragment = document.createDocumentFragment();

    list.forEach((entry) => {
      const termRow = document.createElement('tr');

      const termCell = document.createElement('th');
      termCell.scope = 'row';
      termCell.className = 'term-cell';
      termCell.textContent = entry.term;

      const badge = document.createElement('span');
      badge.className = 'category-badge';
      badge.textContent = entry.category;
      termCell.appendChild(badge);
      termRow.appendChild(termCell);

      const definitionRow = document.createElement('tr');
      definitionRow.className = 'definition-row';

      const definitionCell = document.createElement('td');
      definitionCell.className = 'definition-cell';
      definitionCell.textContent = entry.definition;
      definitionRow.appendChild(definitionCell);

      fragment.appendChild(termRow);
      fragment.appendChild(definitionRow);

      if (entry.example) {
        const exampleRow = document.createElement('tr');
        exampleRow.className = 'example-row';

        const exampleCell = document.createElement('td');
        exampleCell.className = 'example-cell';

        const quote = document.createElement('blockquote');
        quote.textContent = entry.example;
        exampleCell.appendChild(quote);

        exampleRow.appendChild(exampleCell);
        fragment.appendChild(exampleRow);
      }

      if (entry.hint) {
        const hintRow = document.createElement('tr');
        hintRow.className = 'hint-row';

        const hintCell = document.createElement('td');
        hintCell.className = 'hint-cell';

        const label = document.createElement('span');
        label.className = 'hint-label';
        label.textContent = 'Usage hint';
        hintCell.appendChild(label);

        const hintText = document.createElement('span');
        hintText.className = 'hint-text';
        hintText.textContent = entry.hint;
        hintCell.appendChild(hintText);

        hintRow.appendChild(hintCell);
        fragment.appendChild(hintRow);
      }
    });

    tbody.appendChild(fragment);
  }

  let activeCategory = 'all';

  function applyFilters() {
    const searchTerm = filterInput ? filterInput.value : '';
    const trimmed = typeof searchTerm === 'string' ? searchTerm.trim() : '';
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

    let emptyMessage = 'No slang available.';

    if (activeCategory !== 'all' && keywords.length) {
      emptyMessage = `No slang in this category matches “${trimmed}”.`;
    } else if (activeCategory !== 'all') {
      emptyMessage = 'No slang available in this category yet.';
    } else if (keywords.length) {
      emptyMessage = `No slang matches “${trimmed}”.`;
    }

    updateCount(filtered.length);
    renderRows(filtered, emptyMessage);
  }

  applyFilters();

  if (filterInput) {
    filterInput.addEventListener('input', () => {
      applyFilters();
    });
  }

  if (categorySelect) {
    categorySelect.addEventListener('change', (event) => {
      activeCategory = event.target.value;
      applyFilters();
    });
  }
})();
