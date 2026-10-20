const root = document.documentElement;
const fillMs = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 300;

function currentTheme() {
  return root.dataset.theme === 'light' ? 'light' : 'dark';
}

function syncLabel(button: HTMLElement) {
  button.setAttribute('aria-label', currentTheme() === 'dark' ? 'Switch to light theme' : 'Switch to dark theme');
}

document.querySelectorAll<HTMLElement>('[data-theme-toggle]').forEach((button) => {
  syncLabel(button);
  button.addEventListener('mouseleave', () => button.classList.remove('is-done'));
  button.addEventListener('blur', () => button.classList.remove('is-done'));
  button.addEventListener('click', () => {
    if (button.classList.contains('is-switching')) return;
    button.classList.add('is-switching');
    window.setTimeout(() => {
      const next = currentTheme() === 'dark' ? 'light' : 'dark';
      root.dataset.theme = next;
      try {
        localStorage.setItem('engly-theme', next);
      } catch {}
      syncLabel(button);
      button.classList.add('is-done');
      button.classList.remove('is-switching');
    }, fillMs);
  });
});
