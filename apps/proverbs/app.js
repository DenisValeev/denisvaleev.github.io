(function () {
  const textEl = document.getElementById('proverb-text');
  const sourceEl = document.getElementById('proverb-source');
  const positionEl = document.getElementById('proverb-position');
  const prevButton = document.getElementById('prev-button');
  const nextButton = document.getElementById('next-button');
  const reshuffleButton = document.getElementById('reshuffle-button');

  const proverbs = Array.isArray(window.proverbsData)
    ? window.proverbsData.filter((entry) => entry && entry.text)
    : [];

  let shuffled = [];
  let index = 0;

  function shuffle(array) {
    const copy = array.slice();
    for (let i = copy.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  function ensureDeck() {
    if (shuffled.length === 0) {
      shuffled = shuffle(proverbs);
      index = 0;
    }
  }

  function render() {
    if (!proverbs.length) {
      textEl.textContent = 'No proverbs available.';
      sourceEl.textContent = '';
      positionEl.textContent = '';
      prevButton.disabled = true;
      nextButton.disabled = true;
      reshuffleButton.disabled = true;
      return;
    }

    ensureDeck();
    const item = shuffled[index];
    textEl.textContent = item.text;
    sourceEl.textContent = item.source ? `— ${item.source}` : '';
    positionEl.textContent = `${index + 1} / ${shuffled.length}`;

    prevButton.disabled = shuffled.length <= 1;
    nextButton.disabled = shuffled.length <= 1;
  }

  function showNext() {
    ensureDeck();
    index = (index + 1) % shuffled.length;
    render();
  }

  function showPrev() {
    ensureDeck();
    index = (index - 1 + shuffled.length) % shuffled.length;
    render();
  }

  function reshuffle() {
    shuffled = shuffle(proverbs);
    index = 0;
    render();
  }

  prevButton.addEventListener('click', showPrev);
  nextButton.addEventListener('click', showNext);
  reshuffleButton.addEventListener('click', reshuffle);

  document.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowRight') {
      showNext();
    } else if (event.key === 'ArrowLeft') {
      showPrev();
    } else if (event.key.toLowerCase() === 'r') {
      reshuffle();
    }
  });

  render();
})();
