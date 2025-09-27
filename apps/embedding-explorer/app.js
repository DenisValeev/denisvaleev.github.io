(function () {
  const sources = Array.isArray(window.embeddingSources) ? window.embeddingSources : [];

  const pairSelect = document.querySelector('[data-pair-select]');
  const pairStatus = document.querySelector('[data-pair-status]');

  const leftDatasetSelect = document.querySelector('[data-left-dataset-select]');
  const leftDatasetInfo = document.querySelector('[data-left-dataset-info]');
  const leftRecordList = document.querySelector('[data-left-record-list]');
  const leftRecordStatus = document.querySelector('[data-left-record-status]');
  const leftFilterInput = document.querySelector('[data-left-record-filter]');

  const rightDatasetSelect = document.querySelector('[data-right-dataset-select]');
  const rightDatasetInfo = document.querySelector('[data-right-dataset-info]');
  const rightRecordList = document.querySelector('[data-right-record-list]');
  const rightRecordStatus = document.querySelector('[data-right-record-status]');
  const rightFilterInput = document.querySelector('[data-right-record-filter]');

  const primaryCanvas = document.querySelector('[data-primary-canvas]');
  const primaryMeta = document.querySelector('[data-primary-meta]');
  const primaryText = document.querySelector('[data-primary-text]');
  const secondaryCanvas = document.querySelector('[data-secondary-canvas]');
  const secondaryMeta = document.querySelector('[data-secondary-meta]');
  const secondaryText = document.querySelector('[data-secondary-text]');
  const primaryCaption = document.querySelector('[data-primary-caption]');
  const secondaryCaption = document.querySelector('[data-secondary-caption]');
  const visualizationSelect = document.querySelector('[data-visualization-select]');

  if (
    !pairSelect ||
    !pairStatus ||
    !leftDatasetSelect ||
    !leftDatasetInfo ||
    !leftRecordList ||
    !leftRecordStatus ||
    !leftFilterInput ||
    !rightDatasetSelect ||
    !rightDatasetInfo ||
    !rightRecordList ||
    !rightRecordStatus ||
    !rightFilterInput ||
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
  const sourceMap = new Map();
  sources.forEach((source) => {
    if (source && source.id) {
      sourceMap.set(source.id, source);
    }
  });

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

  const sides = {
    left: {
      key: 'left',
      datasetSelect: leftDatasetSelect,
      datasetInfo: leftDatasetInfo,
      recordList: leftRecordList,
      recordStatus: leftRecordStatus,
      filterInput: leftFilterInput,
      activeDatasetId: '',
      activeRecordId: '',
      activePreviewText: '',
      currentRecords: [],
      filteredRecords: [],
    },
    right: {
      key: 'right',
      datasetSelect: rightDatasetSelect,
      datasetInfo: rightDatasetInfo,
      recordList: rightRecordList,
      recordStatus: rightRecordStatus,
      filterInput: rightFilterInput,
      activeDatasetId: '',
      activeRecordId: '',
      activePreviewText: '',
      currentRecords: [],
      filteredRecords: [],
    },
  };

  const DEFAULT_VISUALIZATION_MODE = 'diverging';
  const visualizationModes = {
    diverging: {
      label: 'Positive/negative heatmap',
      primaryIdle: 'Pick a vector to render its heatmap.',
      primaryActive(recordId) {
        return `Positive/negative heatmap for ${recordId}.`;
      },
      secondaryIdle(hasLeftSelection) {
        return hasLeftSelection
          ? 'Select a right-side vector to view its heatmap.'
          : 'Choose a left vector first to enable the heatmap comparison.';
      },
      secondaryActive({ hasLeftSelection, leftId, rightId }) {
        return hasLeftSelection
          ? `Positive/negative heatmap comparing ${rightId} with ${leftId}.`
          : `Positive/negative heatmap for ${rightId}.`;
      },
    },
    binary: {
      label: 'Raw binary RGB fingerprint',
      primaryIdle: 'Pick a vector to render its fingerprint.',
      primaryActive(recordId) {
        return `Binary fingerprint for ${recordId}.`;
      },
      secondaryIdle(hasLeftSelection) {
        return hasLeftSelection
          ? 'Select a right-side vector to view its fingerprint.'
          : 'Choose a left vector first to enable fingerprint comparison.';
      },
      secondaryActive({ hasLeftSelection, leftId, rightId }) {
        return hasLeftSelection
          ? `Binary fingerprint comparing ${rightId} with ${leftId}.`
          : `Binary fingerprint for ${rightId}.`;
      },
    },
  };

  let activeVisualizationMode = DEFAULT_VISUALIZATION_MODE;

  let topPairs = [];
  const TOP_PAIR_LIMIT = 50;

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

  function detectVectorTiling(values) {
    if (!(values instanceof Float32Array)) {
      return null;
    }

    const length = values.length;
    if (length <= 1) {
      return null;
    }

    for (let tileSize = 1; tileSize <= Math.floor(length / 2); tileSize += 1) {
      if (length % tileSize !== 0) {
        continue;
      }

      let isRepeated = true;
      for (let index = tileSize; index < length; index += 1) {
        const compareIndex = index % tileSize;
        if (values[index] !== values[compareIndex]) {
          isRepeated = false;
          break;
        }
      }

      if (isRepeated) {
        const repeatCount = length / tileSize;
        if (repeatCount > 1) {
          return { tileSize, repeatCount };
        }
      }
    }

    return null;
  }

  function analyzeVector(values) {
    if (!(values instanceof Float32Array) || !values.length) {
      return null;
    }

    const uniqueValues = new Set();
    let min = Number.POSITIVE_INFINITY;
    let max = Number.NEGATIVE_INFINITY;
    let finiteCount = 0;

    for (let index = 0; index < values.length; index += 1) {
      const value = values[index];
      if (!Number.isFinite(value)) {
        continue;
      }
      finiteCount += 1;
      uniqueValues.add(value);
      if (value < min) {
        min = value;
      }
      if (value > max) {
        max = value;
      }
    }

    const range = Number.isFinite(min) && Number.isFinite(max) ? { min, max } : null;
    const tiling = detectVectorTiling(values);

    return {
      length: values.length,
      finiteCount,
      uniqueCount: uniqueValues.size,
      range,
      tiling,
    };
  }

  function getVisualizationConfig(mode) {
    if (typeof mode !== 'string') {
      return visualizationModes[DEFAULT_VISUALIZATION_MODE];
    }
    return visualizationModes[mode] || visualizationModes[DEFAULT_VISUALIZATION_MODE];
  }

  function getVisualizationLabel(mode) {
    return getVisualizationConfig(mode).label;
  }

  function getActiveVisualizationMode() {
    return visualizationModes[activeVisualizationMode] ? activeVisualizationMode : DEFAULT_VISUALIZATION_MODE;
  }

  function setActiveVisualizationMode(mode) {
    activeVisualizationMode = visualizationModes[mode] ? mode : DEFAULT_VISUALIZATION_MODE;
    return activeVisualizationMode;
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function createBinaryVisualization(ctx, bytes) {
    const dataView = bytes instanceof Uint8Array ? bytes : new Uint8Array();
    const pixelCount = Math.max(1, Math.ceil(dataView.length / 3));
    const width = Math.max(1, Math.ceil(Math.sqrt(pixelCount)));
    const height = Math.max(1, Math.ceil(pixelCount / width));
    const imageData = ctx.createImageData(width, height);
    const data = imageData.data;
    let byteIndex = 0;

    for (let index = 0; index < width * height; index += 1) {
      data[index * 4] = dataView[byteIndex] ?? 0;
      data[index * 4 + 1] = dataView[byteIndex + 1] ?? 0;
      data[index * 4 + 2] = dataView[byteIndex + 2] ?? 0;
      data[index * 4 + 3] = 255;
      byteIndex += 3;
    }

    return { width, height, imageData, mode: 'binary' };
  }

  function createDivergingVisualization(ctx, values) {
    const vector = values instanceof Float32Array ? values : new Float32Array();
    if (!vector.length) {
      return null;
    }

    let maxMagnitude = 0;
    for (let index = 0; index < vector.length; index += 1) {
      const value = vector[index];
      if (Number.isFinite(value)) {
        const magnitude = Math.abs(value);
        if (magnitude > maxMagnitude) {
          maxMagnitude = magnitude;
        }
      }
    }

    if (!Number.isFinite(maxMagnitude) || maxMagnitude === 0) {
      maxMagnitude = 1;
    }

    const pixelCount = Math.max(1, vector.length);
    const width = Math.max(1, Math.ceil(Math.sqrt(pixelCount)));
    const height = Math.max(1, Math.ceil(pixelCount / width));
    const imageData = ctx.createImageData(width, height);
    const data = imageData.data;

    const yellow = { r: 250, g: 204, b: 21 };
    const green = { r: 22, g: 163, b: 74 };
    const red = { r: 220, g: 38, b: 38 };

    for (let index = 0; index < width * height; index += 1) {
      const rawValue = index < vector.length ? vector[index] : 0;
      const finiteValue = Number.isFinite(rawValue) ? rawValue : 0;
      const normalized = Math.max(-1, Math.min(1, finiteValue / maxMagnitude));
      let r = yellow.r;
      let g = yellow.g;
      let b = yellow.b;

      if (normalized > 0) {
        const t = normalized;
        r = Math.round(lerp(yellow.r, green.r, t));
        g = Math.round(lerp(yellow.g, green.g, t));
        b = Math.round(lerp(yellow.b, green.b, t));
      } else if (normalized < 0) {
        const t = -normalized;
        r = Math.round(lerp(yellow.r, red.r, t));
        g = Math.round(lerp(yellow.g, red.g, t));
        b = Math.round(lerp(yellow.b, red.b, t));
      }

      data[index * 4] = r;
      data[index * 4 + 1] = g;
      data[index * 4 + 2] = b;
      data[index * 4 + 3] = 255;
    }

    return { width, height, imageData, mode: 'diverging' };
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

  function renderPreviewTextRecord(container, contentKey, preview) {
    if (!container || !preview) {
      return;
    }

    const wrapper = document.createElement('article');
    wrapper.className = 'text-record';

    const heading = document.createElement('h3');
    heading.className = 'text-record__heading';
    const baseTitle = getContentTitle(contentKey);
    heading.textContent = baseTitle ? `${baseTitle} preview` : 'Source preview';
    wrapper.appendChild(heading);

    const list = document.createElement('dl');
    list.className = 'text-record__list';

    const dt = document.createElement('dt');
    dt.textContent = 'Preview';
    const dd = document.createElement('dd');
    dd.textContent = preview;
    list.append(dt, dd);

    wrapper.appendChild(list);
    container.appendChild(wrapper);
  }

  function renderContentText(container, contentKey, entry, placeholder, previewFallback) {
    if (!container) {
      return;
    }

    container.innerHTML = '';

    const preview = typeof previewFallback === 'string' ? previewFallback.trim() : '';

    if (!entry) {
      if (preview) {
        renderPreviewTextRecord(container, contentKey, preview);
        return;
      }
      const message = document.createElement('p');
      message.className = 'placeholder';
      message.textContent = placeholder || 'Source text not available for this vector.';
      container.appendChild(message);
      return;
    }

    const fields = getContentFields(contentKey, entry);

    if (!fields.length) {
      if (preview) {
        renderPreviewTextRecord(container, contentKey, preview);
        return;
      }
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

  function createPlaceholderItem(message) {
    const item = document.createElement('li');
    const paragraph = document.createElement('p');
    paragraph.className = 'placeholder';
    paragraph.textContent = message;
    item.appendChild(paragraph);
    return item;
  }

  function updateDatasetInfoElement(target, meta, source) {
    if (!target) {
      return;
    }

    target.innerHTML = '';

    if (!meta || typeof meta !== 'object') {
      target.innerHTML = '<p class="placeholder">No metadata available.</p>';
      return;
    }

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

    target.appendChild(list);
  }

  function renderPane(pane, record, datasetMeta, source, options = {}) {
    if (!pane || !pane.canvas) {
      return;
    }

    const metaPlaceholder = options.metaPlaceholder || 'Select a vector to inspect its details.';
    const textPlaceholder = options.textPlaceholder || 'Select a vector to view its source text.';
    const captionIdle = options.captionIdle || '';
    const captionActive = options.captionActive || captionIdle;
    const visualizationMode = typeof options.visualizationMode === 'string'
      ? options.visualizationMode
      : getActiveVisualizationMode();

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
    const analysis = analyzeVector(record.floatVector);
    let renderResult = null;

    if (visualizationMode === 'diverging') {
      renderResult = createDivergingVisualization(ctx, record.floatVector);
    }

    if (!renderResult) {
      renderResult = createBinaryVisualization(ctx, bytes);
    }

    const appliedMode = renderResult.mode || visualizationMode;
    const visualizationLabel = getVisualizationLabel(appliedMode);
    const { width, height, imageData } = renderResult;
    pane.canvas.width = width;
    pane.canvas.height = height;
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
        { label: 'Visualization', value: visualizationLabel },
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

      if (analysis) {
        if (analysis.range) {
          const minLabel = analysis.range.min.toFixed(3);
          const maxLabel = analysis.range.max.toFixed(3);
          metaItems.push({ label: 'Value range', value: `${minLabel} → ${maxLabel}` });
        }

        if (analysis.length) {
          const uniqueShare = analysis.length ? Math.round((analysis.uniqueCount / analysis.length) * 100) : 0;
          const finiteLabel = analysis.finiteCount === analysis.length
            ? 'All values finite'
            : `${analysis.finiteCount.toLocaleString()} finite`;
          metaItems.push({
            label: 'Unique values',
            value: `${analysis.uniqueCount.toLocaleString()} (${uniqueShare}% distinct)`,
            title: finiteLabel,
          });
        }

        if (analysis.tiling) {
          const { tileSize, repeatCount } = analysis.tiling;
          const repeatLabel = tileSize === 1
            ? `Single value repeated ${repeatCount.toLocaleString()}×`
            : `${tileSize.toLocaleString()}D tile repeated ${repeatCount.toLocaleString()}×`;
          const repeatTitle = tileSize === 1
            ? 'Every dimension shares the same value.'
            : `The leading ${tileSize.toLocaleString()} dimensions repeat to fill the vector.`;
          metaItems.push({ label: 'Detected tiling', value: repeatLabel, title: repeatTitle });
        }
      }

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
      const previewFallback = typeof options.previewFallback === 'string' ? options.previewFallback : '';
      renderContentText(
        pane.text,
        options.contentKey || '',
        options.contentEntry || null,
        textPlaceholder,
        previewFallback
      );
    }
  }

  function computePairSimilarity(leftRecord, rightRecord) {
    if (!leftRecord || !rightRecord) {
      return Number.NaN;
    }

    ensureVectorData(leftRecord);
    ensureVectorData(rightRecord);

    const leftVector = leftRecord.floatVector;
    const rightVector = rightRecord.floatVector;
    if (!(leftVector instanceof Float32Array) || !(rightVector instanceof Float32Array)) {
      return Number.NaN;
    }
    if (leftVector.length !== rightVector.length) {
      return Number.NaN;
    }

    const leftMagnitude = leftRecord.vectorMagnitude;
    const rightMagnitude = rightRecord.vectorMagnitude;
    if (!Number.isFinite(leftMagnitude) || !Number.isFinite(rightMagnitude) || leftMagnitude === 0 || rightMagnitude === 0) {
      return Number.NaN;
    }

    let dot = 0;
    for (let index = 0; index < leftVector.length; index += 1) {
      dot += leftVector[index] * rightVector[index];
    }

    const similarity = dot / (leftMagnitude * rightMagnitude);
    return Number.isFinite(similarity) ? similarity : Number.NaN;
  }

  function renderPrimaryPane(record, datasetData) {
    const contentKey = datasetData?.contentKey || '';
    const contentEntry = record ? getContentEntry(contentKey, record.id) : null;
    const visualizationMode = getActiveVisualizationMode();
    const visualizationConfig = getVisualizationConfig(visualizationMode);
    const captionIdle = visualizationConfig.primaryIdle;
    const captionActive = record ? visualizationConfig.primaryActive(record.id) : captionIdle;
    const previewFallback = sides.left.activePreviewText || '';

    renderPane(primaryPane, record, datasetData?.meta, datasetData?.source, {
      metaPlaceholder: 'Select a vector to inspect its details.',
      textPlaceholder: 'Choose a vector to load its source text.',
      captionIdle,
      captionActive,
      contentKey,
      contentEntry,
      previewFallback,
      visualizationMode,
    });
  }

  function renderSecondaryPane(leftRecord, rightRecord, datasetData) {
    const contentKey = datasetData?.contentKey || '';
    const contentEntry = rightRecord ? getContentEntry(contentKey, rightRecord.id) : null;
    const previewFallback = sides.right.activePreviewText || '';
    const hasLeftSelection = Boolean(leftRecord);
    const visualizationMode = getActiveVisualizationMode();
    const visualizationConfig = getVisualizationConfig(visualizationMode);
    const captionIdle = visualizationConfig.secondaryIdle(hasLeftSelection);
    let captionActive = captionIdle;

    const extraMeta = [];

    if (rightRecord) {
      captionActive = visualizationConfig.secondaryActive({
        hasLeftSelection,
        leftId: leftRecord?.id || '',
        rightId: rightRecord.id,
      });

      if (leftRecord) {
        const similarity = computePairSimilarity(leftRecord, rightRecord);
        if (Number.isFinite(similarity)) {
          extraMeta.push({ label: 'Cosine similarity', value: formatSimilarity(similarity) });
        }
      }
    }

    renderPane(secondaryPane, rightRecord, datasetData?.meta, datasetData?.source, {
      metaPlaceholder: hasLeftSelection
        ? 'Pick a right-side vector to inspect its details.'
        : 'Select a left vector to start the comparison.',
      textPlaceholder: hasLeftSelection
        ? 'Choose a right-side vector to view its source text.'
        : 'Select a left vector first to enable text comparison.',
      captionIdle,
      captionActive,
      contentKey,
      contentEntry,
      extraMeta,
      previewFallback,
      visualizationMode,
    });
  }

  function renderComparison() {
    const leftDatasetId = sides.left.activeDatasetId;
    const rightDatasetId = sides.right.activeDatasetId;
    const leftData = leftDatasetId ? datasetCache.get(leftDatasetId) : null;
    const rightData = rightDatasetId ? datasetCache.get(rightDatasetId) : null;

    const leftRecord = leftData?.recordMap.get(sides.left.activeRecordId) || null;
    const rightRecord = rightData?.recordMap.get(sides.right.activeRecordId) || null;

    renderPrimaryPane(leftRecord, leftData || null);
    renderSecondaryPane(leftRecord, rightRecord, rightData || null);
  }

  function updateRecordStatus(side) {
    if (!side || !side.recordStatus) {
      return;
    }

    if (!side.activeDatasetId) {
      side.recordStatus.textContent = 'Choose a dataset to load its vectors.';
      return;
    }

    if (!side.currentRecords.length) {
      side.recordStatus.textContent = 'No vectors available for this dataset.';
      return;
    }

    if (!side.filteredRecords.length) {
      const searchTerm = side.filterInput.value.trim();
      side.recordStatus.textContent = searchTerm
        ? `No matches for “${searchTerm}”.`
        : 'No vectors match the current filter.';
      return;
    }

    side.recordStatus.textContent = `Showing ${side.filteredRecords.length.toLocaleString()} of ${side.currentRecords.length.toLocaleString()} vectors.`;
  }

  function renderRecordList(side) {
    if (!side || !side.recordList) {
      return;
    }

    side.recordList.innerHTML = '';

    if (!side.filteredRecords.length) {
      const message = side.currentRecords.length
        ? 'No vectors match this filter.'
        : 'No vectors available for this dataset.';
      side.recordList.appendChild(createPlaceholderItem(message));
      return;
    }

    const fragment = document.createDocumentFragment();

    side.filteredRecords.forEach((record) => {
      const item = document.createElement('li');
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'record-button';
      button.dataset.recordId = record.id;
      const isActive = record.id === side.activeRecordId;
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

    side.recordList.appendChild(fragment);
  }

  function setActiveRecord(sideKey, recordId, options = {}) {
    const side = sides[sideKey];
    if (!side) {
      return;
    }

    const datasetId = side.activeDatasetId;
    if (!datasetId) {
      side.activeRecordId = '';
      side.activePreviewText = '';
      renderComparison();
      return;
    }

    const datasetData = datasetCache.get(datasetId);
    if (!datasetData) {
      return;
    }

    if (!recordId || !datasetData.recordMap.has(recordId)) {
      side.activeRecordId = '';
      side.activePreviewText = '';
      renderRecordList(side);
      updateRecordStatus(side);
      renderComparison();
      return;
    }

    const previewText = typeof options.preview === 'string' ? options.preview.trim() : '';
    side.activeRecordId = recordId;
    side.activePreviewText = previewText;
    renderRecordList(side);
    updateRecordStatus(side);
    renderComparison();
  }

  function applyFilter(sideKey) {
    const side = sides[sideKey];
    if (!side) {
      return;
    }

    const datasetId = side.activeDatasetId;
    if (!datasetId) {
      side.filteredRecords = [];
      renderRecordList(side);
      updateRecordStatus(side);
      return;
    }

    const datasetData = datasetCache.get(datasetId);
    if (!datasetData) {
      return;
    }

    const term = side.filterInput.value.trim().toLowerCase();

    if (!term) {
      side.filteredRecords = side.currentRecords;
    } else {
      side.filteredRecords = side.currentRecords.filter((record) => {
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

    renderRecordList(side);
    updateRecordStatus(side);

    if (!side.filteredRecords.length) {
      side.activeRecordId = '';
      renderComparison();
      return;
    }

    if (side.filteredRecords.some((record) => record.id === side.activeRecordId)) {
      return;
    }

    const nextRecordId = side.filteredRecords[0]?.id || '';
    setActiveRecord(sideKey, nextRecordId);
  }

  function resetSide(side) {
    if (!side) {
      return;
    }

    side.activeDatasetId = '';
    side.activeRecordId = '';
    side.activePreviewText = '';
    side.currentRecords = [];
    side.filteredRecords = [];
    side.filterInput.value = '';
    side.filterInput.disabled = true;

    if (side.datasetInfo) {
      side.datasetInfo.innerHTML = '<p class="placeholder">Pick a dataset to inspect its metadata.</p>';
    }

    if (side.recordList) {
      side.recordList.innerHTML = '';
      side.recordList.appendChild(createPlaceholderItem('Select a dataset to load its vectors.'));
    }

    if (side.recordStatus) {
      side.recordStatus.textContent = 'Choose a dataset to load its vectors.';
    }
  }

  function loadDatasetData(datasetId) {
    if (!datasetId || !sourceMap.has(datasetId)) {
      return Promise.reject(new Error('Dataset is not configured.'));
    }

    if (datasetCache.has(datasetId)) {
      return Promise.resolve(datasetCache.get(datasetId));
    }

    const source = sourceMap.get(datasetId);
    if (!source || !source.url) {
      return Promise.reject(new Error('Dataset source is missing.'));
    }

    return fetch(source.url)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Failed to load ${source.url}`);
        }
        return response.json();
      })
      .then((data) => {
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

        const datasetData = {
          source,
          meta,
          records,
          recordMap,
          contentKey,
        };

        datasetCache.set(datasetId, datasetData);
        return datasetData;
      });
  }

  function setDatasetForSide(sideKey, datasetId, options = {}) {
    const side = sides[sideKey];
    if (!side) {
      return Promise.resolve();
    }

    const { recordId = '', preview = '' } = options;

    if (!datasetId) {
      resetSide(side);
      renderComparison();
      return Promise.resolve();
    }

    const source = sourceMap.get(datasetId);
    if (!source) {
      resetSide(side);
      if (side.recordStatus) {
        side.recordStatus.textContent = 'Dataset configuration error.';
      }
      renderComparison();
      return Promise.reject(new Error('Dataset configuration error.'));
    }

    side.datasetSelect.value = datasetId;

    const assignRecords = (datasetData) => {
      side.activeDatasetId = datasetId;
      side.currentRecords = datasetData.records;
      side.filteredRecords = datasetData.records;
      side.filterInput.value = '';
      side.filterInput.disabled = !datasetData.records.length;
      updateDatasetInfoElement(side.datasetInfo, datasetData.meta, datasetData.source);
      renderRecordList(side);
      updateRecordStatus(side);
      const candidateId = recordId && datasetData.recordMap.has(recordId)
        ? recordId
        : datasetData.records[0]?.id || '';
      const candidatePreview = candidateId === recordId ? preview : '';
      setActiveRecord(sideKey, candidateId, { preview: candidatePreview });
    };

    const cached = datasetCache.get(datasetId);
    if (cached && side.activeDatasetId === datasetId) {
      assignRecords(cached);
      return Promise.resolve();
    }

    side.recordList.innerHTML = '';
    side.recordList.appendChild(createPlaceholderItem('Loading vectors…'));
    side.recordStatus.textContent = 'Loading vectors…';
    side.filterInput.value = '';
    side.filterInput.disabled = true;
    if (side.datasetInfo) {
      side.datasetInfo.innerHTML = '<p class="placeholder">Loading metadata…</p>';
    }
    side.activeDatasetId = datasetId;
    side.activeRecordId = '';
    side.activePreviewText = '';

    return loadDatasetData(datasetId)
      .then((datasetData) => {
        assignRecords(datasetData);
      })
      .catch((error) => {
        console.error('Failed to load dataset', error);
        if (side.datasetInfo) {
          side.datasetInfo.innerHTML = '<p class="placeholder">Failed to load dataset metadata.</p>';
        }
        side.recordList.innerHTML = '';
        side.recordList.appendChild(createPlaceholderItem('Could not load vectors. Please try again.'));
        side.recordStatus.textContent = 'Failed to load dataset.';
        side.filterInput.disabled = true;
        side.currentRecords = [];
        side.filteredRecords = [];
        side.activeDatasetId = '';
        side.activeRecordId = '';
        renderComparison();
        throw error;
      });
  }

  function populateDatasetSelects() {
    const selects = [sides.left.datasetSelect, sides.right.datasetSelect];

    selects.forEach((select) => {
      if (!select) {
        return;
      }

      select.innerHTML = '';

      if (!sources.length) {
        select.disabled = true;
        const option = document.createElement('option');
        option.value = '';
        option.textContent = 'No datasets available';
        select.append(option);
        return;
      }

      sources.forEach((source, index) => {
        const option = document.createElement('option');
        option.value = source.id;
        option.textContent = source.label;
        if (index === 0) {
          option.selected = true;
        }
        select.append(option);
      });

      select.disabled = false;
    });
  }

  function describePair(pair) {
    const similarityText = Number.isFinite(pair.similarity) ? formatSimilarity(pair.similarity) : '—';
    const datasetLabel = pair.datasetLabel || 'Dataset';
    return `${similarityText} · ${datasetLabel} — ${pair.idLeft} ↔ ${pair.idRight}`;
  }

  function updatePairStatus(pair) {
    if (!pair) {
      pairStatus.textContent = 'Select a pair to load both vectors.';
      return;
    }

    const similarityText = Number.isFinite(pair.similarity) ? formatSimilarity(pair.similarity) : '—';
    const datasetLabel = pair.datasetLabel || 'dataset';
    const previewA = pair.previewLeft ? `“${pair.previewLeft}”` : '';
    const previewB = pair.previewRight ? `“${pair.previewRight}”` : '';
    const previews = [previewA, previewB].filter(Boolean).join(' ⟷ ');

    const details = [`Comparing ${pair.idLeft} and ${pair.idRight}`];
    details.push(`from ${datasetLabel}`);
    if (Number.isFinite(pair.similarity)) {
      details.push(`cosine ${similarityText}`);
    }
    if (previews) {
      details.push(previews);
    }
    pairStatus.textContent = details.join(' — ');
  }

  function populatePairSelect() {
    pairSelect.innerHTML = '';

    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = topPairs.length ? 'Choose a pair' : 'No pairs available';
    placeholder.disabled = true;
    placeholder.selected = true;
    pairSelect.append(placeholder);

    topPairs.forEach((pair, index) => {
      const option = document.createElement('option');
      option.value = String(index);
      option.textContent = describePair(pair);
      const preview = [pair.previewLeft, pair.previewRight].filter(Boolean).join(' ⟷ ');
      if (preview) {
        option.title = preview;
      }
      pairSelect.append(option);
    });

    pairSelect.disabled = !topPairs.length;
  }

  function loadTopPairs(limit = TOP_PAIR_LIMIT) {
    pairSelect.disabled = true;
    pairSelect.innerHTML = '';
    const loadingOption = document.createElement('option');
    loadingOption.value = '';
    loadingOption.textContent = 'Loading pairs…';
    loadingOption.disabled = true;
    loadingOption.selected = true;
    pairSelect.append(loadingOption);
    pairStatus.textContent = 'Loading pair overview…';

    if (!sources.length) {
      topPairs = [];
      populatePairSelect();
      pairStatus.textContent = 'No datasets configured for pair selection.';
      return;
    }

    const requests = sources.map((source) => {
      if (!source.report) {
        return Promise.resolve([]);
      }

      return fetch(source.report)
        .then((response) => {
          if (!response.ok) {
            throw new Error(`Failed to load ${source.report}`);
          }
          return response.json();
        })
        .then((report) => {
          const matches = Array.isArray(report?.matches) ? report.matches : [];
          const sliceSize = Math.max(limit, 50);
          return matches.slice(0, sliceSize).map((entry) => ({
            datasetIdLeft: source.id,
            datasetIdRight: source.id,
            datasetLabel: source.label,
            similarity: Number.isFinite(entry.similarity) ? entry.similarity : Number(entry.similarity),
            idLeft: entry.idA,
            idRight: entry.idB,
            previewLeft: safeText(entry.previewA),
            previewRight: safeText(entry.previewB),
          }));
        })
        .catch((error) => {
          console.warn('Failed to load pair report', error);
          return [];
        });
    });

    Promise.all(requests)
      .then((results) => {
        const combined = results.flat();
        combined.sort((a, b) => (Number.isFinite(b.similarity) ? b.similarity : -Infinity) - (Number.isFinite(a.similarity) ? a.similarity : -Infinity));
        topPairs = combined.slice(0, limit);
        populatePairSelect();
        updatePairStatus(null);
      })
      .catch((error) => {
        console.error('Failed to load cosine pairs', error);
        topPairs = [];
        populatePairSelect();
        pairStatus.textContent = 'Failed to load cosine pairs.';
      });
  }

  function handlePairSelection(index) {
    const pair = topPairs[index];
    if (!pair) {
      return;
    }

    pairStatus.textContent = 'Loading selected pair…';

    Promise.all([
      setDatasetForSide('left', pair.datasetIdLeft, {
        recordId: pair.idLeft,
        preview: pair.previewLeft || '',
      }),
      setDatasetForSide('right', pair.datasetIdRight, {
        recordId: pair.idRight,
        preview: pair.previewRight || '',
      }),
    ])
      .then(() => {
        updatePairStatus(pair);
      })
      .catch((error) => {
        console.error('Failed to apply pair selection', error);
        pairStatus.textContent = 'Failed to load the selected pair.';
      });
  }

  function resetPairSelection() {
    if (!pairSelect.options.length) {
      return;
    }
    pairSelect.selectedIndex = 0;
    updatePairStatus(null);
  }

  function initialize() {
    populateDatasetSelects();

    if (sources.length) {
      const firstDatasetId = sources[0].id;
      setDatasetForSide('left', firstDatasetId).catch(() => {});
      setDatasetForSide('right', firstDatasetId).catch(() => {});
    } else {
      resetSide(sides.left);
      resetSide(sides.right);
      renderComparison();
    }

    loadTopPairs();
  }

  if (visualizationSelect) {
    visualizationSelect.value = getActiveVisualizationMode();
    visualizationSelect.addEventListener('change', (event) => {
      const nextMode = setActiveVisualizationMode(event.target.value);
      if (visualizationSelect.value !== nextMode) {
        visualizationSelect.value = nextMode;
      }
      renderComparison();
    });
  }

  pairSelect.addEventListener('change', () => {
    const value = pairSelect.value;
    const index = Number.parseInt(value, 10);
    if (!Number.isNaN(index)) {
      handlePairSelection(index);
    }
  });

  leftDatasetSelect.addEventListener('change', (event) => {
    if (event.isTrusted) {
      resetPairSelection();
    }
    setDatasetForSide('left', leftDatasetSelect.value).catch(() => {});
  });

  rightDatasetSelect.addEventListener('change', (event) => {
    if (event.isTrusted) {
      resetPairSelection();
    }
    setDatasetForSide('right', rightDatasetSelect.value).catch(() => {});
  });

  leftRecordList.addEventListener('click', (event) => {
    const button = event.target.closest('.record-button');
    if (!button) {
      return;
    }
    const recordId = button.dataset.recordId;
    if (!recordId || recordId === sides.left.activeRecordId) {
      return;
    }
    setActiveRecord('left', recordId);
  });

  rightRecordList.addEventListener('click', (event) => {
    const button = event.target.closest('.record-button');
    if (!button) {
      return;
    }
    const recordId = button.dataset.recordId;
    if (!recordId || recordId === sides.right.activeRecordId) {
      return;
    }
    setActiveRecord('right', recordId);
  });

  leftFilterInput.addEventListener('input', () => {
    applyFilter('left');
  });

  rightFilterInput.addEventListener('input', () => {
    applyFilter('right');
  });

  initialize();
})();
