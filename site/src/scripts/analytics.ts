type Params = Record<string, string>;
type Gtag = (command: 'event', name: string, params: Params) => void;

const KEYS = new Set(['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp', 'Home', 'End']);

function track(name: string, params: Params = {}) {
  (window as Window & { gtag?: Gtag }).gtag?.('event', name, params);
}

function text(element: Element | null | undefined) {
  return element?.textContent?.replace(/\s+/g, ' ').trim() ?? '';
}

function paramsOf(element: HTMLElement): Params {
  const params: Params = {};
  for (const [key, value] of Object.entries(element.dataset)) {
    if (key === 'track' || !key.startsWith('track') || value === undefined) continue;
    params[key.charAt(5).toLowerCase() + key.slice(6)] = value;
  }
  return params;
}

document.addEventListener('click', (event) => {
  const target = event.target instanceof Element ? event.target : null;

  const tracked = target?.closest<HTMLElement>('[data-track]');
  if (tracked?.dataset.track) track(tracked.dataset.track, paramsOf(tracked));

  const faq = target?.closest<HTMLElement>('[data-faq]');
  if (faq) track('faq_toggle', { question: text(faq), state: faq.getAttribute('aria-expanded') === 'true' ? 'open' : 'close' });

  const tab = target?.closest<HTMLElement>('[data-tabs] [role="tab"]');
  if (tab) track('demo_tab_select', { tab: text(tab), method: 'click' });
});

document.addEventListener('keydown', (event) => {
  if (!KEYS.has(event.key)) return;
  const tab = document.activeElement?.closest<HTMLElement>('[data-tabs] [role="tab"]');
  if (tab) track('demo_tab_select', { tab: text(tab), method: 'keyboard' });
});

new MutationObserver(() => track('theme_toggle', { theme: document.documentElement.dataset.theme ?? 'dark' })).observe(
  document.documentElement,
  { attributes: true, attributeFilter: ['data-theme'] },
);

const seen = new Set<string>();
const sections = new IntersectionObserver(
  (entries) => {
    for (const entry of entries) {
      const name = (entry.target as HTMLElement).dataset.section;
      if (!entry.isIntersecting || !name || seen.has(name)) continue;
      seen.add(name);
      sections.unobserve(entry.target);
      track('section_view', { section: name });
    }
  },
  { threshold: 0.4 },
);
document.querySelectorAll('[data-section]').forEach((section) => sections.observe(section));
