const root = document.querySelector<HTMLElement>('[data-terminal]');

if (root) {
  const lines = [...root.querySelectorAll<HTMLElement>('.term-line')];
  const typed = lines.filter((line) => line.dataset.kind !== 'prompt');
  const prompt = lines.find((line) => line.dataset.kind === 'prompt');
  const texts = typed.map((line) => line.querySelector('.term-text')?.textContent ?? '');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const cursor = document.createElement('span');
  cursor.className = 'term-cursor';
  cursor.setAttribute('aria-hidden', 'true');

  let timer: number | undefined;
  let step = 0;
  let chars = 0;

  const render = () => {
    typed.forEach((line, i) => {
      const text = line.querySelector('.term-text');
      const isTyping = i === step && line.dataset.kind === 'cmd';
      line.classList.toggle('is-visible', i < step || isTyping);
      if (text) text.textContent = isTyping ? (texts[i] ?? '').slice(0, chars) : (texts[i] ?? '');
    });
    const done = step >= typed.length;
    prompt?.classList.toggle('is-visible', done);
    const active = done ? prompt : typed[step]?.dataset.kind === 'cmd' ? typed[step] : undefined;
    if (active) active.append(cursor);
    else cursor.remove();
  };

  const tick = () => {
    if (step >= typed.length) return;
    const line = typed[step];
    if (line?.dataset.kind === 'cmd' && chars < (texts[step] ?? '').length) {
      chars += 1;
      render();
      timer = window.setTimeout(tick, 40 + Math.random() * 50);
      return;
    }
    const next = typed[step + 1];
    const delay = line?.dataset.kind === 'cmd' ? 500 : next?.dataset.kind === 'cmd' ? 600 : 240;
    step += 1;
    chars = 0;
    render();
    timer = window.setTimeout(tick, delay);
  };

  const start = () => {
    clearTimeout(timer);
    chars = 0;
    if (reduced) {
      step = typed.length;
      render();
      return;
    }
    step = 0;
    render();
    timer = window.setTimeout(tick, 600);
  };

  root.querySelector('[data-replay]')?.addEventListener('click', start);
  start();
}
