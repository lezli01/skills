// Runs inventory.mjs against a fake home directory and checks scoping, parsing, and redaction.
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
let home, project, env;
const runs = {};

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

  env = { ...process.env, HOME: home, USERPROFILE: home };
  for (const k of ["XDG_CONFIG_HOME", "XDG_STATE_HOME", "CLAUDECODE"]) delete env[k];
  for (const id of ["claude-code", "codex", "opencode"]) {
    const raw = execFileSync(process.execPath, [SCRIPT, "--agent", id, "--project", project], { env, encoding: "utf8" });
    runs[id] = { raw, inv: JSON.parse(raw) };
  }
});

after(() => rmSync(home, { recursive: true, force: true }));

const inv = (id = "claude-code") => runs[id].inv;
const server = (name, id = "claude-code") => inv(id).mcpServers.find((s) => s.name === name);

test("requires an agent unless running inside Claude Code", () => {
  assert.throws(() => execFileSync(process.execPath, [SCRIPT], { env, stdio: "pipe" }), (e) => e.status === 2);
  const viaEnv = JSON.parse(execFileSync(process.execPath, [SCRIPT, "--project", project], { env: { ...env, CLAUDECODE: "1" }, encoding: "utf8" }));
  assert.equal(viaEnv.agent.id, "claude-code");
});

test("scopes everything to the selected agent", () => {
  const names = (id) => inv(id).mcpServers.map((s) => s.name).sort();
  assert.deepEqual(names("claude-code"), ["legacySse", "local", "missingBin", "proj", "pyPinned", "secretArgs", "winWrapped"]);
  assert.deepEqual(names("codex"), ["docs"]);
  assert.deepEqual(names("opencode"), ["fs"]);
  assert.deepEqual(inv("codex").agent.models.map((m) => m.model), ["gpt-test"]);
  assert.deepEqual(inv("claude-code").agent.models.map((m) => m.model), ["claude-old-model-1"]);
  assert.equal(inv("codex").plugins, null);
  assert.ok(inv("codex").otherAgents.includes("claude-code"));
});

test("never prints secrets", () => {
  const raw = runs["claude-code"].raw;
  assert.equal(raw.includes(SECRET), false);
  assert.equal(raw.includes("Bearer"), false);
  assert.equal(server("secretArgs").secretInArgs, true);
  assert.deepEqual(server("secretArgs").args.slice(-2), ["--api-key", "<redacted>"]);
  assert.match(server("legacySse").url, /\?<redacted>$/);
  assert.deepEqual(server("legacySse").headerKeys, ["Authorization"]);
  assert.deepEqual(server("missingBin").envKeys, ["API_TOKEN"]);
});

test("reads MCP servers from JSON, project scope, TOML, and JSONC", () => {
  assert.equal(server("local").projectExists, true);
  assert.deepEqual(server("docs", "codex").launch, { registry: "npm", package: "docs-mcp", pinned: null });
});

test("identifies packages behind launchers", () => {
  assert.deepEqual(server("secretArgs").launch, { registry: "npm", package: "@upstash/context7-mcp", pinned: null });
  assert.deepEqual(server("winWrapped").launch, { registry: "npm", package: "@scope/pinned-mcp", pinned: "1.2.3" });
  assert.deepEqual(server("pyPinned").launch, { registry: "pypi", package: "mcp-server-git", pinned: "0.6.0" });
  assert.deepEqual(server("fs", "opencode").launch, { registry: "npm", package: "@modelcontextprotocol/server-filesystem", pinned: null });
  assert.equal(server("legacySse").transport, "sse");
  assert.equal(server("missingBin").commandOnPath, false);
});

test("includes shared skills only for agents that read them", () => {
  const codex = inv("codex");
  assert.ok(codex.skills.some((s) => s.owner === "shared" && s.name === "demo" && s.hasSkillMd));
  if (process.platform !== "win32") assert.ok(codex.skills.some((s) => s.brokenSymlink));
  assert.equal(codex.skillLocks[0].skills[0].name, "demo");
  // Claude Code does not read ~/.agents/skills, and has no skill symlinked into it here.
  assert.equal(inv("claude-code").skills.some((s) => s.owner === "shared"), false);
  assert.deepEqual(inv("claude-code").skillLocks, []);
});

test("finds hooks, helper CLIs, and leftovers of the selected agent only", () => {
  const claude = inv("claude-code");
  assert.equal(claude.helperCommands.find((x) => x.bin === "definitely-not-installed-hook")?.onPath, false);
  assert.ok(claude.leftoverFiles.some((f) => f.file.replace(/\\/g, "/").endsWith(".claude/settings.json.bak")));
  assert.equal(inv("codex").leftoverFiles.length, 0);
});
