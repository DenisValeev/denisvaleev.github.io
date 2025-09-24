(function () {
  const samples = Array.isArray(window.embeddingExplorerSamples)
    ? window.embeddingExplorerSamples
    : [];
  const sources = Array.isArray(window.embeddingSources) ? window.embeddingSources : [];

  const sampleList = document.querySelector('[data-sample-list]');
  const sampleMeta = document.querySelector('[data-sample-meta]');
  const summaryGrid = document.querySelector('[data-summary-grid]');
  const embeddingInput = document.querySelector('[data-embedding-input]');
  const updateButton = document.querySelector('[data-update-button]');
  const positiveList = document.querySelector('[data-positive-list]');
  const negativeList = document.querySelector('[data-negative-list]');
  const valueTable = document.querySelector('[data-value-table]');

  const datasetSelect = document.querySelector('[data-dataset-select]');
  const datasetInfo = document.querySelector('[data-dataset-info]');
  const recordList = document.querySelector('[data-record-list]');
  const recordStatus = document.querySelector('[data-record-status]');
  const filterInput = document.querySelector('[data-record-filter]');
  const previewCanvas = document.querySelector('[data-preview-canvas]');
  const previewMeta = document.querySelector('[data-preview-meta]');

  const hasSampleElements =
    sampleList &&
    sampleMeta &&
    summaryGrid &&
    embeddingInput &&
    updateButton &&
    positiveList &&
    negativeList &&
    valueTable;

  const hasDatasetElements =
    datasetSelect &&
    datasetInfo &&
    recordList &&
    recordStatus &&
    filterInput &&
    previewCanvas &&
    previewMeta;

  if (!hasSampleElements && !hasDatasetElements) {
    return;
  }

  if (hasSampleElements) {
    let activeSampleId = '';

    function formatNumber(value, decimals) {
      if (!Number.isFinite(value)) {
        return (0).toFixed(decimals);
      }
      return value.toFixed(decimals);
    }

    function parseVector(raw) {
      if (!raw) {
        return [];
      }

      return raw
        .split(/[\s,]+/)
        .map((token) => Number.parseFloat(token))
        .filter((value) => Number.isFinite(value));
    }

    function computeSummary(vector) {
      const count = vector.length;
      if (!count) {
        return {
          count: 0,
          magnitude: 0,
          mean: 0,
          stdDev: 0,
          min: 0,
          max: 0,
          zeroShare: 0,
        };
      }

      const sum = vector.reduce((total, value) => total + value, 0);
      const sumSquares = vector.reduce((total, value) => total + value * value, 0);
      const mean = sum / count;
      const magnitude = Math.sqrt(sumSquares);
      const variance =
        vector.reduce((total, value) => {
          const diff = value - mean;
          return total + diff * diff;
        }, 0) / count;
      const stdDev = Math.sqrt(variance);
      const min = Math.min(...vector);
      const max = Math.max(...vector);
      const zeroShare = (vector.filter((value) => value === 0).length / count) * 100;

      return { count, magnitude, mean, stdDev, min, max, zeroShare };
    }

    function updateSummary(vector) {
      const summaryValues = summaryGrid.querySelectorAll('dd');
      if (summaryValues.length < 6) {
        return;
      }

      const stats = computeSummary(vector);
      summaryValues[0].textContent = stats.count.toLocaleString();
      summaryValues[1].textContent = formatNumber(stats.magnitude, 3);
      summaryValues[2].textContent = formatNumber(stats.mean, 3);
      summaryValues[3].textContent = formatNumber(stats.stdDev, 3);
      if (vector.length) {
        summaryValues[4].textContent = `${formatNumber(stats.min, 3)} / ${formatNumber(stats.max, 3)}`;
        summaryValues[5].textContent = `${Math.round(stats.zeroShare)}%`;
      } else {
        summaryValues[4].textContent = '— / —';
        summaryValues[5].textContent = '0%';
      }
    }

    function renderExtremaList(target, items, emptyMessage) {
      target.innerHTML = '';
      if (!items.length) {
        const item = document.createElement('li');
        const span = document.createElement('span');
        span.className = 'placeholder';
        span.textContent = emptyMessage;
        item.appendChild(span);
        target.appendChild(item);
        return;
      }

      const fragment = document.createDocumentFragment();
      items.forEach((entry) => {
        const li = document.createElement('li');
        li.textContent = `#${entry.index}${formatNumber(entry.value, 3)}`;
        fragment.appendChild(li);
      });
      target.appendChild(fragment);
    }

    function updateExtrema(vector) {
      const entries = vector.map((value, index) => ({
        value,
        index: index + 1,
      }));

      const positives = entries
        .filter((entry) => entry.value > 0)
        .sort((a, b) => b.value - a.value)
        .slice(0, 5);

      const negatives = entries
        .filter((entry) => entry.value < 0)
        .sort((a, b) => a.value - b.value)
        .slice(0, 5);

      renderExtremaList(positiveList, positives, 'No positive values found.');
      renderExtremaList(negativeList, negatives, 'No negative values found.');
    }

    function updateValueTable(vector) {
      const body = valueTable;
      if (!body) {
        return;
      }

      body.innerHTML = '';

      if (!vector.length) {
        const emptyRow = document.createElement('tr');
        const idCell = document.createElement('td');
        idCell.textContent = '#1';
        const valueCell = document.createElement('td');
        const valueSpan = document.createElement('span');
        valueSpan.textContent = '0.000';
        valueCell.appendChild(valueSpan);
        const normCell = document.createElement('td');
        const normSpan = document.createElement('span');
        normSpan.textContent = '0.000';
        normCell.appendChild(normSpan);
        emptyRow.append(idCell, valueCell, normCell);
        body.appendChild(emptyRow);
        return;
      }

      const fragment = document.createDocumentFragment();
      const maxAbs = vector.reduce((largest, value) => Math.max(largest, Math.abs(value)), 0);

      vector.forEach((value, index) => {
        const row = document.createElement('tr');

        const idCell = document.createElement('td');
        idCell.textContent = `#${index + 1}`;

        const valueCell = document.createElement('td');
        const valueSpan = document.createElement('span');
        valueSpan.textContent = formatNumber(value, 3);
        valueCell.appendChild(valueSpan);

        const normCell = document.createElement('td');
        const normSpan = document.createElement('span');
        const normalized = maxAbs ? value / maxAbs : 0;
        normSpan.textContent = formatNumber(normalized, 3);
        normCell.appendChild(normSpan);

        row.append(idCell, valueCell, normCell);
        fragment.appendChild(row);
      });

      body.appendChild(fragment);
    }

    function applyVector(vector) {
      const cleanVector = vector.filter((value) => Number.isFinite(value));
      updateSummary(cleanVector);
      updateExtrema(cleanVector);
      updateValueTable(cleanVector);
    }

    function formatVectorForInput(vector) {
      return vector.map((value) => (Number.isFinite(value) ? value.toFixed(4) : '0.0000')).join(', ');
    }

    function setSampleMeta(sample, stats) {
      sampleMeta.innerHTML = '';
      const description = document.createElement('p');
      description.textContent = sample?.description || 'No description provided for this sample.';
      sampleMeta.appendChild(description);

      if (stats) {
        const detail = document.createElement('p');
        detail.className = 'panel-sub';
        detail.textContent = `${stats.count.toLocaleString()} dimensions · magnitude ${formatNumber(stats.magnitude, 3)}`;
        sampleMeta.appendChild(detail);
      }
    }

    function clearSampleButtons() {
      const buttons = sampleList.querySelectorAll('.sample-button');
      buttons.forEach((button) => {
        button.dataset.active = 'false';
        button.setAttribute('aria-pressed', 'false');
      });
    }

    function setActiveSample(sampleId) {
      const sample = samples.find((entry) => entry.id === sampleId);
      if (!sample) {
        return;
      }

      const vector = Array.isArray(sample.vector) ? sample.vector.map((value) => Number(value)) : [];
      const stats = computeSummary(vector);
      activeSampleId = sampleId;

      applyVector(vector);
      setSampleMeta(sample, stats);

      const buttons = sampleList.querySelectorAll('.sample-button');
      buttons.forEach((button) => {
        const isActive = button.dataset.sampleId === sampleId;
        button.dataset.active = isActive ? 'true' : 'false';
        button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
      });

      if (embeddingInput) {
        embeddingInput.value = formatVectorForInput(vector);
      }
    }

    function renderSampleButtons() {
      sampleList.innerHTML = '';

      if (!samples.length) {
        const placeholder = document.createElement('p');
        placeholder.className = 'placeholder';
        placeholder.textContent = 'No sample embeddings are configured.';
        sampleList.appendChild(placeholder);
        sampleMeta.innerHTML = '<p class="placeholder">Add sample embeddings to explore them here.</p>';
        applyVector([]);
        return;
      }

      const fragment = document.createDocumentFragment();
      samples.forEach((sample) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'sample-button';
        button.dataset.sampleId = sample.id;
        button.dataset.active = 'false';
        button.setAttribute('aria-pressed', 'false');
        button.textContent = sample.label;
        fragment.appendChild(button);
      });

      sampleList.appendChild(fragment);
      setActiveSample(samples[0].id);
    }

    function updateFromInput() {
      const vector = parseVector(embeddingInput.value);
      if (!vector.length) {
        activeSampleId = '';
        clearSampleButtons();
        sampleMeta.innerHTML = '<p class="placeholder">Enter at least one number to generate insights.</p>';
        applyVector([]);
        return;
      }

      activeSampleId = '';
      clearSampleButtons();
      const stats = computeSummary(vector);
      applyVector(vector);

      sampleMeta.innerHTML = '';
      const message = document.createElement('p');
      message.textContent = 'Custom vector entered manually.';
      const detail = document.createElement('p');
      detail.className = 'panel-sub';
      detail.textContent = `${stats.count.toLocaleString()} dimensions · magnitude ${formatNumber(stats.magnitude, 3)}`;
      sampleMeta.append(message, detail);
    }

    sampleList.addEventListener('click', (event) => {
      const button = event.target.closest('.sample-button');
      if (!button) {
        return;
      }

      const sampleId = button.dataset.sampleId;
      if (!sampleId || sampleId === activeSampleId) {
        return;
      }

      setActiveSample(sampleId);
    });

    updateButton.addEventListener('click', () => {
      updateFromInput();
    });

    embeddingInput.addEventListener('keydown', (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
        event.preventDefault();
        updateFromInput();
      }
    });

    renderSampleButtons();
  }

  if (!hasDatasetElements) {
    return;
  }

  const datasetCache = new Map();
  let activeDatasetId = '';
  let activeRecordId = '';
  let currentRecords = [];
  let filteredRecords = [];

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

  function decodeVector(base64) {
    if (!base64) {
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
      filterInput.disabled = true;
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

  function renderPreview(record, datasetMeta, source) {
    const ctx = previewCanvas.getContext('2d');
    if (!ctx) {
      return;
    }

    if (!record) {
      ctx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
      previewCanvas.width = 1;
      previewCanvas.height = 1;
      previewCanvas.style.width = '';
      previewCanvas.style.height = '';
      previewMeta.innerHTML = '<p class="placeholder">Select a vector to inspect its details.</p>';
      return;
    }

    const bytes = decodeVector(record.vector);
    const pixelCount = Math.ceil(bytes.length / 3);
    const width = Math.max(1, Math.ceil(Math.sqrt(pixelCount)));
    const height = Math.max(1, Math.ceil(pixelCount / width));

    previewCanvas.width = width;
    previewCanvas.height = height;

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

    const maxDisplay = Math.max(200, Math.min(480, previewCanvas.parentElement?.clientWidth || 320));
    const scale = Math.max(1, Math.floor(maxDisplay / Math.max(width, height)));
    previewCanvas.style.width = `${width * scale}px`;
    previewCanvas.style.height = `${height * scale}px`;

    const hash = record.vectorSha256 || '';
    const hashPreview = hash ? `${hash.slice(0, 16)}…` : '—';

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
      { label: 'Vector hash', value: hashPreview },
      { label: 'Updated', value: record.updatedAt ? formatDate(record.updatedAt) : '—' },
    ];

    previewMeta.innerHTML = '';
    const list = document.createElement('dl');
    list.className = 'meta-grid';

    metaItems.forEach((item) => {
      const wrapper = document.createElement('div');
      const dt = document.createElement('dt');
      dt.textContent = item.label;
      const dd = document.createElement('dd');
      dd.textContent = item.value;
      wrapper.append(dt, dd);
      list.appendChild(wrapper);
    });

    previewMeta.appendChild(list);
  }

  function setActiveRecord(recordId) {
    const datasetData = datasetCache.get(activeDatasetId);
    if (!datasetData) {
      return;
    }

    if (!recordId) {
      activeRecordId = '';
      updateActiveRecordButton();
      renderPreview(null, datasetData.meta, datasetData.source);
      return;
    }

    const record = datasetData.records.find((entry) => entry.id === recordId);
    if (!record) {
      return;
    }

    activeRecordId = recordId;
    updateActiveRecordButton();
    renderPreview(record, datasetData.meta, datasetData.source);
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
      activeRecordId = '';
      renderPreview(null, datasetData.meta, datasetData.source);
      updateActiveRecordButton();
      return;
    }

    const current = filteredRecords.find((record) => record.id === activeRecordId);
    if (current) {
      renderPreview(current, datasetData.meta, datasetData.source);
      updateActiveRecordButton();
      return;
    }

    activeRecordId = filteredRecords[0].id;
    renderPreview(filteredRecords[0], datasetData.meta, datasetData.source);
    updateActiveRecordButton();
  }

  function handleDatasetChange() {
    const datasetId = datasetSelect.value;
    activeDatasetId = datasetId;
    activeRecordId = '';
    currentRecords = [];
    filteredRecords = [];

    filterInput.value = '';
    filterInput.disabled = true;

    const ctx = previewCanvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
    }
    previewCanvas.width = 1;
    previewCanvas.height = 1;
    previewCanvas.style.width = '';
    previewCanvas.style.height = '';
    previewMeta.innerHTML = '<p class="placeholder">Select a vector to inspect its details.</p>';

    if (!datasetId) {
      datasetInfo.innerHTML = '<p class="placeholder">Choose a dataset to inspect its metadata.</p>';
      recordList.innerHTML = '<li><p class="placeholder">Select a dataset to load its vectors.</p></li>';
      recordStatus.textContent = 'No dataset selected.';
      return;
    }

    const source = sources.find((entry) => entry.id === datasetId);
    if (!source) {
      datasetInfo.innerHTML = '<p class="placeholder">The selected dataset is not configured.</p>';
      recordList.innerHTML = '<li><p class="placeholder">Unable to load this dataset.</p></li>';
      recordStatus.textContent = 'Dataset configuration error.';
      return;
    }

    recordList.innerHTML = '<li><p class="placeholder">Loading vectors…</p></li>';
    recordStatus.textContent = 'Loading vectors…';

    if (datasetCache.has(datasetId)) {
      const cached = datasetCache.get(datasetId);
      currentRecords = cached.records;
      filteredRecords = cached.records;
      updateDatasetInfo(cached.meta, cached.source);
      filterInput.disabled = !currentRecords.length;
      renderRecordList();
      updateRecordStatus();
      if (filteredRecords.length) {
        activeRecordId = filteredRecords[0].id;
        renderPreview(filteredRecords[0], cached.meta, cached.source);
        updateActiveRecordButton();
      } else {
        previewMeta.innerHTML = '<p class="placeholder">This dataset does not include any vectors.</p>';
      }
      return;
    }

    fetch(source.url)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Failed to load ${source.url}`);
        }
        return response.json();
      })
      .then((data) => {
        const meta = data?.meta || {};
        const recordsObject = data?.records || {};
        const records = Object.keys(recordsObject).map((id) => ({
          id,
          ...recordsObject[id],
        }));

        records.sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true, sensitivity: 'base' }));

        const datasetData = { source, meta, records };
        datasetCache.set(datasetId, datasetData);

        currentRecords = records;
        filteredRecords = records;
        updateDatasetInfo(meta, source);
        filterInput.disabled = !records.length;
        renderRecordList();
        updateRecordStatus();

        if (records.length) {
          activeRecordId = records[0].id;
          renderPreview(records[0], meta, source);
          updateActiveRecordButton();
        } else {
          previewMeta.innerHTML = '<p class="placeholder">This dataset does not include any vectors.</p>';
        }
      })
      .catch((error) => {
        console.error('Failed to load dataset', error);
        datasetInfo.innerHTML = '<p class="placeholder">Failed to load dataset metadata.</p>';
        recordList.innerHTML = '<li><p class="placeholder">Could not load vectors. Please try again.</p></li>';
        recordStatus.textContent = 'Failed to load dataset.';
        filterInput.disabled = true;
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

  filterInput.addEventListener('input', () => {
    applyFilter();
  });

  populateDatasetSelect();

  if (datasetSelect.value) {
    handleDatasetChange();
  }
})();
