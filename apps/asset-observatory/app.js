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
  const freshnessGrid = document.querySelector('[data-freshness-grid]');
  const sourceList = document.querySelector('[data-source-list]');
  const generatedAtNode = document.querySelector('[data-generated-at]');
  const providerCountNode = document.querySelector('[data-provider-count]');

  if (!summaryRoot || !datasetChartContainer || !providerChartContainer || !datasetTableBody || !similarityGrid || !freshnessGrid || !sourceList) {
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

  const toDate = (value) => {
    if (!value) {
      return null;
    }
    if (value instanceof Date) {
      return Number.isNaN(value.getTime()) ? null : value;
    }
    if (typeof value === 'string' || typeof value === 'number') {
      const parsed = new Date(value);
      return Number.isNaN(parsed.getTime()) ? null : parsed;
    }
    return null;
  };

  const msPerDay = 1000 * 60 * 60 * 24;

  const differenceInDays = (laterDate, earlierDate) => {
    const later = toDate(laterDate);
    const earlier = toDate(earlierDate);
    if (!later || !earlier) {
      return null;
    }
    const diff = later.getTime() - earlier.getTime();
    if (!Number.isFinite(diff) || diff <= 0) {
      return 0;
    }
    return diff / msPerDay;
  };

  const formatRelativeDays = (days) => {
    if (days === null || !Number.isFinite(days)) {
      return 'No signal';
    }
    if (days < 0.5) {
      return 'today';
    }
    if (days < 1.5) {
      return '1 day ago';
    }
    if (days < 7) {
      return `${decimalFormatter.format(days)} days ago`;
    }
    return `${Math.round(days)} days ago`;
  };

  const classifyFreshness = (ageDays) => {
    if (ageDays === null || !Number.isFinite(ageDays)) {
      return { bucket: 'missing', className: 'status-muted', toneLabel: 'Missing' };
    }
    if (ageDays <= 2) {
      return { bucket: 'fresh', className: 'status-healthy', toneLabel: 'Fresh' };
    }
    if (ageDays <= 7) {
      return { bucket: 'due', className: 'status-warning', toneLabel: 'Due soon' };
    }
    return { bucket: 'stale', className: 'status-critical', toneLabel: 'Needs refresh' };
  };

  const referenceDate = toDate(data.generatedAt) || new Date();

  const computeComponentStatus = (timestamps, count) => {
    const valid = timestamps
      .map((entry) => toDate(entry))
      .filter((entry) => entry);

    if (valid.length === 0) {
      return {
        count,
        bucket: 'missing',
        className: 'status-muted',
        toneLabel: count > 0 ? 'Untracked' : 'Missing',
        newestDate: null,
        oldestDate: null,
        ageDays: null,
        spanDays: null,
      };
    }

    const sorted = valid.slice().sort((a, b) => a.getTime() - b.getTime());
    const oldestDate = sorted[0];
    const newestDate = sorted[sorted.length - 1];
    const ageDays = differenceInDays(referenceDate, newestDate);
    const spanDays = sorted.length > 1 ? differenceInDays(newestDate, oldestDate) : 0;
    const classification = classifyFreshness(ageDays);

    return {
      count,
      bucket: classification.bucket,
      className: classification.className,
      toneLabel: classification.toneLabel,
      newestDate,
      oldestDate,
      ageDays,
      spanDays,
    };
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

  const datasets = [...data.datasets];
  const providerTotals = Array.isArray(data.providers) ? [...data.providers] : [];

  const deckFreshness = datasets.map((deck) => {
    const manifestStatus = computeComponentStatus([deck.manifest?.generatedAt], deck.manifest ? 1 : 0);
    const embeddingRecords = Array.isArray(deck.embeddings) ? deck.embeddings : [];
    const similarityRecords = Array.isArray(deck.similarityReports) ? deck.similarityReports : [];
    const embeddingStatus = computeComponentStatus(embeddingRecords.map((record) => record.generatedAt), embeddingRecords.length);
    const similarityStatus = computeComponentStatus(similarityRecords.map((record) => record.generatedAt), similarityRecords.length);
    const statuses = [manifestStatus, embeddingStatus, similarityStatus];

    const latestTimestamp = statuses.reduce((accumulator, status) => {
      if (!status.newestDate) {
        return accumulator;
      }
      if (!accumulator || status.newestDate.getTime() > accumulator.getTime()) {
        return status.newestDate;
      }
      return accumulator;
    }, null);

    const latestAgeDays = latestTimestamp ? differenceInDays(referenceDate, latestTimestamp) : null;

    const statusCounts = {
      dueSoon: statuses.filter((status) => status.bucket === 'due').length,
      stale: statuses.filter((status) => status.bucket === 'stale').length,
      missing: statuses.filter((status) => status.bucket === 'missing').length,
    };

    return {
      id: deck.id,
      label: deck.label,
      statuses: {
        manifest: manifestStatus,
        embeddings: embeddingStatus,
        similarity: similarityStatus,
      },
      counts: {
        embeddings: embeddingStatus.count,
        similarityReports: similarityStatus.count,
      },
      latestTimestamp,
      latestAgeDays,
      statusCounts,
    };
  });

  const totalAttention = deckFreshness.reduce((accumulator, entry) => accumulator + entry.statusCounts.dueSoon + entry.statusCounts.stale, 0);
  const totalStale = deckFreshness.reduce((accumulator, entry) => accumulator + entry.statusCounts.stale, 0);
  const totalMissingSignals = deckFreshness.reduce((accumulator, entry) => accumulator + entry.statusCounts.missing, 0);
  const averageLagDays = (() => {
    const values = deckFreshness
      .map((entry) => entry.latestAgeDays)
      .filter((value) => value !== null && Number.isFinite(value));
    if (values.length === 0) {
      return null;
    }
    const sum = values.reduce((accumulator, value) => accumulator + value, 0);
    return sum / values.length;
  })();
  const averageLagLabel = averageLagDays === null ? '—' : formatRelativeDays(averageLagDays);

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
    {
      label: 'Refresh queue',
      value: formatNumber(totalAttention),
      detail: `${formatNumber(totalStale)} stale • ${formatNumber(totalMissingSignals)} missing signals • avg refresh ${averageLagLabel}`,
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

  const datasetById = new Map(datasets.map((deck) => [deck.id, deck]));

  const buildFreshnessCards = (assessments) => {
    freshnessGrid.innerHTML = '';

    if (!Array.isArray(assessments) || assessments.length === 0) {
      const fallback = document.createElement('p');
      fallback.textContent = 'No decks available to audit.';
      fallback.style.color = 'var(--text-secondary)';
      freshnessGrid.appendChild(fallback);
      return;
    }

    assessments.forEach((assessment) => {
      const card = document.createElement('article');
      card.className = 'freshness-card';

      if (assessment.statusCounts.stale > 0) {
        card.classList.add('needs-action');
      } else if (assessment.statusCounts.dueSoon > 0) {
        card.classList.add('due-soon');
      }

      const heading = document.createElement('h3');
      heading.textContent = assessment.label;
      card.appendChild(heading);

      const lastRefresh = document.createElement('p');
      if (assessment.latestAgeDays === null) {
        lastRefresh.textContent = 'No refresh timestamps captured.';
      } else {
        const timestampLabel = assessment.latestTimestamp
          ? formatTimestamp(assessment.latestTimestamp.toISOString())
          : '—';
        lastRefresh.textContent = `Last refresh ${formatRelativeDays(assessment.latestAgeDays)} (${timestampLabel})`;
      }
      card.appendChild(lastRefresh);

      const meta = document.createElement('p');
      meta.className = 'freshness-meta';
      const embeddingLabel = `${formatNumber(assessment.counts.embeddings)} embedding store${assessment.counts.embeddings === 1 ? '' : 's'}`;
      const similarityLabel = `${formatNumber(assessment.counts.similarityReports)} similarity report${assessment.counts.similarityReports === 1 ? '' : 's'}`;
      meta.textContent = `${embeddingLabel} • ${similarityLabel}`;
      card.appendChild(meta);

      const statusList = document.createElement('ul');
      statusList.className = 'freshness-status-list';

      const descriptors = [
        { key: 'manifest', label: 'Manifest', missing: 'Manifest not generated' },
        { key: 'embeddings', label: 'Embeddings', missing: 'No embedding stores tracked' },
        { key: 'similarity', label: 'Similarity', missing: 'No similarity reports' },
      ];

      descriptors.forEach((descriptor) => {
        const info = assessment.statuses[descriptor.key];
        const item = document.createElement('li');
        item.className = `status-chip ${info.className || 'status-muted'}`;

        const title = document.createElement('span');
        title.className = 'status-chip__title';
        title.textContent = descriptor.label;
        item.appendChild(title);

        const value = document.createElement('span');
        value.className = 'status-chip__value';
        if (info.ageDays === null) {
          value.textContent = info.count > 0 ? 'Timestamp missing' : descriptor.missing;
        } else {
          value.textContent = formatRelativeDays(info.ageDays);
        }
        item.appendChild(value);

        const detailParts = [];

        if (info.ageDays !== null) {
          detailParts.push(info.toneLabel);
        }

        if (descriptor.key === 'embeddings') {
          const storeLabel = `${formatNumber(info.count)} store${info.count === 1 ? '' : 's'}`;
          detailParts.push(storeLabel);
          if (info.spanDays && info.spanDays > 0.4) {
            detailParts.push(`spread ${decimalFormatter.format(info.spanDays)}d`);
          }
        } else if (descriptor.key === 'similarity') {
          const reportLabel = `${formatNumber(info.count)} report${info.count === 1 ? '' : 's'}`;
          detailParts.push(reportLabel);
          if (info.spanDays && info.spanDays > 0.4) {
            detailParts.push(`span ${decimalFormatter.format(info.spanDays)}d`);
          }
        } else if (descriptor.key === 'manifest' && info.count > 0 && info.ageDays !== null) {
          detailParts.push('1 file');
        }

        if (info.newestDate) {
          detailParts.push(formatTimestamp(info.newestDate.toISOString()));
        }

        if (detailParts.length > 0) {
          const detail = document.createElement('span');
          detail.className = 'status-chip__detail';
          detail.textContent = detailParts.join(' • ');
          item.appendChild(detail);
        }

        statusList.appendChild(item);
      });

      card.appendChild(statusList);
      freshnessGrid.appendChild(card);
    });
  };

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
      meta.textContent = `${datasetLabel} • ${formatBytes(source.bytes || 0)}`;
      item.appendChild(meta);

      const pathCode = document.createElement('code');
      pathCode.textContent = source.path;
      item.appendChild(pathCode);

      sourceList.appendChild(item);
    });
  };

  buildFreshnessCards(deckFreshness);
  buildDatasetChart();
  buildProviderChart();
  buildDatasetTable();
  buildSimilarityCards();
  buildSourcesList();
})();
