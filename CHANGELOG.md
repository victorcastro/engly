# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-09-26

First version: project foundation and `engly init` for Claude Code.

### Added

- `engly` CLI (Node.js 22.12+, ESM) with the commands `init`, `update`, `enable`, `disable`, `config`, `status` and `remove`. Only `init` is implemented; the rest print "not implemented yet".
- `engly init` for Claude Code:
  - Asks which agents you use and the feedback style (`light` or `detailed`).
  - Writes a marked block with `@.engly/engly.md` in `CLAUDE.md`, creating the file if needed.
  - Installs the `engly-on`, `engly-off` and `engly-review` skills in `.claude/skills/`.
  - Saves `.engly/config.json` and renders the coach instructions to `.engly/engly.md`.
  - Warns when `CLAUDE.md` is tracked by git, or will be once committed.
  - Warns when `CLAUDE.md` is over 200 lines and offers to put the block near the top.
  - Flags: `--tools`, `--style`, `--yes` and `--no-apply`.
- Marked block handling between `<!-- engly:start vX.Y.Z -->` and `<!-- engly:end -->`: insert, update and remove without touching content outside the markers, keeping the file's line endings (LF or CRLF).
- Adapters for Claude Code, Codex, OpenCode, Cursor and GitHub Copilot, with detection, instruction file, delivery mode, skill folders and size limits.
- Skills are copied to as few folders as possible: `.claude/skills/` with Claude Code, plus `.agents/skills/` when Codex is selected or Claude Code is not.
- Coach instructions template and the three skills with valid frontmatter.
- CI workflow for pull requests to `main`, Biome for lint and format, and vitest with 100% coverage required on the block and size modules.
- Version check on pull requests to `main`: `version` in `package.json` must be greater than on `main` (semver, prereleases included), and `CHANGELOG.md` must have an entry for it. All jobs report to a single `Required checks` status for branch protection.
- Release workflow on pushes to `main`: publishes to npm with provenance (trusted publishing, no token) and creates the `vX.Y.Z` tag and GitHub release from the CHANGELOG entry.

[1.0.0]: https://github.com/victorcastro/engly/releases/tag/v1.0.0
