(() => {
  const telemetryTimeline = [
    {
      month: "2023-12",
      label: "Dec 2023",
      metrics: {
        "atlas-70b": { mmlu: 70.8, code: 58.2, math: 57.2, truth: 61.4, tokenRate: 49 },
        "solstice-120b": { mmlu: 68.4, code: 61.5, math: 54.6, truth: 58.1, tokenRate: 42 },
        "orion-45b": { mmlu: 63.5, code: 48.1, math: 66.1, truth: 57.9, tokenRate: 58 },
        "quanta-8b": { mmlu: 52.6, code: 36.4, math: 42.3, truth: 49.5, tokenRate: 70 }
      }
    },
    {
      month: "2024-01",
      label: "Jan 2024",
      metrics: {
        "atlas-70b": { mmlu: 72.1, code: 59.6, math: 58.5, truth: 62.2, tokenRate: 52 },
        "solstice-120b": { mmlu: 69.7, code: 63.8, math: 55.9, truth: 59.7, tokenRate: 43 },
        "orion-45b": { mmlu: 64.8, code: 49.6, math: 67.5, truth: 58.4, tokenRate: 60 },
        "quanta-8b": { mmlu: 54.1, code: 37.9, math: 43.8, truth: 50.3, tokenRate: 72 }
      }
    },
    {
      month: "2024-02",
      label: "Feb 2024",
      metrics: {
        "atlas-70b": { mmlu: 73.5, code: 61.4, math: 59.8, truth: 63.3, tokenRate: 54 },
        "solstice-120b": { mmlu: 71, code: 64.9, math: 57.2, truth: 60.5, tokenRate: 45 },
        "orion-45b": { mmlu: 66.2, code: 50.8, math: 68.9, truth: 59.2, tokenRate: 62 },
        "quanta-8b": { mmlu: 55.9, code: 39.5, math: 45.1, truth: 51.1, tokenRate: 74 }
      }
    },
    {
      month: "2024-03",
      label: "Mar 2024",
      metrics: {
        "atlas-70b": { mmlu: 74.2, code: 63.1, math: 61.6, truth: 64.5, tokenRate: 56 },
        "solstice-120b": { mmlu: 72.9, code: 66.5, math: 58.9, truth: 62.1, tokenRate: 47 },
        "orion-45b": { mmlu: 68.7, code: 52.9, math: 70.8, truth: 60.5, tokenRate: 64 },
        "quanta-8b": { mmlu: 58.2, code: 41.1, math: 47.6, truth: 52.4, tokenRate: 76 }
      }
    },
    {
      month: "2024-04",
      label: "Apr 2024",
      metrics: {
        "atlas-70b": { mmlu: 75.4, code: 64.2, math: 63.1, truth: 65.8, tokenRate: 59 },
        "solstice-120b": { mmlu: 74.1, code: 67.8, math: 61.5, truth: 63.6, tokenRate: 48 },
        "orion-45b": { mmlu: 70.3, code: 54.1, math: 72.4, truth: 61.7, tokenRate: 66 },
        "quanta-8b": { mmlu: 60.5, code: 43.2, math: 49.8, truth: 53.8, tokenRate: 78 }
      }
    },
    {
      month: "2024-05",
      label: "May 2024",
      metrics: {
        "atlas-70b": { mmlu: 76.8, code: 65.7, math: 64.3, truth: 66.9, tokenRate: 61 },
        "solstice-120b": { mmlu: 75.6, code: 69.1, math: 63.8, truth: 64.8, tokenRate: 50 },
        "orion-45b": { mmlu: 71.9, code: 55.8, math: 74.6, truth: 62.9, tokenRate: 69 },
        "quanta-8b": { mmlu: 62.7, code: 45, math: 52.9, truth: 55.2, tokenRate: 81 }
      }
    }
  ];

  const models = [
    {
      id: "atlas-70b",
      name: "Atlas 70B",
      family: "Atlas",
      provider: "Open Research Cooperative",
      params: "70B",
      context: "128k tokens",
      release: "2023-11-15",
      focus: "Generalist baseline",
      notes: "Steady lifts across knowledge and truthfulness with mid-pack throughput that keeps latency predictable."
    },
    {
      id: "solstice-120b",
      name: "Solstice 120B",
      family: "Solstice",
      provider: "Solstice AI",
      params: "120B",
      context: "256k tokens",
      release: "2024-01-04",
      focus: "Dialog reasoning",
      notes: "Leans into multilingual reasoning and long-context synthesis while closing the gap on code generation."
    },
    {
      id: "orion-45b",
      name: "Orion 45B",
      family: "Orion",
      provider: "Northstar Labs",
      params: "45B",
      context: "96k tokens",
      release: "2023-09-22",
      focus: "Math-first toolformer",
      notes: "Aggressive chain-of-thought traces keep GSM8K at the front while throughput remains agent-friendly."
    },
    {
      id: "quanta-8b",
      name: "Quanta 8B",
      family: "Quanta",
      provider: "Quanta Forge",
      params: "8B",
      context: "64k tokens",
      release: "2023-07-01",
      focus: "Edge deployment",
      notes: "Distilled for efficiency—token rate leads the pack even as truthfulness climbs each month."
    }
  ];

  const metrics = [
    {
      key: "mmlu",
      label: "MMLU",
      shortLabel: "MMLU",
      suffix: "%",
      decimals: 1,
      description: "General knowledge accuracy across 57 tasks."
    },
    {
      key: "code",
      label: "HumanEval",
      shortLabel: "HumanEval",
      suffix: "%",
      decimals: 1,
      description: "Python code generation pass@1."
    },
    {
      key: "math",
      label: "GSM8K",
      shortLabel: "GSM8K",
      suffix: "%",
      decimals: 1,
      description: "Grade school math problem solving accuracy."
    },
    {
      key: "truth",
      label: "TruthfulQA",
      shortLabel: "TruthfulQA",
      suffix: "%",
      decimals: 1,
      description: "Hallucination resistance on TruthfulQA."
    },
    {
      key: "tokenRate",
      label: "Token rate",
      shortLabel: "Token rate",
      suffix: " tok/s",
      decimals: 0,
      description: "Tokens generated per second at 8k context."
    }
  ];

  const elements = {
    summaryGrid: document.querySelector("[data-summary-grid]"),
    metricToggle: document.querySelector("[data-metric-toggle]"),
    chart: document.querySelector("[data-metric-chart]"),
    chartCaption: document.querySelector("[data-chart-caption]"),
    chartEmpty: document.querySelector("[data-chart-empty]"),
    modelToggle: document.querySelector("[data-model-toggle]"),
    legendList: document.querySelector("[data-chart-legend]"),
    insightsList: document.querySelector("[data-insights-list]"),
    tableBody: document.querySelector("[data-latest-table]"),
    dossierGrid: document.querySelector("[data-dossier-grid]")
  };

  if (!elements.summaryGrid || !elements.metricToggle || !elements.chart || !elements.chartCaption || !elements.chartEmpty || !elements.modelToggle || !elements.legendList || !elements.insightsList || !elements.tableBody || !elements.dossierGrid) {
    return;
  }

  const style = getComputedStyle(document.documentElement);
  const colorScale = {
    "atlas-70b": style.getPropertyValue("--atlas-color").trim() || "#6c7dff",
    "solstice-120b": style.getPropertyValue("--solstice-color").trim() || "#f97316",
    "orion-45b": style.getPropertyValue("--orion-color").trim() || "#22d3ee",
    "quanta-8b": style.getPropertyValue("--quanta-color").trim() || "#a855f7"
  };

  const metricsByKey = new Map(metrics.map((metric) => [metric.key, metric]));
  const state = {
    metricKey: metrics[0].key,
    activeModels: new Set(models.map((model) => model.id))
  };

  const latestSnapshot = telemetryTimeline[telemetryTimeline.length - 1];
  const previousSnapshot = telemetryTimeline[telemetryTimeline.length - 2];
  const earliestSnapshot = telemetryTimeline[0];

  function formatValue(metric, value) {
    if (typeof value !== "number" || Number.isNaN(value)) {
      return "—";
    }
    const formatted = metric.decimals === 0 ? Math.round(value).toLocaleString() : value.toFixed(metric.decimals);
    return `${formatted}${metric.suffix}`;
  }

  function formatDelta(metric, delta) {
    if (!Number.isFinite(delta) || delta === 0) {
      return `±0${metric.suffix}`;
    }
    const magnitude = Math.abs(delta);
    const formatted = metric.decimals === 0 ? Math.round(magnitude).toLocaleString() : magnitude.toFixed(metric.decimals);
    const sign = delta > 0 ? "+" : "−";
    return `${sign}${formatted}${metric.suffix}`;
  }

  function buildSummaryCards() {
    const primaryKeys = ["mmlu", "code", "math", "truth"];
    const leaderboard = models.map((model) => {
      const latestMetrics = latestSnapshot.metrics[model.id] || {};
      const average = primaryKeys.reduce((acc, key) => acc + (latestMetrics[key] ?? 0), 0) / primaryKeys.length;
      return { model, average };
    }).sort((a, b) => b.average - a.average);

    const fastest = models.map((model) => {
      const latestMetrics = latestSnapshot.metrics[model.id] || {};
      return { model, rate: latestMetrics.tokenRate ?? 0 };
    }).sort((a, b) => b.rate - a.rate);

    const improvement = models.map((model) => {
      const latestMetrics = latestSnapshot.metrics[model.id] || {};
      const earliestMetrics = earliestSnapshot.metrics[model.id] || {};
      return { model, delta: (latestMetrics.mmlu ?? 0) - (earliestMetrics.mmlu ?? 0) };
    }).sort((a, b) => b.delta - a.delta);

    const summary = [
      {
        title: "Overall leader",
        strong: leaderboard[0]?.model.name ?? "—",
        body: leaderboard[0]
          ? `${leaderboard[0].average.toFixed(1)}% blended score across ${primaryKeys.length} suites. ${leaderboard[1] ? `+${(leaderboard[0].average - leaderboard[1].average).toFixed(1)} pts over ${leaderboard[1].model.name}.` : ""}`
          : "Latest sweep pending."
      },
      {
        title: "Throughput leader",
        strong: fastest[0]?.model.name ?? "—",
        body: fastest[0]
          ? `${formatValue(metricsByKey.get("tokenRate"), fastest[0].rate)} at 8k context. ${fastest[1] ? `${Math.round(fastest[0].rate - fastest[1].rate)} tok/s over ${fastest[1].model.name}.` : ""}`
          : "Latest sweep pending."
      },
      {
        title: "MMLU momentum",
        strong: improvement[0]?.model.name ?? "—",
        body: improvement[0]
          ? `${formatDelta(metricsByKey.get("mmlu"), improvement[0].delta)} since ${earliestSnapshot.label}.`
          : "Latest sweep pending."
      }
    ];

    elements.summaryGrid.innerHTML = "";
    summary.forEach((item) => {
      const card = document.createElement("article");
      card.className = "summary-card";
      const heading = document.createElement("h3");
      heading.textContent = item.title;
      const strong = document.createElement("strong");
      strong.textContent = item.strong;
      const paragraph = document.createElement("p");
      paragraph.textContent = item.body;
      card.append(heading, strong, paragraph);
      elements.summaryGrid.appendChild(card);
    });
  }

  function buildMetricToggle() {
    elements.metricToggle.innerHTML = "";
    metrics.forEach((metric) => {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = metric.label;
      button.title = metric.description;
      if (state.metricKey === metric.key) {
        button.dataset.active = "true";
      }
      button.addEventListener("click", () => {
        if (state.metricKey === metric.key) {
          return;
        }
        state.metricKey = metric.key;
        buildMetricToggle();
        renderChart();
        renderLegend();
      });
      elements.metricToggle.appendChild(button);
    });
  }

  function buildModelToggle() {
    elements.modelToggle.innerHTML = "";
    models.forEach((model) => {
      const label = document.createElement("label");
      label.className = "model-chip";
      label.style.setProperty("--swatch-color", colorScale[model.id]);
      if (state.activeModels.has(model.id)) {
        label.dataset.active = "true";
      }
      const swatch = document.createElement("span");
      swatch.className = "swatch";
      swatch.setAttribute("aria-hidden", "true");
      const span = document.createElement("span");
      span.textContent = model.name;
      const input = document.createElement("input");
      input.type = "checkbox";
      input.checked = state.activeModels.has(model.id);
      input.addEventListener("change", () => {
        if (input.checked) {
          state.activeModels.add(model.id);
          label.dataset.active = "true";
        } else {
          state.activeModels.delete(model.id);
          label.dataset.active = "false";
        }
        renderChart();
        renderLegend();
      });
      label.append(input, swatch, span);
      elements.modelToggle.appendChild(label);
    });
  }

  function getSeriesData(metricKey) {
    return models
      .filter((model) => state.activeModels.has(model.id))
      .map((model) => {
        const points = telemetryTimeline
          .map((entry, index) => {
            const value = entry.metrics[model.id]?.[metricKey];
            if (typeof value !== "number") {
              return null;
            }
            return {
              index,
              value,
              label: entry.label,
              month: entry.month
            };
          })
          .filter(Boolean);
        return { model, points };
      })
      .filter((series) => series.points.length > 0);
  }

  function createSvgElement(name, attributes) {
    const element = document.createElementNS("http://www.w3.org/2000/svg", name);
    if (attributes) {
      Object.entries(attributes).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          element.setAttribute(key, String(value));
        }
      });
    }
    return element;
  }

  function renderChart() {
    const metric = metricsByKey.get(state.metricKey);
    const width = 760;
    const height = 360;
    const margin = { top: 32, right: 24, bottom: 60, left: 70 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const seriesData = getSeriesData(metric.key);

    elements.chart.setAttribute("viewBox", `0 0 ${width} ${height}`);
    elements.chart.innerHTML = "";

    if (seriesData.length === 0) {
      elements.chartEmpty.hidden = false;
      elements.chartCaption.textContent = "Select one or more models to plot their trajectory.";
      return;
    }

    elements.chartEmpty.hidden = true;

    const xPositions = telemetryTimeline.map((_, index) => {
      if (telemetryTimeline.length === 1) {
        return margin.left + innerWidth / 2;
      }
      return margin.left + (innerWidth * index) / (telemetryTimeline.length - 1);
    });

    let minValue = Infinity;
    let maxValue = -Infinity;
    seriesData.forEach((series) => {
      series.points.forEach((point) => {
        if (point.value < minValue) {
          minValue = point.value;
        }
        if (point.value > maxValue) {
          maxValue = point.value;
        }
      });
    });

    if (!Number.isFinite(minValue) || !Number.isFinite(maxValue)) {
      elements.chartCaption.textContent = "No data available for the selected metric.";
      return;
    }

    if (minValue === maxValue) {
      const pad = Math.abs(minValue) * 0.1 || 1;
      minValue -= pad;
      maxValue += pad;
    }

    const padding = (maxValue - minValue) * 0.12;
    const domainMin = minValue - padding;
    const domainMax = maxValue + padding;

    const scaleY = (value) => {
      return margin.top + innerHeight - ((value - domainMin) / (domainMax - domainMin)) * innerHeight;
    };

    const background = createSvgElement("rect", {
      x: margin.left,
      y: margin.top,
      width: innerWidth,
      height: innerHeight,
      fill: "url(#chartBackground)"
    });

    const defs = createSvgElement("defs");
    const gradient = createSvgElement("linearGradient", {
      id: "chartBackground",
      x1: "0%",
      y1: "0%",
      x2: "0%",
      y2: "100%"
    });
    gradient.append(
      createSvgElement("stop", { offset: "0%", "stop-color": "rgba(108, 125, 255, 0.16)" }),
      createSvgElement("stop", { offset: "100%", "stop-color": "rgba(108, 125, 255, 0)" })
    );
    defs.appendChild(gradient);
    elements.chart.appendChild(defs);
    elements.chart.appendChild(background);

    const gridGroup = createSvgElement("g", { stroke: "var(--chart-grid)", "stroke-width": 1, fill: "none" });
    elements.chart.appendChild(gridGroup);

    const yTicks = 5;
    for (let i = 0; i <= yTicks; i += 1) {
      const ratio = i / yTicks;
      const y = margin.top + innerHeight - ratio * innerHeight;
      const line = createSvgElement("line", {
        x1: margin.left,
        y1: y,
        x2: margin.left + innerWidth,
        y2: y,
        "stroke-dasharray": i === 0 ? "" : "4 8"
      });
      gridGroup.appendChild(line);
      const value = domainMin + (domainMax - domainMin) * ratio;
      const label = createSvgElement("text", {
        x: margin.left - 12,
        y: y + 4,
        "text-anchor": "end",
        "font-size": 12,
        fill: "var(--text-secondary)"
      });
      label.textContent = metric.decimals === 0 ? Math.round(value).toLocaleString() : value.toFixed(metric.decimals);
      elements.chart.appendChild(label);
    }

    telemetryTimeline.forEach((entry, index) => {
      const x = xPositions[index];
      const line = createSvgElement("line", {
        x1: x,
        y1: margin.top,
        x2: x,
        y2: margin.top + innerHeight,
        "stroke-dasharray": index === 0 || index === telemetryTimeline.length - 1 ? "" : "2 10"
      });
      gridGroup.appendChild(line);
      const label = createSvgElement("text", {
        x,
        y: margin.top + innerHeight + 24,
        "text-anchor": "middle",
        "font-size": 12,
        fill: "var(--text-secondary)"
      });
      label.textContent = entry.label;
      elements.chart.appendChild(label);
    });

    const seriesGroup = createSvgElement("g", { fill: "none", "stroke-width": 3 });
    elements.chart.appendChild(seriesGroup);

    seriesData.forEach((series) => {
      const pathData = series.points
        .map((point, index) => {
          const command = index === 0 ? "M" : "L";
          const x = xPositions[point.index];
          const y = scaleY(point.value);
          return `${command}${x.toFixed(2)},${y.toFixed(2)}`;
        })
        .join(" ");
      const path = createSvgElement("path", {
        d: pathData,
        stroke: colorScale[series.model.id],
        "stroke-linecap": "round",
        "stroke-linejoin": "round"
      });
      seriesGroup.appendChild(path);

      series.points.forEach((point) => {
        const circle = createSvgElement("circle", {
          cx: xPositions[point.index],
          cy: scaleY(point.value),
          r: 4,
          fill: colorScale[series.model.id]
        });
        seriesGroup.appendChild(circle);
      });
    });

    const leader = seriesData
      .map((series) => {
        const latestValue = latestSnapshot.metrics[series.model.id]?.[metric.key];
        return {
          model: series.model,
          value: typeof latestValue === "number" ? latestValue : null
        };
      })
      .filter((item) => typeof item.value === "number")
      .sort((a, b) => (b.value ?? 0) - (a.value ?? 0));

    if (leader[0]) {
      const latestValue = leader[0].value ?? 0;
      const previousValue = previousSnapshot?.metrics[leader[0].model.id]?.[metric.key];
      const delta = typeof previousValue === "number" ? latestValue - previousValue : 0;
      elements.chartCaption.textContent = `${metric.label}: ${leader[0].model.name} leads ${latestSnapshot.label} at ${formatValue(metric, latestValue)} (${formatDelta(metric, delta)} vs last month).`;
    } else {
      elements.chartCaption.textContent = `No leader detected for ${metric.label}.`;
    }
  }

  function renderLegend() {
    const metric = metricsByKey.get(state.metricKey);
    const seriesData = getSeriesData(metric.key);
    elements.legendList.innerHTML = "";

    if (seriesData.length === 0) {
      return;
    }

    seriesData
      .map((series) => {
        const latestValue = latestSnapshot.metrics[series.model.id]?.[metric.key];
        const previousValue = previousSnapshot?.metrics[series.model.id]?.[metric.key];
        const delta = typeof latestValue === "number" && typeof previousValue === "number" ? latestValue - previousValue : 0;
        return {
          series,
          latestValue,
          delta
        };
      })
      .sort((a, b) => (b.latestValue ?? 0) - (a.latestValue ?? 0))
      .forEach((item) => {
        const listItem = document.createElement("li");
        listItem.className = "legend-item";
        const swatch = document.createElement("span");
        swatch.className = "swatch";
        swatch.style.background = colorScale[item.series.model.id];
        const content = document.createElement("div");
        const name = document.createElement("strong");
        name.textContent = item.series.model.name;
        const valueLine = document.createElement("div");
        const value = document.createElement("span");
        value.className = "value";
        value.textContent = typeof item.latestValue === "number" ? formatValue(metric, item.latestValue) : "—";
        const delta = document.createElement("span");
        delta.className = "delta";
        if (item.delta > 0) {
          delta.classList.add("positive");
        } else if (item.delta < 0) {
          delta.classList.add("negative");
        }
        delta.textContent = formatDelta(metric, item.delta ?? 0);
        valueLine.append(value, document.createTextNode(" "), delta);
        content.append(name, valueLine);
        listItem.append(swatch, content);
        elements.legendList.appendChild(listItem);
      });
  }

  function renderInsights() {
    const metricMap = {
      math: metricsByKey.get("math"),
      truth: metricsByKey.get("truth"),
      tokenRate: metricsByKey.get("tokenRate"),
      code: metricsByKey.get("code")
    };

    const mathJump = models
      .map((model) => {
        const latest = latestSnapshot.metrics[model.id]?.math;
        const prev = previousSnapshot?.metrics[model.id]?.math;
        return { model, delta: typeof latest === "number" && typeof prev === "number" ? latest - prev : 0, latest };
      })
      .sort((a, b) => b.delta - a.delta)[0];

    const truthGain = models
      .map((model) => {
        const latest = latestSnapshot.metrics[model.id]?.truth;
        const start = earliestSnapshot.metrics[model.id]?.truth;
        return { model, delta: typeof latest === "number" && typeof start === "number" ? latest - start : 0 };
      })
      .sort((a, b) => b.delta - a.delta)[0];

    const throughput = models
      .map((model) => {
        const rate = latestSnapshot.metrics[model.id]?.tokenRate;
        return { model, rate: typeof rate === "number" ? rate : 0 };
      })
      .sort((a, b) => b.rate - a.rate);

    const fastest = throughput[0];
    const runner = throughput[1];

    const codeSpread = models
      .map((model) => {
        const score = latestSnapshot.metrics[model.id]?.code;
        return { model, score: typeof score === "number" ? score : 0 };
      })
      .sort((a, b) => b.score - a.score);

    elements.insightsList.innerHTML = "";

    const insights = [];
    if (mathJump && mathJump.delta) {
      const comparisonLabel = previousSnapshot?.label ?? "the prior sweep";
      insights.push(
        `${mathJump.model.name} posted the sharpest ${metricMap.math?.label ?? "math"} jump this month (${formatDelta(metricMap.math, mathJump.delta)} vs ${comparisonLabel}), landing at ${formatValue(metricMap.math, mathJump.latest ?? 0)}.`
      );
    }
    if (truthGain && truthGain.delta) {
      insights.push(
        `${truthGain.model.name} lifted ${metricMap.truth?.label ?? "TruthfulQA"} by ${formatDelta(metricMap.truth, truthGain.delta)} since ${earliestSnapshot.label}, tightening hallucination control.`
      );
    }
    if (fastest) {
      const gap = runner ? fastest.rate - runner.rate : 0;
      insights.push(
        `${fastest.model.name} maintains the fastest generation at ${formatValue(metricMap.tokenRate, fastest.rate)}${runner ? `, ${Math.round(gap)} tok/s ahead of ${runner.model.name}` : ""}.`
      );
    }
    if (codeSpread.length >= 2) {
      const leader = codeSpread[0];
      const chaser = codeSpread[1];
      const gap = leader.score - chaser.score;
      insights.push(
        `${leader.model.name} leads ${metricMap.code?.label ?? "code"} at ${formatValue(metricMap.code, leader.score)}, holding ${gap.toFixed(1)} pts over ${chaser.model.name}.`
      );
    }

    insights.slice(0, 4).forEach((entry) => {
      const item = document.createElement("li");
      item.textContent = entry;
      elements.insightsList.appendChild(item);
    });
  }

  function renderTable() {
    elements.tableBody.innerHTML = "";
    models.forEach((model) => {
      const latest = latestSnapshot.metrics[model.id] || {};
      const earliest = earliestSnapshot.metrics[model.id] || {};
      const row = document.createElement("tr");

      const cells = [
        model.name,
        model.params,
        model.context,
        formatValue(metricsByKey.get("mmlu"), latest.mmlu),
        formatValue(metricsByKey.get("code"), latest.code),
        formatValue(metricsByKey.get("math"), latest.math),
        formatValue(metricsByKey.get("truth"), latest.truth),
        formatValue(metricsByKey.get("tokenRate"), latest.tokenRate)
      ];

      cells.forEach((value) => {
        const cell = document.createElement("td");
        cell.textContent = value;
        row.appendChild(cell);
      });

      const deltaCell = document.createElement("td");
      const delta = (latest.mmlu ?? 0) - (earliest.mmlu ?? 0);
      deltaCell.textContent = formatDelta(metricsByKey.get("mmlu"), delta);
      if (delta > 0) {
        deltaCell.classList.add("positive");
      } else if (delta < 0) {
        deltaCell.classList.add("negative");
      }
      row.appendChild(deltaCell);

      elements.tableBody.appendChild(row);
    });
  }

  function renderDossiers() {
    elements.dossierGrid.innerHTML = "";
    models.forEach((model) => {
      const latest = latestSnapshot.metrics[model.id] || {};
      const earliest = earliestSnapshot.metrics[model.id] || {};
      const mmluDelta = (latest.mmlu ?? 0) - (earliest.mmlu ?? 0);
      const card = document.createElement("article");
      card.className = "dossier-card";
      const title = document.createElement("h3");
      title.textContent = model.name;
      const dl = document.createElement("dl");

      const detailPairs = [
        ["Family", model.family],
        ["Provider", model.provider],
        ["Focus", model.focus],
        ["Context", model.context],
        ["Release", model.release],
        ["Latest sweep", latestSnapshot.label]
      ];
      detailPairs.forEach(([term, description]) => {
        const dt = document.createElement("dt");
        dt.textContent = term;
        const dd = document.createElement("dd");
        dd.textContent = description;
        dl.append(dt, dd);
      });

      const summary = document.createElement("p");
      summary.textContent = `${model.notes} ${mmluDelta ? `${formatDelta(metricsByKey.get("mmlu"), mmluDelta)} on MMLU since ${earliestSnapshot.label}.` : ""}`.trim();

      card.append(title, dl, summary);
      elements.dossierGrid.appendChild(card);
    });
  }

  buildSummaryCards();
  buildMetricToggle();
  buildModelToggle();
  renderChart();
  renderLegend();
  renderInsights();
  renderTable();
  renderDossiers();
})();
