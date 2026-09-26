<div align="center">

# 🗣️ Engly

**Your English coach for AI prompts.**

One command. Every agent. Always on. Zero cost.

[![Release](https://github.com/victorcastro/engly/actions/workflows/release.yml/badge.svg?branch=main)](https://github.com/victorcastro/engly/actions/workflows/release.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D22.12-339933?logo=node.js&logoColor=white)](https://nodejs.org)

</div>

---

You write prompts to an AI all day. Why not improve your English while you do it?

- **Always on.** Coaching starts with your next prompt, no command to remember.
- **Never in your way.** A few lines of feedback, then the task goes on as usual.
- **Zero cost.** No API keys, no extra model. The agent you already use does the coaching.
- **For any level.** From A2 to C1, in any native language.

Engly teaches the coding agent you already use (Claude Code, Codex, Cursor…) to coach your English. Every prompt becomes a tiny lesson: the agent shows you how to say it in clear English, points out a couple of mistakes, and then does the task as if you had written the better prompt.

No extra app, no extra model, no extra cost. Just better English and clearer prompts.

## ✨ See it in action

**You write in your own language:**

```
You: arregla el bug del login que no deja entrar cuando el password tiene espacios

Agent:
┌ 🗣️ Engly
│ In English: "Fix the login bug that blocks users when the
│ password contains spaces."
│ Tip: "contains" is more precise than "has" for strings.
└
I'll look at the login handler...
```

**You write in English, with a few mistakes:**

```
You: make that the function return the users who has more than 3 orders

Agent:
┌ 🗣️ Engly
│ • "make that the function return" → "make the function return"
│ • "users who has" → "users who have" (plural subject)
│ Better: "Make the function return users with more than 3 orders."
└
Sure, here's the updated function...
```

**Your English is already right?** Engly stays quiet and the agent just gets to work.

## 🚀 Quick start

> [!NOTE]
> Engly is in early development. Today `engly init` works for **Claude Code**, and the package is not on npm yet. More agents and commands are coming soon.

Install it with one command, no clone needed (requires Node.js 22.12+):

```sh
sh -c "$(curl -fsSL https://raw.githubusercontent.com/victorcastro/engly/main/install.sh)"
```

<details>
<summary>No curl? Use wget</summary>

```sh
sh -c "$(wget -qO- https://raw.githubusercontent.com/victorcastro/engly/main/install.sh)"
```

</details>

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
cd your-project
engly init
```

Open your agent as usual. Your next prompt will be coached. 🎉

Once Engly is on npm, installing will be a single command: `npm install -g engly`.

## 🤖 Supported agents

| Agent | Where Engly adds its instructions | Status |
|---|---|---|
| Claude Code | One import line in `CLAUDE.md` | ✅ Available |
| Codex | Marked block in `AGENTS.md` | 🛠️ Coming soon |
| OpenCode | Marked block in `AGENTS.md` | 🛠️ Coming soon |
| Cursor | Its own rule file, `.cursor/rules/engly.mdc` | 🛠️ Coming soon |
| GitHub Copilot | Marked block in `.github/copilot-instructions.md` | 🛠️ Coming soon |

## 💬 In-chat commands

While you chat with your agent:

| Skill | What it does |
|---|---|
| `/engly-off` | Pause the coach for this session ("I'm in a hurry"). |
| `/engly-on` | Resume the coach. |
| `/engly-review` | Deep review of a prompt: every mistake, why, and better alternatives. |

In Codex, use `$engly-off` instead of `/engly-off`. In any agent you can also just type **"engly off"** or **"engly on"**.

## ⌨️ CLI commands

| Command | What it does |
|---|---|
| `engly init` | Sets up Engly in the current project. Asks two questions: which agents you use and how detailed the feedback should be. |
| `engly update` | Updates the skills and instructions to the latest version. *(coming soon)* |
| `engly enable` / `engly disable` | Turns the coach on or off permanently. *(coming soon)* |
| `engly config <option> <value>` | Changes a setting, e.g. `engly config level B2`. *(coming soon)* |
| `engly status` | Shows where Engly is installed and whether it is active. *(coming soon)* |
| `engly remove` | Removes everything Engly added. *(coming soon)* |

`engly init` options:

| Option | What it does |
|---|---|
| `--tools claude,codex,…` | Choose agents without being asked. |
| `--style light\|detailed` | Choose the feedback style without being asked. |
| `--yes` | No questions at all: detected agents and default settings. |
| `--no-apply` | Only install the skills, don't touch the agent files. |

## ⚙️ Settings

Engly works out of the box. Your settings live in `.engly/config.json`:

| Setting | Values | Default |
|---|---|---|
| `style` | `light` (up to 3 corrections) or `detailed` (every mistake explained) | `light` |
| `level` | `auto`, `A2`, `B1`, `B2`, `C1` | `auto`: the agent infers it from how you write |
| `language` | `auto` or your native language (`es`, `pt`, `fr`…) | `auto`: the agent infers it from your prompts |
| `reviewEnglish` | Also coach prompts written in English | `true` |
| `enabled` | Coach on or off | `true` |

## 🔒 Your files are safe

`engly init` only adds this to your project:

- `.engly/` with the coach instructions and your settings.
- The in-chat skills (`engly-on`, `engly-off`, `engly-review`).
- One small marked block in your agent file:

  ```md
  <!-- engly:start v1.0.0 -->
  @.engly/engly.md
  <!-- engly:end -->
  ```

Everything outside the markers stays exactly as it was, line endings included. Engly also looks out for you:

- **Shared repo?** If your agent file is tracked by git, Engly warns you first. Learning English is personal, and your teammates would be coached too if you commit it.
- **Long agent file?** Agents pay less attention to the end of long files, so Engly offers to put its block near the top.

## ❓ FAQ

<details>
<summary><b>Does Engly cost anything or send my prompts anywhere?</b></summary>

No. Engly is a script that writes a few files. It has no server, no API keys and no telemetry. The coaching is done by the agent you already use, in the same conversation.
</details>

<details>
<summary><b>Will it slow me down?</b></summary>

No. The note is a few lines at most, and the agent never waits for your confirmation. If you're in a hurry, type "engly off".
</details>

<details>
<summary><b>My English is already good. Is Engly useful for me?</b></summary>

Yes. Engly stays silent when your prompt is right, and at higher levels it suggests more natural and precise wording, which also helps the agent understand you better.
</details>

<details>
<summary><b>How do I uninstall it?</b></summary>

`engly remove` is coming soon. Until then, delete the `<!-- engly:start -->` … `<!-- engly:end -->` block from your agent file, then delete the `.engly/` folder and the `engly-*` skill folders.
</details>

## 🤝 Contributing

Contributions are welcome! Open an issue to report a bug or suggest an idea, or send a pull request.
