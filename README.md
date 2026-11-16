<p align="center">
  <img src="assets/logo.svg" alt="skills logo" width="96">
</p>

<h1 align="center">skills</h1>

<p align="center">
  <strong>Agent skills for every mainstream coding agent, installable with one command.</strong>
</p>

<p align="center">
  Reusable <a href="https://agentskills.io">Agent Skills</a> that work in Claude Code, Codex, Cursor, Gemini CLI,<br>
  OpenCode, Copilot, and the rest of the agents supported by the <a href="https://github.com/vercel-labs/skills"><code>skills</code> CLI</a>,<br>
  on Windows, macOS, and Linux.
</p>

<p align="center">
  <a href="https://github.com/lezli01/skills/actions/workflows/validate.yml"><img src="https://github.com/lezli01/skills/actions/workflows/validate.yml/badge.svg" alt="Validate"></a>
  <a href="https://agentskills.io/specification"><img src="https://img.shields.io/badge/Agent_Skills-spec-8b5cf6" alt="Agent Skills spec"></a>
  <a href="#as-a-claude-code-plugin"><img src="https://img.shields.io/badge/Claude_Code-plugin-d97757" alt="Claude Code plugin"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-yellow.svg" alt="License: MIT"></a>
  <a href="https://www.buymeacoffee.com/lezli01"><img src="https://img.shields.io/badge/Buy_Me_a_Coffee-ffdd00?logo=buymeacoffee&logoColor=black" alt="Buy Me a Coffee"></a>
</p>

<p align="center">
  <a href="#quick-start">Quick Start</a> &bull;
  <a href="#skills">Skills</a> &bull;
  <a href="#why-these-skills">Why</a> &bull;
  <a href="#contributing">Contributing</a> &bull;
  <a href="https://agentskills.io/specification">Spec</a>
</p>

---

## Quick Start

```bash
npx skills add lezli01/skills
```

The CLI detects the agents you have installed, lets you pick skills, and installs them where each agent looks.

```bash
# List every skill in this repo
npx skills add lezli01/skills --list

# Install one skill
npx skills add lezli01/skills --skill <skill-name>

# Install globally for a specific agent, no prompts
npx skills add lezli01/skills --skill <skill-name> -g -a claude-code -y

# Update everything you installed
npx skills update
```

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

Each skill links to its own README with full documentation: what it does, usage, requirements, and supported agents.

<!-- One row per skill, alphabetical: | [name](skills/name/) | one-line summary | -->

| Skill | What it does |
| ----- | ------------ |
| [keepup](skills/keepup/) | Audits your whole agent setup (agents, skills, MCP servers, plugins, hooks, helper CLIs, config) for updates, deprecations, and stale items, then applies the fixes you approve. |

## Why These Skills?

A skill is a folder holding a `SKILL.md`: instructions, plus any scripts and reference material, that an agent loads
only when a task calls for it. Skills give an agent know-how it lacks, without stuffing every prompt with context.

Every skill here is:

- **Agent-agnostic.** Written to the open [Agent Skills](https://agentskills.io/specification) format, with no
  dependence on one vendor's features. When a feature exists in only one agent, the skill includes a fallback that works in the others.
- **Cross-platform.** Works on Windows, macOS, and Linux. Helper scripts are Node.js, and CI tests every skill on all
  three.
- **One command to install.** `npx skills add` puts it in the right place for each agent you use, and
  `npx skills update` keeps it current.
- **Documented.** Each skill has its own README, and the table above lists every one.
- **Checked in CI.** Each skill's metadata, docs, and discovery by the `skills` CLI are validated on every pull request.

Created by `lezli01` at [lezli01.is-a.dev](https://lezli01.is-a.dev) and released under the [MIT License](LICENSE).

## Project Layout

```text
skills/<skill-name>/SKILL.md   # agent instructions; the folder name equals the frontmatter `name`
skills/<skill-name>/README.md  # human documentation for the skill
skills/<skill-name>/...        # optional scripts/, references/, assets/
.claude-plugin/                # Claude Code marketplace + plugin manifests (repo root is the plugin)
template/                      # starter files for a new skill (see CONTRIBUTING)
scripts/validate-skills.mjs    # frontmatter, README, link, and portable-script checks, run in CI
```

## Contributing

Contributions of every size are welcome: new skills, fixes, docs, and ideas. Start here:

- Read the [Contributing guide](CONTRIBUTING.md) to scaffold a skill from `template/`, validate it, and test it
  with a real agent.
- Be a good neighbor: this project follows a [Code of Conduct](CODE_OF_CONDUCT.md).
- Have a question or an idea? Open a [Discussion](https://github.com/lezli01/skills/discussions).
- Found a bug or want a skill? Open an [issue](https://github.com/lezli01/skills/issues/new/choose).

## Security

Skills run inside agents that can read files and execute commands, so every skill is reviewed to make sure it doesn't
exfiltrate data, run remote code, or contain credentials. Please report suspected vulnerabilities privately via
GitHub's [security advisories](https://github.com/lezli01/skills/security/advisories/new) rather than a public
issue. See [SECURITY.md](SECURITY.md) for details.

## License

Released under the [MIT License](LICENSE). © 2026 lezli01.
