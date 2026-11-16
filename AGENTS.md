# AGENTS.md

This repo publishes agent skills installed with `npx skills add lezli01/skills`. The CLI discovers
`skills/<name>/SKILL.md`; anything outside `skills/` is repo tooling and never ships to users.

- Start a new skill by copying `template/` to `skills/<name>/`; the folder name equals the frontmatter `name`.
- After any change under `skills/`, run `node scripts/validate-skills.mjs` and `npx skills add . --list`; both must pass.
- Every skill has a row in the README **Skills** table; keep it alphabetical and in sync.
- Before writing or editing a `SKILL.md`, read the spec at https://agentskills.io/specification.
