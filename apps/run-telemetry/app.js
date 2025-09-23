(() => {
  const selectors = {
    runStart: document.querySelector('[data-run-start]'),
    runDuration: document.querySelector('[data-run-duration]'),
    runTotal: document.querySelector('[data-run-total]'),
    refreshButton: document.querySelector('[data-refresh-button]'),
    filterButtons: document.querySelectorAll('[data-filter-button]'),
    filterCounts: document.querySelectorAll('[data-filter-count]'),
    testList: document.querySelector('[data-test-list]'),
    emptyState: document.querySelector('[data-empty-state]'),
    detailPanel: document.querySelector('[data-detail-panel]'),
    detailTitle: document.querySelector('[data-detail-title]'),
    detailLocation: document.querySelector('[data-detail-location]'),
    detailStart: document.querySelector('[data-detail-start]'),
    detailDuration: document.querySelector('[data-detail-duration]'),
    detailProject: document.querySelector('[data-detail-project]'),
    detailPill: document.querySelector('[data-detail-pill]'),
    errorSection: document.querySelector('[data-detail-errors]'),
    errorList: document.querySelector('[data-error-list]'),
    logList: document.querySelector('[data-log-list]'),
    attachmentSection: document.querySelector('[data-detail-attachments]'),
    attachmentList: document.querySelector('[data-attachment-list]'),
  };

  if (!selectors.runStart || !selectors.testList || !selectors.detailPanel) {
    return;
  }

  const statusLabels = {
    all: 'All',
    passed: 'Passed',
    failed: 'Failed',
    timedOut: 'Timed out',
    interrupted: 'Interrupted',
    flaky: 'Flaky',
    skipped: 'Skipped',
    unknown: 'Unknown',
  };

  const statusOrder = ['failed', 'flaky', 'timedOut', 'interrupted', 'skipped', 'passed', 'unknown'];

  const state = {
    tests: [],
    filteredStatus: 'all',
    selectedId: null,
    stats: null,
    lastReport: null,
  };

  const fallbackReport = typeof window !== 'undefined' ? window.playwrightRunLogFallback || null : null;

  const reportUrl = (() => {
    try {
      return new URL('../../data/test-runs/latest.json', window.location.href);
    } catch (error) {
      return null;
    }
  })();

  const formatDuration = (milliseconds) => {
    const ms = typeof milliseconds === 'number' ? milliseconds : Number(milliseconds);
    if (!Number.isFinite(ms) || ms < 0) {
      return '—';
    }
    if (ms < 1000) {
      return `${Math.round(ms)} ms`;
    }
    const seconds = ms / 1000;
    if (seconds < 60) {
      return `${seconds.toFixed(seconds < 10 ? 2 : 1)} s`;
    }
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    if (minutes < 60) {
      return `${minutes} min ${remainingSeconds.toFixed(remainingSeconds < 10 ? 1 : 0)} s`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours} h ${remainingMinutes} min`;
  };

  const formatTimestamp = (isoString) => {
    if (typeof isoString !== 'string' || !isoString) {
      return '—';
    }
    const date = new Date(isoString);
    if (Number.isNaN(date.getTime())) {
      return '—';
    }
    const time = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const day = date.toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' });
    return `${day} · ${time}`;
  };

  const createLogEntry = (type, label, text) => ({
    type,
    label,
    text,
  });

  const normalizePath = (pathValue) => {
    if (typeof pathValue !== 'string') {
      return '';
    }
    return pathValue.replace(/^\.\/?/, '').replace(/\\/g, '/');
  };

  const computeDisplayTitle = (breadcrumbs, specTitle) => {
    const filtered = breadcrumbs.filter((crumb, index) => {
      if (!crumb) {
        return false;
      }
      if (index === 0 && /\.spec\./i.test(crumb)) {
        return false;
      }
      return true;
    });
    const parts = [...filtered, specTitle].filter(Boolean);
    return parts.join(' › ') || specTitle;
  };

  const flattenReport = (report) => {
    const tests = [];

    const walkSuites = (suite, ancestors = []) => {
      if (!suite || typeof suite !== 'object') {
        return;
      }
      const nextAncestors = Array.isArray(ancestors) ? [...ancestors] : [];
      if (suite.title) {
        nextAncestors.push(suite.title);
      }

      if (Array.isArray(suite.specs)) {
        suite.specs.forEach((spec) => {
          if (!spec || typeof spec !== 'object' || !Array.isArray(spec.tests)) {
            return;
          }
          spec.tests.forEach((testInstance, index) => {
            const results = Array.isArray(testInstance?.results) ? testInstance.results : [];
            const latestResult = results.length > 0 ? results[results.length - 1] : null;
            const status = latestResult?.status || testInstance?.expectedStatus || 'unknown';
            const startTime = latestResult?.startTime || null;
            const duration = typeof latestResult?.duration === 'number' ? latestResult.duration : null;
            const errors = Array.isArray(latestResult?.errors) ? latestResult.errors : [];
            const stdout = Array.isArray(latestResult?.stdout) ? latestResult.stdout : [];
            const stderr = Array.isArray(latestResult?.stderr) ? latestResult.stderr : [];
            const attachments = Array.isArray(latestResult?.attachments) ? latestResult.attachments : [];

            const breadcrumbs = computeDisplayTitle(nextAncestors, spec.title).split(' › ');
            const displayTitle = computeDisplayTitle(nextAncestors, spec.title);
            const locationPath = normalizePath(spec.file || suite.file || '');
            const baseId = spec.id || `${displayTitle}-${index}`;
            const projectId = testInstance?.projectId || 'default';
            const testId = `${baseId}-${projectId}`;
            const workerIndex = typeof latestResult?.workerIndex === 'number' ? latestResult.workerIndex : null;
            const parallelIndex = typeof latestResult?.parallelIndex === 'number' ? latestResult.parallelIndex : null;

            const logEntries = [];
            if (startTime) {
              const workerLabel = Number.isInteger(workerIndex) ? `worker #${workerIndex}` : 'worker';
              logEntries.push(
                createLogEntry(
                  'synthetic',
                  'Started',
                  `${workerLabel} booted ${formatTimestamp(startTime)} (parallel slot ${Number.isInteger(parallelIndex) ? parallelIndex : 0}).`,
                ),
              );
            }

            stdout.forEach((entry) => {
              if (!entry) {
                return;
              }
              if (typeof entry.text === 'string' && entry.text.trim()) {
                logEntries.push(createLogEntry('stdout', 'Console', entry.text.trim()));
              } else if (typeof entry.base64 === 'string') {
                logEntries.push(createLogEntry('stdout', 'Console', '[binary stdout omitted]'));
              }
            });

            stderr.forEach((entry) => {
              if (!entry) {
                return;
              }
              if (typeof entry.text === 'string' && entry.text.trim()) {
                logEntries.push(createLogEntry('stderr', 'stderr', entry.text.trim()));
              } else if (typeof entry.base64 === 'string') {
                logEntries.push(createLogEntry('stderr', 'stderr', '[binary stderr omitted]'));
              }
            });

            if (errors.length === 0) {
              logEntries.push(
                createLogEntry(
                  'synthetic',
                  'Status',
                  `${statusLabels[status] || status} in ${formatDuration(duration)}.`,
                ),
              );
            }

            tests.push({
              id: testId,
              displayTitle,
              breadcrumbs,
              specTitle: spec.title,
              file: locationPath,
              line: spec.line,
              column: spec.column,
              status,
              expectedStatus: testInstance?.expectedStatus || 'passed',
              projectName: testInstance?.projectName || '',
              duration,
              startTime,
              errors: errors.map((errorEntry) => ({
                message: typeof errorEntry?.message === 'string' ? errorEntry.message : '',
                stack: typeof errorEntry?.stack === 'string' ? errorEntry.stack : '',
              })),
              logs: logEntries,
              attachments: attachments.map((attachment) => ({
                name: attachment?.name || 'Attachment',
                contentType: attachment?.contentType || '',
                path: normalizePath(attachment?.path || ''),
              })),
            });
          });
        });
      }

      if (Array.isArray(suite.suites)) {
        suite.suites.forEach((child) => walkSuites(child, nextAncestors));
      }
    };

    if (Array.isArray(report?.suites)) {
      report.suites.forEach((suite) => walkSuites(suite, []));
    }

    return tests;
  };

  const computeStatusCounts = (tests) => {
    const counts = {
      passed: 0,
      failed: 0,
      flaky: 0,
      timedOut: 0,
      interrupted: 0,
      skipped: 0,
      unknown: 0,
    };

    tests.forEach((test) => {
      const status = statusLabels[test.status] ? test.status : 'unknown';
      counts[status] += 1;
    });

    counts.all = tests.length;
    return counts;
  };

  const updateFilterCounts = (counts) => {
    selectors.filterCounts.forEach((countNode) => {
      const status = countNode.getAttribute('data-filter-count');
      const value = typeof counts[status] === 'number' ? counts[status] : 0;
      countNode.textContent = String(value);
    });
  };

  const applyFilterButtonState = () => {
    selectors.filterButtons.forEach((button) => {
      const status = button.getAttribute('data-filter-button');
      button.classList.toggle('is-active', status === state.filteredStatus);
    });
  };

  const renderSummary = () => {
    const { stats } = state;
    const tests = state.tests;
    const earliest = tests
      .map((test) => (test.startTime ? new Date(test.startTime).getTime() : Number.POSITIVE_INFINITY))
      .filter((value) => Number.isFinite(value));
    const startTime = stats?.startTime || (earliest.length > 0 ? new Date(Math.min(...earliest)).toISOString() : null);
    selectors.runStart.textContent = formatTimestamp(startTime);
    selectors.runDuration.textContent = formatDuration(stats?.duration);
    selectors.runTotal.textContent = String(tests.length);
  };

  const renderTestList = () => {
    const list = selectors.testList;
    if (!list) {
      return;
    }
    list.innerHTML = '';

    const filtered = state.tests.filter((test) => {
      if (state.filteredStatus === 'all') {
        return true;
      }
      return test.status === state.filteredStatus;
    });

    const sorted = [...filtered].sort((a, b) => {
      const aTime = a.startTime ? new Date(a.startTime).getTime() : 0;
      const bTime = b.startTime ? new Date(b.startTime).getTime() : 0;
      if (aTime !== bTime) {
        return bTime - aTime;
      }
      const aIndex = statusOrder.indexOf(a.status);
      const bIndex = statusOrder.indexOf(b.status);
      if (aIndex !== bIndex) {
        return aIndex - bIndex;
      }
      return a.displayTitle.localeCompare(b.displayTitle);
    });

    if (!state.selectedId && sorted.length > 0) {
      state.selectedId = sorted[0].id;
    }

    const selectionStillVisible = sorted.some((test) => test.id === state.selectedId);
    if (!selectionStillVisible && sorted.length > 0) {
      state.selectedId = sorted[0].id;
    }

    sorted.forEach((test) => {
      const listItem = document.createElement('li');
      const button = document.createElement('button');
      button.type = 'button';
      button.setAttribute('data-test-id', test.id);
      button.setAttribute('data-status', test.status);
      if (test.id === state.selectedId) {
        button.setAttribute('aria-current', 'true');
      }

      button.addEventListener('click', () => {
        selectTest(test.id);
        button.focus({ preventScroll: true });
      });

      const label = document.createElement('span');
      label.className = 'test-label';
      const dot = document.createElement('span');
      dot.className = `status-dot ${test.status}`;
      label.appendChild(dot);
      label.appendChild(document.createTextNode(test.displayTitle));

      const meta = document.createElement('div');
      meta.className = 'test-meta';
      if (test.duration !== null) {
        const durationSpan = document.createElement('span');
        durationSpan.textContent = formatDuration(test.duration);
        meta.appendChild(durationSpan);
      }
      if (test.file) {
        const locationSpan = document.createElement('span');
        locationSpan.textContent = test.file;
        meta.appendChild(locationSpan);
      }

      button.appendChild(label);
      button.appendChild(meta);
      listItem.appendChild(button);
      list.appendChild(listItem);
    });

    if (sorted.length === 0) {
      selectors.emptyState.removeAttribute('hidden');
    } else {
      selectors.emptyState.setAttribute('hidden', 'hidden');
    }
  };

  const renderErrors = (test) => {
    const hasErrors = Array.isArray(test.errors) && test.errors.length > 0;
    if (!hasErrors) {
      selectors.errorSection?.setAttribute('hidden', 'hidden');
      selectors.errorList.innerHTML = '';
      return;
    }
    selectors.errorSection?.removeAttribute('hidden');
    selectors.errorList.innerHTML = '';
    test.errors.forEach((error) => {
      const item = document.createElement('li');
      const message = document.createElement('pre');
      message.textContent = error.message || 'Unknown error';
      item.appendChild(message);
      if (error.stack) {
        const stack = document.createElement('pre');
        stack.textContent = error.stack;
        item.appendChild(stack);
      }
      selectors.errorList.appendChild(item);
    });
  };

  const renderLogs = (test) => {
    selectors.logList.innerHTML = '';
    const entries = Array.isArray(test.logs) && test.logs.length > 0
      ? test.logs
      : [createLogEntry('synthetic', 'Status', `${statusLabels[test.status] || test.status}.`)];
    entries.forEach((entry) => {
      const item = document.createElement('li');
      item.className = `log-entry ${entry.type}`;
      item.setAttribute('data-log-entry', entry.type);
      const badge = document.createElement('span');
      badge.className = 'badge';
      badge.textContent = entry.label;
      const text = document.createElement('span');
      text.textContent = entry.text;
      item.appendChild(badge);
      item.appendChild(text);
      selectors.logList.appendChild(item);
    });
  };

  const renderAttachments = (test) => {
    const hasAttachments = Array.isArray(test.attachments) && test.attachments.length > 0;
    if (!hasAttachments) {
      selectors.attachmentSection?.setAttribute('hidden', 'hidden');
      selectors.attachmentList.innerHTML = '';
      return;
    }
    selectors.attachmentSection?.removeAttribute('hidden');
    selectors.attachmentList.innerHTML = '';
    test.attachments.forEach((attachment) => {
      const item = document.createElement('li');
      item.className = 'attachment-item';
      const name = document.createElement('strong');
      name.textContent = attachment.name;
      item.appendChild(name);
      if (attachment.path) {
        const link = document.createElement('a');
        link.href = `../../${attachment.path}`;
        link.textContent = 'Open attachment';
        link.target = '_blank';
        link.rel = 'noreferrer noopener';
        item.appendChild(link);
      } else if (attachment.contentType) {
        const details = document.createElement('span');
        details.textContent = attachment.contentType;
        item.appendChild(details);
      }
      selectors.attachmentList.appendChild(item);
    });
  };

  const renderDetail = () => {
    const active = state.tests.find((test) => test.id === state.selectedId);
    if (!active) {
      selectors.detailTitle.textContent = 'Pick a test to explore its timeline';
      selectors.detailLocation.textContent = '';
      selectors.detailStart.textContent = '--';
      selectors.detailDuration.textContent = '--';
      selectors.detailProject.textContent = '--';
      selectors.detailPill.textContent = 'Waiting';
      selectors.detailPill.className = 'pill';
      selectors.logList.innerHTML = '';
      selectors.errorList.innerHTML = '';
      selectors.attachmentList.innerHTML = '';
      selectors.errorSection?.setAttribute('hidden', 'hidden');
      selectors.attachmentSection?.setAttribute('hidden', 'hidden');
      return;
    }

    const pill = selectors.detailPill;
    pill.textContent = statusLabels[active.status] || active.status;
    pill.className = `pill ${active.status}`;

    selectors.detailTitle.textContent = active.displayTitle;
    const locationParts = [];
    if (active.file) {
      locationParts.push(active.file);
    }
    if (Number.isInteger(active.line)) {
      locationParts.push(`L${active.line}`);
    }
    selectors.detailLocation.textContent = locationParts.join(' · ');
    selectors.detailStart.textContent = formatTimestamp(active.startTime);
    selectors.detailDuration.textContent = formatDuration(active.duration);
    selectors.detailProject.textContent = active.projectName || 'default';

    renderErrors(active);
    renderLogs(active);
    renderAttachments(active);
  };

  const selectTest = (testId) => {
    state.selectedId = testId;
    renderTestList();
    renderDetail();
  };

  const attachFilterListeners = () => {
    selectors.filterButtons.forEach((button) => {
      button.addEventListener('click', () => {
        const status = button.getAttribute('data-filter-button') || 'all';
        state.filteredStatus = status;
        applyFilterButtonState();
        renderTestList();
        renderDetail();
      });
    });
  };

  const attachListKeyboardNavigation = () => {
    selectors.testList.addEventListener('keydown', (event) => {
      const { key } = event;
      if (!['ArrowUp', 'ArrowDown', 'Home', 'End'].includes(key)) {
        return;
      }
      const buttons = Array.from(selectors.testList.querySelectorAll('button'));
      if (buttons.length === 0) {
        return;
      }
      event.preventDefault();
      const currentIndex = buttons.findIndex((button) => button === document.activeElement);
      let targetIndex = currentIndex;
      if (key === 'ArrowDown') {
        targetIndex = currentIndex < buttons.length - 1 ? currentIndex + 1 : 0;
      } else if (key === 'ArrowUp') {
        targetIndex = currentIndex > 0 ? currentIndex - 1 : buttons.length - 1;
      } else if (key === 'Home') {
        targetIndex = 0;
      } else if (key === 'End') {
        targetIndex = buttons.length - 1;
      }
      const target = buttons[targetIndex];
      if (target) {
        target.focus({ preventScroll: true });
        target.click();
      }
    });
  };

  const fetchReport = async () => {
    if (!reportUrl) {
      return null;
    }
    try {
      const response = await fetch(reportUrl.toString(), { cache: 'no-store' });
      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.warn('Failed to load Playwright report, falling back to snapshot.', error);
      return null;
    }
  };

  const normalizeReport = (report) => {
    if (!report || typeof report !== 'object') {
      return null;
    }
    const stats = report.stats || {};
    return {
      stats: {
        startTime: stats.startTime || null,
        duration: stats.duration || null,
        expected: stats.expected || null,
        unexpected: stats.unexpected || null,
      },
      suites: Array.isArray(report.suites) ? report.suites : [],
    };
  };

  const loadReport = async () => {
    selectors.refreshButton.disabled = true;
    selectors.refreshButton.setAttribute('aria-busy', 'true');
    const liveReport = await fetchReport();
    const report = normalizeReport(liveReport) || normalizeReport(fallbackReport);
    if (!report) {
      state.tests = [];
      state.stats = null;
      state.selectedId = null;
      selectors.detailTitle.textContent = 'Unable to load Playwright logs.';
      selectors.detailPill.textContent = 'Offline';
      selectors.detailPill.className = 'pill skipped';
      selectors.runStart.textContent = '—';
      selectors.runDuration.textContent = '—';
      selectors.runTotal.textContent = '0';
      selectors.testList.innerHTML = '';
      selectors.emptyState.removeAttribute('hidden');
      selectors.refreshButton.disabled = false;
      selectors.refreshButton.removeAttribute('aria-busy');
      return;
    }

    state.lastReport = report;
    state.tests = flattenReport(report);
    state.stats = report.stats || null;
    state.selectedId = null;
    state.filteredStatus = 'all';

    const counts = computeStatusCounts(state.tests);
    updateFilterCounts(counts);
    applyFilterButtonState();
    renderSummary();
    renderTestList();
    renderDetail();

    selectors.refreshButton.disabled = false;
    selectors.refreshButton.removeAttribute('aria-busy');
  };

  attachFilterListeners();
  attachListKeyboardNavigation();
  selectors.refreshButton.addEventListener('click', () => {
    loadReport();
  });

  loadReport();
})();
