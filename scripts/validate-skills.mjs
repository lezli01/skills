#!/usr/bin/env node
// Validates every skills/<name>/ folder: SKILL.md frontmatter against the Agent Skills spec
// (https://agentskills.io/specification), a per-skill README.md, and a link from the root
// README. No dependencies.
import { readdirSync, readFileSync, existsSync, statSync } from "node:fs";
import { extname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
// Skills must run on Windows, macOS, and Linux: helper scripts are Node.js (or Python), never shell-specific.
const SHELL_SCRIPT_EXT = new Set([".sh", ".bash", ".zsh", ".fish", ".ps1", ".bat", ".cmd"]);
function walk(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? walk(join(dir, e.name)) : [join(dir, e.name)],
  );
}
const SKILLS_DIR = join(ROOT, "skills");
const NAME_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

function parseFrontmatter(text) {
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!match) return null;
  const fields = {};
  for (const line of match[1].split(/\r?\n/)) {
    const kv = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (kv) fields[kv[1]] = kv[2].replace(/^["']|["']$/g, "").trim();
  }
  return fields;
}

const rootReadme = readFileSync(join(ROOT, "README.md"), "utf8");
const errors = [];
const dirs = existsSync(SKILLS_DIR)
  ? readdirSync(SKILLS_DIR).filter(
      (d) => !d.startsWith(".") && statSync(join(SKILLS_DIR, d)).isDirectory(),
    )
  : [];

for (const dir of dirs) {
  const file = join(SKILLS_DIR, dir, "SKILL.md");
  const where = `skills/${dir}/SKILL.md`;
  if (!existsSync(file)) {
    errors.push(`${where}: missing`);
    continue;
  }
  const fm = parseFrontmatter(readFileSync(file, "utf8"));
  if (!fm) {
    errors.push(`${where}: missing YAML frontmatter`);
    continue;
  }
  const { name, description } = fm;
  if (!name) errors.push(`${where}: missing \`name\``);
  else {
    if (!NAME_RE.test(name)) errors.push(`${where}: \`name\` must be lowercase letters, digits, and single hyphens`);
    if (name.length > 64) errors.push(`${where}: \`name\` exceeds 64 characters`);
    if (name !== dir) errors.push(`${where}: \`name\` "${name}" must equal folder name "${dir}"`);
  }
  if (!description) errors.push(`${where}: missing \`description\``);
  else if (description.length > 1024) errors.push(`${where}: \`description\` exceeds 1024 characters`);

  if (!existsSync(join(SKILLS_DIR, dir, "README.md")))
    errors.push(`skills/${dir}/README.md: missing (each skill documents itself for humans)`);
  if (!new RegExp(`\\]\\(\\.?/?skills/${dir}/?(README\\.md)?\\)`).test(rootReadme))
    errors.push(`README.md: Skills table has no link to skills/${dir}/`);
  for (const f of walk(join(SKILLS_DIR, dir)))
    if (SHELL_SCRIPT_EXT.has(extname(f).toLowerCase()))
      errors.push(`${relative(ROOT, f).replace(/\\/g, "/")}: shell-specific script; write it in Node.js so it runs on Windows, macOS, and Linux`);
}

if (errors.length) {
  console.error(errors.map((e) => `✗ ${e}`).join("\n"));
  process.exit(1);
}
console.log(`✓ ${dirs.length} skill(s) valid`);
