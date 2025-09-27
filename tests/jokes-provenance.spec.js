const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const rootDir = path.resolve(__dirname, '..');

function loadScriptPayload(relativePath, exportKey) {
  const absolutePath = path.join(rootDir, relativePath);
  const source = fs.readFileSync(absolutePath, 'utf8');
  const sandbox = { window: {} };
  vm.createContext(sandbox);
  vm.runInContext(source, sandbox, { filename: relativePath });
  return sandbox.window[exportKey];
}

test.describe('jokes provenance', () => {
  test('every joke advertises a known source asset', () => {
    const jokes = loadScriptPayload(path.join('apps', 'jokes', 'jokes.js'), 'jokes');
    expect(Array.isArray(jokes), 'window.jokes should be an array').toBeTruthy();
    expect(jokes.length, 'deck should contain entries').toBeGreaterThan(0);

    const assetData = loadScriptPayload(path.join('apps', 'asset-observatory', 'asset-data.js'), 'assetObservatoryData');
    expect(assetData && Array.isArray(assetData.sources), 'asset data should enumerate sources').toBeTruthy();

    const sourceIds = new Set(
      assetData.sources
        .filter((entry) => entry.datasetId === 'jokes' && typeof entry.id === 'string' && entry.id.trim().length > 0)
        .map((entry) => entry.id)
    );

    expect(sourceIds.size, 'asset registry for jokes should expose IDs').toBeGreaterThan(0);

    const missingSourceId = jokes.filter((entry) => typeof entry.sourceId !== 'string' || entry.sourceId.trim().length === 0);
    expect(missingSourceId, 'jokes without a sourceId should be empty').toEqual([]);

    const unknownSources = jokes.filter((entry) => !sourceIds.has(entry.sourceId));
    expect(unknownSources, 'sourceId should map to a known asset').toEqual([]);
  });

  test('supplemental provenance ledger lists Pun.me captures', () => {
    const supplementalPath = path.join(rootDir, 'data', 'jokes-supplemental-sources.json');
    const supplemental = JSON.parse(fs.readFileSync(supplementalPath, 'utf8'));
    const punmeRecords = supplemental.filter((entry) => entry.sourceId === 'punme-dad-jokes');
    expect(punmeRecords.length, 'Pun.me references should be captured in supplemental sources').toBeGreaterThanOrEqual(2);
  });
});
