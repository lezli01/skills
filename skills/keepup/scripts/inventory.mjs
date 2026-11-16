#!/usr/bin/env node
// keepup inventory: read-only scan of ONE agent's setup (the agent running keepup), user level and current project.
// Prints JSON to stdout. Never prints secret values: env and header values, secret-looking args, and URL query strings
// are redacted.
// Usage: node inventory.mjs --agent <id> [--project <dir>]   (default project: current directory)
// Agent ids: claude-code, codex, gemini-cli, antigravity-cli, cursor, copilot-cli, opencode, windsurf
import { execFileSync } from "node:child_process";
import { existsSync, lstatSync, readdirSync, readFileSync, readlinkSync, realpathSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";

const HOME = homedir();
const arg = (name) => { const i = process.argv.indexOf(name); return i > -1 ? process.argv[i + 1] : undefined; };
const PROJECT = resolve(arg("--project") || process.cwd());
const XDG_CONFIG = process.env.XDG_CONFIG_HOME || join(HOME, ".config");
const XDG_STATE = process.env.XDG_STATE_HOME || join(HOME, ".local", "state");
const h = (...p) => join(HOME, ...p);
const p = (...x) => join(PROJECT, ...x);

// ---------------------------------------------------------------- agent table
// Edit here when an agent adds or moves a path. `mcp` entries: [file, format, key-path].
const AGENTS = [
  {
    id: "claude-code", bin: "claude", npm: "@anthropic-ai/claude-code",
    dirs: [h(".claude")],
    mcp: [[h(".claude.json"), "json", "mcpServers"], [h(".claude.json"), "claude-projects", null], [p(".mcp.json"), "json", "mcpServers"]],
    skills: [h(".claude", "skills"), p(".claude", "skills")],
    commands: [h(".claude", "commands"), p(".claude", "commands")],
    subagents: [h(".claude", "agents"), p(".claude", "agents")],
    settings: [h(".claude", "settings.json"), p(".claude", "settings.json"), p(".claude", "settings.local.json")],
    instructions: [h(".claude", "CLAUDE.md"), p("CLAUDE.md"), p(".claude", "CLAUDE.md"), p("CLAUDE.local.md"), p("AGENTS.md")],
    models: [[h(".claude", "settings.json"), "model"], [p(".claude", "settings.json"), "model"], [p(".claude", "settings.local.json"), "model"]],
    modelEnv: ["ANTHROPIC_MODEL", "ANTHROPIC_DEFAULT_OPUS_MODEL", "ANTHROPIC_DEFAULT_SONNET_MODEL", "ANTHROPIC_DEFAULT_HAIKU_MODEL", "ANTHROPIC_SMALL_FAST_MODEL"],
    plugins: "claude",
  },
  {
    id: "codex", bin: "codex", npm: "@openai/codex",
    dirs: [h(".codex")],
    mcp: [[h(".codex", "config.toml"), "toml", "mcp_servers"], [p(".codex", "config.toml"), "toml", "mcp_servers"]],
    // ~/.codex/skills is legacy; current Codex reads the shared .agents/skills dirs.
    skills: [h(".codex", "skills"), p(".codex", "skills")],
    readsShared: true,
    // Custom prompts are deprecated in favour of skills.
    commands: [h(".codex", "prompts")],
    settings: [h(".codex", "config.toml"), h(".codex", "hooks.json"), p(".codex", "hooks.json")],
    instructions: [h(".codex", "AGENTS.md"), p("AGENTS.md")],
    models: [[h(".codex", "config.toml"), "model"]],
    modelEnv: ["OPENAI_MODEL"],
  },
  {
    id: "gemini-cli", bin: "gemini", npm: "@google/gemini-cli",
    dirs: [h(".gemini")],
    mcp: [[h(".gemini", "settings.json"), "json", "mcpServers"], [p(".gemini", "settings.json"), "json", "mcpServers"]],
    skills: [h(".gemini", "skills"), p(".gemini", "skills")],
    readsShared: true,
    extensions: [h(".gemini", "extensions"), p(".gemini", "extensions")],
    commands: [h(".gemini", "commands"), p(".gemini", "commands")],
    settings: [h(".gemini", "settings.json"), p(".gemini", "settings.json")],
    instructions: [h(".gemini", "GEMINI.md"), p("GEMINI.md")],
    models: [[h(".gemini", "settings.json"), "model.name"], [p(".gemini", "settings.json"), "model.name"]],
    modelEnv: ["GEMINI_MODEL"],
  },
  {
    id: "cursor", bin: "cursor-agent", altBins: ["agent", "cursor"],
    dirs: [h(".cursor")],
    mcp: [[h(".cursor", "mcp.json"), "json", "mcpServers"], [p(".cursor", "mcp.json"), "json", "mcpServers"]],
    skills: [h(".cursor", "skills"), p(".cursor", "skills")],
    readsShared: true,
    // Cursor also loads skills from other agents' dirs.
    compatSkills: [h(".claude", "skills"), p(".claude", "skills"), h(".codex", "skills"), p(".codex", "skills")],
    commands: [h(".cursor", "commands"), p(".cursor", "commands")],
    settings: [h(".cursor", "cli-config.json"), h(".cursor", "hooks.json"), p(".cursor", "hooks.json")],
    instructions: [p(".cursorrules"), p(".cursor", "rules"), p("AGENTS.md")],
  },
  {
    id: "copilot-cli", bin: "copilot", npm: "@github/copilot",
    dirs: [h(".copilot")],
    mcp: [[h(".copilot", "mcp-config.json"), "json", "mcpServers"], [p(".github", "mcp.json"), "json", "mcpServers"]],
    skills: [h(".copilot", "skills"), p(".github", "skills")],
    readsShared: true,
    compatSkills: [p(".claude", "skills")],
    settings: [h(".copilot", "config.json"), h(".copilot", "settings.json"), p(".github", "copilot", "settings.json"), p(".github", "copilot", "settings.local.json")],
    instructions: [h(".copilot", "copilot-instructions.md"), p(".github", "copilot-instructions.md"), p("AGENTS.md")],
  },
  {
    id: "opencode", bin: "opencode", npm: "opencode-ai",
    dirs: [join(XDG_CONFIG, "opencode")],
    mcp: [
      [join(XDG_CONFIG, "opencode", "opencode.json"), "json", "mcp"], [join(XDG_CONFIG, "opencode", "opencode.jsonc"), "json", "mcp"],
      [p("opencode.json"), "json", "mcp"], [p("opencode.jsonc"), "json", "mcp"],
      [p(".opencode", "opencode.json"), "json", "mcp"], [p(".opencode", "opencode.jsonc"), "json", "mcp"],
    ],
    skills: [join(XDG_CONFIG, "opencode", "skills"), p(".opencode", "skills")],
    readsShared: true,
    compatSkills: [h(".claude", "skills"), p(".claude", "skills")],
    commands: [join(XDG_CONFIG, "opencode", "commands"), p(".opencode", "commands")],
    subagents: [join(XDG_CONFIG, "opencode", "agents"), p(".opencode", "agents")],
    settings: [join(XDG_CONFIG, "opencode", "opencode.json"), join(XDG_CONFIG, "opencode", "opencode.jsonc"), p("opencode.json"), p("opencode.jsonc")],
    instructions: [join(XDG_CONFIG, "opencode", "AGENTS.md"), p("AGENTS.md")],
    models: [[join(XDG_CONFIG, "opencode", "opencode.json"), "model"], [join(XDG_CONFIG, "opencode", "opencode.json"), "small_model"],
      [join(XDG_CONFIG, "opencode", "opencode.jsonc"), "model"], [join(XDG_CONFIG, "opencode", "opencode.jsonc"), "small_model"],
      [p("opencode.json"), "model"], [p("opencode.jsonc"), "model"]],
  },
  {
    // Antigravity CLI replaced Gemini CLI for unpaid-tier users (2026-06).
    id: "antigravity-cli", bin: "agy",
    dirs: [],
  },
  {
    id: "windsurf", bin: "windsurf",
    dirs: [h(".codeium", "windsurf")],
    mcp: [[h(".codeium", "windsurf", "mcp_config.json"), "json", "mcpServers"]],
    skills: [h(".codeium", "windsurf", "skills"), p(".windsurf", "skills")],
  },
];
// Shared skill directories used by the `skills` CLI and several agents (`readsShared`).
const SHARED_SKILL_DIRS = [h(".agents", "skills"), p(".agents", "skills")];
const SKILL_LOCKS = [join(XDG_STATE, "skills", ".skill-lock.json"), h(".agents", ".skill-lock.json"), p("skills-lock.json")];
const LEFTOVER_RE = /(\.bak[^/]*|\.old|\.orig|\.save|~|\.tmp|\.swp)$|\.json\.\d+\.[0-9a-f-]+\.tmp$/i;

// ---------------------------------------------------------------- helpers
const exists = (f) => { try { return existsSync(f); } catch { return false; } };
const isDir = (f) => { try { return statSync(f).isDirectory(); } catch { return false; } };
const tilde = (f) => (f && typeof f === "string" && f.toLowerCase().startsWith(HOME.toLowerCase()) ? "~" + f.slice(HOME.length) : f);

const WIN = process.platform === "win32";

// On Windows, npm-installed CLIs are .cmd shims that only run through a shell. Only fixed, known command names and
// flags reach this function, so running them through the shell is safe.
function run(cmd, args, timeout = 8000) {
  try {
    return execFileSync(cmd, args, { encoding: "utf8", timeout, stdio: ["ignore", "pipe", "pipe"], shell: WIN, windowsHide: true }).trim();
  } catch {
    return null;
  }
}
const which = (bin) => {
  const out = WIN ? run("where", [bin]) : run("which", ["-a", bin]);
  return out ? [...new Set(out.split(/\r?\n/).map((s) => s.trim()).filter(Boolean))] : [];
};
// "npx.cmd" → "npx", "C:\\...\\uvx.exe" → "uvx"
const cmdName = (c) => basename(String(c)).replace(/\.(cmd|exe|bat|ps1)$/i, "").toLowerCase();

function stripJsonc(text) {
  let out = "", inStr = false, esc = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i], n = text[i + 1];
    if (inStr) { out += c; if (esc) esc = false; else if (c === "\\") esc = true; else if (c === '"') inStr = false; continue; }
    if (c === '"') { inStr = true; out += c; continue; }
    if (c === "/" && n === "/") { while (i < text.length && text[i] !== "\n") i++; out += "\n"; continue; }
    if (c === "/" && n === "*") { i += 2; while (i < text.length && !(text[i] === "*" && text[i + 1] === "/")) i++; i++; continue; }
    out += c;
  }
  return out.replace(/,(\s*[}\]])/g, "$1");
}
function readJson(f) {
  try { return JSON.parse(stripJsonc(readFileSync(f, "utf8"))); } catch { return undefined; }
}

// Minimal TOML reader for [mcp_servers.<name>] tables: string, bool, number, and string-array values.
function readTomlTables(f, prefix) {
  let text;
  try { text = readFileSync(f, "utf8"); } catch { return undefined; }
  const tables = {};
  let current = null;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.replace(/\s+#.*$/, "").trim();
    if (!line || line.startsWith("#")) continue;
    const t = line.match(/^\[([^\]]+)\]$/);
    if (t) {
      const path = t[1].split(".").map((s) => s.trim().replace(/^"|"$/g, ""));
      current = path[0] === prefix && path.length >= 2 ? (tables[path[1]] ??= {}) : null;
      if (current && path.length > 2) current = current[path.slice(2).join(".")] ??= {};
      continue;
    }
    const kv = current && line.match(/^([A-Za-z0-9_.-]+)\s*=\s*(.+)$/);
    if (!kv) continue;
    let v = kv[2].trim();
    try { v = JSON.parse(v.replace(/'/g, '"')); } catch { v = v.replace(/^["']|["']$/g, ""); }
    current[kv[1]] = v;
  }
  return tables;
}

// Args often carry credentials (`--api-key X`, `--token=X`, `Authorization: Bearer X`). Redact them, and any
// value that looks like a token, before anything is printed.
const SECRET_NAME = /(key|token|secret|password|passwd|auth|bearer|credential|pat)\b/i;
const TOKEN_LIKE = /^(sk-|ctx7sk-|ghp_|gho_|ghu_|ghs_|github_pat_|glpat-|xox[abpr]-|AKIA|AIza|ya29\.|eyJ)|^[A-Za-z0-9_\-]{32,}$/;
function redactArgs(args) {
  const a = (args || []).map(String);
  return a.map((x, i) => {
    const m = x.match(/^(--?[\w.-]+)=(.*)$/);
    if (m && SECRET_NAME.test(m[1])) return `${m[1]}=<redacted>`;
    if (i > 0 && /^--?[\w.-]+$/.test(a[i - 1]) && SECRET_NAME.test(a[i - 1])) return "<redacted>";
    if (/^(authorization|x-api-key|api-key)\s*:/i.test(x)) return x.split(":")[0] + ": <redacted>";
    if (TOKEN_LIKE.test(x) || /^Bearer\s+/i.test(x)) return "<redacted>";
    if (/^https?:\/\//.test(x)) return redactUrl(x);
    return x;
  });
}

function redactUrl(u) {
  try { const url = new URL(u); const q = url.search ? "?<redacted>" : ""; return `${url.origin}${url.pathname}${q}`; } catch { return u; }
}

// Work out what a server launches, for registry lookups.
function launchInfo(command, args = []) {
  let cmd = command ? cmdName(command) : null;
  let a = (args || []).map(String);
  // Windows configs often wrap the launcher: `cmd /c npx -y pkg`.
  if (cmd === "cmd" && /^\/c$/i.test(a[0] || "")) { cmd = cmdName(a[1] || ""); a = a.slice(2); }
  const firstPkg = (skipFlags) => a.find((x, i) => !x.startsWith("-") && !(skipFlags.includes(a[i - 1])));
  const split = (spec, registry) => {
    if (!spec) return null;
    const at = spec.lastIndexOf("@");
    const hasVer = at > 0;
    return { registry, package: hasVer ? spec.slice(0, at) : spec, pinned: hasVer ? spec.slice(at + 1) : null };
  };
  if (["npx", "bunx", "pnpx"].includes(cmd)) return split(firstPkg(["-p", "--package"]), "npm");
  if (cmd === "pnpm" && a[0] === "dlx") return split(a.slice(1).find((x) => !x.startsWith("-")), "npm");
  if (cmd === "uvx") {
    const from = a.indexOf("--from");
    const spec = from > -1 ? a[from + 1] : firstPkg(["--with", "--python", "-p"]);
    const m = spec && spec.match(/^([A-Za-z0-9_.\-[\]]+?)(?:==|@)(.+)$/);
    return m ? { registry: "pypi", package: m[1], pinned: m[2] } : spec ? { registry: "pypi", package: spec, pinned: null } : null;
  }
  if (cmd === "pipx" && a[0] === "run") return { registry: "pypi", package: a.slice(1).find((x) => !x.startsWith("-")), pinned: null };
  if (cmd === "docker" || cmd === "podman") {
    const img = a.slice(a.indexOf("run") + 1).find((x, i, arr) => !x.startsWith("-") && !["-e", "--env", "-v", "--volume", "--name", "--network", "-p"].includes(arr[i - 1]));
    if (!img) return null;
    const [name, tag] = img.split(/:(?=[^/]+$)/);
    return { registry: "container", package: name, pinned: tag || "latest" };
  }
  if (cmd === "node" || cmd === "python" || cmd === "python3" || cmd === "bun" || cmd === "deno")
    return { registry: "script", package: a.find((x) => !x.startsWith("-")) || null, pinned: null };
  return cmd ? { registry: "binary", package: cmd, pinned: null } : null;
}

function normalizeServer(name, def, source) {
  if (!def || typeof def !== "object") return null;
  // OpenCode: { type: "local", command: [bin, ...args] } | { type: "remote", url }
  let command = def.command, args = def.args;
  if (Array.isArray(command)) { args = command.slice(1); command = command[0]; }
  const url = def.url || def.httpUrl || def.serverUrl;
  const transport = def.type || def.transport || (url ? (/\/sse\/?$/.test(url) ? "sse?" : "http") : "stdio");
  const relative = command ? /^\.\.?[\\/]/.test(String(command)) : false;
  const binPath = command && !relative ? which(String(command))[0] || (exists(String(command)) ? String(command) : null) : null;
  const launch = command ? launchInfo(command, args) : null;
  if (launch?.pinned && TOKEN_LIKE.test(launch.pinned)) launch.pinned = "<redacted>";
  return {
    name, source: tilde(source),
    transport,
    command: command ?? null,
    args: redactArgs(args),
    secretInArgs: redactArgs(args).some((x) => x.includes("<redacted>")) || undefined,
    url: url ? redactUrl(url) : null,
    launch,
    // Relative commands resolve against the agent's working directory, so they cannot be checked from here.
    commandOnPath: command ? (relative ? "relative-path" : Boolean(binPath)) : null,
    disabled: def.disabled === true || def.enabled === false || undefined,
    envKeys: Object.keys(def.env || def.environment || {}),
    headerKeys: Object.keys(def.headers || def.http_headers || {}),
  };
}

function collectMcp(agent) {
  const out = [];
  for (const [file, format, key] of agent.mcp || []) {
    if (!exists(file)) continue;
    if (format === "toml") {
      const tables = readTomlTables(file, key) || {};
      for (const [n, d] of Object.entries(tables)) out.push(normalizeServer(n, d, file));
    } else if (format === "claude-projects") {
      const projects = readJson(file)?.projects || {};
      for (const [dir, cfg] of Object.entries(projects)) {
        for (const [n, d] of Object.entries(cfg?.mcpServers || {}))
          out.push({ ...normalizeServer(n, d, file), scope: `project ${tilde(dir)}`, projectExists: isDir(dir) });
      }
    } else {
      const data = readJson(file);
      if (data === undefined) { out.push({ source: tilde(file), error: "unparseable" }); continue; }
      let servers = data?.[key] || {};
      // OpenCode 2 nests servers: { "mcp": { "servers": { ... } } }
      if (servers.servers && typeof servers.servers === "object" && !servers.servers.command && !servers.servers.url) servers = servers.servers;
      for (const [n, d] of Object.entries(servers)) out.push(normalizeServer(n, d, file));
    }
  }
  return out.filter(Boolean);
}

function frontmatter(file) {
  try {
    const m = readFileSync(file, "utf8").match(/^---\r?\n([\s\S]*?)\r?\n---/);
    if (!m) return null;
    const fm = {};
    for (const line of m[1].split(/\r?\n/)) {
      const kv = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
      if (kv) fm[kv[1]] = kv[2].replace(/^["']|["']$/g, "").trim();
    }
    return fm;
  } catch { return null; }
}

function collectSkills(dirs, owner) {
  const out = [];
  for (const dir of dirs) {
    if (!isDir(dir)) continue;
    for (const entry of readdirSync(dir)) {
      if (entry.startsWith(".")) continue;
      const full = join(dir, entry);
      let link = null, broken = false;
      try {
        if (lstatSync(full).isSymbolicLink()) { link = readlinkSync(full); try { realpathSync(full); } catch { broken = true; } }
      } catch { continue; }
      if (!broken && !isDir(full)) continue;
      const skillMd = join(full, "SKILL.md");
      const fm = broken ? null : frontmatter(skillMd);
      out.push({
        dir: tilde(full), owner,
        symlinkTo: link ? tilde(resolve(dir, link)) : undefined,
        brokenSymlink: broken || undefined,
        hasSkillMd: broken ? false : exists(skillMd),
        name: fm?.name, descriptionChars: fm?.description?.length,
        version: fm?.version, isGitCheckout: exists(join(full, ".git")) || undefined,
        // Nested skill folders (a dir of skills) are listed, not recursed.
        nested: !broken && !exists(skillMd) && isDir(full) ? readdirSync(full).filter((x) => exists(join(full, x, "SKILL.md"))) : undefined,
      });
    }
  }
  return out;
}

function listDir(dirs) {
  const out = [];
  for (const d of dirs || []) if (isDir(d)) for (const e of readdirSync(d)) if (!e.startsWith(".")) out.push(tilde(join(d, e)));
  return out;
}

function hookCommands(settingsFile) {
  const s = readJson(settingsFile);
  if (!s) return [];
  const out = [];
  for (const [event, groups] of Object.entries(s.hooks || {})) {
    for (const g of Array.isArray(groups) ? groups : [groups]) {
      for (const hk of g?.hooks || (g?.command ? [g] : [])) if (hk?.command) out.push({ event, command: hk.command });
    }
  }
  if (s.statusLine?.command) out.push({ event: "statusLine", command: s.statusLine.command });
  return out.map((x) => ({ ...x, source: tilde(settingsFile) }));
}

function executableOf(command) {
  const first = String(command).trim().match(/^"([^"]+)"|^'([^']+)'|^(\S+)/);
  const bin = first ? first[1] || first[2] || first[3] : null;
  if (!bin) return null;
  const expandHome = (s) => s.replace(/^~(?=[\\/])/, HOME).replace(/\$HOME|\$\{HOME\}|%USERPROFILE%|\$env:USERPROFILE/gi, HOME);
  const expanded = expandHome(bin);
  if (["bash", "sh", "zsh", "node", "python", "python3", "py", "bun", "deno", "npx", "uvx", "powershell", "pwsh", "cmd"].includes(cmdName(expanded))) {
    const script = String(command).split(/\s+/).slice(1).find((x) => !x.startsWith("-") && !/^\/c$/i.test(x));
    return { bin: cmdName(expanded), script: script ? tilde(expandHome(script.replace(/^["']|["']$/g, ""))) : null };
  }
  return { bin: expanded };
}

function modelSettings(agent) {
  const out = [];
  const add = (source, model) => model && typeof model !== "object" && out.push({ source: tilde(source), model: String(model) });
  for (const [f, key] of agent.models || []) {
    if (!exists(f)) continue;
    if (f.endsWith(".toml")) {
      try { const m = readFileSync(f, "utf8").match(new RegExp(`^${key}\\s*=\\s*["']([^"']+)["']`, "m")); if (m) add(f, m[1]); } catch {}
    } else {
      add(f, key.split(".").reduce((o, k) => (o == null ? o : o[k]), readJson(f)));
    }
  }
  for (const k of agent.modelEnv || []) if (process.env[k]) out.push({ source: `env ${k}`, model: process.env[k] });
  return out;
}

// Leftover backup/temp files. Many files sharing one pattern (e.g. crashed atomic writes) collapse into one entry.
function leftovers(dirs) {
  const groups = new Map();
  for (const d of new Set(dirs)) {
    if (!isDir(d)) continue;
    for (const e of readdirSync(d)) {
      if (!LEFTOVER_RE.test(e)) continue;
      const f = join(d, e);
      let st;
      try { st = statSync(f); } catch { continue; }
      if (!st.isFile()) continue;
      const pattern = join(d, e.replace(/\.\d+\.[0-9a-f-]{8,}\.tmp$/i, ".*.tmp"));
      const g = groups.get(pattern) || { file: tilde(pattern), count: 0, bytes: 0, oldest: null, newest: null };
      const day = st.mtime.toISOString().slice(0, 10);
      g.count++; g.bytes += st.size;
      g.oldest = !g.oldest || day < g.oldest ? day : g.oldest;
      g.newest = !g.newest || day > g.newest ? day : g.newest;
      groups.set(pattern, g);
    }
  }
  return [...groups.values()].map((g) => (g.count === 1 ? { file: g.file, modified: g.newest, bytes: g.bytes } : g));
}

// ---------------------------------------------------------------- scan
// Scope: the agent running keepup. Claude Code marks its child processes with CLAUDECODE=1; other agents pass --agent.
const agentId = arg("--agent") || (process.env.CLAUDECODE ? "claude-code" : null);
const agent = AGENTS.find((a) => a.id === agentId);
if (!agent) {
  process.stderr.write(`keepup inventory: ${agentId ? `unknown agent "${agentId}"` : "missing --agent"}. ` +
    `Pass the agent running keepup: --agent ${AGENTS.map((a) => a.id).join("|")}\n`);
  process.exit(2);
}

let bin = agent.bin;
let paths = which(bin);
for (const alt of agent.altBins || []) { if (paths.length) break; paths = which(alt); bin = alt; }
const version = paths.length ? run(bin, ["--version"], 10000) : null;

// Skills this agent loads: its own dirs, the shared .agents/skills dirs when it reads them, and other agents' dirs it
// also loads. A skill reached through several dirs is listed under each; that is itself a finding (duplicate load).
const ownSkills = collectSkills(agent.skills || [], "own");
const sharedSkills = agent.readsShared ? collectSkills(SHARED_SKILL_DIRS, "shared") : [];
const compatSkills = collectSkills(agent.compatSkills || [], "compat");
const skills = [...ownSkills, ...sharedSkills, ...compatSkills];
const visibleNames = new Set(skills.map((x) => x.name || basename(x.dir)));
// Skills symlinked into the shared dir are managed through it even when the agent does not read it directly.
const linksShared = ownSkills.some((x) => x.symlinkTo && /[\\/]\.agents[\\/]skills[\\/]/.test(x.symlinkTo));

const hooks = (agent.settings || []).filter((f) => f.endsWith(".json")).flatMap(hookCommands);
const mcpServers = collectMcp(agent);

const result = {
  generatedAt: new Date().toISOString(),
  platform: `${process.platform} ${process.arch}`,
  project: tilde(PROJECT),
  agent: {
    id: agent.id,
    detectedFrom: arg("--agent") ? "--agent" : "env CLAUDECODE",
    binaries: paths.map(tilde),
    duplicateInstalls: paths.length > 1 || undefined,
    version: version ? version.split("\n")[0] : null,
    npmPackage: agent.npm,
    configDirs: (agent.dirs || []).filter(isDir).map(tilde),
    settingsFiles: (agent.settings || []).filter(exists).map((f) => ({ file: tilde(f), parses: f.endsWith(".toml") || readJson(f) !== undefined })),
    instructionFiles: [...new Set((agent.instructions || []).filter(exists).map(tilde))],
    models: modelSettings(agent),
  },
  mcpServers,
  skills,
  skillLocks: [],
  plugins: null,
  extensions: listDir(agent.extensions),
  commands: listDir(agent.commands),
  subagents: listDir(agent.subagents),
  hooks: [],
  helperCommands: [],
  runtimes: {},
  leftoverFiles: [],
  // Other agents found on the machine are out of scope; keepup runs inside each one separately.
  otherAgents: AGENTS.filter((a) => a !== agent && (which(a.bin).length || (a.dirs || []).some(isDir))).map((a) => a.id),
};

for (const [name, args] of [["node", ["--version"]], ["npm", ["--version"]], ["uv", ["--version"]], ["pipx", ["--version"]], ["docker", ["--version"]], ["brew", ["--version"]], ["gh", ["--version"]], ["git", ["--version"]]]) {
  const v = run(name, args, 5000);
  result.runtimes[name] = v ? v.split("\n")[0] : null;
}

// Lock entries only for skills this agent can see.
if (agent.readsShared || linksShared) {
  for (const f of SKILL_LOCKS) {
    const lock = readJson(f);
    if (!lock) continue;
    const entries = Object.entries(lock.skills || {}).filter(([n]) => visibleNames.has(n));
    if (entries.length) result.skillLocks.push({
      file: tilde(f), version: lock.version,
      skills: entries.map(([n, s]) => ({ name: n, source: s.source, sourceType: s.sourceType, updatedAt: s.updatedAt })),
    });
  }
}

const cpDir = h(".claude", "plugins");
if (agent.plugins === "claude" && isDir(cpDir)) {
  const installed = readJson(join(cpDir, "installed_plugins.json"));
  const markets = readJson(join(cpDir, "known_marketplaces.json"));
  const enabled = readJson(h(".claude", "settings.json"))?.enabledPlugins || {};
  result.plugins = {
    installed: Object.entries(installed?.plugins || {}).map(([id, entries]) => ({
      id,
      enabled: enabled[id],
      installs: (Array.isArray(entries) ? entries : [entries]).map((e) => ({ scope: e.scope, version: e.version, gitCommitSha: e.gitCommitSha?.slice(0, 12), lastUpdated: e.lastUpdated, projectPath: tilde(e.projectPath) })),
    })),
    enabledButNotInstalled: Object.keys(enabled).filter((id) => enabled[id] && !(installed?.plugins || {})[id]),
    marketplaces: Object.entries(markets || {}).map(([n, m]) => ({ name: n, source: m?.source?.repo || m?.source?.url || m?.source?.path || m?.source?.source, lastUpdated: m?.lastUpdated })),
  };
}

// Helper executables called by this agent's hooks, status line, and stdio MCP servers.
const helpers = new Map();
const addHelper = (bin, usedBy) => {
  if (!bin) return;
  const entry = helpers.get(bin) || { bin: tilde(bin), path: null, onPath: false, usedBy: [] };
  if (/^\.\.?[\\/]/.test(bin)) {
    // Resolved against the agent's working directory; cannot be checked from here.
    entry.onPath = "relative-path";
  } else {
    const resolved = /[\\/]/.test(bin) ? (exists(bin) ? bin : null) : which(bin)[0] || null;
    entry.path = resolved ? tilde(resolved) : null;
    entry.onPath = Boolean(resolved);
  }
  if (!entry.usedBy.includes(usedBy)) entry.usedBy.push(usedBy);
  helpers.set(bin, entry);
};
for (const hk of hooks) {
  const ex = executableOf(hk.command);
  if (!ex) continue;
  addHelper(ex.bin, `${hk.event} hook (${hk.source})`);
  if (ex.script && /[\\/]/.test(ex.script)) result.helperCommands.push({ script: ex.script, exists: exists(ex.script.replace(/^~/, HOME)), usedBy: `${hk.event} hook (${hk.source})` });
}
for (const s of mcpServers) if (s.command) addHelper(String(s.command), `MCP ${s.name} (${s.source})`);
result.helperCommands.unshift(...helpers.values());
// Hook commands can carry secrets inline; keep only the event, source, and executable.
result.hooks = hooks.map(({ event, command, source }) => ({ event, source, executable: executableOf(command)?.bin ? tilde(executableOf(command).bin) : null }));

// Leftover files in this agent's own config dirs (and its project dirs).
const projectDirs = [...(agent.settings || []), ...(agent.mcp || []).map((m) => m[0])]
  .filter((f) => f.startsWith(PROJECT)).map(dirname);
result.leftoverFiles = leftovers([
  ...(agent.dirs || []).flatMap((d) => [d, join(d, "skills"), join(d, "plugins")]),
  ...(agent.readsShared || linksShared ? [h(".agents")] : []),
  ...projectDirs.filter((d) => d !== PROJECT),
]);

process.stdout.write(JSON.stringify(result, (k, v) => (v === undefined ? undefined : v), 2) + "\n");
