# AGENTS.md

This repo publishes agent skills for every mainstream agent (Claude Code, Codex, Cursor, Gemini CLI,
OpenCode, Copilot, and the rest the [`skills` CLI](https://github.com/vercel-labs/skills) supports).
Every skill must install with `npx skills add lezli01/skills --skill <name>`. The CLI discovers
`skills/<name>/SKILL.md`; anything outside `skills/` is repo tooling and never ships to users.

## Writing skills

- Write skills agent-agnostic: plain Markdown instructions and portable scripts. When a feature exists in only one
  agent, provide a fallback that works in the others.
- Every skill must work on Windows, macOS, and Linux:
  - Write helper scripts in Node.js (it is already present wherever `npx skills` runs) using `node:path`,
    `os.homedir()`, and `fileURLToPath`, never hard-coded `/` separators or `$HOME`. The validator rejects `.sh`, `.ps1`,
    `.bat`, and other shell-specific scripts.
  - When instructions show a shell command, use one that works on every OS (`npm`, `npx`, `node`, `git`, `gh`), or give
    the Windows (PowerShell) equivalent next to it.
  - Write paths as `~/...` and note where Windows differs (`%USERPROFILE%`, `%APPDATA%`).
  - On Windows, npm CLIs are `.cmd` shims: spawn them with `shell: true` (only with fixed, trusted arguments).
- Give scripts a `*.test.mjs` next to them (Node's built-in `node:test`). CI runs `node --test` on all three OSes.
- Start a new skill by copying `template/` to `skills/<name>/` and renaming `SKILL.md.template` to `SKILL.md`; the folder name equals the frontmatter `name`. The template keeps the `.template` suffix so the `skills` CLI never installs it.
- Before writing or editing a `SKILL.md`, read the spec at https://agentskills.io/specification.

## Documentation

Every change to a skill updates its documentation in the same commit.

- Each skill folder holds its full human-facing documentation in `skills/<name>/README.md`: what it does, the
  install command, usage examples, requirements, supported agents, and supported platforms. `SKILL.md` is the agent's instructions;
  `README.md` is for people.
- The root `README.md` **Skills** table lists every skill, alphabetically, with a link to `skills/<name>/` and a
  one-line summary. Adding, renaming, or removing a skill updates that table, and any root README section the change
  makes stale.

## Checks

After any change under `skills/`, run `node scripts/validate-skills.mjs`, `node --test`, and `npx skills add . --list`;
all must pass. The validator enforces the frontmatter rules, the per-skill `README.md`, the root README link, and
portable scripts. CI repeats these checks on Ubuntu, macOS, and Windows.

## Claude Code plugin

The repo root is also a Claude Code plugin (`.claude-plugin/`), which loads `skills/` automatically, so a skill is
published there just by being in `skills/`. `plugin.json` omits `version` on purpose so installs track the latest
commit.
