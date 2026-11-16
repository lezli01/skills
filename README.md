# skills

A collection of [agent skills](https://agentskills.io) maintained by [lezli01](https://lezli01.is-a.dev).
Every skill is written for all mainstream agents (Claude Code, Codex, Cursor, Gemini CLI, OpenCode, Copilot,
and the others supported by the [`skills` CLI](https://github.com/vercel-labs/skills)) and installs with
`npx skills`.

[![Validate](https://github.com/lezli01/skills/actions/workflows/validate.yml/badge.svg)](https://github.com/lezli01/skills/actions/workflows/validate.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

## Install

```bash
# Pick from every skill in this repo
npx skills add lezli01/skills

# List what's available
npx skills add lezli01/skills --list

# Install one skill
npx skills add lezli01/skills --skill <skill-name>

# Install globally for a specific agent, no prompts
npx skills add lezli01/skills --skill <skill-name> -g -a claude-code -y
```

Keep installed skills current with `npx skills update`.

### As a Claude Code plugin

```
/plugin install lezli01 --marketplace lezli01/skills
```

On Claude Code older than 2.1.275, add the marketplace first:

```
/plugin marketplace add lezli01/skills
/plugin install lezli01@lezli01-skills
```

The plugin bundles every skill in this repo, namespaced as `lezli01:<skill-name>`, and updates with
`/plugin marketplace update lezli01-skills`.

## Skills

Each skill links to its own README with full documentation.

<!-- One row per skill, alphabetical: | [name](skills/name/) | one-line summary | -->

| Skill | What it does |
| ----- | ------------ |
| _None yet. Watch or star the repo to hear about the first one._ | |

## Repository layout

```
skills/<skill-name>/SKILL.md   # agent instructions; the folder name equals the frontmatter `name`
skills/<skill-name>/README.md  # human documentation for the skill
skills/<skill-name>/...        # optional scripts/, references/, assets/
.claude-plugin/                # Claude Code marketplace + plugin manifests (repo root is the plugin)
template/                      # copy this folder to start a new skill
scripts/validate-skills.mjs    # frontmatter, README, and link checks, run in CI
```

## Contributing

Ideas, bug reports, and pull requests are welcome. See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

[MIT](LICENSE) © lezli01
