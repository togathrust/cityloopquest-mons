#!/usr/bin/env node
/** Lit netlify.site.json ou .netlify/state.json et lance netlify deploy --prod. */
import { spawnSync } from "node:child_process";
import fs from "node:fs";

function readSiteId() {
  if (process.env.NETLIFY_SITE_ID) return process.env.NETLIFY_SITE_ID;
  for (const file of ["netlify.site.json", ".netlify/state.json"]) {
    if (!fs.existsSync(file)) continue;
    const data = JSON.parse(fs.readFileSync(file, "utf8"));
    if (data.siteId) return data.siteId;
  }
  return null;
}

const siteId = readSiteId();
const args = ["deploy", "--prod", "--dir=dist", "--no-build"];
if (siteId) args.push("--site", siteId);

const result = spawnSync("netlify", args, { stdio: "inherit", shell: true });
process.exit(result.status ?? 1);
