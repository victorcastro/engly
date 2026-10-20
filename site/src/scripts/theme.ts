const root = document.documentElement;

function currentTheme() {
  return root.dataset.theme === 'light' ? 'light' : 'dark';
}

function syncLabel(button: HTMLElement) {
  button.setAttribute('aria-label', currentTheme() === 'dark' ? 'Switch to light theme' : 'Switch to dark theme');
}

document.querySelectorAll<HTMLElement>('[data-theme-toggle]').forEach((button) => {
  syncLabel(button);
  button.addEventListener('click', () => {
    const next = currentTheme() === 'dark' ? 'light' : 'dark';
    root.dataset.theme = next;
    try {
      localStorage.setItem('engly-theme', next);
    } catch {}
    syncLabel(button);
  });
});
