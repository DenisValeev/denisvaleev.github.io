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

  const rawEntries = Array.isArray(window.genAlphaSlang)
    ? window.genAlphaSlang
        .map((entry) => {
          if (!entry) {
            return null;
          }
          const term = typeof entry.term === 'string' ? entry.term.trim() : '';
          const definition = typeof entry.definition === 'string' ? entry.definition.trim() : '';
          if (!term) {
            return null;
          }
          const searchText = `${term} ${definition}`.toLowerCase();
          return {
            term,
            definition: definition || 'Meaning coming soon.',
            searchText,
          };
        })
        .filter(Boolean)
    : [];

  const deck = rawEntries.slice().sort((a, b) => a.term.localeCompare(b.term));
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
      emptyCell.colSpan = 2;
      emptyCell.textContent = term ? `No slang matches “${term}”.` : 'No slang available.';
      emptyRow.appendChild(emptyCell);
      tbody.appendChild(emptyRow);
      return;
    }

    const fragment = document.createDocumentFragment();

    list.forEach((entry, index) => {
      const termRow = document.createElement('tr');

      const indexCell = document.createElement('th');
      indexCell.scope = 'row';
      indexCell.textContent = (index + 1).toLocaleString();
      termRow.appendChild(indexCell);

      const termCell = document.createElement('td');
      termCell.className = 'term-cell';
      termCell.textContent = entry.term;
      termRow.appendChild(termCell);

      const definitionRow = document.createElement('tr');
      definitionRow.className = 'definition-row';

      const spacerCell = document.createElement('td');
      spacerCell.textContent = '';
      spacerCell.setAttribute('aria-hidden', 'true');
      definitionRow.appendChild(spacerCell);

      const definitionCell = document.createElement('td');
      definitionCell.className = 'definition-cell';
      definitionCell.textContent = entry.definition;
      definitionRow.appendChild(definitionCell);

      fragment.appendChild(termRow);
      fragment.appendChild(definitionRow);
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
