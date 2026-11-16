// Runs inventory.mjs against a fake home directory and checks parsing and redaction.
// Run from the repo root with `node --test`. Works on Windows, macOS, and Linux.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { after, before, test } from "node:test";
import { fileURLToPath } from "node:url";

const SCRIPT = join(dirname(fileURLToPath(import.meta.url)), "inventory.mjs");
const SECRET = "ctx7sk-00000000-test-secret-value-0000";
let home, project, inv, raw;

function write(path, content) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, typeof content === "string" ? content : JSON.stringify(content, null, 2));
}

before(() => {
  home = mkdtempSync(join(tmpdir(), "keepup-home-"));
  project = join(home, "proj");
  mkdirSync(project, { recursive: true });

  write(join(home, ".claude.json"), {
    mcpServers: {
      secretArgs: { type: "stdio", command: "npx", args: ["-y", "@upstash/context7-mcp", "--api-key", SECRET] },
      winWrapped: { command: "cmd", args: ["/c", "npx", "-y", "@scope/pinned-mcp@1.2.3"] },
      pyPinned: { command: "uvx", args: ["mcp-server-git==0.6.0"] },
      legacySse: { type: "sse", url: `https://example.com/sse?token=${SECRET}`, headers: { Authorization: `Bearer ${SECRET}` } },
      missingBin: { command: "definitely-not-installed-keepup-bin", args: [], env: { API_TOKEN: SECRET } },
    },
    projects: { [project]: { mcpServers: { local: { type: "http", url: "https://example.com/mcp" } } } },
  });
  write(join(home, ".claude", "settings.json"), {
    model: "claude-old-model-1",
    hooks: { PreToolUse: [{ matcher: "Bash", hooks: [{ type: "command", command: `definitely-not-installed-hook --key ${SECRET}` }] }] },
  });
  write(join(home, ".claude", "settings.json.bak"), "{}");
  write(join(home, ".agents", "skills", "demo", "SKILL.md"), "---\nname: demo\ndescription: Demo skill.\n---\n# Demo\n");
  write(join(home, ".agents", ".skill-lock.json"), { version: 3, skills: { demo: { source: "owner/repo", sourceType: "github" } } });
  write(join(home, ".codex", "config.toml"), 'model = "gpt-test"\n\n[mcp_servers.docs]\ncommand = "npx"\nargs = ["-y", "docs-mcp"]\n');
  write(join(home, ".config", "opencode", "opencode.jsonc"), `{
    // comment, and a trailing comma below
    "mcp": { "fs": { "type": "local", "command": ["npx", "-y", "@modelcontextprotocol/server-filesystem"], "enabled": true }, },
  }`);
  write(join(project, ".mcp.json"), { mcpServers: { proj: { command: "node", args: ["server.js"] } } });
  // Symlinks need extra privileges on Windows; cover broken links on macOS and Linux only.
  if (process.platform !== "win32") symlinkSync(join(home, "nowhere"), join(home, ".agents", "skills", "broken"));

  const env = { ...process.env, HOME: home, USERPROFILE: home };
  delete env.XDG_CONFIG_HOME;
  delete env.XDG_STATE_HOME;
  raw = execFileSync(process.execPath, [SCRIPT, "--project", project], { env, encoding: "utf8" });
  inv = JSON.parse(raw);
});

after(() => rmSync(home, { recursive: true, force: true }));

const servers = () => inv.agents.flatMap((a) => a.mcpServers);
const server = (name) => servers().find((s) => s.name === name);

test("never prints secrets", () => {
  assert.equal(raw.includes(SECRET), false);
  assert.equal(raw.includes("Bearer"), false);
  assert.equal(server("secretArgs").secretInArgs, true);
  assert.deepEqual(server("secretArgs").args.slice(-2), ["--api-key", "<redacted>"]);
  assert.match(server("legacySse").url, /\?<redacted>$/);
  assert.deepEqual(server("legacySse").headerKeys, ["Authorization"]);
  assert.deepEqual(server("missingBin").envKeys, ["API_TOKEN"]);
});

test("reads MCP servers from JSON, project scope, TOML, and JSONC", () => {
  for (const name of ["secretArgs", "winWrapped", "pyPinned", "legacySse", "missingBin", "local", "proj", "docs", "fs"])
    assert.ok(server(name), `missing server ${name}`);
  assert.equal(server("local").projectExists, true);
});

test("identifies packages behind launchers", () => {
  assert.deepEqual(server("secretArgs").launch, { registry: "npm", package: "@upstash/context7-mcp", pinned: null });
  assert.deepEqual(server("winWrapped").launch, { registry: "npm", package: "@scope/pinned-mcp", pinned: "1.2.3" });
  assert.deepEqual(server("pyPinned").launch, { registry: "pypi", package: "mcp-server-git", pinned: "0.6.0" });
  assert.deepEqual(server("fs").launch, { registry: "npm", package: "@modelcontextprotocol/server-filesystem", pinned: null });
  assert.equal(server("legacySse").transport, "sse");
  assert.equal(server("missingBin").commandOnPath, false);
});

test("finds skills, lock files, models, hooks, and leftovers", () => {
  assert.ok(inv.sharedSkills.some((s) => s.name === "demo" && s.hasSkillMd));
  if (process.platform !== "win32") assert.ok(inv.sharedSkills.some((s) => s.brokenSymlink));
  assert.equal(inv.skillLocks[0].skills[0].name, "demo");
  assert.ok(inv.models.some((m) => m.model === "claude-old-model-1"));
  assert.ok(inv.models.some((m) => m.model === "gpt-test"));
  const hookHelper = inv.helperCommands.find((x) => x.bin === "definitely-not-installed-hook");
  assert.equal(hookHelper?.onPath, false);
  assert.ok(inv.leftoverFiles.some((f) => f.file.replace(/\\/g, "/").endsWith(".claude/settings.json.bak")));
});
