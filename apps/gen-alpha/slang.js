(function () {
  if (typeof window === 'undefined') {
    return;
  }

  const source = Array.isArray(window.slangEntries) ? window.slangEntries : [];
  window.genAlphaSlang = source
    .filter(function (entry) {
      return entry && entry.categoryId === 'gen-alpha';
    })
    .map(function (entry) {
      return {
        id: entry.id,
        term: entry.term,
        definition: entry.definition,
        example: entry.example,
        hint: entry.hint,
      };
    });
})();
