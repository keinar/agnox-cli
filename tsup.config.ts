import { readFileSync } from "node:fs";
import { defineConfig } from "tsup";

const { version } = JSON.parse(readFileSync("./package.json", "utf-8")) as { version: string };

export default defineConfig({
    entry: ["src/index.ts"],
    format: ["cjs"],
    target: "node20",
    minify: true,
    clean: true,
    define: {
        __AGNOX_CLI_VERSION__: JSON.stringify(version),
    },
    banner: {
        js: "#!/usr/bin/env node",
    },
});
