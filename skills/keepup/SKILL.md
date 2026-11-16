---
name: keepup
description: Audits the setup of the agent running it (the agent itself and its skills, MCP servers, plugins and extensions, hooks, helper CLIs, instruction and config files) for outdated, deprecated, superseded, or stale items, reports the findings, then applies the approved fixes. Use when the user asks whether their agent setup is up to date, wants to update or clean up skills, MCP servers, or plugins, or asks what is deprecated or obsolete in their agent configuration.
license: MIT
metadata:
  author: lezli01
  version: "0.2.0"
---

# keepup

Bring an agent setup fully up to date in one pass: **inventory** everything, **check** each item, **report**,
wait for the user's go-ahead, then **apply** and **verify**. Nothing changes before the user approves the report.

**Scope: only the agent running this skill**, meaning you, with your user-level setup and the current project's files
for you. Other agents on the machine are out of scope: leave their config alone, and mention at the end of the report
that keepup can run inside each of them. Read-only work (steps 1–3) needs no permission; every change waits for step 4.

This works on Windows, macOS, and Linux. The commands below use `npm`, `npx`, `node`, `git`, and `gh`, which behave the
same everywhere; where a step needs an OS-specific command, use the one for the current OS. On Windows, run them in
PowerShell (`where.exe` instead of `which`, `$env:USERPROFILE` for `~`).

## 1. Inventory

Run the inventory script from the project root, passing your own agent ID: `claude-code`, `codex`, `gemini-cli`,
`antigravity-cli`, `cursor`, `copilot-cli`, `opencode`, or `windsurf`. It is read-only and prints JSON:

```bash
node <this-skill-dir>/scripts/inventory.mjs --agent <your-id>
```

For that agent it reports its version and install path, MCP servers, the skills it loads (its own dirs, plus the shared
`.agents/skills` dirs and other agents' dirs when it reads them), skill lock entries, plugins and marketplaces, hooks and
the status line (with the helper CLIs they call), configured models, instruction files, and leftover backup or temp
files. It never prints secret values (env, headers, secret-looking args, and URL query strings are redacted).
`otherAgents` lists the other agents it found, for the closing note only.

Then cross-check with your own listing commands from [references/agents.md](references/agents.md) (for example
`claude mcp list` and `claude plugin list` in Claude Code), which see items the script cannot, such as managed or
enterprise config. When Node.js is missing, build the inventory by hand from that file's section for you.

Some items are shared with other agents: a skill in `~/.agents/skills`, a helper CLI, a runtime. Updating them is in scope
because you depend on them. Mark a removal or a breaking change to a shared item **needs you**, and name in the report
which other agents also use it.

Done when every category in the script's output, plus anything the listing commands add, is in your working list.

## 2. Check

Check every inventory item using [references/checks.md](references/checks.md), which has the exact commands and the
signals for each category. Each item ends with one status and the evidence behind it (a command's output, a
registry response, or a URL to a changelog, deprecation notice, or archived repo):

| Status | Meaning |
| --- | --- |
| **Deprecated** | The publisher marked it deprecated, archived it, or replaced it. Migrate or remove it. |
| **Stale** | No update exists, but it no longer holds: it points to something removed, duplicates another item, contradicts current docs, or is leftover cruft. Remove or fix it. |
| **Update** | A newer version exists. |
| **OK** | Current, verified. |
| **Unknown** | Could not be verified; say why. |

Flag an item **needs you** when applying the fix requires the user: a GUI app update, `sudo`, signing in again, a
secret, a restart, or a choice between replacements.

Run independent checks in parallel (batch the registry lookups; use subagents when the agent has them). Verify
deprecation and replacement claims against a primary source (registry metadata, the project's repo or changelog, official docs) before
reporting them; your training data is out of date for exactly these facts.

Done when every inventory item has a status backed by evidence; **Unknown** is a status, not an omission.

## 3. Report

Present the report in the format of [references/report.md](references/report.md): a one-line summary, a numbered
action list grouped by status, the OK items collapsed, and every **needs you** item marked with what the user will have to do.

Then ask which actions to apply: all, a list of numbers, or none. Use the agent's question tool when it has one.
Stop here until the user answers.

## 4. Apply

Apply only the approved actions, in this order, so that each layer is current before anything that depends on it:

1. Back up every config file you will edit to `~/.keepup-backups/<timestamp>/` (on Windows
   `%USERPROFILE%\.keepup-backups\<timestamp>\`), keeping its path relative to the home directory. Copy with `node -e` and
   `fs.cpSync` when the shell has no portable copy command.
2. Helper CLIs and runtimes the setup calls (hook commands, MCP launchers).
3. MCP servers: version bumps, replacements, transport migrations, removals.
4. Skills, then plugins and their marketplaces.
5. Config cleanups: stale model IDs, deprecated keys, duplicate or leftover files. Move removed files into the backup
   folder instead of deleting them.
6. The agent itself, last, because the update may need a restart.

Use each tool's own update or remove command from [references/agents.md](references/agents.md) and
[references/checks.md](references/checks.md) rather than editing files the tool manages. When an action fails,
record the error, leave that item as it was, and continue with the rest. When you reach a **needs you** item, give the user
the exact command or steps and continue with the others; collect anything still waiting for them in the final summary.

## 5. Verify

Re-run the inventory script and the checks for every item you changed. Then give a short closing summary:

- what was updated, replaced, or removed, as before → after;
- what failed, with the error;
- what still needs the user, in the order to do it (restart the agent last);
- where the backups are.

Done when every approved action shows as **OK** on re-check, or appears in the summary as failed or waiting on the user.
