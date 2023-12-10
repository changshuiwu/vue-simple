// import { execa } from "execa";
// import fs from "fs";
const fs = require("fs");
// const execa = import("execa");
const execa = require("execa");

const targets = fs
  .readdirSync("packages")
  .filter((f) => fs.statSync(`packages/${f}`).isDirectory());

async function build(target) {
  await execa("rollup", ["-c", "--environment", `TARGET:${target}`], {
    stdio: "inherit",
  });
}

function run(targets, iteratorFn) {
  const ret = [];
  for (const target of targets) {
    const p = iteratorFn(target);
    ret.push(p);
  }
  return Promise.all(ret);
}
run(targets, build);
