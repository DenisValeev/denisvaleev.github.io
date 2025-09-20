# Jokes deck maintenance

The jokes app relies on the `apps/jokes/jokes.js` dataset being valid JavaScript. When editing or regenerating the deck, keep the double quotes and indentation as-is so diffs stay focused on the records themselves.

After saving changes, run the quick syntax check:

```bash
node --check apps/jokes/jokes.js
```

Then load the file through Node to confirm the array still attaches to `window.jokes`:

```bash
node -e "global.window = {}; require('./apps/jokes/jokes.js'); console.log(Array.isArray(window.jokes), window.jokes.length);"
```

The first command should exit silently. The second should print `true` along with a non-zero count so the app never falls back to the "No jokes available." copy.
