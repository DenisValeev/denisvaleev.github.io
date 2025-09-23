# Gen Alpha slang deck maintenance

Keep the slang dataset valid JavaScript assigned to `window.genAlphaSlang`.
Stick to double quotes and the generated indentation so diffs stay focused on
the records.

After editing the entries or tweaking the navigator UI, run:

```bash
node --check apps/gen-alpha/slang.js
node -e "global.window = {}; require('./apps/gen-alpha/slang.js'); console.log(Array.isArray(window.genAlphaSlang), window.genAlphaSlang.length);"
node tools/update-content-metadata.js --dataset=genalpha
npx playwright test tests/gen-alpha-app.spec.js
```

Regenerate the embeddings stores we use for duplicate protection with:

```bash
node tools/review-content-similarity.js --dataset=genalpha --provider=synthetic --write --update-manifest
node tools/review-content-similarity.js --dataset=genalpha --provider=hfspace --model=bienkieu/sentence-embedding --batch-size=8 --store-suffix=-hfspace --write --report=data/similarity-report-genalpha-hfspace.json
node tools/review-content-similarity.js --dataset=genalpha --provider=synthetic --synthetic-dimensions=128 --model=synthetic-128 --store-suffix=-synthetic128 --write --report=data/similarity-report-genalpha-s128.json
```

Review the high-similarity hits printed by each command before committing new
entries so the deck stays fresh.
