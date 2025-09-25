(function () {
  const notesInput = document.querySelector('[data-notes-input]');
  const currentEntryEl = document.querySelector('[data-current-text]');
  const previewEntryEl = document.querySelector('[data-preview-text]');
  const previewCard = document.querySelector('[data-preview-card]');
  const counterEl = document.querySelector('[data-counter]');
  const prevButton = document.querySelector('[data-prev]');
  const nextButton = document.querySelector('[data-next]');
  const shuffleButton = document.querySelector('[data-shuffle]');
  const saveButton = document.querySelector('[data-save]');
  const clearButton = document.querySelector('[data-clear]');
  const statusEl = document.querySelector('[data-status]');

  if (
    !notesInput ||
    !currentEntryEl ||
    !previewEntryEl ||
    !previewCard ||
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
  const STATE_KEY = 'total-recall-state';
  const DEFAULT_NOTES = [
    "Why don't scientists trust atoms? Because they make up everything.",
    "I told my computer I needed a break, and it said 'No problem — I'll go to sleep.'",
    'Why did the scarecrow get a promotion? He was outstanding in his field.'
  ].join('\n\n');
  const PREVIEW_PLACEHOLDER = 'Add another note to preview the upcoming card.';

  let entries = [];
  let deckOrder = [];
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

  function safeSetItem(key, value) {
    try {
      localStorage.setItem(key, value);
    } catch (error) {
      console.error('Failed to write to localStorage', error); // eslint-disable-line no-console
    }
  }

  function safeRemoveItem(key) {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error('Failed to remove item from localStorage', error); // eslint-disable-line no-console
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

  function createSequentialDeck() {
    return entries.map((_, entryIndex) => entryIndex);
  }

  function clampIndex(value, length) {
    if (length <= 0) {
      return 0;
    }

    const number = Number(value);
    if (!Number.isFinite(number)) {
      return 0;
    }

    const integer = Math.trunc(number);
    if (integer < 0) {
      return 0;
    }

    if (integer >= length) {
      return length - 1;
    }

    return integer;
  }

  function sanitizeStoredDeck(order) {
    if (!Array.isArray(order) || order.length !== entries.length) {
      return null;
    }

    const seen = new Set();
    const sanitized = [];

    for (let i = 0; i < order.length; i += 1) {
      const value = Number(order[i]);
      if (!Number.isInteger(value) || value < 0 || value >= entries.length || seen.has(value)) {
        return null;
      }
      seen.add(value);
      sanitized.push(value);
    }

    return sanitized;
  }

  function loadState() {
    const raw = safeGetItem(STATE_KEY);
    if (typeof raw !== 'string' || raw.length === 0) {
      return null;
    }

    try {
      return JSON.parse(raw);
    } catch (error) {
      console.error('Failed to parse saved deck state', error); // eslint-disable-line no-console
      return null;
    }
  }

  function saveState() {
    if (!entries.length || deckOrder.length !== entries.length) {
      safeRemoveItem(STATE_KEY);
      return;
    }

    const payload = JSON.stringify({ deck: deckOrder, index });
    safeSetItem(STATE_KEY, payload);
  }

  function ensureDeck() {
    if (!entries.length) {
      deckOrder = [];
      index = 0;
      return;
    }

    const expectedLength = entries.length;
    if (deckOrder.length !== expectedLength) {
      deckOrder = createSequentialDeck();
      index = 0;
      saveState();
      return;
    }

    if (index < 0 || index >= deckOrder.length) {
      index = clampIndex(index, deckOrder.length);
      saveState();
    }
  }

  function renderEmptyState() {
    counterEl.textContent = '0 of 0';
    currentEntryEl.textContent = 'No notes yet. Add entries below to start reviewing.';
    currentEntryEl.classList.add('is-empty');
    previewEntryEl.textContent = PREVIEW_PLACEHOLDER;
    previewEntryEl.classList.add('is-empty');
    previewCard.setAttribute('aria-hidden', 'true');
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

    if (!deckOrder.length) {
      renderEmptyState();
      return;
    }

    const currentEntryIndex = deckOrder[index];
    const current = entries[currentEntryIndex];

    currentEntryEl.textContent = current;
    currentEntryEl.classList.remove('is-empty');
    counterEl.textContent = `${index + 1} of ${deckOrder.length}`;
    const disableNav = deckOrder.length <= 1;
    prevButton.disabled = disableNav;
    nextButton.disabled = disableNav;
    shuffleButton.disabled = deckOrder.length <= 1;

    if (deckOrder.length > 1) {
      const previewEntryIndex = deckOrder[(index + 1) % deckOrder.length];
      const preview = entries[previewEntryIndex];
      previewEntryEl.textContent = preview;
      previewEntryEl.classList.remove('is-empty');
      previewCard.removeAttribute('aria-hidden');
    } else {
      previewEntryEl.textContent = PREVIEW_PLACEHOLDER;
      previewEntryEl.classList.add('is-empty');
      previewCard.setAttribute('aria-hidden', 'true');
    }
  }

  function showNext() {
    if (!entries.length) {
      return;
    }
    ensureDeck();
    if (!deckOrder.length) {
      return;
    }
    index = (index + 1) % deckOrder.length;
    saveState();
    render();
  }

  function showPrev() {
    if (!entries.length) {
      return;
    }
    ensureDeck();
    if (!deckOrder.length) {
      return;
    }
    index = (index - 1 + deckOrder.length) % deckOrder.length;
    saveState();
    render();
  }

  function reshuffleDeck() {
    if (entries.length <= 1) {
      return;
    }
    deckOrder = shuffle(createSequentialDeck());
    index = 0;
    saveState();
    render();
    setStatus('Deck reshuffled.');
  }

  function updateEntriesFrom(raw, storedState = null) {
    entries = parseNotes(raw);

    if (!entries.length) {
      deckOrder = [];
      index = 0;
      render();
      safeRemoveItem(STATE_KEY);
      return;
    }

    let nextDeck = createSequentialDeck();
    let nextIndex = 0;

    if (storedState && typeof storedState === 'object') {
      const sanitizedDeck = sanitizeStoredDeck(storedState.deck);
      if (sanitizedDeck) {
        nextDeck = sanitizedDeck;
        nextIndex = clampIndex(storedState.index, nextDeck.length);
      }
    }

    deckOrder = nextDeck;
    index = nextIndex;
    render();
    saveState();
  }

  function handleSave() {
    const raw = notesInput.value;
    safeSetItem(STORAGE_KEY, raw);
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
    safeSetItem(STORAGE_KEY, '');
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
  const storedDeckState = loadState();
  updateEntriesFrom(initialNotes, storedDeckState);
})();
