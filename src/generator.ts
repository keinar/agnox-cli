import { writeFile, readFile, stat } from "node:fs/promises";
import { join } from "node:path";
import * as p from "@clack/prompts";
import pc from "picocolors";
import {
    DOCKERIGNORE,
    PLAYWRIGHT_DEFAULT_VERSION,
    playwrightDockerfile,
    PLAYWRIGHT_ENTRYPOINT,
    generatePytestDockerfile,
    generatePytestEntrypoint,
} from "./templates.js";
import { analyzePythonProject } from "./analyzer.js";

/** Supported automation frameworks. */
export type Framework = "playwright" | "pytest";

/** A single file to be generated. */
interface FileSpec {
    name: string;
    content: string;
    /** Octal permission mode (e.g. 0o755 for executable). */
    mode: number;
}

interface GenerationResult {
    files: FileSpec[];
    platforms: string[];
}

/**
 * Smartly detects the automation framework based on project markers.
 */
export async function detectFramework(dir: string): Promise<Framework | null> {
    // 1. Check for Playwright (Node.js)
    try {
        const hasPkgJson = await fileExists(join(dir, "package.json"));
        if (hasPkgJson) {
            const raw = await readFile(join(dir, "package.json"), "utf-8");
            const pkg = JSON.parse(raw);
            if (pkg.devDependencies?.["@playwright/test"] || pkg.dependencies?.["@playwright/test"]) {
                return "playwright";
            }
        }
        // Fallback: Check for config file
        if (await fileExists(join(dir, "playwright.config.ts")) || await fileExists(join(dir, "playwright.config.js"))) {
            return "playwright";
        }
    } catch (e) { /* ignore */ }

    // 2. Check for Pytest
    try {
        if (await fileExists(join(dir, "pytest.ini")) || await fileExists(join(dir, "conftest.py"))) {
            return "pytest";
        }
        // Check requirements.txt or pyproject.toml
        if (await fileExists(join(dir, "requirements.txt"))) {
            const reqs = await readFile(join(dir, "requirements.txt"), "utf-8");
            if (reqs.includes("pytest")) return "pytest";
        }
        if (await fileExists(join(dir, "pyproject.toml"))) {
            const toml = await readFile(join(dir, "pyproject.toml"), "utf-8");
            if (toml.includes("pytest")) return "pytest";
        }
    } catch (e) { /* ignore */ }

    // Add more detections here (Cypress, Puppeteer, etc.) as you expand
    return null;
}

async function getProjectName(dir: string): Promise<string> {
    try {
        const raw = await readFile(join(dir, "package.json"), "utf-8");
        const pkg = JSON.parse(raw);
        return pkg.name?.replace(/^@[^/]+\//, "") || "my-automation-project";
    } catch {
        return dir.split(/[\\/]/).pop() || "my-automation-project";
    }
}

/**
 * Detects the @playwright/test version from the project's package.json.
 * Strips semver prefixes (^, ~, >=, etc.) and returns the raw version.
 * Returns the default version if detection fails.
 */
async function detectPlaywrightVersion(dir: string): Promise<string> {
    try {
        const raw = await readFile(join(dir, "package.json"), "utf-8");
        const pkg = JSON.parse(raw) as Record<string, Record<string, string>>;
        const version =
            pkg.devDependencies?.["@playwright/test"] ??
            pkg.dependencies?.["@playwright/test"];

        if (!version) return PLAYWRIGHT_DEFAULT_VERSION;

        // Strip leading semver range characters: ^, ~, >=, =, v
        const clean = version.replace(/^[^\d]*/, "");
        return clean || PLAYWRIGHT_DEFAULT_VERSION;
    } catch {
        return PLAYWRIGHT_DEFAULT_VERSION;
    }
}

/**
 * Returns the ordered list of files to generate for the given framework.
 */
async function getFiles(
    framework: Framework,
    targetDir: string
): Promise<GenerationResult> {
    const isPlaywright = framework === "playwright";

    let dockerfile: string;
    let entrypoint: string;
    let platforms: string[] = ["linux/amd64", "linux/arm64"]; // Default multi-platform

    if (isPlaywright) {
        const version = await detectPlaywrightVersion(targetDir);
        p.log.info(
            `Detected Playwright version: ${pc.cyan("v" + version)}`
        );
        dockerfile = playwrightDockerfile(version);
        entrypoint = PLAYWRIGHT_ENTRYPOINT;
    } else {
        // --- Pytest Analysis & Smart Questions ---
        p.log.info(pc.cyan("Analyzing project structure..."));
        const analysis = await analyzePythonProject(targetDir);

        // 1. Detect/Ask Browser
        // We only care if we likely need a browser (Playwright or Selenium)
        let browser: "chromium" | "firefox" | "webkit" | null = null;

        // If it's NOT API-only, we assume we might need a browser.
        if (!analysis.isApiOnly) {
            // For now, let's ask if we detect it's NOT API-only.
            const b = await p.select({
                message: "Which browser does your test suite use?",
                options: [
                    { value: "chromium", label: "Chromium (default)" },
                    { value: "firefox", label: "Firefox" },
                    { value: "webkit", label: "Webkit" },
                    { value: "none", label: "None (API tests only)" },
                ],
                initialValue: "chromium"
            });

            if (p.isCancel(b)) {
                p.cancel("Operation cancelled.");
                process.exit(0);
            }

            if (b !== "none") {
                browser = b as "chromium" | "firefox" | "webkit";
            } else {
                // User explicitly said None, so treat as API only
                analysis.isApiOnly = true;
                analysis.hasPlaywright = false;
            }
        }

        // 2. Allure
        let useAllure = analysis.hasAllure;
        if (!useAllure) {
            const askAllure = await p.confirm({
                message: "Does your project use Allure reporting?",
            });
            if (p.isCancel(askAllure)) process.exit(0);
            useAllure = askAllure;
        }

        // 3. System Deps
        const sysDeps = await p.text({
            message: "Are there any system-level dependencies your tests need? (space separated)",
            placeholder: "e.g. ffmpeg fonts-liberation",
        });
        if (p.isCancel(sysDeps)) process.exit(0);

        const extraSystemDeps = sysDeps ? (sysDeps as string).split(" ").filter(Boolean) : [];

        // Update platforms from analysis
        if (analysis.browserConfig && analysis.browserConfig.platforms) {
            platforms = analysis.browserConfig.platforms;
        }

        // Build Confirmation Summary
        let browserSummary = browser || "none";
        // Check if detected browser channel adds info
        if (analysis.browserConfig.channel) {
            browserSummary += ` + ${analysis.browserConfig.channel} (detected --browser-channel ${analysis.browserConfig.channel})`;
        }

        // Show platform warning if needed
        let platformSummary = platforms.join(", ");
        if (analysis.browserConfig.requiresAmd64Only) {
            platformSummary += ` ${pc.yellow("(restricted by browser selection)")}`;
        }

        p.note(
            `  Base image:     ${analysis.hasPlaywright ? `mcr.microsoft.com/playwright/python:v${analysis.playwrightVersion || PLAYWRIGHT_DEFAULT_VERSION}-jammy` : `python:${analysis.pythonVersion || "3.11"}-slim`}
  Package mgr:    ${analysis.packageManager}
  Browser:        ${browserSummary}
  Allure:         ${useAllure ? "yes" : "no"}
  Platforms:      ${platformSummary}
  Extra deps:     ${extraSystemDeps.length ? extraSystemDeps.join(", ") : "none"}
  
${analysis.browserConfig.warningMessage ? `  ${pc.yellow("⚠️  " + analysis.browserConfig.warningMessage)}` : ""}`,
            "📋 Agnox will generate the following setup:"
        );

        const proceed = await p.confirm({
            message: "Proceed with these settings?",
            initialValue: true
        });

        if (p.isCancel(proceed) || !proceed) {
            p.cancel("Operation cancelled.");
            process.exit(0);
        }

        // Generate Content
        dockerfile = generatePytestDockerfile({
            pythonVersion: analysis.pythonVersion || "3.11",
            packageManager: analysis.packageManager,
            installPlaywright: analysis.hasPlaywright,
            playwrightVersion: analysis.playwrightVersion,
            browserConfig: analysis.browserConfig,
            extraSystemDeps: extraSystemDeps,
        });

        entrypoint = generatePytestEntrypoint(analysis.packageManager);
    }

    const files = [
        { name: ".dockerignore", content: DOCKERIGNORE, mode: 0o644 },
        {
            name: "entrypoint.sh",
            content: entrypoint,
            mode: 0o755,
        },
        {
            name: "Dockerfile",
            content: dockerfile,
            mode: 0o644,
        },
    ];

    return { files, platforms };
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
 * Generates Agnox integration files in the target directory.
 * Handles conflict detection, interactive overwrite prompts, and LF enforcement.
 * Returns the supported platforms for the build.
 */
export async function generate(
    framework: Framework,
    targetDir: string
): Promise<string[]> {
    const { files, platforms } = await getFiles(framework, targetDir);
    const projectName = await getProjectName(targetDir);
    const skipped = new Set<string>();


    const platformFlag = platforms.length ? ` --platform ${platforms.join(",")}` : "";
    const imageTag = `your-dockerhub-username/${projectName}:latest`;

    p.note(
        [
            `${pc.dim("Follow these steps to connect your project:")}`,
            "",
            `${pc.bold("1.")} docker buildx build${platformFlag} -t ${pc.cyan(imageTag)} --push .`,
            `${pc.bold("2.")} Enter the image name ${pc.cyan(imageTag)} in the Agnox Dashboard.`,
        ].join("\n"),
        `${pc.green("✅")} Next steps to connect your project to Agnox`
    );

    return platforms;
}
