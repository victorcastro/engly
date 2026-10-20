const AUTOPLAY_MS = 6000;
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

  let timer: number | undefined;
  let visible = false;
  let stopped = list.dataset.autoplay === undefined || window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const current = () => tabs.findIndex((tab) => tab.getAttribute('aria-selected') === 'true');

  const schedule = () => {
    clearTimeout(timer);
    if (stopped || !visible) return;
    timer = window.setTimeout(() => {
      select(tabs, (current() + 1) % tabs.length);
      schedule();
    }, AUTOPLAY_MS);
  };

  const stop = () => {
    stopped = true;
    clearTimeout(timer);
    list.classList.remove('is-auto');
  };

  if (!stopped) {
    new IntersectionObserver(([entry]) => {
      visible = entry?.isIntersecting ?? false;
      list.classList.toggle('is-auto', visible);
      schedule();
    }).observe(list);
  }

  tabs.forEach((tab, index) =>
    tab.addEventListener('click', () => {
      stop();
      select(tabs, index);
    }),
  );

  list.addEventListener('keydown', (event) => {
    const focused = tabs.findIndex((tab) => tab === document.activeElement);
    if (focused === -1) return;
    let next = focused;
    const step = STEPS[event.key];
    if (step) next = (focused + step + tabs.length) % tabs.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = tabs.length - 1;
    else return;
    event.preventDefault();
    stop();
    select(tabs, next);
    tabs[next]?.focus();
  });
});
