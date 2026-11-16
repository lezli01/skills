# Report format

The user reads this report to decide what to approve, so it must be quick to scan: lead with the counts, put every
action in one numbered list, and push the OK items to the end.

## Template

````markdown
## keepup report

**42 items checked** · 🔴 2 deprecated · 🟠 3 stale · 🟡 5 updates · ✅ 30 OK · ❔ 2 unknown · 👤 3 need you

### Actions

| # | Item | Where | Now → Proposed | Why | 👤 |
|---|------|-------|----------------|-----|----|
| | **🔴 Deprecated** | | | | |
| 1 | `github` MCP server | `~/.claude.json` | `@modelcontextprotocol/server-github` → `github/github-mcp-server` (remote) | npm marks the package deprecated; [notice](https://...) | re-auth |
| | **🟠 Stale** | | | | |
| 2 | `CLAUDE.md` line 12 | project | remove | names `old-tool`, which is not installed | |
| 3 | `config.toml.bak` | `~/.codex/` | move to backups | leftover backup, 4 months old | |
| | **🟡 Updates** | | | | |
| 4 | Claude Code | global | 2.1.250 → 2.1.278 | [changelog](https://...) | restart |
| 5 | `find-skills` skill | `~/.agents/skills` | update | `npx skills check` reports a newer commit | |

### Needs you

- **#1**: sign in to GitHub when the new server first connects.
- **#4**: restart Claude Code after the update.

### Couldn't check

- `metabase` MCP server (`http://internal-host/...`): not reachable from here; check with its owner.

<details><summary>✅ 30 items OK</summary>

Claude Code plugins (3), skills (8), MCP servers (4), helper CLIs (6), ...

</details>

Apply all 5 actions, pick numbers (e.g. `1,4,5`), or none?
````

## Rules

- **One row per action.** When one fix covers several items (for example, one `npx skills update` updates many skills), list it
  once and name the items in **Item**.
- **Proposed** is the concrete end state: a version, a replacement, `remove`, or the corrected value.
- **Why** gives one piece of evidence, linked when it is a URL. Leave detailed explanations out of the table.
- **👤** names what the user will have to do (`restart`, `sudo`, `re-auth`, `GUI`, `choose`), or stays empty.
- Order within each group: the agents themselves first, then MCP servers, skills, plugins, helper CLIs, config.
- Skip empty groups. When there is nothing to do, report the summary line and the OK list, and stop.
- Never show secret values. Refer to an env var or header by its name.
