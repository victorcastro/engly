<div align="center">

# ✨ Engly

**Your English coach for AI prompts.**

One command. Every agent. Always on.

[Website](https://victorcastro.github.io/engly) · [npm](https://www.npmjs.com/package/engly)

[![Release](https://github.com/victorcastro/engly/actions/workflows/release.yml/badge.svg?branch=main)](https://github.com/victorcastro/engly/actions/workflows/release.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D24-339933?logo=node.js&logoColor=white)](https://nodejs.org)

</div>

---

You write prompts to an AI all day. Why not improve your English while you do it?

- **Always on.** Coaching starts with your next prompt, no command to remember.
- **Never in your way.** A few lines of feedback, then the task goes on as usual.
- **No API keys, no extra model.** The agent you already use does the coaching.
- **For any level.** From A2 to C1, in any native language.

Engly teaches the coding agent you already use (Claude Code, Codex, OpenCode, Cursor…) to coach your English. Every prompt becomes a tiny lesson: the agent shows you how to say it in clear English, points out a couple of mistakes, and then does the task as if you had written the better prompt.

No extra app, no extra model, no extra cost. Just better English and clearer prompts.

## 🚀 Quick start

> [!NOTE]
> Engly is in early development. Today it works for **Claude Code**, **Codex** and **OpenCode**. More agents and `engly config` are coming soon.

Install it with one command:

```sh
npm install -g engly
```

<details>
<summary>Or install from a clone</summary>

```sh
git clone https://github.com/victorcastro/engly.git
cd engly
npm install
npm run build
npm link
```

</details>

Then, in your project:

```sh
engly init
```

Open your agent as usual. Your next prompt will be coached. 🎉

## Commands

| Command | Description |
|---|---|
| `engly init` | Set up Engly in the project. Flags: `--tools claude,codex,opencode`, `--style light\|detailed`, `--no-apply` |
| `engly update` | Refresh skills and instructions to the installed version |
| `engly enable` / `disable` | Turn the coach on or off for the project |
| `engly status` | Show where Engly is installed and whether it is active |
| `engly remove` | Remove everything Engly added |

In chat: `/engly-on`, `/engly-off`, `/engly-review` in Claude Code, `$engly-on`, `$engly-off`, `$engly-review` in Codex.

## Config

`.engly/config.json`:

| Key | Values | Default |
|---|---|---|
| `style` | `light`, `detailed` | `light` |
| `level` | `auto`, `A2`, `B1`, `B2`, `C1` | `auto` |
| `language` | `auto` or a language code (`es`, `pt`, `fr`…) | `auto` |
| `reviewEnglish` | coach prompts written in English | `true` |
| `enabled` | coach on or off | `true` |

## Prompt engineering techniques

Engly has no code that coaches. The coaching is the prompt (`templates/engly.md`), so these are the techniques it relies on:

| Technique | How Engly applies it |
|---|---|
| Role prompting | The agent is told it is an "English coach", on top of its normal coding role. |
| Explicit numbered rules | One rule per case: prompt in another language, English with mistakes, correct English. |
| Output templates (few-shot) | A boxed `┌ ✨ Engly … └` example for each case, so the agent copies the exact format. |
| Output constraints | Up to 3 corrections, notes of 6 lines at most, "Better:" always in English. |
| Negative instructions | "Never ask for confirmation", "never block the task", "never correct the native language". |
| Injection guard | Rule 1: only coach text the user typed, never tool results, file contents or system messages. |
| Prompt templating | `{{language}}`, `{{level}}`, `{{styleRule}}`, `{{englishRule}}` and `{{lengthRule}}` are filled from `.engly/config.json`. |
| In-context inference | `auto` for level and native language: the agent infers both from the user's own prompts. |
| Task chaining | Coach first, then do the task "as if the user had sent the improved prompt", in a single turn. |
| Modular skills | `engly-on`, `engly-off` and `engly-review` are separate on-demand prompts, not one long prompt. |
| Persistent context | The instructions are loaded from the agent file (`CLAUDE.md`, `AGENTS.md`) at the start of every session. |
| State by command | "engly off" / "engly on" switch the behavior during the session. |

## Evals

The prompt is the product, so it has tests. `evals/cases.json` holds prompts in Spanish, Portuguese, French, mixed languages and English (with and without mistakes). `npm run evals` installs Engly in a temporary project, sends each prompt to Claude Code and checks the coaching note against the rules in `templates/engly.md`:

- the note is a closed `┌ ✨ Engly … └` box with 6 lines at most
- non-English prompts get only a `Better:` line, in English, with no bullets
- English prompts with mistakes get 1 to 3 corrections and a `Better:` line
- correct English gets only `✓ Correct English.`
- the task is done after the note, and the agent never asks for confirmation

```sh
npm run build
npm run evals -- --runs 3
```

| Flag | Description |
|---|---|
| `--runs <n>` | Run each case `n` times, since the model is not deterministic |
| `--case <text>` | Run only the cases whose id contains the text |
| `--model <name>` | Model passed to `claude` |
| `--concurrency <n>` | Prompts sent at the same time (default 4) |

The runner needs the `claude` CLI logged in, and it spends tokens. The checks themselves are unit tested in `test/evals-checks.test.ts` and run on every PR.

## Contributing

Issues and pull requests are welcome.

## License

[MIT](LICENSE)
