(function () {
  const tbody = document.querySelector('tbody');
  const countTarget = document.querySelector('[data-count]');

  const proverbs = Array.isArray(window.proverbsData)
    ? window.proverbsData.filter((entry) => entry && entry.text)
    : [];

  if (!tbody) {
    return;
  }

  function shuffle(array) {
    const copy = array.slice();
    for (let i = copy.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  const deck = shuffle(proverbs);

  if (countTarget) {
    countTarget.textContent = deck.length.toLocaleString();
  }

  tbody.textContent = '';

  if (!deck.length) {
    const emptyRow = document.createElement('tr');
    const emptyCell = document.createElement('td');
    emptyCell.colSpan = 2;
    emptyCell.textContent = 'No proverbs available.';
    emptyRow.appendChild(emptyCell);
    tbody.appendChild(emptyRow);
    return;
  }

  const fragment = document.createDocumentFragment();

  deck.forEach((entry, idx) => {
    const row = document.createElement('tr');

    const indexCell = document.createElement('th');
    indexCell.scope = 'row';
    indexCell.className = 'index-cell';
    indexCell.textContent = String(idx + 1);

    const textCell = document.createElement('td');
    textCell.className = 'text-cell';
    textCell.textContent = entry.text;

    row.appendChild(indexCell);
    row.appendChild(textCell);

    fragment.appendChild(row);
  });

  tbody.appendChild(fragment);
})();
