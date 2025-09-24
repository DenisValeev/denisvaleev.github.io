(function () {
  const notesInput = document.querySelector('[data-notes-input]');
  const entryEl = document.querySelector('[data-entry-text]');
  const placeholderEl = document.querySelector('[data-placeholder]');
  const counterEl = document.querySelector('[data-counter]');
  const prevButton = document.querySelector('[data-prev]');
  const nextButton = document.querySelector('[data-next]');
  const revealButton = document.querySelector('[data-reveal]');
  const shuffleButton = document.querySelector('[data-shuffle]');
  const saveButton = document.querySelector('[data-save]');
  const resetButton = document.querySelector('[data-reset]');
  const statusEl = document.querySelector('[data-status]');

  if (
    !notesInput ||
    !entryEl ||
    !placeholderEl ||
    !counterEl ||
    !prevButton ||
    !nextButton ||
    !revealButton ||
    !shuffleButton ||
    !saveButton ||
    !resetButton ||
    !statusEl
  ) {
    return;
  }

  const STORAGE_KEY = 'total-recall-notes';
  const DEFAULT_NOTES = [
    "Why don't scientists trust atoms? Because they make up everything.",
    "I told my computer I needed a break, and it said 'No problem — I'll go to sleep.'",
    'Why did the scarecrow get a promotion? He was outstanding in his field.'
  ].join('\n\n');

  let entries = [];
  let deck = [];
  let index = 0;
  let isVisible = false;

  function setStatus(message) {
    statusEl.textContent = message;
  }

  function safeGetItem(key) {
    try {
      return localStorage.getItem(key);
    } catch (error) {
      console.error('Failed to access localStorage', error); // eslint-disable-line no-console
      return null;
    }
  }

  function parseNotes(raw) {
    if (typeof raw !== 'string') {
      return [];
    }

    return raw
      .split(/\r?\n\s*\r?\n+/)
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0);
  }

  function shuffle(list) {
    const copy = list.slice();
    for (let i = copy.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  function resetDeck() {
    if (!entries.length) {
      deck = [];
      index = 0;
      return;
    }

    deck = shuffle(entries);
    index = 0;
  }

  function ensureDeck() {
    if (!deck.length) {
      resetDeck();
    }
  }

  function setEntryVisible(visible) {
    isVisible = visible;
    entryEl.classList.toggle('is-visible', visible);
    entryEl.setAttribute('aria-hidden', visible ? 'false' : 'true');
    placeholderEl.hidden = visible;
    revealButton.setAttribute('aria-pressed', visible ? 'true' : 'false');
    revealButton.textContent = visible ? 'Hide note' : 'Reveal note';
  }

  function renderEmptyState() {
    counterEl.textContent = '0 of 0';
    isVisible = false;
    entryEl.textContent = '';
    entryEl.classList.remove('is-visible');
    entryEl.setAttribute('aria-hidden', 'true');
    placeholderEl.hidden = false;
    placeholderEl.textContent = 'No notes yet. Add entries below to start reviewing.';
    revealButton.disabled = true;
    revealButton.setAttribute('aria-pressed', 'false');
    revealButton.textContent = 'Reveal note';
    prevButton.disabled = true;
    nextButton.disabled = true;
    shuffleButton.disabled = true;
  }

  function render() {
    if (!entries.length) {
      renderEmptyState();
      return;
    }

    ensureDeck();
    const current = deck[index];

    entryEl.textContent = current;
    counterEl.textContent = `${index + 1} of ${deck.length}`;
    placeholderEl.textContent = 'Ready when you are. Press “Reveal note” or tap space to check your recall.';

    revealButton.disabled = false;
    const disableNav = deck.length <= 1;
    prevButton.disabled = disableNav;
    nextButton.disabled = disableNav;
    shuffleButton.disabled = deck.length <= 1;

    setEntryVisible(false);
  }

  function showNext() {
    if (!entries.length) {
      return;
    }
    ensureDeck();
    index = (index + 1) % deck.length;
    render();
  }

  function showPrev() {
    if (!entries.length) {
      return;
    }
    ensureDeck();
    index = (index - 1 + deck.length) % deck.length;
    render();
  }

  function toggleEntry() {
    if (!entries.length) {
      return;
    }
    setEntryVisible(!isVisible);
  }

  function reshuffleDeck() {
    if (entries.length <= 1) {
      return;
    }
    deck = shuffle(entries);
    index = 0;
    render();
    setStatus('Deck reshuffled.');
  }

  function updateEntriesFrom(raw) {
    entries = parseNotes(raw);
    resetDeck();
    render();
  }

  function handleSave() {
    const raw = notesInput.value;
    try {
      localStorage.setItem(STORAGE_KEY, raw);
    } catch (error) {
      console.error('Failed to save notes to localStorage', error); // eslint-disable-line no-console
    }
    updateEntriesFrom(raw);
    const count = entries.length;
    if (count === 0) {
      setStatus('Saved. Add notes to build your deck.');
    } else if (count === 1) {
      setStatus('Saved 1 card.');
    } else {
      setStatus(`Saved ${count} cards.`);
    }
  }

  function handleReset() {
    notesInput.value = DEFAULT_NOTES;
    handleSave();
    setStatus('Restored the default joke deck.');
  }

  prevButton.addEventListener('click', showPrev);
  nextButton.addEventListener('click', showNext);
  revealButton.addEventListener('click', toggleEntry);
  shuffleButton.addEventListener('click', reshuffleDeck);
  saveButton.addEventListener('click', handleSave);
  resetButton.addEventListener('click', handleReset);

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
    } else if (event.key === ' ' || event.key === 'Spacebar') {
      const active = document.activeElement;
      if (
        active &&
        (active.tagName === 'BUTTON' ||
          active.tagName === 'TEXTAREA' ||
          active.tagName === 'INPUT' ||
          active.tagName === 'A' ||
          active.tagName === 'SUMMARY' ||
          active.tagName === 'SELECT')
      ) {
        return;
      }
      event.preventDefault();
      toggleEntry();
    }
  });

  const storedNotes = safeGetItem(STORAGE_KEY);
  const initialNotes = storedNotes !== null ? storedNotes : DEFAULT_NOTES;
  notesInput.value = initialNotes;
  setStatus('');
  updateEntriesFrom(initialNotes);
})();
