(function () {
  const notesInput = document.querySelector('[data-notes-input]');
  const entryEl = document.querySelector('[data-entry-text]');
  const counterEl = document.querySelector('[data-counter]');
  const prevButton = document.querySelector('[data-prev]');
  const nextButton = document.querySelector('[data-next]');
  const shuffleButton = document.querySelector('[data-shuffle]');
  const saveButton = document.querySelector('[data-save]');
  const clearButton = document.querySelector('[data-clear]');
  const statusEl = document.querySelector('[data-status]');

  if (
    !notesInput ||
    !entryEl ||
    !counterEl ||
    !prevButton ||
    !nextButton ||
    !shuffleButton ||
    !saveButton ||
    !clearButton ||
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

  function renderEmptyState() {
    counterEl.textContent = '0 of 0';
    entryEl.textContent = 'No notes yet. Add entries below to start reviewing.';
    entryEl.classList.add('is-empty');
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
    entryEl.classList.remove('is-empty');
    counterEl.textContent = `${index + 1} of ${deck.length}`;
    const disableNav = deck.length <= 1;
    prevButton.disabled = disableNav;
    nextButton.disabled = disableNav;
    shuffleButton.disabled = deck.length <= 1;
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

  function handleClear() {
    notesInput.value = '';
    try {
      localStorage.setItem(STORAGE_KEY, '');
    } catch (error) {
      console.error('Failed to clear notes in localStorage', error); // eslint-disable-line no-console
    }
    updateEntriesFrom('');
    setStatus('Cleared notes. Add new entries to continue.');
  }

  prevButton.addEventListener('click', showPrev);
  nextButton.addEventListener('click', showNext);
  shuffleButton.addEventListener('click', reshuffleDeck);
  saveButton.addEventListener('click', handleSave);
  clearButton.addEventListener('click', handleClear);

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
    }
  });

  const storedNotes = safeGetItem(STORAGE_KEY);
  const initialNotes = storedNotes !== null ? storedNotes : DEFAULT_NOTES;
  notesInput.value = initialNotes;
  setStatus('');
  updateEntriesFrom(initialNotes);
})();
