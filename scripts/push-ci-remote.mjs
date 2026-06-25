#!/usr/bin/env node
/**
 * Pousse main vers le dépôt CI Netlify (remote cityloopquest par défaut).
 * Usage: node scripts/push-ci-remote.mjs [remoteName]
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";

const remote = process.argv[2] || "cityloopquest";
let ciRepo = null;
if (fs.existsSync("netlify.site.json")) {
  const data = JSON.parse(fs.readFileSync("netlify.site.json", "utf8"));
  ciRepo = data.ciRepo || null;
}

const remotes = spawnSync("git", ["remote"], { encoding: "utf8" }).stdout.split(/\r?\n/).filter(Boolean);
if (!remotes.includes(remote)) {
  if (!ciRepo) {
    console.error(`Remote "${remote}" absent et ciRepo non défini dans netlify.site.json.`);
    process.exit(1);
  }
  const url = `https://github.com/${ciRepo}.git`;
  const add = spawnSync("git", ["remote", "add", remote, url], { stdio: "inherit" });
  if (add.status !== 0) process.exit(add.status ?? 1);
  console.log(`Remote ${remote} → ${url}`);
}

const push = spawnSync("git", ["push", remote, "main", "--force-with-lease"], { stdio: "inherit" });
process.exit(push.status ?? 1);
