#!/usr/bin/env node
// Validates every skills/<name>/SKILL.md against the Agent Skills spec
// (https://agentskills.io/specification). No dependencies.
import { readdirSync, readFileSync, existsSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname;
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
}

if (errors.length) {
  console.error(errors.map((e) => `✗ ${e}`).join("\n"));
  process.exit(1);
}
console.log(`✓ ${dirs.length} skill(s) valid`);
