const STEPS: Record<string, number> = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };

function select(tabs: HTMLElement[], index: number) {
  tabs.forEach((tab, i) => {
    const selected = i === index;
    tab.setAttribute('aria-selected', String(selected));
    tab.tabIndex = selected ? 0 : -1;
    const panel = document.getElementById(tab.getAttribute('aria-controls') ?? '');
    if (panel) panel.hidden = !selected;
  });
}

document.querySelectorAll<HTMLElement>('[data-tabs]').forEach((list) => {
  const tabs = [...list.querySelectorAll<HTMLElement>('[role="tab"]')];

  tabs.forEach((tab, index) => tab.addEventListener('click', () => select(tabs, index)));

  list.addEventListener('keydown', (event) => {
    const current = tabs.findIndex((tab) => tab === document.activeElement);
    if (current === -1) return;
    let next = current;
    const step = STEPS[event.key];
    if (step) next = (current + step + tabs.length) % tabs.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = tabs.length - 1;
    else return;
    event.preventDefault();
    select(tabs, next);
    tabs[next]?.focus();
  });
});
