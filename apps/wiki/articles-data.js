window.wikiArticles = [
  {
    "slug": "kickoff-chaos",
    "title": "Kickoff Log: We Built a Blog Instead of a Slide Deck",
    "summary": "The day we swapped status meetings for a punchy blog beaming updates straight from the lab.",
    "accentEmoji": "🎉",
    "published": "2024-03-14",
    "tags": ["origin story", "process"],
    "content": `
# Welcome to the Build Diary

We set out to have a tidy project sync. Fifteen minutes later, someone muttered "what if progress updates were actually fun?" and now there's a dedicated blog broadcasting right from the toolbox. Classic scope creep, but make it storytelling.

## Why we're doing this
- Status updates should read like dispatches from a mischievous mission control.
- Documentation belongs where the work happens, not in a folder named *final_v4_really_this_time*.
- Sharing the "why" behind decisions means future us won't squint at old commits wondering what possessed us.

## What changed today
- Spun up the new blog home inside \`apps/wiki/\` with enough glow to feel celebratory, but not so much that sunglasses are required.
- Drafted the first crop of articles, all narrated with equal parts honesty and caffeine.
- Added a left-hand dispatch board so you can hop between updates without spelunking through folders.

## Next experiments
- Wire in URL support so you can bookmark a favorite saga for dramatic retellings.
- Expand the article data set as milestones land, using this markdown-friendly format for fast edits.
- Invite guest narrators from the team. The more chaotic energy, the merrier.
`
  },
  {
    "slug": "markdown-machinations",
    "title": "Markdown Shenanigans Without a Build Step",
    "summary": "A peek under the hood at how we turn lightweight markdown into punchy HTML inside the blog.",
    "accentEmoji": "🛠️",
    "published": "2024-03-18",
    "tags": ["markdown", "frontend"],
    "content": `
# How the blog digests markdown

Confession time: we wanted the joy of markdown without unleashing a bundler hydra. So the blog ships with a pocket-sized parser that handles the greatest hits—headings, lists, links, and the occasional code block—right in the browser.

## The conversion game plan
- Trim the markdown, line by line, so blank space doesn't spawn weird ghosts in the layout.
- Look for headings (one to three \`#\` characters) and convert them into proper semantic tags.
- Detect bullet lists and wrap them in \`<ul>\` elements so screen readers stay happy.
- Escape anything suspicious before adding emphasis, links, or \`<code>\` snippets.

## Sample markdown
```
# Sample heading

- One bullet to rule them all
- Another bullet wearing a cape

Remember: inline code like `npm run blog` gets the spotlight treatment too.
```

## Why it matters
Keeping the parser tiny means no dependencies, instant loads, and zero build step drama. It also lowers the barrier for anyone to drop in a new dispatch—just add a markdown string to the data file and the page does the rest.
`
  },
  {
    "slug": "navigation-nerdery",
    "title": "Navigation Nerdery: URLs, Reading Time, and Reader Delight",
    "summary": "Tuning the experience so each update feels like a guided tour through the blog instead of a scavenger hunt.",
    "accentEmoji": "🧭",
    "published": "2024-03-21",
    "tags": ["ux", "tooling"],
    "content": `
# The reader experience tune-up

The first version of the blog asked you to keep track of where you were by sheer memory. Cute, but not ideal. Today we injected some quality-of-life boosts so catching up on the project feels like binging a mini-series.

## What's new
- URLs now reflect the article you're reading thanks to query parameters. Shareable, bookmarkable, brag-worthy.
- Each entry announces an approximate reading time, calculated by a friendly script that counts words instead of vibes.
- Selected articles steal focus (politely) so keyboard users jump straight to the juicy headline.

## Helpful tidbits
> Bookmark the article list view to keep an eye on how many dispatches we've shipped. The badge updates automatically as new posts land.

- Tag pills highlight the theme of each entry, making it easy to skim for tech dives vs. retro musings.
- The layout snaps into a single column on phones so you can doomscroll our progress comfortably.

## TL;DR
We're building a blog that's actually fun to read. If you spot any rough edges or dream up a feature, drop it in the next entry—we're all ears and probably already writing the punchline.
`
  }
];
