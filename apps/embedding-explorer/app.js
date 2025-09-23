(function () {
  const dataset = Array.isArray(window.sampleEmbeddings) ? window.sampleEmbeddings : [];
  const sampleList = document.querySelector('[data-sample-list]');
  const sampleMeta = document.querySelector('[data-sample-meta]');
  const input = document.querySelector('[data-embedding-input]');
  const parseButton = document.querySelector('[data-parse-button]');
  const columnSlider = document.querySelector('[data-column-slider]');
  const columnDisplay = document.querySelector('[data-column-display]');
  const summaryGrid = document.querySelector('[data-summary-grid]');
  const heatmapCanvas = document.querySelector('[data-heatmap]');
  const lineCanvas = document.querySelector('[data-line-chart]');
  const positiveList = document.querySelector('[data-positive-list]');
  const negativeList = document.querySelector('[data-negative-list]');
  const valueTable = document.querySelector('[data-value-table]');

  if (
    !sampleList ||
    !sampleMeta ||
    !input ||
    !parseButton ||
    !columnSlider ||
    !columnDisplay ||
    !summaryGrid ||
    !heatmapCanvas ||
    !lineCanvas ||
    !positiveList ||
    !negativeList ||
    !valueTable
  ) {
    return;
  }

  let activeSampleId = '';
  let sliderManuallyAdjusted = false;

  const state = {
    vector: [],
    normalized: [],
    stats: null,
    columns: Number.parseInt(columnSlider.value, 10) || 8,
  };

  columnDisplay.textContent = columnSlider.value;

  function formatNumber(value, digits = 3) {
    if (!Number.isFinite(value)) {
      return '0.000';
    }
    return Number(value).toFixed(digits);
  }

  function parseVector(text) {
    if (!text) {
      return [];
    }

    const tokens = text
      .split(/[\s,]+/)
      .map((token) => token.trim())
      .filter(Boolean);

    const numbers = tokens
      .map((token) => Number.parseFloat(token))
      .filter((value) => Number.isFinite(value));

    return numbers;
  }

  function computeStats(vector) {
    if (!vector.length) {
      return null;
    }

    let min = vector[0];
    let max = vector[0];
    let sum = 0;
    let squaredSum = 0;
    let absSum = 0;
    let maxAbs = Math.abs(vector[0]);
    let nearZero = 0;

    for (const value of vector) {
      if (value < min) {
        min = value;
      }
      if (value > max) {
        max = value;
      }
      sum += value;
      squaredSum += value * value;
      absSum += Math.abs(value);
      const absValue = Math.abs(value);
      if (absValue > maxAbs) {
        maxAbs = absValue;
      }
      if (absValue < 0.05) {
        nearZero += 1;
      }
    }

    const mean = sum / vector.length;
    let varianceSum = 0;

    for (const value of vector) {
      const diff = value - mean;
      varianceSum += diff * diff;
    }

    const stdDev = Math.sqrt(varianceSum / vector.length);
    const sorted = [...vector].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    const median =
      sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];

    return {
      length: vector.length,
      min,
      max,
      sum,
      mean,
      median,
      stdDev,
      l2: Math.sqrt(squaredSum),
      absSum,
      maxAbs: maxAbs || 1,
      nearZeroRatio: nearZero / vector.length,
    };
  }

  function buildSummary(stats) {
    if (!stats) {
      summaryGrid.innerHTML = '<p class="placeholder">Paste an embedding to view its metrics.</p>';
      return;
    }

    const summaryItems = [
      { label: 'Dimensions', value: stats.length.toLocaleString() },
      { label: 'L2 norm', value: formatNumber(stats.l2) },
      { label: 'Mean', value: formatNumber(stats.mean) },
      { label: 'Std dev', value: formatNumber(stats.stdDev) },
      { label: 'Min / Max', value: `${formatNumber(stats.min)} / ${formatNumber(stats.max)}` },
      { label: 'Near zero', value: `${Math.round(stats.nearZeroRatio * 100)}%` },
    ];

    summaryGrid.innerHTML = '';
    const fragment = document.createDocumentFragment();

    summaryItems.forEach((item) => {
      const dl = document.createElement('dl');
      dl.className = 'summary-card';

      const dt = document.createElement('dt');
      dt.textContent = item.label;

      const dd = document.createElement('dd');
      dd.textContent = item.value;

      dl.append(dt, dd);
      fragment.appendChild(dl);
    });

    summaryGrid.appendChild(fragment);
  }

  function colorForValue(value) {
    const clamped = Math.max(-1, Math.min(1, Number.isFinite(value) ? value : 0));
    const intensity = Math.pow(Math.abs(clamped), 0.85);
    const neutral = { r: 241, g: 245, b: 249 };
    const positive = { r: 249, g: 115, b: 22 };
    const negative = { r: 37, g: 99, b: 235 };

    const mix = (source, target, amount) => ({
      r: Math.round(source.r + (target.r - source.r) * amount),
      g: Math.round(source.g + (target.g - source.g) * amount),
      b: Math.round(source.b + (target.b - source.b) * amount),
    });

    const palette = clamped >= 0 ? mix(neutral, positive, intensity) : mix(neutral, negative, intensity);
    return `rgb(${palette.r}, ${palette.g}, ${palette.b})`;
  }

  function drawHeatmap(normalized) {
    const ctx = heatmapCanvas.getContext('2d');

    if (!normalized.length) {
      heatmapCanvas.width = 10;
      heatmapCanvas.height = 10;
      ctx.fillStyle = 'rgba(148, 163, 209, 0.18)';
      ctx.fillRect(0, 0, heatmapCanvas.width, heatmapCanvas.height);
      return;
    }

    const columns = Math.max(1, Math.min(state.columns, normalized.length));
    const rows = Math.ceil(normalized.length / columns);

    heatmapCanvas.width = columns;
    heatmapCanvas.height = rows;

    ctx.clearRect(0, 0, columns, rows);

    normalized.forEach((value, index) => {
      const column = index % columns;
      const row = Math.floor(index / columns);
      ctx.fillStyle = colorForValue(value);
      ctx.fillRect(column, row, 1, 1);
    });
  }

  function drawLinePlot(normalized) {
    const ctx = lineCanvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const width = lineCanvas.clientWidth || lineCanvas.parentElement?.clientWidth || 600;
    const height = 220;

    lineCanvas.width = width * dpr;
    lineCanvas.height = height * dpr;
    lineCanvas.style.width = `${width}px`;
    lineCanvas.style.height = `${height}px`;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);

    const mid = height / 2;
    ctx.strokeStyle = 'rgba(148, 163, 209, 0.35)';
    ctx.lineWidth = 1;
    ctx.setLineDash([6, 6]);
    ctx.beginPath();
    ctx.moveTo(0, mid);
    ctx.lineTo(width, mid);
    ctx.stroke();
    ctx.setLineDash([]);

    if (!normalized.length) {
      return;
    }

    const amplitude = (height / 2) * 0.82;
    const step = normalized.length === 1 ? width : width / (normalized.length - 1);

    ctx.beginPath();
    normalized.forEach((value, index) => {
      const x = index * step;
      const y = mid - value * amplitude;
      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });

    ctx.strokeStyle = 'rgba(96, 165, 250, 0.9)';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.lineTo(width, mid);
    ctx.lineTo(0, mid);
    ctx.closePath();
    ctx.fillStyle = 'rgba(96, 165, 250, 0.18)';
    ctx.fill();
  }

  function renderExtremes(vector, normalized) {
    const entries = vector.map((value, index) => ({
      index,
      value,
      normalized: normalized[index],
    }));

    const positives = entries
      .filter((entry) => entry.value > 0)
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);

    const negatives = entries
      .filter((entry) => entry.value < 0)
      .sort((a, b) => a.value - b.value)
      .slice(0, 6);

    const fallback = [{ index: null, value: 0, normalized: 0 }];

    const renderList = (container, items, className) => {
      container.innerHTML = '';
      const list = items.length ? items : fallback;
      const fragment = document.createDocumentFragment();

      list.forEach((item) => {
        const li = document.createElement('li');
        const indexSpan = document.createElement('span');
        indexSpan.textContent = item.index != null ? `#${item.index + 1}` : '–';
        const valueSpan = document.createElement('span');
        if (className && item.index != null) {
          valueSpan.classList.add(className);
        }
        valueSpan.textContent = formatNumber(item.value);
        li.append(indexSpan, valueSpan);
        fragment.appendChild(li);
      });

      container.appendChild(fragment);
    };

    renderList(positiveList, positives, 'value-positive');
    renderList(negativeList, negatives, 'value-negative');
  }

  function renderTable(vector, normalized) {
    valueTable.innerHTML = '';

    if (!vector.length) {
      const row = document.createElement('tr');
      const cell = document.createElement('td');
      cell.colSpan = 3;
      cell.textContent = 'Paste an embedding to populate the table.';
      row.appendChild(cell);
      valueTable.appendChild(row);
      return;
    }

    const fragment = document.createDocumentFragment();

    vector.forEach((value, index) => {
      const row = document.createElement('tr');

      const indexCell = document.createElement('td');
      indexCell.textContent = `#${index + 1}`;

      const valueCell = document.createElement('td');
      const valueSpan = document.createElement('span');
      if (value > 0) {
        valueSpan.classList.add('value-positive');
      } else if (value < 0) {
        valueSpan.classList.add('value-negative');
      }
      valueSpan.textContent = formatNumber(value);
      valueCell.appendChild(valueSpan);

      const normalizedCell = document.createElement('td');
      const normalizedSpan = document.createElement('span');
      if (normalized[index] > 0) {
        normalizedSpan.classList.add('value-positive');
      } else if (normalized[index] < 0) {
        normalizedSpan.classList.add('value-negative');
      }
      normalizedSpan.textContent = formatNumber(normalized[index]);
      normalizedCell.appendChild(normalizedSpan);

      row.append(indexCell, valueCell, normalizedCell);
      fragment.appendChild(row);
    });

    valueTable.appendChild(fragment);
  }

  function renderSampleMeta(sample) {
    sampleMeta.innerHTML = '';

    if (!sample) {
      const placeholder = document.createElement('p');
      placeholder.className = 'placeholder';
      placeholder.textContent = 'Select a sample to preview its prompt and notes.';
      sampleMeta.appendChild(placeholder);
      return;
    }

    const promptParagraph = document.createElement('p');
    const promptLabel = document.createElement('strong');
    promptLabel.textContent = 'Prompt:';
    promptParagraph.append(promptLabel, document.createTextNode(` ${sample.prompt}`));

    const notesParagraph = document.createElement('p');
    const notesLabel = document.createElement('strong');
    notesLabel.textContent = 'Notes:';
    notesParagraph.append(notesLabel, document.createTextNode(` ${sample.notes}`));

    const dimensionsParagraph = document.createElement('p');
    const dimensionsLabel = document.createElement('strong');
    dimensionsLabel.textContent = 'Dimensions:';
    dimensionsParagraph.append(
      dimensionsLabel,
      document.createTextNode(` ${sample.vector.length.toLocaleString()}`),
    );

    sampleMeta.append(promptParagraph, notesParagraph, dimensionsParagraph);
  }

  function renderAll() {
    buildSummary(state.stats);
    drawHeatmap(state.normalized);
    requestAnimationFrame(() => {
      drawLinePlot(state.normalized);
    });
    renderExtremes(state.vector, state.normalized);
    renderTable(state.vector, state.normalized);
  }

  function updateColumnSliderMax(length) {
    const max = Math.max(1, Math.min(64, length));
    columnSlider.max = String(max);

    if (!sliderManuallyAdjusted) {
      const suggested = Math.max(1, Math.round(Math.sqrt(length)) || 1);
      const nextValue = Math.min(max, suggested);
      state.columns = nextValue;
      columnSlider.value = String(nextValue);
    } else if (state.columns > max) {
      state.columns = max;
      columnSlider.value = String(max);
    } else {
      const safeValue = Math.min(Math.max(state.columns, 1), max);
      state.columns = safeValue;
      columnSlider.value = String(safeValue);
    }

    columnDisplay.textContent = columnSlider.value;
  }

  function updateStateFromInput() {
    const values = parseVector(input.value);
    state.vector = values;
    state.stats = computeStats(values);

    if (!values.length || !state.stats) {
      state.normalized = [];
      columnSlider.disabled = true;
      columnDisplay.textContent = '–';
      renderAll();
      return;
    }

    columnSlider.disabled = false;
    columnDisplay.textContent = columnSlider.value;

    updateColumnSliderMax(values.length);

    state.normalized = values.map((value) => (state.stats.maxAbs ? value / state.stats.maxAbs : 0));

    renderAll();
  }

  function updateActiveButtons() {
    const buttons = sampleList.querySelectorAll('.sample-button');
    buttons.forEach((button) => {
      const isActive = button.dataset.sampleId === activeSampleId;
      button.dataset.active = isActive ? 'true' : 'false';
      button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    });
  }

  function handleSampleSelection(sample) {
    if (!sample) {
      return;
    }
    sliderManuallyAdjusted = false;
    activeSampleId = sample.id;
    input.value = sample.vector.join(', ');
    renderSampleMeta(sample);
    updateActiveButtons();
    updateStateFromInput();
  }

  function hydrateSamples() {
    sampleList.innerHTML = '';

    if (!dataset.length) {
      const placeholder = document.createElement('p');
      placeholder.className = 'placeholder';
      placeholder.textContent = 'No sample embeddings were provided.';
      sampleList.appendChild(placeholder);
      return;
    }

    const fragment = document.createDocumentFragment();

    dataset.forEach((sample) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'sample-button';
      button.dataset.sampleId = sample.id;
      button.dataset.active = 'false';
      button.setAttribute('aria-pressed', 'false');

      const labelSpan = document.createElement('span');
      labelSpan.textContent = sample.label;
      const dimsSpan = document.createElement('span');
      dimsSpan.className = 'pill';
      dimsSpan.textContent = `${sample.vector.length}D`;

      button.append(labelSpan, dimsSpan);
      button.addEventListener('click', () => {
        handleSampleSelection(sample);
      });
      fragment.appendChild(button);
    });

    sampleList.appendChild(fragment);
  }

  parseButton.addEventListener('click', () => {
    updateStateFromInput();
  });

  columnSlider.addEventListener('input', () => {
    sliderManuallyAdjusted = true;
    state.columns = Number.parseInt(columnSlider.value, 10) || 1;
    columnDisplay.textContent = columnSlider.value;
    drawHeatmap(state.normalized);
  });

  input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      updateStateFromInput();
    }
  });

  window.addEventListener('resize', () => {
    if (!state.normalized.length) {
      return;
    }
    requestAnimationFrame(() => {
      drawLinePlot(state.normalized);
    });
  });

  hydrateSamples();
  renderSampleMeta(null);

  if (dataset.length) {
    handleSampleSelection(dataset[0]);
  } else {
    updateStateFromInput();
  }
})();
