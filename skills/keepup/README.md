# keepup

Keep your AI agent's setup current with one prompt. `keepup` inventories the agent it runs in and everything around it
(its skills, MCP servers, plugins and extensions, hooks, helper CLIs, instruction and config files), checks each item
against its source, and shows you one compact report:

- 🔴 **Deprecated**: marked deprecated or archived by its publisher, or replaced by something else; keepup names the replacement.
- 🟠 **Stale**: no update exists, but it no longer holds up: it points at something removed, duplicates
  another item, uses a retired model ID, or is a leftover backup file.
- 🟡 **Update**: a newer version is available.
- 👤 **Needs you**: the fix needs a restart, `sudo`, a sign-in, a GUI update, or your choice.

Nothing changes until you approve. Then keepup backs up what it will touch, applies the approved fixes in
dependency order (the agent's own update last), verifies them, and tells you what is left for you to do.

keepup only touches the agent it runs in. If you use several agents, run it in each one; the report lists the other
agents it found so you know where to run it next.

## Install

```bash
npx skills add lezli01/skills --skill keepup
```

Install it globally (`-g`) so it can run from any project:

```bash
npx skills add lezli01/skills --skill keepup -g
```

Or, in Claude Code, install every skill in this repo as a plugin: `/plugin install lezli01 --marketplace lezli01/skills`.

## Usage

Ask your agent in plain words:

```
> is my agent setup up to date?
> check my skills and MCP servers for updates
> anything deprecated or stale in my agent config?
> /keepup
```

The agent replies with a report like this:

```
keepup report: Claude Code
42 items checked · 🔴 1 deprecated · 🟠 2 stale · 🟡 3 updates · ✅ 34 OK · 👤 2 need you

#  Item                 Now → Proposed                                  Why                         👤
🔴 Deprecated
1  github MCP server    @modelcontextprotocol/server-github → official  npm: package deprecated     re-auth
🟠 Stale
2  settings.json.bak    move to backups                                 leftover backup file
3  CLAUDE.md line 12    remove                                          names a tool not installed
🟡 Updates
4  Claude Code          2.1.250 → 2.1.278                               changelog                   restart
5  4 skills             npx skills update -g                            npx skills check
6  codegraph CLI        1.5.0 → 1.6.2                                   codegraph upgrade

Out of scope: Codex and Cursor are also installed. Run keepup inside each of them.

Apply all 6, pick numbers (e.g. 1,4), or none?
```

Reply with `all`, a list of numbers, or `none`. Backups of every edited or removed file go to
`~/.keepup-backups/<timestamp>/`.

## What it checks

| Area | Examples |
| --- | --- |
| The agent | installed vs latest version, duplicate installs, its built-in health check |
| Skills | every skill the agent loads (its own dirs, the shared `~/.agents/skills`, and other agents' dirs it reads): `npx skills check` for managed skills; source, duplicates, and outdated instructions for hand-installed ones |
| MCP servers | npm / PyPI / Docker / binary versions, deprecated or archived packages, the deprecated SSE transport, missing commands, duplicates |
| Plugins & extensions | the agent's plugins and marketplaces or extensions |
| Hooks & helper CLIs | tools called by hooks, status lines, and MCP launchers: missing from `PATH` or outdated |
| Config & instructions | retired model IDs, deprecated settings keys, instructions that name tools you no longer have, leftover `.bak`/`.tmp` files |

## Requirements

- Node.js 18+ for the read-only inventory script. Without Node.js the agent builds the inventory by hand, which takes longer.
- Network access to npm, PyPI, and GitHub for version and deprecation checks.
- Optional: `gh` (archived-repo checks), `brew`, `uv`, `pipx`, `docker`, when your setup uses them.

## Supported platforms

Windows, macOS, and Linux. The inventory script is plain Node.js with no dependencies, and its tests run on all three in
CI. keepup updates each tool through the package manager that installed it: npm, Homebrew, winget, scoop, Chocolatey,
uv, pipx, cargo, or the agent's own updater.

## Supported agents

Works in any agent supported by the [`skills` CLI](https://github.com/vercel-labs/skills). It knows the config layout of
Claude Code, OpenAI Codex CLI, Gemini CLI and Antigravity CLI, Cursor, GitHub Copilot CLI, OpenCode, and Windsurf, and
audits whichever of them it runs in. Agents without a question tool get the approval prompt as a normal chat message.

## Safety

- Scoped to the agent it runs in; other agents' config is never touched. Removing or breaking-changing something other
  agents share (a skill in `~/.agents/skills`, a helper CLI) always asks you first.
- Read-only until you approve; no secret values (env vars, headers, tokens) ever appear in the report.
- Every edited or removed file is backed up first. Removed files are moved, not deleted.
- Instruction files (`CLAUDE.md`, `AGENTS.md`, ...) are only edited with your approval of the exact change.
