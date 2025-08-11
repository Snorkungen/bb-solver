import { readFileSync, writeFileSync } from "fs"

const file = readFileSync("./index.html", "utf-8");
const lines = file.split("\n");
let i = lines.findIndex(line => /^\s*import.*\".\/index.mjs\"/.test(line));

lines[i] = readFileSync("./index.mjs", "utf-8");

writeFileSync("./index.concat.html", lines.join("\n"), "utf-8");