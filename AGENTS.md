# AGENTS.md

This repo publishes agent skills for every mainstream agent (Claude Code, Codex, Cursor, Gemini CLI,
OpenCode, Copilot, and the rest the [`skills` CLI](https://github.com/vercel-labs/skills) supports).
Every skill must install with `npx skills add lezli01/skills --skill <name>`. The CLI discovers
`skills/<name>/SKILL.md`; anything outside `skills/` is repo tooling and never ships to users.

## Writing skills

- Write skills agent-agnostic: plain Markdown instructions and portable scripts. When a feature exists in only one
  agent, provide a fallback that works in the others.
- Start a new skill by copying `template/` to `skills/<name>/` and renaming `SKILL.md.template` to `SKILL.md`; the folder name equals the frontmatter `name`. The template keeps the `.template` suffix so the `skills` CLI never installs it.
- Before writing or editing a `SKILL.md`, read the spec at https://agentskills.io/specification.

## Documentation

Every change to a skill updates its documentation in the same commit.

- Each skill folder holds its full human-facing documentation in `skills/<name>/README.md`: what it does, the
  install command, usage examples, requirements, and supported agents. `SKILL.md` is the agent's instructions;
  `README.md` is for people.
- The root `README.md` **Skills** table lists every skill, alphabetically, with a link to `skills/<name>/` and a
  one-line summary. Adding, renaming, or removing a skill updates that table, and any root README section the change
  makes stale.

## Checks

After any change under `skills/`, run `node scripts/validate-skills.mjs` and `npx skills add . --list`; both must
pass. The validator enforces the frontmatter rules, the per-skill `README.md`, and the root README link.

## Claude Code plugin

The repo root is also a Claude Code plugin (`.claude-plugin/`), which loads `skills/` automatically, so a skill is
published there just by being in `skills/`. `plugin.json` omits `version` on purpose so installs track the latest
commit.
