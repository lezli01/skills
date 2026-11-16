# Contributing

Thanks for helping out. Bug reports, skill ideas, and pull requests are all welcome.

## Report a problem or suggest a skill

Open an [issue](https://github.com/lezli01/skills/issues/new/choose) using the matching template.
For open-ended questions, use [Discussions](https://github.com/lezli01/skills/discussions).

## Add or change a skill

1. Copy `template/` to `skills/<skill-name>/` and rename `SKILL.md.template` to `SKILL.md`. (The suffix keeps the template from being installed as a skill.) The folder name must equal the `name` in the frontmatter:
   lowercase letters, digits, and hyphens, at most 64 characters.
2. Write the `description` so an agent knows **when** to load the skill: what it does plus the concrete
   triggers. It is the only part an agent sees before deciding, and it must stay under 1024 characters.
3. Keep `SKILL.md` focused. Put long reference material in `references/` and runnable helpers in `scripts/`,
   and link to them from `SKILL.md`. Write it so it works in every agent the `skills` CLI supports, not just one.
4. Fill in `skills/<skill-name>/README.md` with the skill's full documentation: what it does, how to install it,
   usage examples, requirements, and supported agents.
5. Add a row to the **Skills** table in the root `README.md` that links to `skills/<skill-name>/`, and update any
   other root README section your change affects.
6. Validate and try the skill locally:

   ```bash
   node scripts/validate-skills.mjs
   npx skills add . --list                  # confirm the CLI discovers it
   npx skills add . --skill <skill-name> -a claude-code -y
   ```

7. Open a pull request describing what the skill does and how you tested it with a real agent.

## Conventions

- One skill per pull request.
- Skills must not exfiltrate data, fetch and execute remote code, or contain credentials.
- By contributing you agree your work is released under the [MIT License](LICENSE).
