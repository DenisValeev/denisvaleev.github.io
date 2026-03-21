const defaults = Object.freeze({
  mode: "drag",
  columns: 30,
  rows: 18,
  spacing: 16,
  gravity: 0.72,
  stiffness: 0.93,
  iterations: 7,
  wind: 0.38,
  tearFactor: 1.85,
  damping: 0.992,
  selectionRadius: 30,
  cutRadius: 16,
  edgeBounce: 0.28
});

const modeHints = {
  drag: "Drag nearby points to stretch, swing, and fling the cloth.",
  cut: "Swipe across strands to break them and watch the fabric split apart.",
  pin: "Click any point to pin or unpin it where it is."
};

const modeNotes = {
  drag: "Grab the mesh and throw it around.",
  cut: "Swipe through the mesh to slice links.",
  pin: "Tap a point to toggle a pin in place."
};

const rebuildKeys = new Set(["columns", "rows", "spacing"]);

const formatters = {
  columns: (value) => String(Math.round(value)),
  rows: (value) => String(Math.round(value)),
  spacing: (value) => `${Math.round(value)}px`,
  gravity: (value) => value.toFixed(2),
  stiffness: (value) => value.toFixed(2),
  iterations: (value) => String(Math.round(value)),
  wind: (value) => value.toFixed(2),
  tearFactor: (value) => `${value.toFixed(2)}x`
};

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

function titleize(value) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function distancePointToSegment(px, py, ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  const lengthSquared = dx * dx + dy * dy;

  if (lengthSquared === 0) {
    return Math.hypot(px - ax, py - ay);
  }

  let t = ((px - ax) * dx + (py - ay) * dy) / lengthSquared;
  t = clamp(t, 0, 1);

  const sx = ax + dx * t;
  const sy = ay + dy * t;
  return Math.hypot(px - sx, py - sy);
}

class Particle {
  constructor(x, y, pinned = false) {
    this.x = x;
    this.y = y;
    this.prevX = x;
    this.prevY = y;
    this.pinX = x;
    this.pinY = y;
    this.pinned = pinned;
    this.row = 0;
    this.col = 0;
  }

  pin(x = this.x, y = this.y) {
    this.pinned = true;
    this.pinX = x;
    this.pinY = y;
    this.x = x;
    this.y = y;
    this.prevX = x;
    this.prevY = y;
  }

  unpin() {
    this.pinned = false;
    this.prevX = this.x;
    this.prevY = this.y;
  }
}

class Constraint {
  constructor(a, b, restLength, kind, stiffness) {
    this.a = a;
    this.b = b;
    this.restLength = restLength;
    this.kind = kind;
    this.stiffness = stiffness;
    this.broken = false;
  }
}

class ClothSimulation {
  constructor(canvas, viewport, ui) {
    this.canvas = canvas;
    this.viewport = viewport;
    this.ui = ui;
    this.ctx = canvas.getContext("2d");
    this.config = { ...defaults };
    this.particles = [];
    this.constraints = [];
    this.grid = [];
    this.width = 0;
    this.height = 0;
    this.dpr = 1;
    this.time = 0;
    this.lastTs = 0;
    this.brokenConstraints = 0;
    this.dragParticle = null;
    this.lastWind = defaults.wind;
    this.pointer = {
      active: false,
      id: null,
      x: 0,
      y: 0,
      dx: 0,
      dy: 0
    };

    this.frame = this.frame.bind(this);
    this.handlePointerDown = this.handlePointerDown.bind(this);
    this.handlePointerMove = this.handlePointerMove.bind(this);
    this.handlePointerUp = this.handlePointerUp.bind(this);
    this.handleResize = this.handleResize.bind(this);
    this.handleVisibilityChange = this.handleVisibilityChange.bind(this);

    this.attachEvents();
    this.resizeCanvas();
    this.rebuildCloth();
    this.setMode(defaults.mode);
    this.refreshWindUI();
  }

  attachEvents() {
    this.canvas.addEventListener("pointerdown", this.handlePointerDown);
    this.canvas.addEventListener("pointermove", this.handlePointerMove);
    this.canvas.addEventListener("pointerup", this.handlePointerUp);
    this.canvas.addEventListener("pointercancel", this.handlePointerUp);
    this.canvas.addEventListener("contextmenu", (event) => event.preventDefault());
    window.addEventListener("resize", this.handleResize);
    document.addEventListener("visibilitychange", this.handleVisibilityChange);
  }

  handleVisibilityChange() {
    if (!document.hidden) {
      this.lastTs = performance.now();
    }
  }

  start() {
    requestAnimationFrame(this.frame);
  }

  frame(timestamp) {
    if (!this.lastTs) {
      this.lastTs = timestamp;
    }

    const delta = clamp((timestamp - this.lastTs) / 16.6667, 0.35, 1.8);
    this.lastTs = timestamp;

    this.step(delta);
    this.render();
    requestAnimationFrame(this.frame);
  }

  handleResize() {
    this.resizeCanvas();
    this.rebuildCloth();
  }

  resizeCanvas() {
    const rect = this.viewport.getBoundingClientRect();
    this.width = Math.max(320, rect.width);
    this.height = Math.max(320, rect.height);
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.round(this.width * this.dpr);
    this.canvas.height = Math.round(this.height * this.dpr);
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.ctx.lineCap = "round";
    this.ctx.lineJoin = "round";
  }

  setMode(mode) {
    if (!(mode in modeHints)) {
      return;
    }

    this.config.mode = mode;
    document.body.dataset.mode = mode;
    this.releaseDrag();
    this.ui.modePill.textContent = titleize(mode);
    this.ui.modeHint.textContent = modeHints[mode];
    this.ui.canvasNote.textContent = modeNotes[mode];

    for (const button of this.ui.modeButtons) {
      const isActive = button.dataset.mode === mode;
      button.classList.toggle("is-active", isActive);
      button.setAttribute("aria-pressed", String(isActive));
    }
  }

  applyConfig(nextConfig, options = {}) {
    const { rebuild = false } = options;

    if (typeof nextConfig.wind === "number" && nextConfig.wind > 0.01) {
      this.lastWind = nextConfig.wind;
    }

    Object.assign(this.config, nextConfig);

    if (rebuild) {
      this.rebuildCloth();
    }

    this.refreshWindUI();
  }

  toggleWind() {
    const nextWind = this.config.wind > 0.01 ? 0 : this.lastWind || defaults.wind;
    this.applyConfig({ wind: nextWind });
    return nextWind;
  }

  refreshWindUI() {
    const enabled = this.config.wind > 0.01;
    this.ui.windToggle.textContent = enabled ? "Wind on" : "Wind off";
    this.ui.windToggle.setAttribute("aria-pressed", String(enabled));
  }

  rebuildCloth() {
    const { columns, rows, spacing } = this.config;
    const rawWidth = (columns - 1) * spacing;
    const rawHeight = (rows - 1) * spacing;
    const fitScale = Math.min(
      1,
      (this.width - 48) / Math.max(rawWidth, 1),
      (this.height - 96) / Math.max(rawHeight, 1)
    );
    const actualSpacing = spacing * fitScale;
    const clothWidth = (columns - 1) * actualSpacing;
    const clothHeight = (rows - 1) * actualSpacing;
    const startX = (this.width - clothWidth) / 2;
    const maxStartY = Math.max(36, this.height - clothHeight - 48);
    const startY = clamp(this.height * 0.12, 36, maxStartY);

    this.pointer.active = false;
    this.pointer.dx = 0;
    this.pointer.dy = 0;
    this.releaseDrag();

    this.particles = [];
    this.constraints = [];
    this.grid = [];
    this.brokenConstraints = 0;

    for (let rowIndex = 0; rowIndex < rows; rowIndex += 1) {
      const row = [];
      for (let columnIndex = 0; columnIndex < columns; columnIndex += 1) {
        const x = startX + columnIndex * actualSpacing;
        const y = startY + rowIndex * actualSpacing;
        const particle = new Particle(x, y, rowIndex === 0);

        particle.row = rowIndex;
        particle.col = columnIndex;

        if (!particle.pinned) {
          particle.prevX = x - Math.sin(columnIndex * 0.45) * 3.5;
          particle.prevY = y - 2;
        }

        row.push(particle);
        this.particles.push(particle);

        if (columnIndex > 0) {
          this.addConstraint(particle, row[columnIndex - 1], actualSpacing, "struct", 1);
        }

        if (rowIndex > 0) {
          this.addConstraint(
            particle,
            this.grid[rowIndex - 1][columnIndex],
            actualSpacing,
            "struct",
            1
          );
        }

        if (rowIndex > 0 && columnIndex > 0) {
          this.addConstraint(
            particle,
            this.grid[rowIndex - 1][columnIndex - 1],
            Math.SQRT2 * actualSpacing,
            "shear",
            0.9
          );
        }

        if (rowIndex > 0 && columnIndex < columns - 1) {
          this.addConstraint(
            particle,
            this.grid[rowIndex - 1][columnIndex + 1],
            Math.SQRT2 * actualSpacing,
            "shear",
            0.9
          );
        }

        if (columnIndex > 1) {
          this.addConstraint(particle, row[columnIndex - 2], actualSpacing * 2, "bend", 0.58);
        }

        if (rowIndex > 1) {
          this.addConstraint(
            particle,
            this.grid[rowIndex - 2][columnIndex],
            actualSpacing * 2,
            "bend",
            0.65
          );
        }
      }

      this.grid.push(row);
    }

    this.updateStats();
  }

  addConstraint(a, b, restLength, kind, stiffness) {
    this.constraints.push(new Constraint(a, b, restLength, kind, stiffness));
  }

  breakConstraint(constraint) {
    if (constraint.broken) {
      return false;
    }

    constraint.broken = true;
    this.brokenConstraints += 1;
    return true;
  }

  step(delta) {
    this.time += delta;

    const deltaSquared = delta * delta;
    const gravity = this.config.gravity * deltaSquared;
    const windBase = this.config.wind;

    for (const particle of this.particles) {
      if (particle === this.dragParticle) {
        continue;
      }

      if (particle.pinned) {
        particle.x = particle.pinX;
        particle.y = particle.pinY;
        particle.prevX = particle.pinX;
        particle.prevY = particle.pinY;
        continue;
      }

      const velocityX = (particle.x - particle.prevX) * this.config.damping;
      const velocityY = (particle.y - particle.prevY) * this.config.damping;

      particle.prevX = particle.x;
      particle.prevY = particle.y;

      const windWave =
        Math.sin(this.time * 0.026 + particle.row * 0.22) +
        Math.cos(this.time * 0.021 + particle.col * 0.31) * 0.45;
      const windForce = windBase * windWave;

      particle.x += velocityX + windForce * deltaSquared;
      particle.y += velocityY + gravity + Math.abs(windForce) * 0.03 * deltaSquared;
    }

    if (this.dragParticle) {
      const drag = this.dragParticle;
      drag.x = this.pointer.x;
      drag.y = this.pointer.y;
      drag.prevX = drag.x - this.pointer.dx * 1.3;
      drag.prevY = drag.y - this.pointer.dy * 1.3;

      if (drag.pinned) {
        drag.pinX = drag.x;
        drag.pinY = drag.y;
      }
    }

    let toreLinks = false;

    for (let iteration = 0; iteration < this.config.iterations; iteration += 1) {
      for (const constraint of this.constraints) {
        if (constraint.broken) {
          continue;
        }

        const deltaX = constraint.b.x - constraint.a.x;
        const deltaY = constraint.b.y - constraint.a.y;
        const distance = Math.hypot(deltaX, deltaY) || 0.0001;

        if (constraint.kind !== "bend" && distance > constraint.restLength * this.config.tearFactor) {
          this.breakConstraint(constraint);
          toreLinks = true;
          continue;
        }

        const difference = (constraint.restLength - distance) / distance;
        const strength = this.config.stiffness * constraint.stiffness;
        const offsetX = deltaX * difference * strength;
        const offsetY = deltaY * difference * strength;
        const canMoveA = !constraint.a.pinned && constraint.a !== this.dragParticle;
        const canMoveB = !constraint.b.pinned && constraint.b !== this.dragParticle;

        if (canMoveA && canMoveB) {
          constraint.a.x -= offsetX * 0.5;
          constraint.a.y -= offsetY * 0.5;
          constraint.b.x += offsetX * 0.5;
          constraint.b.y += offsetY * 0.5;
        } else if (canMoveA) {
          constraint.a.x -= offsetX;
          constraint.a.y -= offsetY;
        } else if (canMoveB) {
          constraint.b.x += offsetX;
          constraint.b.y += offsetY;
        }
      }

      this.applyBounds();

      if (this.dragParticle) {
        this.dragParticle.x = this.pointer.x;
        this.dragParticle.y = this.pointer.y;
      }
    }

    if (toreLinks) {
      this.updateStats();
    }
  }

  applyBounds() {
    const padding = 10;
    const floor = this.height - 10;

    for (const particle of this.particles) {
      if (particle.pinned) {
        particle.x = particle.pinX;
        particle.y = particle.pinY;
        continue;
      }

      if (particle === this.dragParticle) {
        continue;
      }

      const velocityX = particle.x - particle.prevX;
      const velocityY = particle.y - particle.prevY;

      if (particle.x < padding) {
        particle.x = padding;
        particle.prevX = particle.x + velocityX * this.config.edgeBounce;
      } else if (particle.x > this.width - padding) {
        particle.x = this.width - padding;
        particle.prevX = particle.x + velocityX * this.config.edgeBounce;
      }

      if (particle.y < padding) {
        particle.y = padding;
        particle.prevY = particle.y + velocityY * this.config.edgeBounce;
      } else if (particle.y > floor) {
        particle.y = floor;
        particle.prevY = particle.y + velocityY * this.config.edgeBounce;
        particle.prevX = particle.x - velocityX * 0.16;
      }
    }
  }

  updateStats() {
    this.ui.particleCount.textContent = String(this.particles.length);
    this.ui.linkCount.textContent = String(Math.max(0, this.constraints.length - this.brokenConstraints));
    this.ui.tearCount.textContent = String(this.brokenConstraints);
  }

  render() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.width, this.height);

    const background = ctx.createLinearGradient(0, 0, 0, this.height);
    background.addColorStop(0, "#07111f");
    background.addColorStop(1, "#02050b");
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, this.width, this.height);

    const glow = ctx.createRadialGradient(
      this.width * 0.62,
      this.height * 0.04,
      0,
      this.width * 0.62,
      this.height * 0.04,
      this.width * 0.92
    );
    glow.addColorStop(0, "rgba(92, 166, 255, 0.18)");
    glow.addColorStop(1, "rgba(92, 166, 255, 0)");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, this.width, this.height);

    ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, this.height - 10);
    ctx.lineTo(this.width, this.height - 10);
    ctx.stroke();

    if (this.grid.length > 0) {
      const topRow = this.grid[0];
      ctx.strokeStyle = "rgba(213, 227, 255, 0.16)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(topRow[0].x, topRow[0].y - 12);
      ctx.lineTo(topRow[topRow.length - 1].x, topRow[topRow.length - 1].y - 12);
      ctx.stroke();
    }

    for (const constraint of this.constraints) {
      if (constraint.broken || constraint.kind === "bend") {
        continue;
      }

      const deltaX = constraint.b.x - constraint.a.x;
      const deltaY = constraint.b.y - constraint.a.y;
      const distance = Math.hypot(deltaX, deltaY);
      const stretch = clamp(distance / constraint.restLength, 0.85, 1.5);

      if (constraint.kind === "shear") {
        const alpha = clamp(0.08 + (stretch - 1) * 0.18, 0.05, 0.18);
        ctx.strokeStyle = `rgba(118, 174, 255, ${alpha.toFixed(3)})`;
        ctx.lineWidth = 1;
      } else {
        const red = Math.round(clamp(116 + (stretch - 1) * 240, 116, 244));
        const green = Math.round(clamp(196 - (stretch - 1) * 110, 136, 196));
        const alpha = clamp(0.34 + (stretch - 1) * 1.2, 0.34, 0.92);
        ctx.strokeStyle = `rgba(${red}, ${green}, 255, ${alpha.toFixed(3)})`;
        ctx.lineWidth = 1.45;
      }

      ctx.beginPath();
      ctx.moveTo(constraint.a.x, constraint.a.y);
      ctx.lineTo(constraint.b.x, constraint.b.y);
      ctx.stroke();
    }

    for (const particle of this.particles) {
      if (!particle.pinned) {
        continue;
      }

      ctx.fillStyle = "rgba(244, 249, 255, 0.9)";
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, 2.6, 0, Math.PI * 2);
      ctx.fill();
    }

    if (this.dragParticle) {
      ctx.strokeStyle = "rgba(255, 255, 255, 0.9)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(this.dragParticle.x, this.dragParticle.y, 12, 0, Math.PI * 2);
      ctx.stroke();
    }

    if (this.pointer.active && this.config.mode === "cut") {
      ctx.strokeStyle = "rgba(255, 129, 129, 0.95)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(this.pointer.x, this.pointer.y, this.config.cutRadius, 0, Math.PI * 2);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(this.pointer.x - 6, this.pointer.y);
      ctx.lineTo(this.pointer.x + 6, this.pointer.y);
      ctx.moveTo(this.pointer.x, this.pointer.y - 6);
      ctx.lineTo(this.pointer.x, this.pointer.y + 6);
      ctx.stroke();
    }
  }

  getPointerPosition(event) {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: clamp(event.clientX - rect.left, 0, rect.width),
      y: clamp(event.clientY - rect.top, 0, rect.height)
    };
  }

  handlePointerDown(event) {
    if (event.button !== 0) {
      return;
    }

    event.preventDefault();

    const point = this.getPointerPosition(event);
    this.pointer.active = true;
    this.pointer.id = event.pointerId;
    this.pointer.x = point.x;
    this.pointer.y = point.y;
    this.pointer.dx = 0;
    this.pointer.dy = 0;
    this.canvas.setPointerCapture(event.pointerId);

    if (this.config.mode === "drag") {
      const hit = this.findNearestParticle(point.x, point.y, this.config.selectionRadius);
      if (hit) {
        this.dragParticle = hit;
        this.dragParticle.x = point.x;
        this.dragParticle.y = point.y;

        if (hit.pinned) {
          hit.pinX = point.x;
          hit.pinY = point.y;
        }
      }
    } else if (this.config.mode === "cut") {
      this.cutAlong(point.x, point.y, point.x, point.y);
    } else if (this.config.mode === "pin") {
      const hit = this.findNearestParticle(point.x, point.y, this.config.selectionRadius * 0.8);
      if (hit) {
        this.togglePin(hit);
      }
    }
  }

  handlePointerMove(event) {
    const point = this.getPointerPosition(event);
    const previousX = this.pointer.x;
    const previousY = this.pointer.y;

    this.pointer.x = point.x;
    this.pointer.y = point.y;
    this.pointer.dx = point.x - previousX;
    this.pointer.dy = point.y - previousY;

    if (!this.pointer.active) {
      return;
    }

    if (this.config.mode === "drag" && this.dragParticle) {
      this.dragParticle.x = point.x;
      this.dragParticle.y = point.y;

      if (this.dragParticle.pinned) {
        this.dragParticle.pinX = point.x;
        this.dragParticle.pinY = point.y;
      }
    }

    if (this.config.mode === "cut") {
      this.cutAlong(previousX, previousY, point.x, point.y);
    }
  }

  handlePointerUp(event) {
    if (this.canvas.hasPointerCapture(event.pointerId)) {
      this.canvas.releasePointerCapture(event.pointerId);
    }

    if (this.dragParticle) {
      if (this.dragParticle.pinned) {
        this.dragParticle.pin(this.dragParticle.x, this.dragParticle.y);
      } else {
        this.dragParticle.prevX = this.dragParticle.x - this.pointer.dx;
        this.dragParticle.prevY = this.dragParticle.y - this.pointer.dy;
      }
    }

    this.releaseDrag();
    this.pointer.active = false;
    this.pointer.id = null;
    this.pointer.dx = 0;
    this.pointer.dy = 0;
  }

  releaseDrag() {
    this.dragParticle = null;
  }

  findNearestParticle(x, y, radius) {
    let best = null;
    let bestDistanceSquared = radius * radius;

    for (const particle of this.particles) {
      const deltaX = particle.x - x;
      const deltaY = particle.y - y;
      const distanceSquared = deltaX * deltaX + deltaY * deltaY;

      if (distanceSquared <= bestDistanceSquared) {
        best = particle;
        bestDistanceSquared = distanceSquared;
      }
    }

    return best;
  }

  togglePin(particle) {
    if (particle.pinned) {
      particle.unpin();
    } else {
      particle.pin(particle.x, particle.y);
    }
  }

  cutAlong(x1, y1, x2, y2) {
    const distance = Math.hypot(x2 - x1, y2 - y1);
    const stepSize = Math.max(6, this.config.cutRadius * 0.65);
    const steps = Math.max(1, Math.ceil(distance / stepSize));
    let cutCount = 0;

    for (let step = 0; step <= steps; step += 1) {
      const progress = step / steps;
      const x = x1 + (x2 - x1) * progress;
      const y = y1 + (y2 - y1) * progress;

      for (const constraint of this.constraints) {
        if (constraint.broken) {
          continue;
        }

        const separation = distancePointToSegment(
          x,
          y,
          constraint.a.x,
          constraint.a.y,
          constraint.b.x,
          constraint.b.y
        );

        if (separation <= this.config.cutRadius) {
          // Manual cuts must sever hidden bend links too, otherwise the cloth keeps
          // hanging from support paths that are not drawn on screen.
          if (this.breakConstraint(constraint)) {
            cutCount += 1;
          }
        }
      }
    }

    if (cutCount > 0) {
      this.updateStats();
    }
  }
}

const canvas = document.getElementById("cloth-canvas");
const viewport = document.querySelector(".canvas-wrap");

const inputs = Object.fromEntries(
  Array.from(document.querySelectorAll("[data-config]")).map((input) => [input.dataset.config, input])
);

const outputs = Object.fromEntries(
  Object.keys(inputs).map((key) => [key, document.getElementById(`${key}-output`)])
);

const ui = {
  modeButtons: Array.from(document.querySelectorAll("[data-mode]")),
  modeHint: document.getElementById("mode-hint"),
  modePill: document.getElementById("mode-pill"),
  canvasNote: document.getElementById("canvas-note"),
  particleCount: document.getElementById("particle-count"),
  linkCount: document.getElementById("link-count"),
  tearCount: document.getElementById("tear-count"),
  windToggle: document.getElementById("wind-toggle"),
  resetButton: document.getElementById("reset-button"),
  defaultsButton: document.getElementById("defaults-button")
};

const simulation = new ClothSimulation(canvas, viewport, ui);

function syncInputsFromConfig(config) {
  for (const [key, input] of Object.entries(inputs)) {
    const value = config[key];
    input.value = String(value);
    outputs[key].textContent = formatters[key](value);
  }
}

function setWindControl(value) {
  inputs.wind.value = String(value);
  outputs.wind.textContent = formatters.wind(value);
}

syncInputsFromConfig(simulation.config);
simulation.start();

for (const [key, input] of Object.entries(inputs)) {
  input.addEventListener("input", () => {
    const value = Number(input.value);
    outputs[key].textContent = formatters[key](value);
    simulation.applyConfig({ [key]: value }, { rebuild: rebuildKeys.has(key) });
  });
}

for (const button of ui.modeButtons) {
  button.addEventListener("click", () => {
    simulation.setMode(button.dataset.mode);
  });
}

ui.resetButton.addEventListener("click", () => {
  simulation.rebuildCloth();
});

ui.defaultsButton.addEventListener("click", () => {
  simulation.applyConfig({ ...defaults }, { rebuild: true });
  simulation.setMode(defaults.mode);
  syncInputsFromConfig(simulation.config);
});

ui.windToggle.addEventListener("click", () => {
  const nextWind = simulation.toggleWind();
  setWindControl(nextWind);
});

window.addEventListener("keydown", (event) => {
  const target = event.target;

  if (
    target instanceof HTMLElement &&
    (target.isContentEditable ||
      target.tagName === "INPUT" ||
      target.tagName === "BUTTON" ||
      target.tagName === "SELECT" ||
      target.tagName === "TEXTAREA")
  ) {
    return;
  }

  const key = event.key.toLowerCase();

  if (key === "d") {
    simulation.setMode("drag");
  } else if (key === "c") {
    simulation.setMode("cut");
  } else if (key === "p") {
    simulation.setMode("pin");
  } else if (key === "r") {
    simulation.rebuildCloth();
  } else if (event.code === "Space") {
    event.preventDefault();
    const nextWind = simulation.toggleWind();
    setWindControl(nextWind);
  }
});
