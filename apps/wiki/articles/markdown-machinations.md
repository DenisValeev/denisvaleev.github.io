# How the wiki digests markdown

Confession time: we wanted the joy of markdown without unleashing a bundler hydra. So the wiki ships with a pocket-sized parser that handles the greatest hits—headings, lists, links, and the occasional code block—right in the browser.

## The conversion game plan
- Trim the markdown, line by line, so blank space doesn't spawn weird ghosts in the layout.
- Look for headings (one to three `#` characters) and convert them into proper semantic tags.
- Detect bullet lists and wrap them in `<ul>` elements so screen readers stay happy.
- Escape anything suspicious before adding emphasis, links, or `<code>` snippets.

## Sample markdown
```
# Sample heading

- One bullet to rule them all
- Another bullet wearing a cape

Remember: inline code like `npm run wiki` gets the spotlight treatment too.
```

## Why it matters
Keeping the parser tiny means no dependencies, instant loads, and zero build step drama. It also lowers the barrier for anyone to drop in a new article—just add a markdown string to the data file and the page does the rest.
