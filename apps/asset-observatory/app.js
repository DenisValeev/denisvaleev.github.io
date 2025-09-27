(() => {
  const data = typeof window !== 'undefined' ? window.assetObservatoryData : null;
  if (!data || !Array.isArray(data.datasets) || data.datasets.length === 0) {
    return;
  }

  const summaryRoot = document.querySelector('[data-summary]');
  const datasetChartContainer = document.querySelector('[data-dataset-chart]');
  const providerChartContainer = document.querySelector('[data-provider-chart]');
  const datasetTableBody = document.querySelector('[data-dataset-table]');
  const similarityGrid = document.querySelector('[data-similarity-grid]');
  const sourceList = document.querySelector('[data-source-list]');
  const generatedAtNode = document.querySelector('[data-generated-at]');
  const providerCountNode = document.querySelector('[data-provider-count]');

  if (!summaryRoot || !datasetChartContainer || !providerChartContainer || !datasetTableBody || !similarityGrid || !sourceList) {
    return;
  }

  const numberFormatter = new Intl.NumberFormat('en-US');
  const decimalFormatter = new Intl.NumberFormat('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 1 });

  const formatNumber = (value) => {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) {
      return '0';
    }
    return numberFormatter.format(Math.round(numeric));
  };

  const formatBytes = (bytes) => {
    const numeric = Number(bytes);
    if (!Number.isFinite(numeric) || numeric <= 0) {
      return '0 B';
    }
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = numeric;
    let unitIndex = 0;
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex += 1;
    }
    const formatted = size >= 10 || unitIndex === 0 ? Math.round(size) : decimalFormatter.format(size);
    return `${formatted} ${units[unitIndex]}`;
  };

  const formatTimestamp = (isoString) => {
    if (typeof isoString !== 'string' || !isoString) {
      return '—';
    }
    const parsed = new Date(isoString);
    if (Number.isNaN(parsed.getTime())) {
      return '—';
    }
    return parsed.toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  };

  if (generatedAtNode) {
    generatedAtNode.textContent = formatTimestamp(data.generatedAt);
  }

  if (providerCountNode) {
    const providerCount = Number.isFinite(Number(data.totals?.providerCount))
      ? data.totals.providerCount
      : (Array.isArray(data.providers) ? data.providers.length : 0);
    providerCountNode.textContent = formatNumber(providerCount);
  }

  const summaryMetrics = [
    {
      label: 'Curated entries',
      value: formatNumber(data.totals?.entries || 0),
      detail: `${formatNumber(data.totals?.datasets || data.datasets.length)} decks tracked`,
    },
    {
      label: 'Embedding vectors',
      value: formatNumber(data.totals?.embeddingVectors || 0),
      detail: `${formatNumber(data.totals?.embeddingStores || 0)} stores • ${formatBytes(data.totals?.embeddingBytes || 0)}`,
    },
    {
      label: 'Similarity pairs monitored',
      value: formatNumber(data.totals?.similarityPairs || 0),
      detail: `${formatNumber(data.totals?.similarityReports || 0)} reports • ${formatBytes(data.totals?.similarityBytes || 0)}`,
    },
    {
      label: 'Asset footprint',
      value: formatBytes(data.totals?.totalBytes || 0),
      detail: `${formatNumber(data.totals?.totalFiles || 0)} files across datasets & sources`,
    },
  ];

  summaryRoot.innerHTML = '';
  summaryMetrics.forEach((metric) => {
    const card = document.createElement('article');
    card.className = 'summary-card';

    const heading = document.createElement('h3');
    heading.textContent = metric.label;
    card.appendChild(heading);

    const strong = document.createElement('strong');
    strong.textContent = metric.value;
    card.appendChild(strong);

    const detail = document.createElement('p');
    detail.textContent = metric.detail;
    card.appendChild(detail);

    summaryRoot.appendChild(card);
  });

  const datasets = [...data.datasets];
  const providerTotals = Array.isArray(data.providers) ? [...data.providers] : [];

  const datasetById = new Map(datasets.map((deck) => [deck.id, deck]));

  const buildDatasetChart = () => {
    datasetChartContainer.innerHTML = '';
    const svgNamespace = 'http://www.w3.org/2000/svg';
    const sorted = datasets.slice().sort((a, b) => (b.dataset?.bytes || 0) - (a.dataset?.bytes || 0));
    if (sorted.length === 0) {
      return;
    }

    const maxBytes = sorted.reduce((acc, deck) => Math.max(acc, deck.dataset?.bytes || 0), 0);
    const maxEntries = sorted.reduce((acc, deck) => Math.max(acc, deck.entries || 0), 0);
    const rowHeight = 60;
    const chartWidth = 640;
    const chartHeight = sorted.length * rowHeight + 40;
    const barOffset = 180;
    const barMax = chartWidth - barOffset - 40;

    const svg = document.createElementNS(svgNamespace, 'svg');
    svg.setAttribute('viewBox', `0 0 ${chartWidth} ${chartHeight}`);
    svg.setAttribute('role', 'img');
    svg.setAttribute('aria-label', 'Dataset payload spectrum chart');

    const defs = document.createElementNS(svgNamespace, 'defs');
    const payloadGradient = document.createElementNS(svgNamespace, 'linearGradient');
    payloadGradient.setAttribute('id', 'payloadGradient');
    payloadGradient.setAttribute('x1', '0');
    payloadGradient.setAttribute('x2', '1');
    payloadGradient.setAttribute('y1', '0');
    payloadGradient.setAttribute('y2', '1');

    const payloadStopA = document.createElementNS(svgNamespace, 'stop');
    payloadStopA.setAttribute('offset', '0%');
    payloadStopA.style.setProperty('stop-color', 'var(--accent)');
    payloadStopA.style.setProperty('stop-opacity', '0.9');
    payloadGradient.appendChild(payloadStopA);

    const payloadStopB = document.createElementNS(svgNamespace, 'stop');
    payloadStopB.setAttribute('offset', '100%');
    payloadStopB.style.setProperty('stop-color', 'var(--accent)');
    payloadStopB.style.setProperty('stop-opacity', '0.55');
    payloadGradient.appendChild(payloadStopB);

    const bubbleGradient = document.createElementNS(svgNamespace, 'radialGradient');
    bubbleGradient.setAttribute('id', 'bubbleGradient');
    bubbleGradient.setAttribute('cx', '0.5');
    bubbleGradient.setAttribute('cy', '0.5');
    bubbleGradient.setAttribute('r', '0.8');

    const bubbleStopA = document.createElementNS(svgNamespace, 'stop');
    bubbleStopA.setAttribute('offset', '0%');
    bubbleStopA.style.setProperty('stop-color', 'var(--accent-alt)');
    bubbleStopA.style.setProperty('stop-opacity', '0.95');
    bubbleGradient.appendChild(bubbleStopA);

    const bubbleStopB = document.createElementNS(svgNamespace, 'stop');
    bubbleStopB.setAttribute('offset', '100%');
    bubbleStopB.style.setProperty('stop-color', 'var(--accent-alt)');
    bubbleStopB.style.setProperty('stop-opacity', '0.4');
    bubbleGradient.appendChild(bubbleStopB);

    defs.appendChild(payloadGradient);
    defs.appendChild(bubbleGradient);
    svg.appendChild(defs);

    sorted.forEach((deck, index) => {
      const bytes = deck.dataset?.bytes || 0;
      const entries = deck.entries || 0;
      const y = index * rowHeight + 30;
      const barWidth = maxBytes > 0 ? (bytes / maxBytes) * barMax : 0;
      const bubbleRadius = maxEntries > 0 ? 10 + (entries / maxEntries) * 22 : 12;

      const gridLine = document.createElementNS(svgNamespace, 'line');
      gridLine.setAttribute('x1', String(barOffset - 12));
      gridLine.setAttribute('x2', String(chartWidth - 20));
      gridLine.setAttribute('y1', String(y + 12));
      gridLine.setAttribute('y2', String(y + 12));
      gridLine.setAttribute('class', 'grid-line');
      svg.appendChild(gridLine);

      const circle = document.createElementNS(svgNamespace, 'circle');
      circle.setAttribute('cx', String(barOffset - 50));
      circle.setAttribute('cy', String(y + 12));
      circle.setAttribute('r', bubbleRadius.toFixed(2));
      circle.setAttribute('fill', 'url(#bubbleGradient)');
      const circleTitle = document.createElementNS(svgNamespace, 'title');
      circleTitle.textContent = `${deck.label}: ${formatNumber(entries)} entries`;
      circle.appendChild(circleTitle);
      svg.appendChild(circle);

      const rect = document.createElementNS(svgNamespace, 'rect');
      rect.setAttribute('x', String(barOffset));
      rect.setAttribute('y', String(y));
      rect.setAttribute('width', String(Math.max(barWidth, 4)));
      rect.setAttribute('height', '24');
      rect.setAttribute('rx', '8');
      rect.setAttribute('fill', 'url(#payloadGradient)');
      const rectTitle = document.createElementNS(svgNamespace, 'title');
      rectTitle.textContent = `${deck.label}: ${formatBytes(bytes)}`;
      rect.appendChild(rectTitle);
      svg.appendChild(rect);

      const label = document.createElementNS(svgNamespace, 'text');
      label.setAttribute('x', '12');
      label.setAttribute('y', String(y + 20));
      label.setAttribute('fill', 'currentColor');
      label.setAttribute('font-size', '14');
      label.textContent = deck.label;
      svg.appendChild(label);

      const value = document.createElementNS(svgNamespace, 'text');
      value.setAttribute('x', String(barOffset + Math.max(barWidth, 4) + 12));
      value.setAttribute('y', String(y + 20));
      value.setAttribute('fill', 'var(--text-secondary)');
      value.setAttribute('font-size', '12');
      value.textContent = `${formatBytes(bytes)} • ${formatNumber(entries)} entries`;
      svg.appendChild(value);
    });

    datasetChartContainer.appendChild(svg);
    datasetChartContainer.removeAttribute('aria-hidden');
  };

  const buildProviderChart = () => {
    providerChartContainer.innerHTML = '';
    const svgNamespace = 'http://www.w3.org/2000/svg';
    const sortedProviders = providerTotals.slice().sort((a, b) => (b.vectorCount || 0) - (a.vectorCount || 0));
    if (sortedProviders.length === 0) {
      const chartCard = providerChartContainer.closest('.chart-card');
      if (chartCard) {
        const placeholder = document.createElement('p');
        placeholder.textContent = 'No embedding providers recorded in this snapshot.';
        placeholder.style.color = 'var(--text-secondary)';
        chartCard.appendChild(placeholder);
      }
      return;
    }

    const maxVectors = sortedProviders.reduce((acc, provider) => Math.max(acc, provider.vectorCount || 0), 0);
    const chartWidth = Math.max(360, sortedProviders.length * 110);
    const chartHeight = 240;
    const margin = { top: 20, right: 20, bottom: 48, left: 48 };
    const barWidth = 44;

    const svg = document.createElementNS(svgNamespace, 'svg');
    svg.setAttribute('viewBox', `0 0 ${chartWidth} ${chartHeight}`);
    svg.setAttribute('role', 'img');
    svg.setAttribute('aria-label', 'Embedding provider load chart');

    const gridLineCount = 4;
    for (let index = 0; index <= gridLineCount; index += 1) {
      const ratio = index / gridLineCount;
      const y = chartHeight - margin.bottom - ratio * (chartHeight - margin.top - margin.bottom);
      const line = document.createElementNS(svgNamespace, 'line');
      line.setAttribute('x1', String(margin.left));
      line.setAttribute('x2', String(chartWidth - margin.right));
      line.setAttribute('y1', String(y));
      line.setAttribute('y2', String(y));
      line.setAttribute('class', 'grid-line');
      svg.appendChild(line);

      const label = document.createElementNS(svgNamespace, 'text');
      label.setAttribute('x', String(margin.left - 12));
      label.setAttribute('y', String(y + 4));
      label.setAttribute('text-anchor', 'end');
      label.setAttribute('fill', 'var(--text-secondary)');
      label.setAttribute('font-size', '10');
      label.textContent = formatNumber(ratio * maxVectors);
      svg.appendChild(label);
    }

    sortedProviders.forEach((provider, index) => {
      const vectors = provider.vectorCount || 0;
      const barHeight = maxVectors > 0 ? (vectors / maxVectors) * (chartHeight - margin.top - margin.bottom) : 0;
      const x = margin.left + index * (barWidth + 28);
      const y = chartHeight - margin.bottom - barHeight;

      const rect = document.createElementNS(svgNamespace, 'rect');
      rect.setAttribute('x', String(x));
      rect.setAttribute('y', String(y));
      rect.setAttribute('width', String(barWidth));
      rect.setAttribute('height', String(Math.max(barHeight, 4)));
      rect.setAttribute('rx', '8');
      rect.setAttribute('fill', 'var(--accent)');
      rect.style.opacity = '0.85';
      const rectTitle = document.createElementNS(svgNamespace, 'title');
      rectTitle.textContent = `${provider.id}: ${formatNumber(vectors)} vectors across ${formatNumber(provider.stores || 0)} stores`;
      rect.appendChild(rectTitle);
      svg.appendChild(rect);

      const valueLabel = document.createElementNS(svgNamespace, 'text');
      valueLabel.setAttribute('x', String(x + barWidth / 2));
      valueLabel.setAttribute('y', String(y - 8));
      valueLabel.setAttribute('text-anchor', 'middle');
      valueLabel.setAttribute('fill', 'currentColor');
      valueLabel.setAttribute('font-size', '11');
      valueLabel.textContent = formatNumber(vectors);
      svg.appendChild(valueLabel);

      const nameLabel = document.createElementNS(svgNamespace, 'text');
      nameLabel.setAttribute('x', String(x + barWidth / 2));
      nameLabel.setAttribute('y', String(chartHeight - margin.bottom + 20));
      nameLabel.setAttribute('text-anchor', 'middle');
      nameLabel.setAttribute('fill', 'currentColor');
      nameLabel.setAttribute('font-size', '11');
      nameLabel.textContent = provider.id;
      svg.appendChild(nameLabel);
    });

    providerChartContainer.appendChild(svg);
    providerChartContainer.removeAttribute('aria-hidden');

    const providerCard = providerChartContainer.closest('.chart-card');
    if (providerCard) {
      const badgeList = document.createElement('ul');
      badgeList.className = 'badge-list';
      sortedProviders.forEach((provider) => {
        const item = document.createElement('li');
        const dimensions = Array.isArray(provider.dimensions) && provider.dimensions.length > 0
          ? provider.dimensions.join(' • ')
          : 'n/a';
        item.textContent = `${provider.id} • ${formatNumber(provider.stores || 0)} store${(provider.stores || 0) === 1 ? '' : 's'} • dims ${dimensions}`;
        badgeList.appendChild(item);
      });
      providerCard.appendChild(badgeList);
    }
  };

  const buildDatasetTable = () => {
    datasetTableBody.innerHTML = '';
    datasets.forEach((deck) => {
      const row = document.createElement('tr');

      const nameCell = document.createElement('td');
      nameCell.className = 'dataset-name';
      nameCell.textContent = deck.label;
      row.appendChild(nameCell);

      const entriesCell = document.createElement('td');
      entriesCell.className = 'metric';
      entriesCell.textContent = formatNumber(deck.entries || 0);
      row.appendChild(entriesCell);

      const datasetCell = document.createElement('td');
      datasetCell.className = 'metric';
      datasetCell.textContent = formatBytes(deck.dataset?.bytes || 0);
      row.appendChild(datasetCell);

      const manifestCell = document.createElement('td');
      manifestCell.className = 'metric';
      manifestCell.textContent = formatBytes(deck.manifest?.bytes || 0);
      row.appendChild(manifestCell);

      const storesCell = document.createElement('td');
      storesCell.className = 'metric';
      storesCell.textContent = formatNumber(Array.isArray(deck.embeddings) ? deck.embeddings.length : 0);
      row.appendChild(storesCell);

      const vectorsCell = document.createElement('td');
      vectorsCell.className = 'metric';
      vectorsCell.textContent = formatNumber(deck.totals?.embeddingVectors || 0);
      row.appendChild(vectorsCell);

      const embeddingBytesCell = document.createElement('td');
      embeddingBytesCell.className = 'metric';
      embeddingBytesCell.textContent = formatBytes(deck.totals?.embeddingBytes || 0);
      row.appendChild(embeddingBytesCell);

      const pairsCell = document.createElement('td');
      pairsCell.className = 'metric';
      pairsCell.textContent = formatNumber(deck.totals?.similarityPairs || 0);
      row.appendChild(pairsCell);

      const similarityBytesCell = document.createElement('td');
      similarityBytesCell.className = 'metric';
      similarityBytesCell.textContent = formatBytes(deck.totals?.similarityBytes || 0);
      row.appendChild(similarityBytesCell);

      datasetTableBody.appendChild(row);
    });
  };

  const buildSimilarityCards = () => {
    similarityGrid.innerHTML = '';
    const cards = datasets.map((deck) => ({
      id: deck.id,
      title: deck.label,
      scope: 'deck',
      pairs: deck.totals?.similarityPairs || 0,
      bytes: deck.totals?.similarityBytes || 0,
      reports: Array.isArray(deck.similarityReports) ? deck.similarityReports : [],
    }));

    if (Array.isArray(data.crossDeck) && data.crossDeck.length > 0) {
      const crossPairs = data.crossDeck.reduce((acc, report) => acc + (Number(report.pairs) || 0), 0);
      const crossBytes = data.crossDeck.reduce((acc, report) => acc + (Number(report.bytes) || 0), 0);
      cards.push({
        id: 'cross-deck',
        title: 'Cross-deck comparisons',
        scope: 'cross',
        pairs: crossPairs,
        bytes: crossBytes,
        reports: data.crossDeck,
      });
    }

    if (cards.length === 0) {
      const fallback = document.createElement('p');
      fallback.textContent = 'No similarity data recorded for this snapshot.';
      fallback.style.color = 'var(--text-secondary)';
      similarityGrid.appendChild(fallback);
      return;
    }

    cards.forEach((entry) => {
      const card = document.createElement('article');
      card.className = 'similarity-card';

      const heading = document.createElement('h3');
      heading.textContent = entry.title;
      card.appendChild(heading);

      const reportCount = entry.reports.length;
      const summary = document.createElement('p');
      const pairsText = `${formatNumber(entry.pairs)} pair${entry.pairs === 1 ? '' : 's'}`;
      const reportText = `${reportCount} report${reportCount === 1 ? '' : 's'}`;
      const scopeText = entry.scope === 'cross'
        ? 'Across decks to catch inter-collection duplicates.'
        : 'Deck-level sweep for near duplicates.';
      summary.textContent = `${pairsText} across ${reportText} (${formatBytes(entry.bytes)}). ${scopeText}`;
      card.appendChild(summary);

      const providerMap = new Map();
      entry.reports.forEach((report) => {
        const provider = report.provider || 'unknown';
        if (!providerMap.has(provider)) {
          providerMap.set(provider, {
            count: 0,
            pairs: 0,
            models: new Set(),
          });
        }
        const bucket = providerMap.get(provider);
        bucket.count += 1;
        bucket.pairs += Number(report.pairs) || 0;
        if (report.model) {
          bucket.models.add(report.model);
        }
      });

      if (providerMap.size > 0) {
        const list = document.createElement('ul');
        list.className = 'badge-list';
        providerMap.forEach((info, provider) => {
          const item = document.createElement('li');
          const modelLabel = info.models.size > 0 ? Array.from(info.models).slice(0, 2).join(' • ') : null;
          item.textContent = `${provider} • ${formatNumber(info.count)} run${info.count === 1 ? '' : 's'} • ${formatNumber(info.pairs)} pairs`;
          if (modelLabel) {
            const modelSpan = document.createElement('span');
            modelSpan.textContent = modelLabel;
            modelSpan.style.fontStyle = 'italic';
            modelSpan.style.opacity = '0.75';
            item.appendChild(modelSpan);
          }
          list.appendChild(item);
        });
        card.appendChild(list);
      }

      similarityGrid.appendChild(card);
    });
  };

  const buildSourcesList = () => {
    sourceList.innerHTML = '';
    const sources = Array.isArray(data.sources) ? data.sources : [];
    if (sources.length === 0) {
      const section = sourceList.closest('section');
      if (section) {
        section.hidden = true;
      }
      return;
    }

    sources.forEach((source) => {
      const datasetLabel = datasetById.get(source.datasetId)?.label || source.datasetId;
      const item = document.createElement('li');

      const label = document.createElement('span');
      label.className = 'label';
      label.textContent = source.label;
      item.appendChild(label);

      const meta = document.createElement('span');
      meta.className = 'meta';
      const metaParts = [datasetLabel, formatBytes(source.bytes || 0)];
      if (typeof source.id === 'string' && source.id.trim().length > 0) {
        metaParts.push(`id: ${source.id}`);
      }
      meta.textContent = metaParts.join(' • ');
      item.appendChild(meta);

      const pathCode = document.createElement('code');
      pathCode.textContent = source.path;
      item.appendChild(pathCode);

      sourceList.appendChild(item);
    });
  };

  buildDatasetChart();
  buildProviderChart();
  buildDatasetTable();
  buildSimilarityCards();
  buildSourcesList();
})();
