import { defineConfig, Options } from "tsup";

export default defineConfig((options: Options) => ({
  entry: {
    index: "src/components/index.ts",
    extensions: "src/extensions/index.ts",
    plugins: "src/plugins/index.ts",
  },
  banner: {
    js: "'use client'",
  },
  format: ["cjs", "esm"],
  dts: true,
  clean: true,
  external: ["react"],
  injectStyle: true,
  ...options,
}));
