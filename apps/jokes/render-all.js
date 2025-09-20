(function () {
  const tbody = document.querySelector('tbody');
  const countTarget = document.querySelector('[data-count]');

  const jokes = Array.isArray(window.jokes)
    ? window.jokes.filter((entry) => entry && entry.joke)
    : [];

  if (!tbody) {
    return;
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

  const deck = shuffle(jokes);

  if (countTarget) {
    countTarget.textContent = deck.length.toLocaleString();
  }

  tbody.textContent = '';

  if (!deck.length) {
    const emptyRow = document.createElement('tr');
    const emptyCell = document.createElement('td');
    emptyCell.textContent = 'No jokes available.';
    emptyRow.appendChild(emptyCell);
    tbody.appendChild(emptyRow);
    return;
  }

  const fragment = document.createDocumentFragment();

  deck.forEach((entry) => {
    const setupRow = document.createElement('tr');

    const setupCell = document.createElement('td');
    setupCell.className = 'setup-cell';
    setupCell.textContent = entry.joke;

    setupRow.appendChild(setupCell);

    const punchlineRow = document.createElement('tr');
    punchlineRow.className = 'punchline-row';

    const punchlineCell = document.createElement('td');
    punchlineCell.className = 'punchline-cell';
    punchlineCell.textContent = formatPunchline(entry.punchline);

    punchlineRow.appendChild(punchlineCell);

    fragment.appendChild(setupRow);
    fragment.appendChild(punchlineRow);
  });

  tbody.appendChild(fragment);
})();
