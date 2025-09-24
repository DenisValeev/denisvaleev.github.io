(function () {
  const sources = Array.isArray(window.embeddingSources) ? window.embeddingSources : [];

  const summaryGrid = document.querySelector('[data-summary-grid]');
  const positiveList = document.querySelector('[data-positive-list]');
  const negativeList = document.querySelector('[data-negative-list]');
  const valueTable = document.querySelector('[data-value-table]');

  const datasetSelect = document.querySelector('[data-dataset-select]');
  const datasetInfo = document.querySelector('[data-dataset-info]');
  const recordList = document.querySelector('[data-record-list]');
  const recordStatus = document.querySelector('[data-record-status]');
  const filterInput = document.querySelector('[data-record-filter]');
  const neighborList = document.querySelector('[data-neighbor-list]');
  const neighborStatus = document.querySelector('[data-neighbor-status]');
  const primaryCanvas = document.querySelector('[data-primary-canvas]');
  const primaryMeta = document.querySelector('[data-primary-meta]');
  const primaryText = document.querySelector('[data-primary-text]');
  const secondaryCanvas = document.querySelector('[data-secondary-canvas]');
  const secondaryMeta = document.querySelector('[data-secondary-meta]');
  const secondaryText = document.querySelector('[data-secondary-text]');
  const primaryCaption = document.querySelector('[data-primary-caption]');
  const secondaryCaption = document.querySelector('[data-secondary-caption]');

  if (
    !datasetSelect ||
    !datasetInfo ||
    !recordList ||
    !recordStatus ||
    !filterInput ||
    !neighborList ||
    !neighborStatus ||
    !primaryCanvas ||
    !primaryMeta ||
    !primaryText ||
    !secondaryCanvas ||
    !secondaryMeta ||
    !secondaryText ||
    !primaryCaption ||
    !secondaryCaption
  ) {
    return;
  }

  const datasetCache = new Map();
  let activeDatasetId = '';
  let activeRecordId = '';
  let activeNeighborId = '';
  let currentRecords = [];
  let filteredRecords = [];
  let neighborRecords = [];

  const contentMaps = buildContentMaps();
  const collectionContentKeys = new Map([
    ['Dad jokes', 'jokes'],
    ['Curated quotes', 'quotes'],
    ['Internet slang', 'slang'],
  ]);

  const primaryPane = {
    canvas: primaryCanvas,
    meta: primaryMeta,
    text: primaryText,
    caption: primaryCaption,
  };

  const secondaryPane = {
    canvas: secondaryCanvas,
    meta: secondaryMeta,
    text: secondaryText,
    caption: secondaryCaption,
  };
  const MAX_NEIGHBOR_DISPLAY = 10;
  const overridesUrl = '../../data/similarity-overrides.json';
  let overridesPromise = null;
  let overrideIndex = new Map();
  const summaryValues = summaryGrid ? Array.from(summaryGrid.querySelectorAll('dd')) : [];
  const POSITIVE_PLACEHOLDER = 'Positive values appear here.';
  const NEGATIVE_PLACEHOLDER = 'Negative values appear here.';

  function safeText(value) {
    return typeof value === 'string' ? value.trim() : '';
  }

  function formatDate(value) {
    if (!value) {
      return '—';
    }

    try {
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) {
        return value;
      }
      return date.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
    } catch (error) {
      console.error('Failed to format date', error);
      return value;
    }
  }

  function formatSimilarity(value) {
    if (!Number.isFinite(value)) {
      return '—';
    }
    return value.toFixed(3);
  }

  function createOverrideKey(idA, idB) {
    const first = safeText(idA);
    const second = safeText(idB);
    if (!first || !second) {
      return '';
    }

    return [first, second]
      .sort((left, right) => left.localeCompare(right, undefined, { numeric: true, sensitivity: 'base' }))
      .join('::');
  }

  function parseOverrides(payload) {
    const index = new Map();
    if (!payload || typeof payload !== 'object') {
      return index;
    }

    const datasets = payload.datasets && typeof payload.datasets === 'object' ? payload.datasets : {};
    Object.entries(datasets).forEach(([datasetName, datasetPayload]) => {
      if (!datasetName || !datasetPayload || typeof datasetPayload !== 'object') {
        return;
      }

      const pairs = Array.isArray(datasetPayload.protectedPairs) ? datasetPayload.protectedPairs : [];
      if (!pairs.length) {
        return;
      }

      const datasetMap = new Map();
      pairs.forEach((entry) => {
        if (!entry || typeof entry !== 'object' || !Array.isArray(entry.ids) || entry.ids.length < 2) {
          return;
        }

        const [idA, idB] = entry.ids;
        const key = createOverrideKey(idA, idB);
        if (!key) {
          return;
        }

        const label = safeText(entry.label) || 'Protected pair';
        const reason = safeText(entry.reason);
        datasetMap.set(key, { label, reason });
      });

      if (datasetMap.size) {
        index.set(datasetName, datasetMap);
      }
    });

    return index;
  }

  function loadOverrides() {
    if (overridesPromise) {
      return overridesPromise;
    }

    overridesPromise = fetch(overridesUrl)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Failed to load ${overridesUrl}`);
        }
        return response.json();
      })
      .then((json) => {
        overrideIndex = parseOverrides(json);
        return overrideIndex;
      })
      .catch((error) => {
        console.warn(error);
        overrideIndex = new Map();
        return overrideIndex;
      });

    return overridesPromise;
  }

  function addNeighborEntry(neighborMap, sourceId, targetId, similarity) {
    if (!(neighborMap instanceof Map)) {
      return;
    }

    const sourceKey = safeText(sourceId);
    const targetKey = safeText(targetId);
    if (!sourceKey || !targetKey || !Number.isFinite(similarity)) {
      return;
    }

    if (!neighborMap.has(sourceKey)) {
      neighborMap.set(sourceKey, []);
    }

    const list = neighborMap.get(sourceKey);
    const existing = list.find((entry) => entry.id === targetKey);
    if (existing) {
      if (existing.similarity < similarity) {
        existing.similarity = similarity;
      }
      return;
    }

    list.push({ id: targetKey, similarity });
  }

  function buildNeighborMapFromReport(report) {
    const neighborMap = new Map();
    if (!report || typeof report !== 'object') {
      return neighborMap;
    }

    const matches = Array.isArray(report.matches) ? report.matches : [];
    matches.forEach((match) => {
      if (!match || typeof match !== 'object') {
        return;
      }

      const idA = safeText(match.idA);
      const idB = safeText(match.idB);
      const similarity = Number(match.similarity);
      if (!idA || !idB || !Number.isFinite(similarity)) {
        return;
      }

      addNeighborEntry(neighborMap, idA, idB, similarity);
      addNeighborEntry(neighborMap, idB, idA, similarity);
    });

    neighborMap.forEach((list) => {
      list.sort((a, b) => b.similarity - a.similarity);
    });

    return neighborMap;
  }

  function getOverrideForPair(datasetData, idA, idB) {
    const overrideMap = datasetData && datasetData.overrideMap instanceof Map ? datasetData.overrideMap : null;
    if (!overrideMap) {
      return null;
    }

    const key = createOverrideKey(idA, idB);
    if (!key || !overrideMap.has(key)) {
      return null;
    }

    return overrideMap.get(key);
  }

  function formatNumber(value, digits = 3) {
    if (!Number.isFinite(value)) {
      return (0).toFixed(digits);
    }
    return value.toFixed(digits);
  }

  function computeVectorStats(values) {
    let sourceValues = [];

    if (Array.isArray(values)) {
      sourceValues = values;
    } else if (values && typeof values === 'object') {
      if (ArrayBuffer.isView(values)) {
        sourceValues = Array.from(values);
      } else if (typeof values[Symbol.iterator] === 'function') {
        sourceValues = Array.from(values);
      }
    }

    const numericValues = sourceValues
      .map((value) => Number(value))
      .filter((value) => Number.isFinite(value));
    const length = numericValues.length;

    if (!length) {
      return {
        values: [],
        length: 0,
        magnitude: 0,
        mean: 0,
        variance: 0,
        min: Number.NaN,
        max: Number.NaN,
        zeroCount: 0,
      };
    }

    let sum = 0;
    let sumSquares = 0;
    let min = numericValues[0];
    let max = numericValues[0];
    let zeroCount = 0;

    numericValues.forEach((value) => {
      sum += value;
      sumSquares += value * value;
      if (value < min) {
        min = value;
      }
      if (value > max) {
        max = value;
      }
      if (value === 0) {
        zeroCount += 1;
      }
    });

    const mean = sum / length;
    const variance = numericValues.reduce((accumulator, value) => accumulator + (value - mean) * (value - mean), 0) / length;
    const magnitude = Math.sqrt(sumSquares);

    return {
      values: numericValues,
      length,
      magnitude,
      mean,
      variance,
      min,
      max,
      zeroCount,
    };
  }

  function renderSummary(stats) {
    if (!summaryValues.length) {
      return;
    }

    const [dimensionsEl, magnitudeEl, meanEl, stdevEl, rangeEl, zeroShareEl] = summaryValues;
    dimensionsEl.textContent = stats.length.toLocaleString();
    magnitudeEl.textContent = formatNumber(stats.magnitude);
    meanEl.textContent = formatNumber(stats.mean);
    stdevEl.textContent = formatNumber(Math.sqrt(stats.variance));

    if (stats.length) {
      rangeEl.textContent = `${formatNumber(stats.min)} / ${formatNumber(stats.max)}`;
      const zeroShare = Math.round((stats.zeroCount / stats.length) * 100);
      zeroShareEl.textContent = `${zeroShare}%`;
    } else {
      rangeEl.textContent = '— / —';
      zeroShareEl.textContent = '0%';
    }
  }

  function renderExtremaList(listElement, entries, placeholder) {
    if (!listElement) {
      return;
    }

    listElement.innerHTML = '';

    if (!entries.length) {
      const item = document.createElement('li');
      const message = document.createElement('span');
      message.className = 'placeholder';
      message.textContent = placeholder;
      item.appendChild(message);
      listElement.appendChild(item);
      return;
    }

    const fragment = document.createDocumentFragment();
    entries.forEach((entry) => {
      const item = document.createElement('li');
      item.textContent = `#${entry.index}${formatNumber(entry.value)}`;
      fragment.appendChild(item);
    });
    listElement.appendChild(fragment);
  }

  function renderValueTable(values) {
    if (!valueTable) {
      return;
    }

    valueTable.innerHTML = '';

    if (!values.length) {
      const row = document.createElement('tr');
      const cell = document.createElement('td');
      cell.colSpan = 3;
      const message = document.createElement('p');
      message.className = 'placeholder';
      message.textContent = 'Select a vector to populate this table.';
      cell.appendChild(message);
      row.appendChild(cell);
      valueTable.appendChild(row);
      return;
    }

    const fragment = document.createDocumentFragment();
    const maxMagnitude = values.reduce((highest, value) => Math.max(highest, Math.abs(value)), 0);
    const safeDivisor = Number.isFinite(maxMagnitude) && maxMagnitude > 0 ? maxMagnitude : 1;

    values.forEach((value, index) => {
      const row = document.createElement('tr');

      const indexCell = document.createElement('td');
      indexCell.textContent = `#${index + 1}`;

      const valueCell = document.createElement('td');
      const valueSpan = document.createElement('span');
      valueSpan.textContent = formatNumber(value);
      valueCell.appendChild(valueSpan);

      const normalizedCell = document.createElement('td');
      const normalizedSpan = document.createElement('span');
      normalizedSpan.textContent = formatNumber(Math.abs(value) / safeDivisor);
      normalizedCell.appendChild(normalizedSpan);

      row.append(indexCell, valueCell, normalizedCell);
      fragment.appendChild(row);
    });

    valueTable.appendChild(fragment);
  }

  function updateSummaryForVector(values) {
    const stats = computeVectorStats(values);
    renderSummary(stats);

    const entries = stats.values.map((value, index) => ({ index: index + 1, value }));
    const positiveEntries = entries
      .filter((entry) => entry.value > 0)
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
    const negativeEntries = entries
      .filter((entry) => entry.value < 0)
      .sort((a, b) => a.value - b.value)
      .slice(0, 5);

    renderExtremaList(positiveList, positiveEntries, POSITIVE_PLACEHOLDER);
    renderExtremaList(negativeList, negativeEntries, NEGATIVE_PLACEHOLDER);
    renderValueTable(stats.values);
    return stats;
  }

  function decodeVectorBytes(base64) {
    if (typeof base64 !== 'string' || !base64) {
      return new Uint8Array();
    }

    try {
      const binary = window.atob(base64);
      const length = binary.length;
      const bytes = new Uint8Array(length);
      for (let index = 0; index < length; index += 1) {
        bytes[index] = binary.charCodeAt(index);
      }
      return bytes;
    } catch (error) {
      console.error('Failed to decode vector', error);
      return new Uint8Array();
    }
  }

  function bytesToFloat32(bytes) {
    if (!(bytes instanceof Uint8Array) || bytes.byteLength % 4 !== 0) {
      return new Float32Array();
    }

    try {
      return new Float32Array(bytes.buffer, bytes.byteOffset, bytes.byteLength / 4);
    } catch (error) {
      console.error('Failed to interpret vector as Float32Array', error);
      return new Float32Array();
    }
  }

  function computeMagnitude(values) {
    if (!(values instanceof Float32Array) || !values.length) {
      return 0;
    }

    let sum = 0;
    for (let index = 0; index < values.length; index += 1) {
      const value = values[index];
      sum += value * value;
    }
    return Math.sqrt(sum);
  }

  function ensureVectorData(record) {
    if (!record || typeof record !== 'object') {
      return;
    }

    if (!(record.vectorBytes instanceof Uint8Array)) {
      record.vectorBytes = decodeVectorBytes(record.vector);
    }

    if (!(record.floatVector instanceof Float32Array)) {
      if (record.vectorBytes instanceof Uint8Array) {
        record.floatVector = bytesToFloat32(record.vectorBytes);
      } else {
        record.floatVector = new Float32Array();
      }
    }

    if (!Number.isFinite(record.vectorMagnitude)) {
      record.vectorMagnitude = computeMagnitude(record.floatVector);
    }
  }

  function buildContentMaps() {
    const jokesMap = new Map();
    const quotesMap = new Map();
    const slangMap = new Map();

    if (Array.isArray(window.jokes)) {
      window.jokes.forEach((entry) => {
        if (!entry || typeof entry.id !== 'string') {
          return;
        }
        jokesMap.set(entry.id, {
          id: entry.id,
          setup: safeText(entry.joke),
          punchline: safeText(entry.punchline),
        });
      });
    }

    if (Array.isArray(window.quotesData)) {
      window.quotesData.forEach((category) => {
        const categoryId = safeText(category && category.id);
        const categoryLabel = safeText(category && category.label);
        const quotes = Array.isArray(category && category.quotes) ? category.quotes : [];
        quotes.forEach((quote) => {
          if (!quote || typeof quote.id !== 'string') {
            return;
          }
          quotesMap.set(quote.id, {
            id: quote.id,
            text: safeText(quote.text),
            author: safeText(quote.author),
            categoryId,
            category: categoryLabel,
          });
        });
      });
    }

    if (Array.isArray(window.slangEntries)) {
      window.slangEntries.forEach((entry) => {
        if (!entry || typeof entry.id !== 'string') {
          return;
        }
        slangMap.set(entry.id, {
          id: entry.id,
          term: safeText(entry.term),
          definition: safeText(entry.definition),
          example: safeText(entry.example),
          hint: safeText(entry.hint),
          category: safeText(entry.category),
        });
      });
    }

    return { jokes: jokesMap, quotes: quotesMap, slang: slangMap };
  }
  function getContentEntry(contentKey, recordId) {
    if (!recordId) {
      return null;
    }

    if (contentKey === 'jokes') {
      return contentMaps.jokes.get(recordId) || null;
    }
    if (contentKey === 'quotes') {
      return contentMaps.quotes.get(recordId) || null;
    }
    if (contentKey === 'slang') {
      return contentMaps.slang.get(recordId) || null;
    }
    return null;
  }

  function getContentTitle(contentKey) {
    switch (contentKey) {
      case 'jokes':
        return 'Dad joke';
      case 'quotes':
        return 'Quote';
      case 'slang':
        return 'Slang entry';
      default:
        return 'Source text';
    }
  }

  function getContentFields(contentKey, entry) {
    if (!entry) {
      return [];
    }

    switch (contentKey) {
      case 'jokes':
        return [
          { label: 'Setup', value: entry.setup },
          { label: 'Punchline', value: entry.punchline },
        ].filter((item) => item.value);
      case 'quotes':
        return [
          { label: 'Quote', value: entry.text },
          { label: 'Author', value: entry.author },
          { label: 'Category', value: entry.category },
        ].filter((item) => item.value);
      case 'slang':
        return [
          { label: 'Term', value: entry.term },
          { label: 'Definition', value: entry.definition },
          { label: 'Example', value: entry.example },
          { label: 'Hint', value: entry.hint },
          { label: 'Category', value: entry.category },
        ].filter((item) => item.value);
      default:
        return [];
    }
  }

  function renderContentText(container, contentKey, entry, placeholder) {
    if (!container) {
      return;
    }

    container.innerHTML = '';

    if (!entry) {
      const message = document.createElement('p');
      message.className = 'placeholder';
      message.textContent = placeholder || 'Source text not available for this vector.';
      container.appendChild(message);
      return;
    }

    const fields = getContentFields(contentKey, entry);

    if (!fields.length) {
      const message = document.createElement('p');
      message.className = 'placeholder';
      message.textContent = placeholder || 'Source text not available for this vector.';
      container.appendChild(message);
      return;
    }

    const wrapper = document.createElement('article');
    wrapper.className = 'text-record';

    const heading = document.createElement('h3');
    heading.className = 'text-record__heading';
    heading.textContent = getContentTitle(contentKey);
    wrapper.appendChild(heading);

    const list = document.createElement('dl');
    list.className = 'text-record__list';

    fields.forEach((field) => {
      const dt = document.createElement('dt');
      dt.textContent = field.label;
      const dd = document.createElement('dd');
      dd.textContent = field.value;
      list.append(dt, dd);
    });

    wrapper.appendChild(list);
    container.appendChild(wrapper);
  }

  function getContentPreview(contentKey, entry) {
    if (!entry) {
      return '';
    }

    switch (contentKey) {
      case 'jokes': {
        const parts = [entry.setup, entry.punchline].filter(Boolean);
        return parts.join(' • ');
      }
      case 'quotes': {
        if (entry.text && entry.author) {
          return `${entry.text} — ${entry.author}`;
        }
        return entry.text || entry.author || '';
      }
      case 'slang': {
        if (entry.term && entry.definition) {
          return `${entry.term}: ${entry.definition}`;
        }
        return entry.definition || entry.term || '';
      }
      default:
        return '';
    }
  }

  function truncateText(value, maxLength) {
    if (typeof value !== 'string' || !value.length) {
      return '';
    }
    if (value.length <= maxLength) {
      return value;
    }
    return `${value.slice(0, Math.max(0, maxLength - 1))}…`;
  }

  function createPlaceholderItem(message) {
    const item = document.createElement('li');
    const paragraph = document.createElement('p');
    paragraph.className = 'placeholder';
    paragraph.textContent = message;
    item.appendChild(paragraph);
    return item;
  }

  function populateDatasetSelect() {
    datasetSelect.innerHTML = '';

    if (!sources.length) {
      datasetSelect.disabled = true;
      const option = document.createElement('option');
      option.value = '';
      option.textContent = 'No datasets available';
      datasetSelect.append(option);
      datasetInfo.innerHTML = '<p class="placeholder">No embedding datasets are configured.</p>';
      recordList.innerHTML = '<li><p class="placeholder">No datasets available.</p></li>';
      recordStatus.textContent = 'No vectors to display.';
      neighborList.innerHTML = '';
      neighborList.appendChild(createPlaceholderItem('No datasets available.'));
      neighborStatus.textContent = 'No neighbors to display.';
      filterInput.disabled = true;
      updateSummaryForVector([]);
      return;
    }

    sources.forEach((source, index) => {
      const option = document.createElement('option');
      option.value = source.id;
      option.textContent = source.label;
      datasetSelect.append(option);
      if (index === 0) {
        datasetSelect.value = source.id;
      }
    });

    datasetSelect.disabled = false;
  }

  function updateDatasetInfo(meta, source) {
    datasetInfo.innerHTML = '';

    const list = document.createElement('dl');
    list.className = 'meta-grid';

    const items = [
      { label: 'Collection', value: source?.collection || '—' },
      { label: 'Provider', value: meta?.provider || '—' },
      { label: 'Model', value: meta?.model || '—' },
      {
        label: 'Dimensions',
        value: meta?.dimensions ? `${meta.dimensions.toLocaleString()}D` : '—',
      },
      {
        label: 'Records',
        value: meta?.recordCount ? meta.recordCount.toLocaleString() : '—',
      },
      {
        label: 'Generated',
        value: meta?.generatedAt ? formatDate(meta.generatedAt) : '—',
      },
    ];

    items.forEach((item) => {
      const wrapper = document.createElement('div');
      const dt = document.createElement('dt');
      dt.textContent = item.label;
      const dd = document.createElement('dd');
      dd.textContent = item.value;
      wrapper.append(dt, dd);
      list.appendChild(wrapper);
    });

    datasetInfo.appendChild(list);
  }

  function updateRecordStatus() {
    if (!currentRecords.length) {
      recordStatus.textContent = 'No vectors available for this dataset.';
      return;
    }

    if (!filteredRecords.length) {
      const searchTerm = filterInput.value.trim();
      recordStatus.textContent = searchTerm
        ? `No matches for “${searchTerm}”.`
        : 'No vectors match the current filter.';
      return;
    }

    recordStatus.textContent = `Showing ${filteredRecords.length.toLocaleString()} of ${currentRecords.length.toLocaleString()} vectors.`;
  }

  function renderRecordList() {
    recordList.innerHTML = '';

    if (!filteredRecords.length) {
      const item = document.createElement('li');
      const placeholder = document.createElement('p');
      placeholder.className = 'placeholder';
      placeholder.textContent = currentRecords.length
        ? 'No vectors match this filter.'
        : 'No vectors available for this dataset.';
      item.appendChild(placeholder);
      recordList.appendChild(item);
      return;
    }

    const fragment = document.createDocumentFragment();

    filteredRecords.forEach((record) => {
      const item = document.createElement('li');
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'record-button';
      button.dataset.recordId = record.id;
      const isActive = record.id === activeRecordId;
      button.dataset.active = isActive ? 'true' : 'false';
      button.setAttribute('aria-pressed', isActive ? 'true' : 'false');

      const idSpan = document.createElement('span');
      idSpan.className = 'record-button__id';
      idSpan.textContent = record.id;

      const metaSpan = document.createElement('span');
      metaSpan.className = 'record-button__meta';
      metaSpan.textContent = record.updatedAt ? `Updated ${formatDate(record.updatedAt)}` : 'No timestamp available';

      button.append(idSpan, metaSpan);
      item.appendChild(button);
      fragment.appendChild(item);
    });

    recordList.appendChild(fragment);
  }

  function updateActiveRecordButton() {
    const buttons = recordList.querySelectorAll('.record-button');
    buttons.forEach((button) => {
      const isActive = button.dataset.recordId === activeRecordId;
      button.dataset.active = isActive ? 'true' : 'false';
      button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    });
  }

  function updateActiveNeighborButton() {
    const buttons = neighborList.querySelectorAll('.neighbor-button');
    buttons.forEach((button) => {
      const isActive = button.dataset.neighborId === activeNeighborId;
      button.dataset.active = isActive ? 'true' : 'false';
      button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    });
  }

  function createNeighborListItem(record, datasetData, options = {}) {
    if (!record || !datasetData) {
      return null;
    }

    const item = document.createElement('li');
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'neighbor-button';
    button.dataset.neighborId = record.id;
    const isActiveNeighbor = record.id === activeNeighborId;
    button.dataset.active = isActiveNeighbor ? 'true' : 'false';
    button.setAttribute('aria-pressed', isActiveNeighbor ? 'true' : 'false');

    const similarity = Number.isFinite(options.similarity) ? options.similarity : Number.NaN;
    if (activeRecordId) {
      const parts = [`Compare ${record.id} with ${activeRecordId}`];
      if (Number.isFinite(similarity)) {
        parts.push(`similarity ${formatSimilarity(similarity)}`);
      }
      if (options.override && options.override.label) {
        parts.push(options.override.label);
      }
      button.setAttribute('aria-label', parts.join(' – '));
    }

    const header = document.createElement('div');
    header.className = 'neighbor-button__header';

    const idSpan = document.createElement('span');
    idSpan.className = 'neighbor-button__id';
    idSpan.textContent = record.id;

    const scoreSpan = document.createElement('span');
    scoreSpan.className = 'neighbor-button__score';
    scoreSpan.textContent = formatSimilarity(similarity);

    header.append(idSpan, scoreSpan);
    button.appendChild(header);

    if (options.override) {
      const badge = document.createElement('span');
      badge.className = 'neighbor-button__badge';
      badge.textContent = options.override.label || 'Protected pair';
      if (options.override.reason) {
        badge.setAttribute('title', options.override.reason);
      }
      button.appendChild(badge);
    }

    const snippetSpan = document.createElement('span');
    snippetSpan.className = 'neighbor-button__snippet';
    const contentEntry = getContentEntry(datasetData.contentKey, record.id);
    const fullPreview = getContentPreview(datasetData.contentKey, contentEntry);
    const preview = truncateText(fullPreview, 120);
    snippetSpan.textContent = preview || 'No source text available.';
    if (fullPreview && preview !== fullPreview) {
      snippetSpan.setAttribute('title', fullPreview);
    }

    button.appendChild(snippetSpan);
    item.appendChild(button);
    return item;
  }

  function renderNeighborList(datasetData) {
    neighborList.innerHTML = '';

    if (!activeDatasetId || !datasetData) {
      neighborStatus.textContent = 'Select a dataset to compute neighbors.';
      neighborList.appendChild(createPlaceholderItem('Choose a dataset to load vectors before exploring neighbors.'));
      return;
    }

    if (!activeRecordId) {
      neighborStatus.textContent = 'Select a vector to compute its nearest neighbors.';
      neighborList.appendChild(createPlaceholderItem('Neighbors appear here once you choose a vector.'));
      return;
    }

    if (!neighborRecords.length) {
      neighborStatus.textContent = 'No comparable vectors found for this selection.';
      neighborList.appendChild(createPlaceholderItem('No similar vectors were detected for the selected entry.'));
      return;
    }

    const fragment = document.createDocumentFragment();
    neighborStatus.textContent = `Top ${neighborRecords.length} matches for ${activeRecordId}.`;

    neighborRecords.forEach((entry) => {
      const item = createNeighborListItem(entry.record, datasetData, {
        similarity: entry.similarity,
        override: entry.override || null,
      });
      if (item) {
        fragment.appendChild(item);
      }
    });

    neighborList.appendChild(fragment);
  }
  function computeCosineNeighbors(record, datasetData) {
    if (!record || !datasetData) {
      return [];
    }

    ensureVectorData(record);
    const baseVector = record.floatVector;
    const baseMagnitude = record.vectorMagnitude;

    if (!(baseVector instanceof Float32Array) || !baseVector.length || !Number.isFinite(baseMagnitude) || baseMagnitude === 0) {
      return [];
    }

    const neighbors = [];

    datasetData.records.forEach((candidate) => {
      if (!candidate || candidate.id === record.id) {
        return;
      }

      ensureVectorData(candidate);
      const compareVector = candidate.floatVector;
      const compareMagnitude = candidate.vectorMagnitude;

      if (!(compareVector instanceof Float32Array) || compareVector.length !== baseVector.length) {
        return;
      }

      if (!Number.isFinite(compareMagnitude) || compareMagnitude === 0) {
        return;
      }

      let dot = 0;
      for (let index = 0; index < baseVector.length; index += 1) {
        dot += baseVector[index] * compareVector[index];
      }

      const similarity = dot / (baseMagnitude * compareMagnitude);
      if (!Number.isFinite(similarity)) {
        return;
      }

      neighbors.push({ id: candidate.id, record: candidate, similarity });
    });

    neighbors.sort((a, b) => b.similarity - a.similarity);
    return neighbors.slice(0, MAX_NEIGHBOR_DISPLAY);
  }

  function computeNeighbors(record, datasetData) {
    if (!record || !datasetData) {
      return [];
    }

    const precomputed = datasetData.neighborMap instanceof Map ? datasetData.neighborMap.get(record.id) || [] : [];
    const results = [];
    const seen = new Set();

    precomputed.forEach((entry) => {
      if (!entry || typeof entry !== 'object') {
        return;
      }

      const candidate = datasetData.recordMap.get(entry.id);
      if (!candidate || candidate.id === record.id || seen.has(candidate.id)) {
        return;
      }

      const similarity = Number(entry.similarity);
      if (!Number.isFinite(similarity)) {
        return;
      }

      const override = getOverrideForPair(datasetData, record.id, candidate.id);
      results.push({ id: candidate.id, record: candidate, similarity, override });
      seen.add(candidate.id);
    });

    if (results.length < MAX_NEIGHBOR_DISPLAY) {
      const fallback = computeCosineNeighbors(record, datasetData);
      fallback.forEach((entry) => {
        if (!entry || seen.has(entry.id)) {
          return;
        }

        const override = getOverrideForPair(datasetData, record.id, entry.id);
        results.push({ id: entry.id, record: entry.record, similarity: entry.similarity, override });
        seen.add(entry.id);
      });
    }

    results.sort((a, b) => b.similarity - a.similarity);
    return results.slice(0, MAX_NEIGHBOR_DISPLAY);
  }

  function renderPane(pane, record, datasetMeta, source, options = {}) {
    if (!pane || !pane.canvas) {
      return;
    }

    const metaPlaceholder = options.metaPlaceholder || 'Select a vector to inspect its details.';
    const textPlaceholder = options.textPlaceholder || 'Select a vector to view its source text.';
    const captionIdle = options.captionIdle || '';
    const captionActive = options.captionActive || captionIdle;

    if (pane.caption) {
      pane.caption.textContent = record ? captionActive : captionIdle;
    }

    const ctx = pane.canvas.getContext('2d');
    if (!ctx) {
      return;
    }

    if (!record) {
      ctx.clearRect(0, 0, pane.canvas.width, pane.canvas.height);
      pane.canvas.width = 1;
      pane.canvas.height = 1;
      pane.canvas.style.width = '';
      pane.canvas.style.height = '';
      if (pane.meta) {
        pane.meta.innerHTML = `<p class="placeholder">${metaPlaceholder}</p>`;
      }
      if (pane.text) {
        pane.text.innerHTML = `<p class="placeholder">${textPlaceholder}</p>`;
      }
      return;
    }

    ensureVectorData(record);
    const bytes = record.vectorBytes instanceof Uint8Array ? record.vectorBytes : new Uint8Array();
    const pixelCount = Math.ceil(bytes.length / 3);
    const width = Math.max(1, Math.ceil(Math.sqrt(pixelCount)));
    const height = Math.max(1, Math.ceil(pixelCount / width));

    pane.canvas.width = width;
    pane.canvas.height = height;

    const imageData = ctx.createImageData(width, height);
    const data = imageData.data;
    let byteIndex = 0;
    for (let index = 0; index < width * height; index += 1) {
      data[index * 4] = bytes[byteIndex] ?? 0;
      data[index * 4 + 1] = bytes[byteIndex + 1] ?? 0;
      data[index * 4 + 2] = bytes[byteIndex + 2] ?? 0;
      data[index * 4 + 3] = 255;
      byteIndex += 3;
    }

    ctx.putImageData(imageData, 0, 0);

    const containerWidth = pane.canvas.parentElement?.clientWidth || 220;
    const maxDisplay = Math.max(140, Math.min(260, containerWidth));
    const scale = Math.max(1, Math.floor(maxDisplay / Math.max(width, height)));
    pane.canvas.style.width = `${width * scale}px`;
    pane.canvas.style.height = `${height * scale}px`;

    if (pane.meta) {
      const hash = record.vectorSha256 || '';
      const hashPreview = hash ? `${hash.slice(0, 16)}…` : '—';
      const textHash = record.textHash || '';
      const textHashPreview = textHash ? `${textHash.slice(0, 16)}…` : '—';

      const metaItems = [
        { label: 'Vector id', value: record.id },
        { label: 'Collection', value: source?.collection || '—' },
        { label: 'Provider', value: record.provider || datasetMeta?.provider || '—' },
        { label: 'Model', value: record.model || datasetMeta?.model || '—' },
        {
          label: 'Dimensions',
          value: record.dimensions
            ? `${record.dimensions.toLocaleString()}D`
            : datasetMeta?.dimensions
            ? `${datasetMeta.dimensions.toLocaleString()}D`
            : '—',
        },
        { label: 'Binary bytes', value: bytes.length.toLocaleString() },
        { label: 'Pixel grid', value: `${width} × ${height}` },
        { label: 'Vector hash', value: hashPreview, title: hash },
        { label: 'Text hash', value: textHash ? textHashPreview : '—', title: textHash },
        { label: 'Updated', value: record.updatedAt ? formatDate(record.updatedAt) : '—' },
      ];

      const extraMeta = Array.isArray(options.extraMeta) ? options.extraMeta.filter((item) => item && item.label) : [];
      const combined = [...metaItems];

      extraMeta.forEach((item) => {
        const value = typeof item.value === 'string' ? item.value : String(item.value ?? '');
        combined.push({ label: item.label, value: value || '—', title: item.title || '' });
      });

      pane.meta.innerHTML = '';
      const list = document.createElement('dl');
      list.className = 'meta-grid';

      combined.forEach((item) => {
        const wrapper = document.createElement('div');
        const dt = document.createElement('dt');
        dt.textContent = item.label;
        const dd = document.createElement('dd');
        dd.textContent = item.value || '—';
        if (item.title) {
          dd.setAttribute('title', item.title);
        }
        wrapper.append(dt, dd);
        list.appendChild(wrapper);
      });

      pane.meta.appendChild(list);
    }

    if (pane.text) {
      renderContentText(pane.text, options.contentKey || '', options.contentEntry || null, textPlaceholder);
    }
  }
  function renderPrimaryPane(record, datasetData) {
    const contentKey = datasetData?.contentKey || '';
    const contentEntry = record ? getContentEntry(contentKey, record.id) : null;
    const captionIdle = 'Pick a vector to render its fingerprint.';
    const captionActive = record ? `Binary fingerprint for ${record.id}.` : captionIdle;

    renderPane(primaryPane, record, datasetData?.meta, datasetData?.source, {
      metaPlaceholder: 'Select a vector to inspect its details.',
      textPlaceholder: 'Choose a vector to load its source text.',
      captionIdle,
      captionActive,
      contentKey,
      contentEntry,
    });
  }

  function renderSecondaryPane(primaryRecord, neighborEntry, datasetData) {
    const contentKey = datasetData?.contentKey || '';
    const record = neighborEntry ? neighborEntry.record : null;
    const contentEntry = record ? getContentEntry(contentKey, record.id) : null;
    const captionIdle = primaryRecord
      ? 'Select a neighbor to view its fingerprint.'
      : 'Choose a vector to compute neighbors.';
    let captionActive = captionIdle;

    if (primaryRecord && record) {
      captionActive = `Comparing ${record.id} with ${primaryRecord.id}.`;
    }

    const extraMeta = [];
    if (neighborEntry && Number.isFinite(neighborEntry.similarity)) {
      extraMeta.push({ label: 'Cosine similarity', value: formatSimilarity(neighborEntry.similarity) });
    }

    if (neighborEntry && neighborEntry.override) {
      const overrideLabel = neighborEntry.override.label || 'Protected pair';
      const overrideReason = neighborEntry.override.reason
        ? neighborEntry.override.reason
        : 'Manually protected from dedupe sweeps.';
      extraMeta.push({ label: overrideLabel, value: overrideReason, title: neighborEntry.override.reason || '' });
    }

    renderPane(secondaryPane, record, datasetData?.meta, datasetData?.source, {
      metaPlaceholder: primaryRecord
        ? 'Pick a neighbor to inspect its details.'
        : 'Select a vector to compute its nearest neighbors.',
      textPlaceholder: primaryRecord
        ? 'Choose a neighbor to view its source text.'
        : 'Select a vector first to reveal similar entries.',
      captionIdle,
      captionActive,
      contentKey,
      contentEntry,
      extraMeta,
    });
  }

  function setActiveNeighbor(neighborId) {
    const datasetData = datasetCache.get(activeDatasetId);
    if (!datasetData || !activeRecordId) {
      return;
    }

    if (!neighborId) {
      activeNeighborId = '';
      updateActiveNeighborButton();
      const primaryRecord = datasetData.recordMap.get(activeRecordId) || null;
      renderSecondaryPane(primaryRecord, null, datasetData);
      return;
    }

    const neighbor = neighborRecords.find((entry) => entry.id === neighborId);
    if (!neighbor) {
      return;
    }

    activeNeighborId = neighborId;
    updateActiveNeighborButton();
    const primaryRecord = datasetData.recordMap.get(activeRecordId) || null;
    renderSecondaryPane(primaryRecord, neighbor, datasetData);
  }

  function setActiveRecord(recordId) {
    const datasetData = datasetCache.get(activeDatasetId);
    if (!datasetData) {
      return;
    }

    if (!recordId) {
      activeRecordId = '';
      neighborRecords = [];
      activeNeighborId = '';
      updateActiveRecordButton();
      updateSummaryForVector([]);
      renderPrimaryPane(null, datasetData);
      renderNeighborList(datasetData);
      renderSecondaryPane(null, null, datasetData);
      updateActiveNeighborButton();
      return;
    }

    const record = datasetData.recordMap.get(recordId);
    if (!record) {
      return;
    }

    activeRecordId = recordId;
    updateActiveRecordButton();
    ensureVectorData(record);
    updateSummaryForVector(record.floatVector);
    renderPrimaryPane(record, datasetData);
    neighborRecords = computeNeighbors(record, datasetData);
    if (!neighborRecords.length) {
      activeNeighborId = '';
    } else if (!neighborRecords.some((entry) => entry.id === activeNeighborId)) {
      activeNeighborId = neighborRecords[0].id;
    }
    renderNeighborList(datasetData);
    updateActiveNeighborButton();
    const neighborEntry = neighborRecords.find((entry) => entry.id === activeNeighborId) || null;
    renderSecondaryPane(record, neighborEntry, datasetData);
  }

  function applyFilter() {
    const datasetData = datasetCache.get(activeDatasetId);
    if (!datasetData) {
      return;
    }

    const term = filterInput.value.trim().toLowerCase();

    if (!term) {
      filteredRecords = currentRecords;
    } else {
      filteredRecords = currentRecords.filter((record) => {
        if (record.id.toLowerCase().includes(term)) {
          return true;
        }
        if (record.vectorSha256 && record.vectorSha256.toLowerCase().includes(term)) {
          return true;
        }
        if (record.textHash && record.textHash.toLowerCase().includes(term)) {
          return true;
        }
        return false;
      });
    }

    renderRecordList();
    updateRecordStatus();

    if (!filteredRecords.length) {
      setActiveRecord('');
      return;
    }

    const current = filteredRecords.find((record) => record.id === activeRecordId);
    if (current) {
      setActiveRecord(current.id);
      return;
    }

    setActiveRecord(filteredRecords[0].id);
  }
  function handleDatasetChange() {
    const datasetId = datasetSelect.value;
    activeDatasetId = datasetId;
    activeRecordId = '';
    activeNeighborId = '';
    currentRecords = [];
    filteredRecords = [];
    neighborRecords = [];

    filterInput.value = '';
    filterInput.disabled = true;

    updateSummaryForVector([]);
    renderPrimaryPane(null, null);
    renderSecondaryPane(null, null, null);

    if (!datasetId) {
      datasetInfo.innerHTML = '<p class="placeholder">Choose a dataset to inspect its metadata.</p>';
      recordList.innerHTML = '<li><p class="placeholder">Select a dataset to load its vectors.</p></li>';
      recordStatus.textContent = 'No dataset selected.';
      neighborList.innerHTML = '';
      neighborList.appendChild(createPlaceholderItem('Select a dataset to explore similar vectors.'));
      neighborStatus.textContent = 'Select a dataset to compute neighbors.';
      return;
    }

    const source = sources.find((entry) => entry.id === datasetId);
    if (!source) {
      datasetInfo.innerHTML = '<p class="placeholder">The selected dataset is not configured.</p>';
      recordList.innerHTML = '<li><p class="placeholder">Unable to load this dataset.</p></li>';
      recordStatus.textContent = 'Dataset configuration error.';
      neighborList.innerHTML = '';
      neighborList.appendChild(createPlaceholderItem('Fix the dataset configuration to continue.'));
      neighborStatus.textContent = 'Unable to compute neighbors for this dataset.';
      return;
    }

    recordList.innerHTML = '<li><p class="placeholder">Loading vectors…</p></li>';
    recordStatus.textContent = 'Loading vectors…';
    neighborList.innerHTML = '';
    neighborList.appendChild(createPlaceholderItem('Neighbors appear after the vector list loads.'));
    neighborStatus.textContent = 'Select a vector to compute its nearest neighbors.';

    if (datasetCache.has(datasetId)) {
      const cached = datasetCache.get(datasetId);
      currentRecords = cached.records;
      filteredRecords = cached.records;
      updateDatasetInfo(cached.meta, cached.source);
      filterInput.disabled = !currentRecords.length;
      renderRecordList();
      updateRecordStatus();
      if (filteredRecords.length) {
        setActiveRecord(filteredRecords[0].id);
      } else {
        setActiveRecord('');
        neighborList.innerHTML = '';
        neighborList.appendChild(createPlaceholderItem('No neighbors available without any vectors.'));
        neighborStatus.textContent = 'This dataset does not include any vectors.';
      }
      return;
    }

    const datasetRequest = fetch(source.url).then((response) => {
      if (!response.ok) {
        throw new Error(`Failed to load ${source.url}`);
      }
      return response.json();
    });

    const reportRequest = typeof source.report === 'string' && source.report
      ? fetch(source.report)
          .then((response) => {
            if (!response.ok) {
              throw new Error(`Failed to load ${source.report}`);
            }
            return response.json();
          })
          .catch((error) => {
            console.warn('Failed to load neighbor report', error);
            return null;
          })
      : Promise.resolve(null);

    Promise.all([datasetRequest, reportRequest, loadOverrides()])
      .then(([data, reportData, overrides]) => {
        const meta = data?.meta || {};
        const recordsObject = data?.records || {};
        const records = Object.keys(recordsObject).map((id) => {
          const entry = recordsObject[id] || {};
          const vectorString = typeof entry.vector === 'string' ? entry.vector : '';
          const vectorBytes = decodeVectorBytes(vectorString);
          const floatVector = bytesToFloat32(vectorBytes);
          return {
            id,
            ...entry,
            vector: vectorString,
            vectorBytes,
            floatVector,
            vectorMagnitude: computeMagnitude(floatVector),
          };
        });

        records.sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true, sensitivity: 'base' }));

        const recordMap = new Map();
        records.forEach((record) => {
          recordMap.set(record.id, record);
        });

        const contentKey = collectionContentKeys.get(source.collection) || '';
        const overrideMap =
          contentKey && overrides instanceof Map && overrides.has(contentKey)
            ? overrides.get(contentKey)
            : new Map();
        const neighborMap = buildNeighborMapFromReport(reportData);

        const datasetData = {
          source,
          meta,
          records,
          recordMap,
          contentKey,
          neighborMap,
          overrideMap,
        };

        datasetCache.set(datasetId, datasetData);

        currentRecords = records;
        filteredRecords = records;
        updateDatasetInfo(meta, source);
        filterInput.disabled = !records.length;
        renderRecordList();
        updateRecordStatus();

        if (records.length) {
          setActiveRecord(records[0].id);
        } else {
          setActiveRecord('');
          neighborList.innerHTML = '';
          neighborList.appendChild(createPlaceholderItem('No neighbors available without any vectors.'));
          neighborStatus.textContent = 'This dataset does not include any vectors.';
        }
      })
      .catch((error) => {
        console.error('Failed to load dataset', error);
        datasetInfo.innerHTML = '<p class="placeholder">Failed to load dataset metadata.</p>';
        recordList.innerHTML = '<li><p class="placeholder">Could not load vectors. Please try again.</p></li>';
        recordStatus.textContent = 'Failed to load dataset.';
        filterInput.disabled = true;
        neighborList.innerHTML = '';
      neighborList.appendChild(createPlaceholderItem('Neighbors cannot load without the vector data.'));
      neighborStatus.textContent = 'Unable to compute neighbors.';
      renderPrimaryPane(null, null);
      renderSecondaryPane(null, null, null);
      updateSummaryForVector([]);
    });
  }

  datasetSelect.addEventListener('change', () => {
    handleDatasetChange();
  });

  recordList.addEventListener('click', (event) => {
    const button = event.target.closest('.record-button');
    if (!button) {
      return;
    }
    const recordId = button.dataset.recordId;
    if (!recordId || recordId === activeRecordId) {
      return;
    }
    setActiveRecord(recordId);
  });

  neighborList.addEventListener('click', (event) => {
    const button = event.target.closest('.neighbor-button');
    if (!button) {
      return;
    }
    const neighborId = button.dataset.neighborId;
    if (!neighborId || neighborId === activeNeighborId) {
      return;
    }
    setActiveNeighbor(neighborId);
  });

  filterInput.addEventListener('input', () => {
    applyFilter();
  });

  populateDatasetSelect();

  if (datasetSelect.value) {
    handleDatasetChange();
  } else {
    neighborList.innerHTML = '';
    neighborList.appendChild(createPlaceholderItem('Select a dataset to explore similar vectors.'));
    neighborStatus.textContent = 'Select a dataset to compute neighbors.';
  }
})();
