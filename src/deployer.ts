import { execSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import * as p from "@clack/prompts";
import pc from "picocolors";

/**
 * Reads the project name from the local package.json.
 * Returns null if not found or on error.
 */
async function detectProjectName(dir: string): Promise<string | null> {
    try {
        const raw = await readFile(join(dir, "package.json"), "utf-8");
        const pkg = JSON.parse(raw) as { name?: string };
        if (!pkg.name) return null;
        // Strip npm scope (e.g. @org/name -> name).
        return pkg.name.replace(/^@[^/]+\//, "");
    } catch {
        return null;
    }
}

/**
 * Docker Hub account check → username → project name → login → buildx build & push.
 */
export async function deploy(
    targetDir: string,
    username: string,
    projectName: string,
    platforms: string[] = ["linux/amd64", "linux/arm64"]
): Promise<void> {

    const fullImage = `${username.trim()}/${projectName}:latest`;

    // --- Docker login ---
    const shouldLogin = await p.confirm({
        message: `I need to log you into Docker as ${pc.cyan(username)}. Send request?`,
    });

    if (p.isCancel(shouldLogin)) {
        p.cancel("Deployment cancelled.");
        return;
    }

    if (shouldLogin) {
        p.log.step("Opening Docker login...");
        try {
            execSync("docker login", { stdio: "inherit", cwd: targetDir });
            p.log.success("Docker login successful.");
        } catch {
            p.log.error("Docker login failed. Please try again manually.");
            return;
        }
    }

    const platformFlag = platforms.join(",");

    // --- Build & push confirmation ---
    const shouldBuild = await p.confirm({
        message: `Build multi-platform image ${pc.cyan(fullImage)} for ${pc.yellow(platformFlag)} and push to Docker Hub?`,
    });

    if (p.isCancel(shouldBuild) || !shouldBuild) {
        p.log.warn("Build skipped.");
        p.note(
            [
                `${pc.bold("1.")} docker buildx create --name agnox-builder --use`,
                `${pc.bold("2.")} docker buildx build --platform ${platformFlag} -t ${fullImage} --push .`,
            ].join("\n"),
            "You can build manually later"
        );
        return;
    }

    // --- Execute buildx ---
    const s = p.spinner();

    try {
        s.start("Setting up Docker Buildx builder...");
        execSync("docker buildx create --name agnox-builder --use", {
            stdio: "pipe",
            cwd: targetDir,
        });
        s.stop("Buildx builder ready.");
    } catch {
        // Builder may already exist — safe to ignore.
        s.stop("Using existing Buildx builder.");
    }

    p.log.step(`Building & pushing ${pc.cyan(fullImage)}...`);

    try {
        execSync(
            `docker buildx build --platform ${platformFlag} -t ${fullImage} --push .`,
            { stdio: "inherit", cwd: targetDir }
        );
        p.log.success(`Image ${pc.green(fullImage)} pushed successfully!`);

        p.note(
            `Go to the ${pc.bold("Agnox Dashboard")} and enter:\n${pc.cyan(fullImage)}`,
            pc.green("✅ Deployment Complete")
        );
    } catch {
        p.log.error("Docker build failed. Check the output above for details.");
    }
}
