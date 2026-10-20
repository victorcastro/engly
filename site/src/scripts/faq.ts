document.querySelectorAll<HTMLButtonElement>('[data-faq]').forEach((button) => {
  const panel = document.getElementById(button.getAttribute('aria-controls') ?? '');
  if (!panel) return;

  button.addEventListener('click', () => {
    const open = button.getAttribute('aria-expanded') !== 'true';
    button.setAttribute('aria-expanded', String(open));
    panel.hidden = !open;
  });
});
