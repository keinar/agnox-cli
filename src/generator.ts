import { writeFile, stat } from "node:fs/promises";
import { join } from "node:path";
import * as p from "@clack/prompts";
import pc from "picocolors";
import {
    DOCKERIGNORE,
    PLAYWRIGHT_DOCKERFILE,
    PLAYWRIGHT_ENTRYPOINT,
    PYTEST_DOCKERFILE,
    PYTEST_ENTRYPOINT,
} from "./templates.js";

/** Supported automation frameworks. */
export type Framework = "playwright" | "pytest";

/** A single file to be generated. */
interface FileSpec {
    name: string;
    content: string;
    /** Octal permission mode (e.g. 0o755 for executable). */
    mode: number;
}

/**
 * Returns the ordered list of files to generate for the given framework.
 */
function getFiles(framework: Framework): FileSpec[] {
    const isPlaywright = framework === "playwright";

    return [
        { name: ".dockerignore", content: DOCKERIGNORE, mode: 0o644 },
        {
            name: "entrypoint.sh",
            content: isPlaywright ? PLAYWRIGHT_ENTRYPOINT : PYTEST_ENTRYPOINT,
            mode: 0o755,
        },
        {
            name: "Dockerfile",
            content: isPlaywright ? PLAYWRIGHT_DOCKERFILE : PYTEST_DOCKERFILE,
            mode: 0o644,
        },
    ];
}

/**
 * Checks whether a file exists at the given absolute path.
 */
async function fileExists(path: string): Promise<boolean> {
    try {
        await stat(path);
        return true;
    } catch {
        return false;
    }
}

/**
 * Enforces strict LF line endings — prevents Docker "bad interpreter" crashes
 * when the CLI runs on Windows.
 */
function enforceLF(content: string): string {
    return content.replace(/\r\n/g, "\n");
}

/**
 * Generates AAC integration files in the target directory.
 * Handles conflict detection, interactive overwrite prompts, and LF enforcement.
 */
export async function generate(
    framework: Framework,
    targetDir: string
): Promise<void> {
    const files = getFiles(framework);
    const skipped = new Set<string>();

    // Detect conflicts and prompt for each.
    for (const file of files) {
        const fullPath = join(targetDir, file.name);
        if (await fileExists(fullPath)) {
            const overwrite = await p.confirm({
                message: `File ${pc.yellow(file.name)} already exists. Overwrite?`,
            });

            if (p.isCancel(overwrite)) {
                p.cancel("Operation cancelled.");
                process.exit(0);
            }

            if (!overwrite) {
                skipped.add(file.name);
            }
        }
    }

    // Abort gracefully if every file was skipped.
    if (skipped.size === files.length) {
        p.log.warn("All files were skipped. No changes were made.");
        return;
    }

    // Write files.
    const written: string[] = [];

    for (const file of files) {
        if (skipped.has(file.name)) continue;

        const fullPath = join(targetDir, file.name);
        const content = enforceLF(file.content);

        await writeFile(fullPath, content, { mode: file.mode });
        written.push(file.name);
    }

    // Print results.
    for (const name of written) {
        p.log.success(`Created ${pc.green(name)}`);
    }

    // Print next steps.
    p.note(
        [
            `${pc.bold("1.")} docker build -t your-username/my-automation-tests:latest .`,
            `${pc.bold("2.")} docker push your-username/my-automation-tests:latest`,
            `${pc.bold("3.")} Enter this image name in the AAC Dashboard.`,
        ].join("\n"),
        `${pc.green("✅")} Next steps to connect your project to the AAC`
    );
}
