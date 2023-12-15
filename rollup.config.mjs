import esbuild from 'rollup-plugin-esbuild';
import resolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import scss from "rollup-plugin-scss";
import terser from "@rollup/plugin-terser";

export default [
  // Publish Script
  {
    input: "src/index.ts",
    output: {
      file: "publish.js",
      format: "cjs",
    },
    plugins: [
      esbuild(),
      resolve({
        preferBuiltins: true,
      }),
      commonjs(),
      terser(),
    ],
  },
  // Static Source
  {
    input: "src/static/index.ts",
    output: {
      file: "static/main.js",
      format: "cjs",
    },
    plugins: [
      esbuild(),
      resolve({
        preferBuiltins: true,
      }),
      commonjs(),
      terser(),
      scss({
        fileName: "main.css",
        includePaths: ["src/static/styles"],
        watch: "src/static/styles",
        failOnError: true,
        outputStyle: "compressed",
      }),
    ],
  },
];
