(function () {
  const articleTitleEl = document.querySelector('[data-article-title]');
  const articleMetaEl = document.querySelector('[data-article-meta]');
  const articleBodyEl = document.querySelector('[data-article-body]');
  const articleTagsEl = document.querySelector('[data-article-tags]');
  const previousButton = document.querySelector('[data-article-prev]');
  const nextButton = document.querySelector('[data-article-next]');

  if (!articleTitleEl || !articleMetaEl || !articleBodyEl || !articleTagsEl || !previousButton || !nextButton) {
    return;
  }

  let articles = [];
  let activeSlug = null;
  let loadErrorMessage = '';

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function escapeAttribute(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function formatInline(text, allowLinks = true) {
    if (typeof text !== 'string') {
      return '';
    }

    let safe = escapeHtml(text);

    if (allowLinks) {
      safe = safe.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (match, rawLabel, rawHref) => {
        const labelHtml = formatInline(rawLabel, false);
        const decodedHref = rawHref.replace(/&amp;/g, '&').trim();
        const forbidden = decodedHref.toLowerCase().startsWith('javascript:');
        const hrefValue = forbidden || !decodedHref ? '#' : decodedHref;
        const escapedHref = escapeAttribute(hrefValue);
        return `<a href="${escapedHref}" target="_blank" rel="noreferrer noopener">${labelHtml}</a>`;
      });
    }

    safe = safe.replace(/`([^`]+)`/g, (match, code) => `<code>${code}</code>`);
    safe = safe.replace(/\*\*([^*]+)\*\*/g, (match, bold) => `<strong>${bold}</strong>`);
    safe = safe.replace(/(^|[\s>])\*([^*]+)\*(?=[\s<.,!?:;)]|$)/g, (match, prefix, italic) => `${prefix}<em>${italic}</em>`);
    safe = safe.replace(/(^|[\s>])_([^_]+)_(?=[\s<.,!?:;)]|$)/g, (match, prefix, italic) => `${prefix}<em>${italic}</em>`);

    return safe;
  }

  function renderMarkdown(markdown) {
    if (typeof markdown !== 'string') {
      return '<p>No story yet.</p>';
    }

    const lines = markdown.replace(/\r\n/g, '\n').split('\n');
    const html = [];
    let paragraphLines = [];
    let inList = false;
    let listItems = [];
    let inCodeBlock = false;
    let codeLines = [];
    let codeLanguage = '';

    function flushParagraph() {
      if (!paragraphLines.length) {
        return;
      }

      const paragraphText = paragraphLines.join(' ').trim();
      if (paragraphText) {
        html.push(`<p>${formatInline(paragraphText)}</p>`);
      }
      paragraphLines = [];
    }

    function flushList() {
      if (!inList) {
        return;
      }

      html.push(`<ul>${listItems.join('')}</ul>`);
      inList = false;
      listItems = [];
    }

    function flushCode() {
      const codeText = codeLines.join('\n');
      const escaped = escapeHtml(codeText);
      const languageAttr = codeLanguage ? ` data-language="${escapeAttribute(codeLanguage)}"` : '';
      html.push(`<pre><code${languageAttr}>${escaped}</code></pre>`);
      codeLines = [];
      codeLanguage = '';
    }

    lines.forEach((rawLine) => {
      const line = rawLine.replace(/\s+$/g, '');
      const trimmed = line.trim();

      if (!inCodeBlock && trimmed.startsWith('```')) {
        flushParagraph();
        flushList();
        inCodeBlock = true;
        codeLanguage = trimmed.slice(3).trim();
        codeLines = [];
        return;
      }

      if (inCodeBlock) {
        if (trimmed.startsWith('```')) {
          flushCode();
          inCodeBlock = false;
          return;
        }

        codeLines.push(line);
        return;
      }

      if (trimmed === '') {
        flushParagraph();
        flushList();
        return;
      }

      if (/^[-*]\s+/.test(trimmed)) {
        flushParagraph();
        const listText = trimmed.replace(/^[-*]\s+/, '');
        listItems.push(`<li>${formatInline(listText)}</li>`);
        inList = true;
        return;
      }

      const headingMatch = trimmed.match(/^(#{1,3})\s+(.*)$/);
      if (headingMatch) {
        flushParagraph();
        flushList();
        const level = headingMatch[1].length;
        const headingText = formatInline(headingMatch[2]);
        html.push(`<h${level}>${headingText}</h${level}>`);
        return;
      }

      if (/^>\s?/.test(trimmed)) {
        flushParagraph();
        flushList();
        const quoteText = formatInline(trimmed.replace(/^>\s?/, ''));
        html.push(`<blockquote>${quoteText}</blockquote>`);
        return;
      }

      if (/^[-]{3,}$/.test(trimmed)) {
        flushParagraph();
        flushList();
        html.push('<hr>');
        return;
      }

      paragraphLines.push(line);
    });

    if (inCodeBlock) {
      flushCode();
    }

    flushParagraph();
    flushList();

    return html.join('');
  }

  function parseDate(value) {
    if (typeof value !== 'string' || !value.trim()) {
      return null;
    }

    const timestamp = Date.parse(value);
    return Number.isFinite(timestamp) ? timestamp : null;
  }

  function formatDate(value) {
    const timestamp = parseDate(value);
    if (!timestamp) {
      return null;
    }

    try {
      return new Intl.DateTimeFormat('en', {
        month: 'long',
        day: 'numeric',
        year: 'numeric'
      }).format(new Date(timestamp));
    } catch (error) {
      return null;
    }
  }

  function estimateReadingTime(content) {
    if (typeof content !== 'string') {
      return null;
    }

    const words = content
      .replace(/[`*_#>\-]/g, ' ')
      .split(/\s+/)
      .filter(Boolean);
    if (!words.length) {
      return null;
    }

    const minutes = Math.max(1, Math.round(words.length / 170));
    return `${minutes} min read`;
  }

  function deriveTitleFromSlug(slug) {
    if (typeof slug !== 'string') {
      return '';
    }

    return slug
      .replace(/[_-]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/\b\w/g, (match) => match.toUpperCase());
  }

  function normalizeArticles(entries) {
    if (!Array.isArray(entries)) {
      return [];
    }

    return entries
      .map((entry) => {
        const slug = entry && typeof entry.slug === 'string' ? entry.slug.trim() : '';
        let title = entry && typeof entry.title === 'string' ? entry.title.trim() : '';
        const summary = entry && typeof entry.summary === 'string' ? entry.summary.trim() : '';
        const accentEmoji = entry && typeof entry.accentEmoji === 'string' ? entry.accentEmoji.trim() : '';
        const published = entry && typeof entry.published === 'string' ? entry.published.trim() : '';
        const content = entry && typeof entry.content === 'string' ? entry.content : '';
        const tags = Array.isArray(entry && entry.tags)
          ? entry.tags
              .map((tag) => (typeof tag === 'string' ? tag.trim() : ''))
              .filter(Boolean)
          : [];

        if (!slug || !content) {
          return null;
        }

        if (!title) {
          title = deriveTitleFromSlug(slug);
        }

        if (!title) {
          return null;
        }

        const readingTime = estimateReadingTime(content);
        return {
          slug,
          title,
          summary,
          accentEmoji,
          published,
          content,
          tags,
          readingTime
        };
      })
      .filter(Boolean);
  }

  function loadInlineArticles() {
    const inline = Array.isArray(window.wikiArticles) ? window.wikiArticles : [];
    if (inline.length) {
      return normalizeArticles(inline);
    }

    const inlineScript = document.querySelector('script[type="application/json"][data-wiki-articles]');
    if (inlineScript && inlineScript.textContent) {
      try {
        const parsed = JSON.parse(inlineScript.textContent);
        if (Array.isArray(parsed)) {
          return normalizeArticles(parsed);
        }
      } catch (error) {
        console.error('Failed to parse inline wiki dataset.', error);
      }
    }

    return [];
  }

  function sortArticles(list) {
    return list.slice().sort((a, b) => {
      const timeA = parseDate(a.published);
      const timeB = parseDate(b.published);

      if (timeA && timeB) {
        return timeB - timeA;
      }

      if (timeA && !timeB) {
        return -1;
      }

      if (!timeA && timeB) {
        return 1;
      }

      return a.title.localeCompare(b.title);
    });
  }

  function parseYamlIndex(text) {
    if (typeof text !== 'string') {
      return [];
    }

    const names = [];
    const lines = text.replace(/\r\n/g, '\n').split('\n');

    lines.forEach((rawLine) => {
      const trimmed = rawLine.trim();
      if (!trimmed || trimmed.startsWith('#')) {
        return;
      }

      const match = trimmed.match(/^-\s*(.+)$/);
      if (!match) {
        return;
      }

      let value = match[1].trim();
      if (!value) {
        return;
      }

      let buffer = '';
      let inSingleQuote = false;
      let inDoubleQuote = false;

      for (let index = 0; index < value.length; index += 1) {
        const char = value[index];
        if (char === "'" && !inDoubleQuote) {
          inSingleQuote = !inSingleQuote;
          buffer += char;
          continue;
        }

        if (char === '"' && !inSingleQuote) {
          inDoubleQuote = !inDoubleQuote;
          buffer += char;
          continue;
        }

        if (char === '#' && !inSingleQuote && !inDoubleQuote) {
          break;
        }

        buffer += char;
      }

      value = buffer.trim();
      if (!value) {
        return;
      }

      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }

      if (value) {
        names.push(value);
      }
    });

    return names;
  }

  async function fetchText(url) {
    const response = await fetch(url, { credentials: 'same-origin' });
    if (!response.ok) {
      throw new Error(`Failed to fetch ${url}: ${response.status}`);
    }

    return response.text();
  }

  function parseFrontMatter(markdown) {
    if (typeof markdown !== 'string') {
      return { data: {}, body: '' };
    }

    const normalized = markdown.replace(/\r\n/g, '\n');
    if (!normalized.startsWith('---\n')) {
      return { data: {}, body: normalized.trim() };
    }

    const closingIndex = normalized.indexOf('\n---', 4);
    if (closingIndex === -1) {
      return { data: {}, body: normalized.trim() };
    }

    const frontMatterText = normalized.slice(4, closingIndex);
    let body = normalized.slice(closingIndex + 4);
    if (body.startsWith('\n')) {
      body = body.slice(1);
    }

    return {
      data: parseFrontMatterBlock(frontMatterText),
      body: body.trim()
    };
  }

  function parseFrontMatterBlock(text) {
    const lines = text.split('\n');
    const data = {};
    let currentKey = null;
    let expectingArray = false;

    lines.forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) {
        return;
      }

      if (trimmed.startsWith('- ')) {
        if (expectingArray && currentKey) {
          const value = parseFrontMatterValue(trimmed.slice(2).trim());
          if (value !== null && value !== undefined && value !== '') {
            data[currentKey].push(value);
          }
        }
        return;
      }

      const match = trimmed.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
      if (!match) {
        currentKey = null;
        expectingArray = false;
        return;
      }

      const key = match[1];
      const remainder = match[2];

      if (!remainder) {
        data[key] = [];
        currentKey = key;
        expectingArray = true;
        return;
      }

      const parsed = parseFrontMatterValue(remainder);
      if (Array.isArray(parsed)) {
        data[key] = parsed.filter((item) => typeof item === 'string' && item.trim());
        currentKey = key;
        expectingArray = true;
        return;
      }

      data[key] = parsed;
      currentKey = key;
      expectingArray = false;
    });

    return data;
  }

  function parseFrontMatterValue(rawValue) {
    const trimmed = typeof rawValue === 'string' ? rawValue.trim() : '';
    if (!trimmed) {
      return '';
    }

    if (trimmed === '[]') {
      return [];
    }

    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      const inner = trimmed.slice(1, -1).trim();
      if (!inner) {
        return [];
      }

      return inner
        .split(',')
        .map((part) => parseFrontMatterScalar(part.trim()))
        .filter((value) => typeof value === 'string' && value);
    }

    return parseFrontMatterScalar(trimmed);
  }

  function parseFrontMatterScalar(value) {
    if (!value) {
      return '';
    }

    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      const unquoted = value.slice(1, -1);
      return unquoted.replace(/\\"/g, '"').replace(/\\'/g, "'");
    }

    if (/^(true|false)$/i.test(value)) {
      return value.toLowerCase() === 'true';
    }

    if (/^-?\d+(?:\.\d+)?$/.test(value)) {
      return Number(value);
    }

    return value;
  }

  function slugToTitle(slug) {
    if (typeof slug !== 'string') {
      return '';
    }

    return slug
      .replace(/[-_]+/g, ' ')
      .replace(/\b\w/g, (char) => char.toUpperCase());
  }

  function toStringArray(value) {
    if (Array.isArray(value)) {
      return value
        .map((item) => (typeof item === 'string' ? item.trim() : ''))
        .filter((item) => item);
    }

    if (typeof value === 'string' && value.trim()) {
      return [value.trim()];
    }

    return [];
  }

  async function loadArticlesFromFiles() {
    let yamlText = '';

    try {
      yamlText = await fetchText('articles/index.yaml');
    } catch (error) {
      console.error('Unable to load wiki index file.', error);
      return { entries: [], hadErrors: true };
    }

    const baseNames = parseYamlIndex(yamlText);
    if (!baseNames.length) {
      return { entries: [], hadErrors: false };
    }

    const results = await Promise.all(
      baseNames.map(async (baseName) => {
        const safeName = typeof baseName === 'string' ? baseName.trim() : '';
        if (!safeName || safeName.includes('..') || safeName.includes('/') || safeName.includes('\\')) {
          console.warn(`Skipping invalid wiki article reference: "${baseName}".`);
          return { entry: null, error: true };
        }

        const encodedName = encodeURIComponent(safeName);
        const bodyUrl = `articles/${encodedName}.md`;

        try {
          const markdown = await fetchText(bodyUrl);
          const { data: frontMatter, body } = parseFrontMatter(markdown);
          const fm = frontMatter && typeof frontMatter === 'object' ? frontMatter : {};

          const derivedSlug = typeof fm.slug === 'string' && fm.slug.trim() ? fm.slug.trim() : safeName;
          const title = typeof fm.title === 'string' && fm.title.trim()
            ? fm.title.trim()
            : slugToTitle(derivedSlug);
          const summary = typeof fm.summary === 'string' ? fm.summary.trim() : '';
          const accentEmoji = typeof fm.emoji === 'string' && fm.emoji.trim()
            ? fm.emoji.trim()
            : (typeof fm.accentEmoji === 'string' && fm.accentEmoji.trim() ? fm.accentEmoji.trim() : '');
          const published = typeof fm.date === 'string' && fm.date.trim()
            ? fm.date.trim()
            : (typeof fm.published === 'string' && fm.published.trim() ? fm.published.trim() : '');
          const tags = toStringArray(fm.tags);

          const entry = {
            slug: derivedSlug,
            title,
            summary,
            accentEmoji,
            published,
            tags,
            content: body
          };

          return { entry, error: false };
        } catch (error) {
          console.error(`Failed to load wiki article "${safeName}".`, error);
          return { entry: null, error: true };
        }
      })
    );

    const entries = results.map((result) => result.entry).filter(Boolean);
    const hadErrors = results.some((result) => result.error);
    return { entries, hadErrors };
  }

  function renderTags(tags) {
    articleTagsEl.innerHTML = '';
    if (!tags || !tags.length) {
      articleTagsEl.hidden = true;
      return;
    }

    const fragment = document.createDocumentFragment();
    tags.forEach((tag) => {
      const item = document.createElement('li');
      item.textContent = tag;
      fragment.appendChild(item);
    });
    articleTagsEl.appendChild(fragment);
    articleTagsEl.hidden = false;
  }

  function updateNavigationControls() {
    if (!previousButton || !nextButton) {
      return;
    }

    if (!articles.length) {
      previousButton.disabled = true;
      nextButton.disabled = true;
      delete previousButton.dataset.articleSlug;
      delete nextButton.dataset.articleSlug;
      previousButton.setAttribute('aria-label', 'No previous post');
      previousButton.removeAttribute('title');
      nextButton.setAttribute('aria-label', 'No next post');
      nextButton.removeAttribute('title');
      return;
    }

    const index = articles.findIndex((article) => article.slug === activeSlug);
    if (index === -1) {
      previousButton.disabled = true;
      nextButton.disabled = true;
      delete previousButton.dataset.articleSlug;
      delete nextButton.dataset.articleSlug;
      previousButton.setAttribute('aria-label', 'No previous post');
      previousButton.removeAttribute('title');
      nextButton.setAttribute('aria-label', 'No next post');
      nextButton.removeAttribute('title');
      return;
    }

    const previousArticle = index > 0 ? articles[index - 1] : null;
    const nextArticle = index < articles.length - 1 ? articles[index + 1] : null;

    if (previousArticle) {
      previousButton.disabled = false;
      previousButton.dataset.articleSlug = previousArticle.slug;
      previousButton.setAttribute('aria-label', `Previous post: ${previousArticle.title}`);
      previousButton.title = `Previous post: ${previousArticle.title}`;
    } else {
      previousButton.disabled = true;
      delete previousButton.dataset.articleSlug;
      previousButton.setAttribute('aria-label', 'No previous post');
      previousButton.removeAttribute('title');
    }

    if (nextArticle) {
      nextButton.disabled = false;
      nextButton.dataset.articleSlug = nextArticle.slug;
      nextButton.setAttribute('aria-label', `Next post: ${nextArticle.title}`);
      nextButton.title = `Next post: ${nextArticle.title}`;
    } else {
      nextButton.disabled = true;
      delete nextButton.dataset.articleSlug;
      nextButton.setAttribute('aria-label', 'No next post');
      nextButton.removeAttribute('title');
    }
  }

  function renderArticle(article, options) {
    const metaParts = [];
    const dateLabel = formatDate(article.published);
    if (dateLabel) {
      metaParts.push(dateLabel);
    }
    if (article.readingTime) {
      metaParts.push(article.readingTime);
    }

    if (metaParts.length) {
      articleMetaEl.hidden = false;
      articleMetaEl.textContent = metaParts.join(' • ');
    } else {
      articleMetaEl.hidden = true;
      articleMetaEl.textContent = '';
    }

    articleTitleEl.textContent = article.title;
    const html = renderMarkdown(article.content);
    articleBodyEl.innerHTML = html || '<p class="article-empty">No story yet.</p>';
    renderTags(article.tags);

    if (options && options.focus && articleTitleEl.focus) {
      articleTitleEl.focus();
    }

    document.title = `${article.title} · Project Blog`;
  }

  function selectArticle(slug, options = {}) {
    if (!slug) {
      return;
    }

    const match = articles.find((article) => article.slug === slug);
    if (!match) {
      return;
    }

    activeSlug = match.slug;
    renderArticle(match, options);
    updateNavigationControls();

    if (options.updateHistory !== false) {
      try {
        const url = new URL(window.location.href);
        url.searchParams.set('article', match.slug);
        window.history.replaceState({ article: match.slug }, '', url);
      } catch (error) {
        // ignore URL update errors
      }
    }
  }

  function applyInitialSelection() {
    if (!articles.length) {
      return;
    }

    let slug = null;
    try {
      const url = new URL(window.location.href);
      slug = url.searchParams.get('article');
    } catch (error) {
      slug = null;
    }

    if (slug && articles.some((article) => article.slug === slug)) {
      selectArticle(slug, { updateHistory: false });
      return;
    }

    selectArticle(articles[0].slug, { updateHistory: false });
  }

  function handlePopState() {
    if (!articles.length) {
      return;
    }

    let slug = null;
    try {
      const url = new URL(window.location.href);
      slug = url.searchParams.get('article');
    } catch (error) {
      slug = null;
    }

    if (slug && articles.some((article) => article.slug === slug)) {
      selectArticle(slug, { updateHistory: false, focus: true });
      return;
    }

    if (activeSlug && articles.some((article) => article.slug === activeSlug)) {
      selectArticle(activeSlug, { updateHistory: false, focus: true });
    } else {
      selectArticle(articles[0].slug, { updateHistory: false, focus: true });
    }
  }

  function bindEvents() {
    previousButton.addEventListener('click', () => {
      if (previousButton.disabled) {
        return;
      }

      const slug = previousButton.dataset.articleSlug;
      if (slug) {
        selectArticle(slug, { focus: true });
      }
    });

    nextButton.addEventListener('click', () => {
      if (nextButton.disabled) {
        return;
      }

      const slug = nextButton.dataset.articleSlug;
      if (slug) {
        selectArticle(slug, { focus: true });
      }
    });

    window.addEventListener('keydown', (event) => {
      if (!articles.length || !activeSlug || event.defaultPrevented) {
        return;
      }

      if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) {
        return;
      }

      if (event.key === 'ArrowLeft') {
        const slug = previousButton.dataset.articleSlug;
        if (slug && !previousButton.disabled) {
          selectArticle(slug, { focus: true });
          event.preventDefault();
        }
        return;
      }

      if (event.key === 'ArrowRight') {
        const slug = nextButton.dataset.articleSlug;
        if (slug && !nextButton.disabled) {
          selectArticle(slug, { focus: true });
          event.preventDefault();
        }
      }
    });

    window.addEventListener('popstate', handlePopState);
  }

  async function initializeWiki() {
    bindEvents();

    let loadResult;
    try {
      loadResult = await loadArticlesFromFiles();
    } catch (error) {
      console.error('Failed to load blog posts.', error);
      loadResult = { entries: [], hadErrors: true };
    }

    const fileArticles = normalizeArticles(loadResult.entries);
    let normalized = fileArticles;
    let usedInlineFallback = false;

    if (!normalized.length) {
      const inlineArticles = loadInlineArticles();
      if (inlineArticles.length) {
        normalized = inlineArticles;
        usedInlineFallback = true;
        if (loadResult.hadErrors) {
          console.warn('Using inline blog posts while the file-backed entries are unavailable.');
        }
      }
    }

    articles = sortArticles(normalized);
    activeSlug = null;

    if (loadResult.hadErrors && !articles.length && !usedInlineFallback) {
      loadErrorMessage = 'Unable to load blog posts right now.';
    } else {
      loadErrorMessage = '';
    }

    updateNavigationControls();

    if (!articles.length) {
      articleTitleEl.textContent = loadErrorMessage ? 'Unable to load posts' : 'No posts yet';
      articleMetaEl.hidden = true;
      articleMetaEl.textContent = '';
      articleTagsEl.hidden = true;
      articleTagsEl.innerHTML = '';
      const fallbackMessage = loadErrorMessage
        ? `<p class="article-empty">${loadErrorMessage}</p>`
        : '<p class="article-empty">Add a slug to <code>apps/wiki/articles/index.yaml</code> and create a matching markdown file to publish your first post.</p>';
      articleBodyEl.innerHTML = fallbackMessage;
      document.title = 'Project Blog';
      return;
    }

    applyInitialSelection();
  }

  initializeWiki();
})();
