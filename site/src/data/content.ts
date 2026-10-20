import pkg from '../../../package.json';

export const repoUrl = 'https://github.com/victorcastro/engly';
export const npmUrl = 'https://www.npmjs.com/package/engly';
export const installCommand = 'npm install -g engly';
export const initCommand = 'engly init';

export const navLinks = [
  { href: '#features', label: 'Features' },
  { href: '#how', label: 'How it works' },
  { href: '#agents', label: 'Agents' },
  { href: '#faq', label: 'FAQ' },
];

export const facts = [
  { label: 'MIT license' },
  { label: `Node ${pkg.engines.node.replace('>=', '≥ ')}` },
  { label: `v${pkg.version}` },
  { accent: '0', label: 'API keys' },
  { accent: '0', label: 'telemetry' },
  { label: 'Levels A2–C1' },
  { label: 'Any native language' },
];

export type TerminalKind = 'cmd' | 'out' | 'gap' | 'brand' | 'q' | 'ok';

export const terminalLines: { kind: TerminalKind; text: string }[] = [
  { kind: 'cmd', text: installCommand },
  { kind: 'out', text: 'added 1 package in 1.8s' },
  { kind: 'gap', text: '' },
  { kind: 'cmd', text: initCommand },
  { kind: 'brand', text: `✨ Engly ${pkg.version}` },
  { kind: 'q', text: '? Agents to set up › Claude Code' },
  { kind: 'q', text: '? Coaching style › light' },
  { kind: 'ok', text: '✓ Created .engly/config.json' },
  { kind: 'ok', text: '✓ Added skills engly-on, engly-off, engly-review' },
  { kind: 'ok', text: '✓ Linked .engly/engly.md in CLAUDE.md' },
  { kind: 'out', text: 'Done. Open your agent and write as usual.' },
];

export const demoTabs = ['Write in your language', 'Write in English with mistakes', 'Already correct'];

export const comparison = {
  others: [
    'A separate language app',
    'Switching context away from your code',
    'Paying for another subscription',
    'Generic lessons unrelated to your work',
  ],
  engly: ['Practice with your real work', 'Never leave your editor', 'No extra cost', 'Always on, never blocks'],
};

export const features: { title: string; body: string }[] = [
  { title: 'Always on', body: 'Coaching starts with your next prompt. No commands to remember.' },
  {
    title: 'Never in your way',
    body: 'A few lines of feedback, then the task continues. It never asks for confirmation.',
  },
  {
    title: 'No API keys, no extra model',
    body: 'The agent you already use does the coaching. Engly only writes files.',
  },
  {
    title: 'Any level, any language',
    body: 'A2–C1. <code>auto</code> infers your level and native language, and catches typical mistakes from it: false friends, calques, word order.',
  },
  {
    title: 'Translate to English',
    body: 'Write in your language and get the clear English version. Your native language is never corrected.',
  },
  {
    title: 'Silent confirmation',
    body: 'If your English is already right, you just see <code class="t-ok">✓ Correct English.</code>',
  },
  {
    title: 'Deep review',
    body: '<code>/engly-review</code> numbers every mistake with an explanation, an improved version and a more formal alternative.',
  },
  {
    title: 'Session controls',
    body: '<code>/engly-off</code> and <code>/engly-on</code> in chat. <code>engly enable|disable</code> per project, permanently.',
  },
];

export const agents: { name: string; available?: boolean; detail: string }[] = [
  { name: 'Claude Code', available: true, detail: 'Import in <code>CLAUDE.md</code> or <code>AGENTS.md</code>' },
  { name: 'Codex', detail: 'Block in <code>AGENTS.md</code>' },
  { name: 'OpenCode', detail: 'Block in <code>AGENTS.md</code>' },
  { name: 'Cursor', detail: '<code>.cursor/rules/engly.mdc</code>' },
  { name: 'GitHub Copilot', detail: '<code>.github/copilot-instructions.md</code>' },
];

export const faq: { question: string; answer: string }[] = [
  {
    question: 'Does it cost anything or send my prompts anywhere?',
    answer:
      'No. There is no server, no keys and no telemetry in the coaching. The CLI only checks npm once a day to let you know about new versions.',
  },
  { question: 'Will it slow me down?', answer: 'No. Feedback is a few lines and it never waits for confirmation.' },
  {
    question: 'Is it useful if my English is already good?',
    answer: 'Yes. It suggests more natural and precise wording.',
  },
  {
    question: 'How do I uninstall it?',
    answer: 'Run <code>engly remove</code>. To pause it instead, run <code>engly disable</code>.',
  },
];

export const footerColumns = [
  {
    label: 'Project',
    links: [
      { href: repoUrl, label: 'GitHub' },
      { href: npmUrl, label: 'npm' },
      { href: `${repoUrl}/releases`, label: 'Changelog' },
    ],
  },
  {
    label: 'Community',
    links: [
      { href: `${repoUrl}/issues`, label: 'Issues' },
      { href: `${repoUrl}/blob/main/LICENSE`, label: 'License MIT' },
    ],
  },
];
