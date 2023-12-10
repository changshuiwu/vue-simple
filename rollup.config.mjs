// import path from "path";
import jsonPlugin from "@rollup/plugin-json";
import resolvePlugin from "@rollup/plugin-node-resolve";
import ts from "rollup-plugin-typescript2";
import { fileURLToPath, URL } from "node:url";
import { createRequire } from "node:module";

const resolve = (path) =>
  fileURLToPath(
    new URL(`packages/${process.env.TARGET}/${path}`, import.meta.url)
  );

const pkg = resolve("package.json");

const require = createRequire(import.meta.url);

const json = require(pkg);

const outputOptions = {
  "esm-bundler": {
    file: resolve(`dist/${process.env.TARGET}.esm-bundler.js`),
    format: "es",
  },
  cjs: {
    file: resolve(`dist/${process.env.TARGET}.js`),
    format: "cjs",
  },
  global: {
    file: resolve(`dist/${process.env.TARGET}.global.js`),
    format: "iife",
  },
};

const options = json.buildOptions;

function createConfig(format, output) {
  output.name = options.name;
  output.sourcemap = true;

  return {
    input: resolve("src/index.ts"),
    output,
    plugins: [
      jsonPlugin(),
      ts({
        tsconfig: fileURLToPath(new URL("tsconfig.json", import.meta.url)),
      }),
      resolvePlugin(),
    ],
  };
}
export default options.formats.map((format) =>
  createConfig(format, outputOptions[format])
);
