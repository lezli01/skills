# Agents

Where each agent keeps its configuration and how to update it, as of 2026-11. `~` is the home directory
(`%USERPROFILE%` on Windows); `<project>` is the current repository. The paths are the same on Windows, macOS, and Linux
unless noted. When a path or command here disagrees with the agent's current `--help` or docs, trust the agent: it
changes faster than this file. Note what changed in the report.

Shared by several agents (the `skills` CLI writes here too): skills in `~/.agents/skills` and
`<project>/.agents/skills`; `skills` CLI lock files at `~/.agents/.skill-lock.json` (or
`$XDG_STATE_HOME/skills/.skill-lock.json`) and `<project>/skills-lock.json`. Manage those skills with
`npx skills ls|check|update|remove` (`-g` for global).

## Claude Code

- **Version**: `claude --version`. Latest: `npm view @anthropic-ai/claude-code dist-tags` (`latest` and `stable` channels).
- **Update** with the method that installed it:
  - Native installer (`~/.local/bin/claude`; on Windows `%USERPROFILE%\.local\bin\claude.exe`): updates itself in the background;
    `claude update` forces it. The `autoUpdatesChannel` setting picks `latest` or `stable`.
  - Homebrew: `brew upgrade claude-code`. WinGet: `winget upgrade Anthropic.ClaudeCode`. apt/dnf/apk: system upgrade, needs `sudo`.
  - npm: `npm i -g @anthropic-ai/claude-code@latest` (not `npm update -g`, never `sudo`).
  - The new version runs after a restart (**needs you**). `DISABLE_AUTOUPDATER` / `DISABLE_UPDATES` env vars turn updates off;
    report that as the reason when the native install is behind.
- **Health check**: `claude doctor` (read-only): settings errors, install problems, last auto-update result.
- **MCP**: `mcpServers` in `~/.claude.json` (user scope, plus per-project local scope under `projects.<path>.mcpServers`)
  and `<project>/.mcp.json`. `claude mcp list` shows each server's connection status. The SSE transport is
  deprecated in favour of HTTP. Edit with `claude mcp add|remove` and `-s user|project|local`.
- **Skills**: `~/.claude/skills`, `<project>/.claude/skills`, and plugin skills.
- **Plugins**: `claude plugin list|update <plugin>|uninstall|enable|disable|prune` and
  `claude plugin marketplace list|update [name]|remove`. State is in `~/.claude/plugins/installed_plugins.json` and
  `known_marketplaces.json`; `enabledPlugins` and `extraKnownMarketplaces` are in settings. Run `marketplace update` before
  comparing versions. Plugin updates apply after a restart.
- **Other**: commands in `~/.claude/commands` and `.claude/commands` still work but have been merged into skills
  (suggest converting them). Subagents are in `agents/*.md`; hooks and `statusLine` in `settings.json` (user, project, and
  `settings.local.json`); instructions in `CLAUDE.md`, `CLAUDE.local.md`, `~/.claude/CLAUDE.md`.
- **Deprecated settings**: `includeCoAuthoredBy` → `attribution`; `disableArtifact` → `enableArtifact`;
  `keybindingFlavor` has no effect. **Removed**: `permissionExplainerEnabled`, `taskOutputMaxChars`,
  `teammateDefaultModel`. The legacy dirs `~/.claude/todos`, `statsig`, `logs`, and `image-cache` are no longer written.

## OpenAI Codex CLI

- **Version**: `codex --version`. Latest: `npm view @openai/codex version`.
- **Update**: `codex update`. Other installs: npm `@openai/codex`, `brew upgrade --cask codex`, the install script, or GitHub release
  binaries. The Codex desktop app updates itself.
- **Health check**: `codex doctor`; `codex features list`.
- **MCP**: TOML tables `[mcp_servers.<name>]` in `~/.codex/config.toml` and, for trusted projects,
  `<project>/.codex/config.toml`. `codex mcp list|get|add|remove`. Transports are stdio and streamable HTTP.
- **Skills**: `~/.agents/skills`, `.agents/skills` in each directory from the project up to the repo root, and `/etc/codex/skills`.
  `~/.codex/skills` is not in the current docs; treat skills there as unmanaged and check that Codex still loads them.
- **Plugins**: `codex plugin list|add|remove`; `codex plugin marketplace list|upgrade|remove` refreshes the marketplaces
  (there is no per-plugin update).
- **Deprecated**: custom prompts in `~/.codex/prompts/*.md` ("Custom prompts are deprecated. Use skills"). Propose
  converting each one to a skill, then removing it. Also retired: `[profiles.*]` with `--profile`, the top-level `profile =`, and
  `approval_policy = "untrusted"`.
- **Other**: hooks in `~/.codex/hooks.json`, `<project>/.codex/hooks.json`, or `[hooks]` in `config.toml`. Instructions in
  `AGENTS.md` and `~/.codex/AGENTS.md`.

## Gemini CLI → Antigravity CLI

- On 2026-06-18 Google replaced Gemini CLI with **Antigravity CLI** (`agy`) for unpaid-tier and Google One users; Gemini CLI
  still works with paid API keys. When `gemini` is installed and the user is not on a paid key, report it as
  **Deprecated**, **needs you**, with the
  [migration announcement](https://developers.googleblog.com/an-important-update-transitioning-gemini-cli-to-antigravity-cli/).
  Check `agy --help` for its import and update commands before proposing them.
- **Version**: `gemini --version`. Latest: `npm view @google/gemini-cli dist-tags`. Updates itself when
  `general.enableAutoUpdate` is on (the default); otherwise `npm i -g @google/gemini-cli@latest` or `brew upgrade gemini-cli`.
- **MCP**: `mcpServers` in `~/.gemini/settings.json` and `<project>/.gemini/settings.json`; `gemini mcp list`. The field
  picks the transport: `command` = stdio, `url` = SSE (deprecated), `httpUrl` = streamable HTTP.
- **Skills**: `~/.gemini/skills`, `.gemini/skills`, and the shared `.agents/skills` dirs (which take precedence);
  `gemini skills list --all`.
- **Extensions**: `~/.gemini/extensions/`; `gemini extensions update --all`, `uninstall <name>`.
- **Deprecated settings**: `ui.accessibility.enableLoadingPhrases` → `ui.loadingPhrases`;
  `experimental.topicUpdateNarration` → `general.topicUpdateNarration`.
- **Other**: commands in `~/.gemini/commands/*.toml`; `hooks` in settings; instructions in `GEMINI.md`.

## Cursor (IDE and CLI)

- **CLI** (`agent`, alias `cursor-agent`): `agent --version`; `agent update`. Updates itself by default. There is no
  public latest-version endpoint, so if `agent update` reports nothing, mark the version **OK**.
- **IDE**: a desktop app that updates itself; an update needs the user to restart it (**needs you**).
- **MCP**: `mcpServers` in `~/.cursor/mcp.json` and `<project>/.cursor/mcp.json`; `agent mcp list`.
- **Skills**: `~/.cursor/skills`, `.cursor/skills`, plus the shared `.agents/skills` dirs and the `.claude/skills` /
  `.codex/skills` compatibility dirs. A skill visible through several of these dirs loads more than once.
- **Plugins**: managed in the IDE's Customize panel; `agent plugin marketplace list|update`.
- **Other**: hooks in `~/.cursor/hooks.json` and `.cursor/hooks.json`; rules in `.cursor/rules/*.mdc` (plain `.md` files
  there are ignored, so flag them as **Stale**) and `AGENTS.md`. Cursor 2.4+ offers `/migrate-to-skills` to convert slash
  commands and rules into skills. Crashed atomic writes leave `~/.cursor/cli-config.json.<n>.<id>.tmp` files that
  are safe to remove.

## GitHub Copilot CLI

- **Version**: `copilot --version`. Latest: `npm view @github/copilot version`.
- **Update**: `copilot update`. It also checks on startup and applies a downloaded update at the next launch. Other installs:
  npm `@github/copilot`, `brew upgrade --cask copilot-cli`, `winget upgrade GitHub.Copilot`. `COPILOT_AUTO_UPDATE=false` turns updates off.
- **MCP**: `~/.copilot/mcp-config.json`, `<project>/.mcp.json`, `<project>/.github/mcp.json`;
  `copilot mcp list|remove|enable|disable`.
- **Skills**: `~/.copilot/skills`, `.github/skills`, plus the shared `.agents/skills` and `.claude/skills` dirs;
  `copilot skill list|remove`.
- **Plugins**: `copilot plugin list|update|uninstall`; the default marketplace is `github/awesome-copilot`.
- **Deprecated**: the `--config-dir` flag (use `COPILOT_HOME`); `copilot plugins` (plural) is a legacy alias.
- **Other**: settings in `~/.copilot/settings.json` and `.github/copilot/settings*.json`; hooks in `.github/hooks/*.json`;
  instructions in `~/.copilot/copilot-instructions.md`, `.github/copilot-instructions.md`, and
  `.github/instructions/**/*.instructions.md` (`copilot instruction list`).

## OpenCode

- **Version**: `opencode --version`. Latest: `npm view opencode-ai version` (v1) and `npm view @opencode/cli version` (v2).
- **Update**: `opencode upgrade` (`--method npm|brew|curl|...`). **OpenCode 2** is a breaking, opt-in move:
  `opencode upgrade --major` installs v2 and removes v1. v1 plugins do not run in v2, and the config keys are renamed
  (`agent`→`agents`, `command`→`commands`, `provider`→`providers`, `permission`→`permissions`, `mcp` →
  `mcp.servers` with `enabled` → `disabled`, `plugin` → `plugins`). Offer it as a separate **needs you** action and
  follow https://opencode.ai/v2/docs/migrate-v1/.
- **MCP**: `mcp` in `~/.config/opencode/opencode.json(c)`, `<project>/opencode.json(c)`, and
  `<project>/.opencode/opencode.json(c)`; `opencode mcp list`. Servers are `type: "local"` (with `command` as one array
  holding the executable and its args) or `type: "remote"` (with `url`). On Windows, too, the config lives in `~/.config/opencode`.
- **Skills**: `~/.config/opencode/skills`, `.opencode/skills`, plus the shared `.agents/skills` and `.claude/skills` dirs.
- **Plugins**: the `plugin` array of npm package names in the config; there is no list or update command, so compare each with
  `npm view <pkg> version`.
- **Other**: `agents/` and `commands/` dirs; `AGENTS.md`; diagnostics with `opencode debug config|paths`.
