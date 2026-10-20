const RESET_MS = 1600;

document.querySelectorAll<HTMLButtonElement>('[data-copy]').forEach((button) => {
  let timer: number | undefined;

  button.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(button.dataset.copy ?? '');
    } catch {}
    button.textContent = 'Copied ✓';
    clearTimeout(timer);
    timer = window.setTimeout(() => {
      button.textContent = 'Copy';
    }, RESET_MS);
  });
});
