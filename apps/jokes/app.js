(function () {
  const setupEl = document.getElementById('joke-setup');
  const punchlineEl = document.getElementById('joke-punchline');
  const statusEl = document.getElementById('card-status');
  const prevButton = document.getElementById('prev-button');
  const nextButton = document.getElementById('next-button');
  const revealButton = document.getElementById('reveal-button');

  if (!setupEl || !punchlineEl || !statusEl || !prevButton || !nextButton || !revealButton) {
    return;
  }

  const jokes = Array.isArray(window.jokes)
    ? window.jokes.filter((entry) => entry && entry.joke)
    : [];

  let deck = [];
  let index = 0;
  let punchlineVisible = false;

  function shuffle(array) {
    const copy = array.slice();
    for (let i = copy.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  function ensureDeck() {
    if (deck.length === 0) {
      deck = shuffle(jokes);
      index = 0;
    }
  }

  function updateStatus() {
    if (!deck.length) {
      statusEl.textContent = 'No jokes available.';
      return;
    }

    statusEl.textContent = punchlineVisible
      ? 'Punchline revealed.'
      : 'Punchline hidden — reveal when you\'re ready.';
  }

  function setPunchlineVisible(visible) {
    punchlineVisible = visible;
    punchlineEl.classList.toggle('is-visible', visible);
    punchlineEl.setAttribute('aria-hidden', visible ? 'false' : 'true');
    revealButton.setAttribute('aria-pressed', visible ? 'true' : 'false');
    revealButton.textContent = visible ? 'Hide punchline' : 'Reveal punchline';
    updateStatus();
  }

  function render() {
    if (!jokes.length) {
      setupEl.textContent = 'No jokes available.';
      punchlineEl.textContent = '';
      punchlineEl.classList.remove('is-visible');
      punchlineEl.setAttribute('aria-hidden', 'true');
      revealButton.hidden = true;
      prevButton.disabled = true;
      nextButton.disabled = true;
      updateStatus();
      return;
    }

    ensureDeck();
    const current = deck[index];
    const hasPunchline = typeof current.punchline === 'string' && current.punchline.trim().length > 0;
    const punchlineText = hasPunchline ? current.punchline : '💩';

    setupEl.textContent = current.joke;
    punchlineEl.textContent = punchlineText;
    revealButton.hidden = false;

    setPunchlineVisible(false);

    const buttonsDisabled = deck.length <= 1;
    prevButton.disabled = buttonsDisabled;
    nextButton.disabled = buttonsDisabled;
  }

  function showNext() {
    ensureDeck();
    index = (index + 1) % deck.length;
    render();
  }

  function showPrev() {
    ensureDeck();
    index = (index - 1 + deck.length) % deck.length;
    render();
  }

  function togglePunchline() {
    if (!deck.length) {
      return;
    }
    setPunchlineVisible(!punchlineVisible);
  }

  prevButton.addEventListener('click', showPrev);
  nextButton.addEventListener('click', showNext);
  revealButton.addEventListener('click', togglePunchline);

  document.addEventListener('keydown', (event) => {
    if (event.defaultPrevented) {
      return;
    }

    if (event.key === 'ArrowRight') {
      event.preventDefault();
      showNext();
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      showPrev();
    } else if (event.key === ' ') {
      const active = document.activeElement;
      if (active && active.tagName === 'BUTTON') {
        return;
      }
      event.preventDefault();
      togglePunchline();
    }
  });

  render();
})();
