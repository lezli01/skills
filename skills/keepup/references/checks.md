# Checks

How to decide each inventory item's status. Each section lists the commands to run and the signals that mean
**Deprecated**, **Stale**, or **Update**. Agent-specific commands and paths are in [agents.md](agents.md).

## The agent

- Compare the installed version (`<agent> --version`) with the latest release in the agent's registry or release
  feed. For npm-distributed agents: `npm view <package> version`.
- **Update** when they differ; note the install method so the update uses the same one (npm, Homebrew, native
  installer, desktop app). A package manager other than the one that installed the agent can install a second copy;
  check that `which -a <agent>` (Windows: `where.exe <agent>`) lists only one. The inventory's `duplicateInstalls`
  flags this.
- Run the agent's built-in health check when it has one (for example `claude doctor`) and report what it flags.
- Mark a GUI app update or a restart as **needs you**.

## Skills

- **Managed by the `skills` CLI** (listed in `~/.agents/.skill-lock.json`, `$XDG_STATE_HOME/skills/.skill-lock.json`,
  or a project `skills-lock.json`): run `npx skills check` (exit code 1 means updates exist) for both scopes, `-g`
  and project. One `npx skills update -g -y` / `npx skills update -p -y` action covers all of them.
- **Installed by a plugin**: covered by the plugin's update.
- **Unmanaged** (copied by hand, symlinked, or synced by another tool): find where it came from (a `source`/`repository`
  field in its frontmatter, a git checkout, or a symlink target) and compare it with that source. With no source,
  judge the content:
  - **Stale** when it tells the agent to use a tool, command, flag, API, model ID, or file that no longer exists or
    has been renamed; when another installed skill does the same job (a duplicate); or when its `SKILL.md` is
    missing or its frontmatter lacks `name`/`description`.
  - Broken symlinks, and the same skill installed at different versions in different agent directories, are **Stale**.
- Spot-check that each skill's `description` still matches what the skill does.

## MCP servers

Work out how each server is launched:

| Launch | Package | Latest / deprecation |
| --- | --- | --- |
| `npx -y pkg[@ver]`, `bunx pkg` | npm | `npm view <pkg> version deprecated repository.url` |
| `uvx pkg[@ver]`, `pipx run pkg` | PyPI | `https://pypi.org/pypi/<pkg>/json` → `info.version`; archived/deprecated status from `https://pypi.org/simple/<pkg>/` with header `Accept: application/vnd.pypi.simple.v1+json` → `project-status` |
| `docker run image[:tag]` | container | the image's registry tags; a `latest` tag only updates after `docker pull` |
| local binary (`codegraph serve`) | the binary | its own `--version` and update/upgrade command, then its release feed |
| `url` (http / streamable HTTP / SSE) | remote | the provider's docs; is the endpoint still the one they publish? |

Fetch URLs with `curl` on macOS and Linux and `curl.exe` on Windows (in Windows PowerShell 5, plain `curl` is an
alias for `Invoke-WebRequest`), or on any OS with
`node -e "fetch(process.argv[1]).then(r=>r.text()).then(console.log)" <url>`.

Signals:

- **Update**: a pinned version (`pkg@1.2.3`, an image tag, a local binary) is older than the latest. Unpinned
  `npx -y pkg` fetches the latest on each launch but can be held back by the npx cache; no action unless the
  server misbehaves. `uvx` caches too; `uvx pkg@latest` or `uv cache clean pkg` refreshes it.
- **Deprecated**: the registry marks it deprecated (`npm view` prints a `deprecated` message), the source repo is
  archived (`gh api repos/<owner>/<repo> --jq .archived`), the project moved it to a new package or an official
  vendor server, or it uses the deprecated HTTP+SSE transport (`"type": "sse"`, or a URL ending in `/sse`) where
  the provider now offers streamable HTTP. Name the replacement and how to migrate.
- **Stale**: the command is not on `PATH`, the package no longer exists (`npm view` returns E404), the server is
  disabled and unused, the same server is configured twice (in two scopes, or under two names), or a remote
  URL has stopped answering. For an endpoint on a private network, report **Unknown** instead of **Stale**.
- Known archived reference servers (moved to the archived `modelcontextprotocol/servers-archived` repo; npm marks them
  deprecated): AWS KB Retrieval, Brave Search, EverArt, GitHub, GitLab, Google Drive, Google Maps, PostgreSQL,
  Puppeteer, Redis, Sentry, Slack, SQLite. Replacements: GitHub → `github/github-mcp-server` (official, with a remote
  endpoint); Brave Search → `@brave/brave-search-mcp-server`; Slack → `zencoderai/slack-mcp-server`; Sentry → Sentry's
  hosted server (`https://mcp.sentry.dev/mcp`); Puppeteer → `@playwright/mcp` (a common choice, not an endorsed
  successor: **needs you**). For anything else, look for the vendor's official server. Still maintained: Everything,
  Fetch, Filesystem, Git, Memory, Sequential Thinking, Time.
- Check whether the running agent reports the server as failed (`claude mcp list` shows connection status).
- Never print `env` or `headers` values; refer to them by name.

## Plugins and extensions

- Refresh marketplace or extension indexes first, then compare installed versions or commits with the latest
  (commands in [agents.md](agents.md)).
- **Deprecated**: the marketplace removed or renamed the plugin (a marketplace `renames` entry, or the plugin is missing from
  the refreshed index), or its repo is archived.
- **Stale**: installed but disabled for a long time, enabled in settings but not installed, or a marketplace with
  no installed plugins.

## Hooks, status lines, and helper CLIs

The inventory lists the executables that hooks, status lines, and MCP servers call.

- **Stale**: the executable is missing from `PATH` (the hook fails every time it fires), or the script path does
  not exist.
- **Update**: the tool has a newer release. Use the tool's own check first (many print a notice, such as
  "v1.6.2 is available", or have an `upgrade`/`update` subcommand), then its package manager:
  - any OS: `npm outdated -g`, `uv tool list` / `pipx list --short` against PyPI, `cargo install --list` against crates.io;
  - macOS and Linux: `brew outdated`; Linux system packages through the distro (`apt list --upgradable`, needs `sudo`
    to upgrade: **needs you**);
  - Windows: `winget upgrade`, `scoop status`, `choco outdated`.
- Update with the same package manager that installed it. The inventory gives each helper's `path`:
  `/opt/homebrew`, `/usr/local/Cellar`, or `/home/linuxbrew` → Homebrew; `.cargo/bin` → cargo; `.local/bin` → pipx, uv,
  or a native installer; the npm global prefix (`npm prefix -g`) or an nvm/fnm/volta dir → npm;
  `AppData\Local\Microsoft\WinGet` → winget; `scoop\shims` → scoop; `ProgramData\chocolatey` → choco.

## Instruction and config files

Instruction files (`CLAUDE.md`, `AGENTS.md`, `GEMINI.md`, rules files) and settings files, user and project level.

- **Stale** model IDs: a configured `model` that the provider has retired or that has a newer generation. Check the
  provider's current model list (for Anthropic, the models overview page; for OpenAI, its models page). Propose the
  current equivalent; mark it **needs you** when the choice affects cost.
- **Deprecated** settings keys: compare the settings against the agent's current settings docs or schema
  (the `$schema` URL when present). The agent's health check often flags these.
- **Stale** instructions: lines that name a tool, MCP server, skill, command, or path that is not installed or does not exist,
  or that repeat what another file already says. Quote the line in the report; never rewrite instruction files
  without approval of the exact edit.
- **Stale** files: `*.bak`, `*.old`, `*.orig`, `*.save`, `*~`, and `*.tmp` files beside agent configs. Also two config files for the same agent and scope (for example
  `opencode.json` next to `opencode.jsonc`): check the agent's docs for which one it loads or how it merges them,
  and flag the one that is ignored, or the settings that conflict. Propose moving these files to the backup folder.
  Leave alone files modified in the last 7 days, and backups an app rotates itself (they reappear after every
  run); report them as **OK**.
- An API key passed as a literal in MCP `args` or config: the inventory redacts it, but flag it as **Stale**
  with the fix of moving it to an env var or the agent's secret store.
