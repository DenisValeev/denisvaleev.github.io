# Slang deck maintenance

Keep the slang dataset valid JavaScript assigned to `window.slangEntries`.
Stick to double quotes and the generated indentation so diffs stay focused on
the records.

After editing the entries or tweaking the navigator UI, run:

```bash
node --check apps/slang/slang.js
node -e "global.window = {}; require('./apps/slang/slang.js'); console.log(Array.isArray(window.slangEntries), window.slangEntries.length);"
node tools/update-content-metadata.js --dataset=slang
npx playwright test tests/slang-app.spec.js
```

Regenerate the embeddings stores we use for duplicate protection with:

```bash
node tools/review-content-similarity.js --dataset=slang --provider=synthetic --write --update-manifest
node tools/review-content-similarity.js --dataset=slang --provider=hfspace --model=bienkieu/sentence-embedding --batch-size=8 --store-suffix=-hfspace --write --report=data/similarity-report-slang-hfspace.json
node tools/review-content-similarity.js --dataset=slang --provider=synthetic --synthetic-dimensions=128 --model=synthetic-128 --store-suffix=-synthetic128 --write --report=data/similarity-report-slang-s128.json
```

Review the high-similarity hits printed by each command before committing new
entries so the deck stays fresh.
