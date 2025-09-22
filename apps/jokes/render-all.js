(function () {
  const tbody = document.querySelector('tbody');
  const countTarget = document.querySelector('[data-count]');
  const totalTarget = document.querySelector('[data-total]');
  const filterForm = document.querySelector('[data-filter-form]');
  const filterInput = document.querySelector('[data-filter-input]');
  const isCompact = document.body && document.body.dataset.compact === 'true';

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
          return { setup, rawPunchline };
        })
        .filter(Boolean)
    : [];

  const deck = shuffle(
    rawJokes.map((entry) => {
      const punchline = formatPunchline(entry.rawPunchline);
      const searchText = `${entry.setup} ${entry.rawPunchline}`.toLowerCase();
      return {
        setup: entry.setup,
        punchline,
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
      if (isCompact) {
        emptyCell.colSpan = 3;
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

        fragment.appendChild(row);
        return;
      }

      const setupRow = document.createElement('tr');

      const setupCell = document.createElement('td');
      setupCell.className = 'setup-cell';
      setupCell.textContent = entry.setup;

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

  function applyFilter(term) {
    const normalized = typeof term === 'string' ? term.trim().toLowerCase() : '';
    const filtered = normalized
      ? deck.filter((entry) => entry.searchText.includes(normalized))
      : deck;

    updateCount(filtered.length);
    renderRows(filtered, normalized);
  }

  applyFilter(filterInput ? filterInput.value : '');

  if (filterInput) {
    filterInput.addEventListener('input', () => {
      applyFilter(filterInput.value);
    });
  }
})();
