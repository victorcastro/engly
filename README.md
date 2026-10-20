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

Engly teaches the coding agent you already use (Claude Code, Codex, Cursor…) to coach your English. Every prompt becomes a tiny lesson: the agent shows you how to say it in clear English, points out a couple of mistakes, and then does the task as if you had written the better prompt.

No extra app, no extra model, no extra cost. Just better English and clearer prompts.

## 🚀 Quick start

> [!NOTE]
> Engly is in early development. Today it works for **Claude Code** and **Codex**. More agents and `engly config` are coming soon.

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
| `engly init` | Set up Engly in the project. Flags: `--tools claude,codex`, `--style light\|detailed`, `--no-apply` |
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

## Footprint

`engly init` adds `.engly/`, the `engly-*` skills (`.claude/skills/`, `.agents/skills/`) and one marked block in each agent file (`CLAUDE.md`, `AGENTS.md`). Nothing else is touched, and `engly remove` undoes it.

## Contributing

Issues and pull requests are welcome.

## License

[MIT](LICENSE)
