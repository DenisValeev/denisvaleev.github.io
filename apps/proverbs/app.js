(function () {
  const textEl = document.getElementById('proverb-text');
  const prevButton = document.getElementById('prev-button');
  const nextButton = document.getElementById('next-button');

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
      prevButton.disabled = true;
      nextButton.disabled = true;
      return;
    }

    ensureDeck();
    const item = shuffled[index];
    textEl.textContent = item.text;

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

  prevButton.addEventListener('click', showPrev);
  nextButton.addEventListener('click', showNext);

  document.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowRight') {
      showNext();
    } else if (event.key === 'ArrowLeft') {
      showPrev();
    }
  });

  render();
})();
