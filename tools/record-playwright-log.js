#!/usr/bin/env node
const { spawn } = require('node:child_process');
const { mkdirSync, readFileSync, writeFileSync, unlinkSync } = require('node:fs');
const { resolve, relative } = require('node:path');

const rootDir = resolve(__dirname, '..');
const outputDir = resolve(rootDir, 'data', 'test-runs');
const finalReportPath = resolve(outputDir, 'latest.json');
const tempReportPath = resolve(outputDir, `latest-${Date.now()}.tmp.json`);

const command = process.platform === 'win32' ? 'npx.cmd' : 'npx';
const args = ['playwright', 'test', '--reporter=line', '--reporter=json'];

const formatDuration = (milliseconds) => {
  if (!Number.isFinite(milliseconds)) {
    return 'unknown duration';
  }
  if (milliseconds < 1000) {
    return `${Math.round(milliseconds)} ms`;
  }
  const seconds = milliseconds / 1000;
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

const normalizePaths = (value) => {
  if (Array.isArray(value)) {
    return value.map((entry) => normalizePaths(entry));
  }
  if (value && typeof value === 'object') {
    for (const key of Object.keys(value)) {
      value[key] = normalizePaths(value[key]);
    }
    return value;
  }
  if (typeof value === 'string') {
    const normalizedRoot = rootDir.replace(/\\/g, '/');
    const normalizedValue = value.replace(/\\/g, '/');
    if (normalizedValue.startsWith(normalizedRoot)) {
      const relativePath = normalizedValue.slice(normalizedRoot.length).replace(/^\/?/, '');
      return relativePath || '.';
    }
    return value;
  }
  return value;
};

const summarize = (report) => {
  if (!report || typeof report !== 'object') {
    return 'Report unavailable.';
  }
  const stats = report.stats || {};
  const expected = typeof stats.expected === 'number' ? stats.expected : 0;
  const unexpected = typeof stats.unexpected === 'number' ? stats.unexpected : 0;
  const duration = typeof stats.duration === 'number' ? stats.duration : NaN;
  return `Recorded ${expected} test${expected === 1 ? '' : 's'} in ${formatDuration(duration)} (${unexpected} unexpected).`;
};

const ensureOutputDir = () => {
  mkdirSync(outputDir, { recursive: true });
};

const writeNormalizedReport = () => {
  const raw = readFileSync(tempReportPath, 'utf8');
  const parsed = JSON.parse(raw);
  const normalized = normalizePaths(parsed);
  normalized.generatedAt = new Date().toISOString();
  const pretty = `${JSON.stringify(normalized, null, 2)}\n`;
  writeFileSync(finalReportPath, pretty, 'utf8');
  unlinkSync(tempReportPath);
  return normalized;
};

const run = () => {
  ensureOutputDir();
  const child = spawn(command, args, {
    cwd: rootDir,
    env: { ...process.env, PLAYWRIGHT_JSON_OUTPUT_FILE: tempReportPath },
    stdio: 'inherit',
  });

  child.on('exit', (code) => {
    if (code !== 0) {
      console.error(`Playwright exited with code ${code}. Leaving the previous log intact.`);
      process.exit(code ?? 1);
    }

    try {
      const report = writeNormalizedReport();
      const summary = summarize(report);
      console.log(`\n${summary}`);
      console.log(`JSON log saved to ${relative(process.cwd(), finalReportPath)}.`);
      console.log('Inspect the JSON directly or wire it into your own visualiser.');
    } catch (error) {
      console.error('Failed to normalize Playwright report:', error);
      process.exit(1);
    }
  });
};

run();
