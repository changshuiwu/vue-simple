// import { execa } from "execa";
// import fs from "fs";
const fs = require("fs");
// const execa = import("execa");
const execa = require("execa");

async function build(target) {
  await execa("rollup", ["-cw", "--environment", `TARGET:${target}`], {
    stdio: "inherit",
  });
}
const target = `reactivity`;
build(target);
