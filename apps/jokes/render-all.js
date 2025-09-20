(function () {
  const tbody = document.querySelector('tbody');
  const countTarget = document.querySelector('[data-count]');
  const isCompact = document.body.dataset.compact === 'true';

  const jokes = Array.isArray(window.jokes)
    ? window.jokes.filter((entry) => entry && entry.joke)
    : [];

  if (countTarget) {
    countTarget.textContent = jokes.length.toLocaleString();
  }

  if (!tbody) {
    return;
  }

  if (isCompact) {
    document.body.classList.add('is-compact');
  }

  tbody.textContent = '';

  if (!jokes.length) {
    const emptyRow = document.createElement('tr');
    const emptyCell = document.createElement('td');
    emptyCell.colSpan = 3;
    emptyCell.textContent = 'No jokes available.';
    emptyRow.appendChild(emptyCell);
    tbody.appendChild(emptyRow);
    return;
  }

  const fragment = document.createDocumentFragment();
  const formatPunchline = (value) => {
    if (typeof value === 'string' && value.trim().length > 0) {
      return value;
    }
    return '💩';
  };

  jokes.forEach((entry, idx) => {
    const row = document.createElement('tr');

    const indexCell = document.createElement('th');
    indexCell.scope = 'row';
    indexCell.textContent = String(idx + 1);

    const jokeCell = document.createElement('td');
    jokeCell.textContent = entry.joke;

    const punchlineCell = document.createElement('td');
    punchlineCell.textContent = formatPunchline(entry.punchline);

    row.appendChild(indexCell);
    row.appendChild(jokeCell);
    row.appendChild(punchlineCell);

    fragment.appendChild(row);
  });

  tbody.appendChild(fragment);
})();
