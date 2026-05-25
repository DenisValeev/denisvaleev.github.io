(function () {
  const notesInput = document.querySelector('[data-notes-input]');
  const currentEntryEl = document.querySelector('[data-current-text]');
  const counterEl = document.querySelector('[data-counter]');
  const prevButton = document.querySelector('[data-prev]');
  const nextButton = document.querySelector('[data-next]');
  const shuffleButton = document.querySelector('[data-shuffle]');
  const saveButton = document.querySelector('[data-save]');
  const clearButton = document.querySelector('[data-clear]');
  const statusEl = document.querySelector('[data-status]');
  const deckSelect = document.querySelector('[data-deck-select]');
  const addDeckButton = document.querySelector('[data-add-deck]');
  const deckStatsEl = document.querySelector('[data-deck-stats]');
  const deckNameInput = document.querySelector('[data-deck-name-input]');
  const renameDeckButton = document.querySelector('[data-rename-deck]');
  const deleteDeckButton = document.querySelector('[data-delete-deck]');
  const deckListEl = document.querySelector('[data-deck-list]');
  const activeDeckNameEl = document.querySelector('[data-active-deck-name]');
  const browserPanel = document.querySelector('[data-browser-panel]');
  const browserScopeSelect = document.querySelector('[data-browser-scope]');
  const browserSearchInput = document.querySelector('[data-browser-search]');
  const browserCountEl = document.querySelector('[data-browser-count]');
  const browserResultsEl = document.querySelector('[data-browser-results]');
  const browserEmptyEl = document.querySelector('[data-browser-empty]');

  if (
    !notesInput ||
    !currentEntryEl ||
    !counterEl ||
    !prevButton ||
    !nextButton ||
    !shuffleButton ||
    !saveButton ||
    !clearButton ||
    !statusEl ||
    !deckSelect ||
    !addDeckButton ||
    !deckStatsEl ||
    !deckNameInput ||
    !renameDeckButton ||
    !deleteDeckButton ||
    !deckListEl ||
    !activeDeckNameEl ||
    !browserPanel ||
    !browserScopeSelect ||
    !browserSearchInput ||
    !browserCountEl ||
    !browserResultsEl ||
    !browserEmptyEl
  ) {
    return;
  }

  const STORAGE_KEYS = {
    collection: 'total-recall-deck-collection',
    legacyNotes: 'total-recall-notes',
    legacyState: 'total-recall-state'
  };

  const sourceDefaultDeck =
    window.totalRecallDefaultDeck &&
    typeof window.totalRecallDefaultDeck === 'object' &&
    Array.isArray(window.totalRecallDefaultDeck.entries)
      ? window.totalRecallDefaultDeck
      : null;

  const FALLBACK_NOTES = [
    "Why don't scientists trust atoms? Because they make up everything.",
    "I told my computer I needed a break, and it said 'No problem — I'll go to sleep.'",
    'Why did the scarecrow get a promotion? He was outstanding in his field.'
  ].join('\n\n');

  const DEFAULT_NOTES = sourceDefaultDeck
    ? sourceDefaultDeck.entries
        .map((entry) => (typeof entry === 'string' ? entry.trim() : ''))
        .filter((entry) => entry.length > 0)
        .join('\n\n')
    : FALLBACK_NOTES;

  const DEFAULT_DECK_NAME =
    sourceDefaultDeck && typeof sourceDefaultDeck.name === 'string' && sourceDefaultDeck.name.trim()
      ? sourceDefaultDeck.name.trim()
      : 'Starter deck';

  const DEFAULT_INITIAL_ORDER =
    sourceDefaultDeck && Array.isArray(sourceDefaultDeck.initialOrder) ? sourceDefaultDeck.initialOrder : null;

  let decks = [];
  let activeDeckId = '';
  let browserQuery = '';
  let browserScope = 'deck';

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

  function createSequentialOrder(length) {
    const order = [];
    for (let i = 0; i < length; i += 1) {
      order.push(i);
    }
    return order;
  }

  function shuffle(list) {
    const copy = list.slice();
    for (let i = copy.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
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

  function sanitizeOrder(order, length) {
    if (!Array.isArray(order) || order.length !== length) {
      return null;
    }

    const seen = new Set();
    const sanitized = [];

    for (let i = 0; i < order.length; i += 1) {
      const value = Number(order[i]);
      if (!Number.isInteger(value) || value < 0 || value >= length || seen.has(value)) {
        return null;
      }
      seen.add(value);
      sanitized.push(value);
    }

    return sanitized;
  }

  function sanitizeState(state, length) {
    if (!length) {
      return { order: [], index: 0 };
    }

    if (!state || typeof state !== 'object') {
      return { order: createSequentialOrder(length), index: 0 };
    }

    const rawOrder = Array.isArray(state.order) ? state.order : state.deck;
    const order = sanitizeOrder(rawOrder, length) || createSequentialOrder(length);
    const index = clampIndex(state.index, order.length);
    return { order, index };
  }

  function createDeckId() {
    return `deck-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  }

  function createDeck(name, notes) {
    const deckName = typeof name === 'string' && name.trim() ? name.trim() : DEFAULT_DECK_NAME;
    const safeNotes = typeof notes === 'string' ? notes : '';
    const entries = parseNotes(safeNotes);
    const state = sanitizeState(null, entries.length);
    return {
      id: createDeckId(),
      name: deckName,
      notes: safeNotes,
      entries,
      state
    };
  }

  function applyDefaultInitialOrder(deck) {
    if (!deck || deck.notes !== DEFAULT_NOTES || deck.name !== DEFAULT_DECK_NAME) {
      return;
    }

    const initialOrder = sanitizeOrder(DEFAULT_INITIAL_ORDER, deck.entries.length);
    if (!initialOrder) {
      return;
    }

    deck.state = {
      order: initialOrder,
      index: 0
    };
  }

  function sanitizeDeck(rawDeck) {
    if (!rawDeck || typeof rawDeck !== 'object') {
      return null;
    }

    const id = typeof rawDeck.id === 'string' && rawDeck.id.trim() ? rawDeck.id.trim() : createDeckId();
    const name = typeof rawDeck.name === 'string' && rawDeck.name.trim() ? rawDeck.name.trim() : DEFAULT_DECK_NAME;
    const notes = typeof rawDeck.notes === 'string' ? rawDeck.notes : '';
    const entries = parseNotes(notes);
    const state = sanitizeState(rawDeck.state, entries.length);
    return { id, name, notes, entries, state };
  }

  function loadLegacyState() {
    const raw = safeGetItem(STORAGE_KEYS.legacyState);
    if (typeof raw !== 'string' || !raw.length) {
      return null;
    }

    try {
      return JSON.parse(raw);
    } catch (error) {
      console.error('Failed to parse legacy deck state', error); // eslint-disable-line no-console
      return null;
    }
  }

  function migrateLegacyCollection() {
    const legacyNotes = safeGetItem(STORAGE_KEYS.legacyNotes);
    const notes = typeof legacyNotes === 'string' && legacyNotes.length ? legacyNotes : DEFAULT_NOTES;
    const deck = createDeck(DEFAULT_DECK_NAME, notes);
    const legacyState = loadLegacyState();
    if (legacyState) {
      deck.state = sanitizeState(legacyState, deck.entries.length);
    } else {
      applyDefaultInitialOrder(deck);
    }

    // Clean up legacy keys so the new structure is the source of truth.
    safeRemoveItem(STORAGE_KEYS.legacyNotes);
    safeRemoveItem(STORAGE_KEYS.legacyState);

    return {
      decks: [deck],
      activeDeckId: deck.id
    };
  }

  function loadCollection() {
    const raw = safeGetItem(STORAGE_KEYS.collection);
    if (typeof raw === 'string' && raw.length) {
      try {
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.decks)) {
          return migrateLegacyCollection();
        }

        const sanitizedDecks = parsed.decks
          .map((deck) => sanitizeDeck(deck))
          .filter(Boolean);

        if (!sanitizedDecks.length) {
          return migrateLegacyCollection();
        }

        let nextActive = typeof parsed.activeDeckId === 'string' ? parsed.activeDeckId : '';
        if (!sanitizedDecks.some((deck) => deck.id === nextActive)) {
          nextActive = sanitizedDecks[0].id;
        }

        return {
          decks: sanitizedDecks,
          activeDeckId: nextActive
        };
      } catch (error) {
        console.error('Failed to parse stored deck collection', error); // eslint-disable-line no-console
        return migrateLegacyCollection();
      }
    }

    return migrateLegacyCollection();
  }

  function saveCollection() {
    const payload = {
      decks: decks.map((deck) => ({
        id: deck.id,
        name: deck.name,
        notes: deck.notes,
        state: {
          order: deck.state.order.slice(),
          index: deck.state.index
        }
      })),
      activeDeckId
    };

    safeSetItem(STORAGE_KEYS.collection, JSON.stringify(payload));
  }

  function getActiveDeck() {
    return decks.find((deck) => deck.id === activeDeckId) || null;
  }

  function ensureDeckState(deck) {
    if (!deck) {
      return;
    }

    const length = deck.entries.length;
    if (!length) {
      deck.state = { order: [], index: 0 };
      return;
    }

    const sanitizedOrder = sanitizeOrder(deck.state.order, length);
    if (!sanitizedOrder) {
      deck.state = { order: createSequentialOrder(length), index: 0 };
      return;
    }

    deck.state = {
      order: sanitizedOrder,
      index: clampIndex(deck.state.index, sanitizedOrder.length)
    };
  }

  function updateDeckEntries(deck, rawNotes) {
    if (!deck) {
      return;
    }

    const notes = typeof rawNotes === 'string' ? rawNotes : '';
    const entries = parseNotes(notes);
    deck.notes = notes;
    deck.entries = entries;
    deck.state = sanitizeState(deck.state, entries.length);
  }

  function syncActiveDeckNotesFromInput() {
    const deck = getActiveDeck();
    if (!deck) {
      return false;
    }

    const raw = notesInput.value;
    if (raw === deck.notes) {
      return false;
    }

    updateDeckEntries(deck, raw);
    saveCollection();
    return true;
  }

  function generateDeckName() {
    const base = 'New deck';
    if (!decks.some((deck) => deck.name === base)) {
      return base;
    }

    let counter = 2;
    while (decks.some((deck) => deck.name === `${base} ${counter}`)) {
      counter += 1;
    }
    return `${base} ${counter}`;
  }

  function formatCount(count, singular) {
    return count === 1 ? `1 ${singular}` : `${count} ${singular}s`;
  }

  function renderEmptyState() {
    counterEl.textContent = '0 of 0';
    currentEntryEl.textContent = 'No notes yet. Add entries below to start reviewing.';
    currentEntryEl.classList.add('is-empty');
    prevButton.disabled = true;
    nextButton.disabled = true;
    shuffleButton.disabled = true;
  }

  function renderActiveDeck() {
    const deck = getActiveDeck();
    if (!deck) {
      renderEmptyState();
      activeDeckNameEl.textContent = 'No deck';
      return;
    }

    ensureDeckState(deck);

    activeDeckNameEl.textContent = deck.name;

    if (!deck.entries.length || !deck.state.order.length) {
      renderEmptyState();
      return;
    }

    const currentEntryIndex = deck.state.order[deck.state.index];
    const current = deck.entries[currentEntryIndex];

    currentEntryEl.textContent = current;
    currentEntryEl.classList.remove('is-empty');
    counterEl.textContent = `${deck.state.index + 1} of ${deck.state.order.length}`;
    const disableNav = deck.state.order.length <= 1;
    prevButton.disabled = disableNav;
    nextButton.disabled = disableNav;
    shuffleButton.disabled = deck.state.order.length <= 1;
  }

  function renderDeckSelect() {
    const previousValue = deckSelect.value;
    deckSelect.innerHTML = '';
    const fragment = document.createDocumentFragment();

    decks.forEach((deck) => {
      const option = document.createElement('option');
      option.value = deck.id;
      option.textContent = `${deck.name} (${formatCount(deck.entries.length, 'card')})`;
      fragment.appendChild(option);
    });

    deckSelect.appendChild(fragment);
    if (decks.some((deck) => deck.id === previousValue)) {
      deckSelect.value = previousValue;
    } else {
      deckSelect.value = activeDeckId;
    }
  }

  function renderDeckStats() {
    const totalDecks = decks.length;
    const totalCards = decks.reduce((sum, deck) => sum + deck.entries.length, 0);
    const decksText = formatCount(totalDecks, 'deck');
    const cardsText = formatCount(totalCards, 'card');
    deckStatsEl.textContent = `${decksText} · ${cardsText} total`;
  }

  function renderDeckList() {
    deckListEl.innerHTML = '';

    if (!decks.length) {
      const empty = document.createElement('p');
      empty.className = 'browser__empty';
      empty.textContent = 'No decks yet. Add one above to get started.';
      deckListEl.appendChild(empty);
      return;
    }

    const fragment = document.createDocumentFragment();

    decks.forEach((deck) => {
      ensureDeckState(deck);
      const item = document.createElement('article');
      item.className = 'deck-list__item';

      const textContainer = document.createElement('div');
      textContainer.className = 'deck-list__text';

      const title = document.createElement('h3');
      title.className = 'deck-list__title';
      title.textContent = deck.name;
      if (deck.id === activeDeckId) {
        const badge = document.createElement('span');
        badge.className = 'deck-list__badge';
        badge.textContent = 'Active';
        title.appendChild(document.createTextNode(' '));
        title.appendChild(badge);
      }

      const meta = document.createElement('p');
      meta.className = 'deck-list__meta';
      if (!deck.entries.length) {
        meta.textContent = 'No cards yet.';
      } else {
        const progressIndex = deck.state.index + 1;
        meta.textContent = `${formatCount(deck.entries.length, 'card')} · Next card ${progressIndex} of ${deck.state.order.length}`;
      }

      textContainer.appendChild(title);
      textContainer.appendChild(meta);

      const actions = document.createElement('div');
      actions.className = 'deck-list__actions';

      if (deck.id !== activeDeckId) {
        const openButton = document.createElement('button');
        openButton.type = 'button';
        openButton.className = 'control-button control-button--secondary';
        openButton.textContent = 'Switch to deck';
        openButton.dataset.action = 'activate';
        openButton.dataset.deckId = deck.id;
        actions.appendChild(openButton);
      }

      const deleteButton = document.createElement('button');
      deleteButton.type = 'button';
      deleteButton.className = 'control-button control-button--danger';
      deleteButton.textContent = 'Delete';
      deleteButton.dataset.action = 'delete';
      deleteButton.dataset.deckId = deck.id;
      actions.appendChild(deleteButton);

      item.appendChild(textContainer);
      item.appendChild(actions);
      fragment.appendChild(item);
    });

    deckListEl.appendChild(fragment);
  }

  function highlightMatches(text, query) {
    const fragment = document.createDocumentFragment();
    if (!query) {
      fragment.appendChild(document.createTextNode(text));
      return fragment;
    }

    const lowerText = text.toLowerCase();
    const lowerQuery = query.toLowerCase();
    let startIndex = 0;

    while (startIndex < text.length) {
      const matchIndex = lowerText.indexOf(lowerQuery, startIndex);
      if (matchIndex === -1) {
        fragment.appendChild(document.createTextNode(text.slice(startIndex)));
        break;
      }

      if (matchIndex > startIndex) {
        fragment.appendChild(document.createTextNode(text.slice(startIndex, matchIndex)));
      }

      const mark = document.createElement('mark');
      mark.textContent = text.slice(matchIndex, matchIndex + lowerQuery.length);
      fragment.appendChild(mark);

      startIndex = matchIndex + lowerQuery.length;
    }

    return fragment;
  }

  function getBrowseSource() {
    if (!decks.length) {
      return [];
    }

    if (browserScope === 'deck') {
      const deck = getActiveDeck();
      if (!deck || !deck.entries.length) {
        return [];
      }

      return deck.entries.map((text, index) => ({
        deckId: deck.id,
        deckName: deck.name,
        text,
        index
      }));
    }

    const items = [];
    decks.forEach((deck) => {
      deck.entries.forEach((text, index) => {
        items.push({
          deckId: deck.id,
          deckName: deck.name,
          text,
          index
        });
      });
    });
    return items;
  }

  function renderBrowserResults() {
    const source = getBrowseSource();
    browserResultsEl.innerHTML = '';

    if (!source.length) {
      browserEmptyEl.hidden = false;
      browserEmptyEl.textContent = 'No cards to browse yet. Add notes to your decks.';
      browserCountEl.textContent = 'Showing 0 cards';
      return;
    }

    const query = browserQuery.trim();
    const lowerQuery = query.toLowerCase();
    const filtered = query
      ? source.filter((item) => item.text.toLowerCase().includes(lowerQuery))
      : source;

    if (!filtered.length) {
      browserEmptyEl.hidden = false;
      browserEmptyEl.textContent = 'No cards match your search.';
    } else {
      browserEmptyEl.hidden = true;
    }

    if (!filtered.length) {
      browserCountEl.textContent = `Showing 0 of ${source.length} cards`;
      return;
    }

    const fragment = document.createDocumentFragment();
    filtered.forEach((item) => {
      const listItem = document.createElement('li');
      listItem.className = 'browser__item';

      const deckEl = document.createElement('p');
      deckEl.className = 'browser__deck';
      deckEl.textContent = `${item.deckName} • Card ${item.index + 1}`;

      const textEl = document.createElement('p');
      textEl.className = 'browser__text';
      textEl.appendChild(highlightMatches(item.text, query));

      listItem.appendChild(deckEl);
      listItem.appendChild(textEl);
      fragment.appendChild(listItem);
    });

    browserResultsEl.appendChild(fragment);

    if (query) {
      browserCountEl.textContent = `Showing ${filtered.length} of ${source.length} cards`;
    } else {
      browserCountEl.textContent = `Showing ${filtered.length} cards`;
    }
  }

  function syncInputsWithActiveDeck() {
    const deck = getActiveDeck();
    if (!deck) {
      notesInput.value = '';
      deckNameInput.value = '';
      return;
    }

    notesInput.value = deck.notes;
    deckNameInput.value = deck.name;
  }

  function refreshAll() {
    renderDeckSelect();
    renderDeckStats();
    syncInputsWithActiveDeck();
    renderActiveDeck();
    renderDeckList();
    browserScope = browserScopeSelect.value === 'all' ? 'all' : 'deck';
    browserQuery = browserSearchInput.value || '';
    renderBrowserResults();
  }

  function handleShowNext() {
    const deck = getActiveDeck();
    if (!deck || !deck.entries.length) {
      return;
    }
    ensureDeckState(deck);
    if (!deck.state.order.length) {
      return;
    }
    deck.state.index = (deck.state.index + 1) % deck.state.order.length;
    saveCollection();
    renderActiveDeck();
    renderDeckList();
  }

  function handleShowPrev() {
    const deck = getActiveDeck();
    if (!deck || !deck.entries.length) {
      return;
    }
    ensureDeckState(deck);
    if (!deck.state.order.length) {
      return;
    }
    deck.state.index = (deck.state.index - 1 + deck.state.order.length) % deck.state.order.length;
    saveCollection();
    renderActiveDeck();
    renderDeckList();
  }

  function handleShuffle() {
    const deck = getActiveDeck();
    if (!deck || deck.entries.length <= 1) {
      return;
    }
    deck.state.order = shuffle(createSequentialOrder(deck.entries.length));
    deck.state.index = 0;
    saveCollection();
    renderActiveDeck();
    renderDeckList();
    setStatus('Deck reshuffled.');
  }

  function handleSaveNotes() {
    const changed = syncActiveDeckNotesFromInput();
    const deck = getActiveDeck();
    if (!deck) {
      setStatus('No deck selected.');
      return;
    }

    renderActiveDeck();
    renderDeckSelect();
    renderDeckStats();
    renderDeckList();
    renderBrowserResults();

    if (!deck.entries.length) {
      setStatus('Saved. Add notes to build your deck.');
      return;
    }

    if (!changed) {
      setStatus('No changes to save.');
      return;
    }

    const count = deck.entries.length;
    setStatus(count === 1 ? 'Saved 1 card.' : `Saved ${count} cards.`);
  }

  function handleClearNotes() {
    const deck = getActiveDeck();
    if (!deck) {
      setStatus('No deck selected.');
      return;
    }

    notesInput.value = '';
    updateDeckEntries(deck, '');
    saveCollection();
    renderActiveDeck();
    renderDeckSelect();
    renderDeckStats();
    renderDeckList();
    renderBrowserResults();
    setStatus('Cleared notes. Add new entries to continue.');
  }

  function handleDeckSelectionChange(event) {
    const nextDeckId = event.target.value;
    if (!nextDeckId || nextDeckId === activeDeckId) {
      return;
    }

    syncActiveDeckNotesFromInput();
    if (!decks.some((deck) => deck.id === nextDeckId)) {
      deckSelect.value = activeDeckId;
      return;
    }

    activeDeckId = nextDeckId;
    saveCollection();
    refreshAll();
    setStatus(`Switched to ${getActiveDeck().name}.`);
  }

  function handleAddDeck() {
    syncActiveDeckNotesFromInput();
    const name = generateDeckName();
    const deck = createDeck(name, '');
    decks.push(deck);
    activeDeckId = deck.id;
    saveCollection();
    refreshAll();
    setStatus('Created a new deck. Start adding cards below.');
  }

  function handleRenameDeck() {
    const deck = getActiveDeck();
    if (!deck) {
      setStatus('No deck selected.');
      return;
    }

    const nextName = deckNameInput.value.trim();
    if (!nextName) {
      setStatus('Enter a name to save.');
      deckNameInput.value = deck.name;
      deckNameInput.focus();
      return;
    }

    if (nextName === deck.name) {
      setStatus('Name unchanged.');
      return;
    }

    deck.name = nextName;
    saveCollection();
    refreshAll();
    setStatus('Deck renamed.');
  }

  function removeDeckById(id) {
    const index = decks.findIndex((deck) => deck.id === id);
    if (index === -1) {
      return false;
    }
    decks.splice(index, 1);
    return true;
  }

  function selectFallbackDeck() {
    if (decks.length) {
      activeDeckId = decks[0].id;
    } else {
      const deck = createDeck(DEFAULT_DECK_NAME, DEFAULT_NOTES);
      decks.push(deck);
      activeDeckId = deck.id;
    }
  }

  function handleDeleteDeck(deckId) {
    if (decks.length <= 1) {
      setStatus('Keep at least one deck.');
      return;
    }

    const targetDeck = decks.find((deck) => deck.id === deckId);
    if (!targetDeck) {
      setStatus('Deck not found.');
      return;
    }

    const confirmed = window.confirm(`Delete "${targetDeck.name}"? This cannot be undone.`);
    if (!confirmed) {
      return;
    }

    removeDeckById(deckId);
    if (activeDeckId === deckId) {
      selectFallbackDeck();
    }

    saveCollection();
    refreshAll();
    setStatus('Deck deleted.');
  }

  function handleDeleteCurrentDeck() {
    const deck = getActiveDeck();
    if (!deck) {
      setStatus('No deck selected.');
      return;
    }
    handleDeleteDeck(deck.id);
  }

  function handleDeckListAction(event) {
    const button = event.target.closest('button');
    if (!button) {
      return;
    }

    const { action, deckId } = button.dataset;
    if (!deckId) {
      return;
    }

    if (action === 'activate') {
      if (deckId === activeDeckId) {
        return;
      }
      syncActiveDeckNotesFromInput();
      if (!decks.some((deck) => deck.id === deckId)) {
        return;
      }
      activeDeckId = deckId;
      saveCollection();
      refreshAll();
      setStatus(`Switched to ${getActiveDeck().name}.`);
    } else if (action === 'delete') {
      handleDeleteDeck(deckId);
    }
  }

  function handleBrowserScopeChange(event) {
    browserScope = event.target.value === 'all' ? 'all' : 'deck';
    renderBrowserResults();
  }

  function handleBrowserSearch(event) {
    browserQuery = event.target.value;
    renderBrowserResults();
  }

  function initializeKeyboardShortcuts() {
    document.addEventListener('keydown', (event) => {
      if (event.defaultPrevented) {
        return;
      }

      if (event.key === 'ArrowRight') {
        event.preventDefault();
        handleShowNext();
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault();
        handleShowPrev();
      }
    });
  }

  function initialize() {
    const initial = loadCollection();
    decks = initial.decks;
    activeDeckId = initial.activeDeckId;

    refreshAll();
    setStatus('');

    prevButton.addEventListener('click', handleShowPrev);
    nextButton.addEventListener('click', handleShowNext);
    shuffleButton.addEventListener('click', handleShuffle);
    saveButton.addEventListener('click', handleSaveNotes);
    clearButton.addEventListener('click', handleClearNotes);
    deckSelect.addEventListener('change', handleDeckSelectionChange);
    addDeckButton.addEventListener('click', handleAddDeck);
    renameDeckButton.addEventListener('click', handleRenameDeck);
    deleteDeckButton.addEventListener('click', handleDeleteCurrentDeck);
    deckListEl.addEventListener('click', handleDeckListAction);
    browserScopeSelect.addEventListener('change', handleBrowserScopeChange);
    browserSearchInput.addEventListener('input', handleBrowserSearch);
    browserPanel.addEventListener('toggle', () => {
      if (browserPanel.open) {
        browserSearchInput.focus();
      }
    });
    initializeKeyboardShortcuts();
  }

  initialize();
})();
