(function () {
  const target = '../slang/';
  if (typeof window === 'undefined') {
    return;
  }

  if (typeof window.location.replace === 'function') {
    window.location.replace(target);
  } else {
    window.location.href = target;
  }
})();
