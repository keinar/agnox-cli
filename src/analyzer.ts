import { readFile, stat } from "node:fs/promises";
import { join } from "node:path";
import pc from "picocolors";

export interface PythonProjectAnalysis {
    hasPlaywright: boolean;
    hasAllure: boolean;
    hasSelenium: boolean;
    isApiOnly: boolean;
    packageManager: "pip" | "poetry";
    pythonVersion: string | null;
    playwrightVersion: string | null;
    browserConfig: BrowserConfig;
}

export interface BrowserConfig {
    browser: 'chromium' | 'firefox' | 'webkit' | null;
    channel: 'chrome' | 'msedge' | null;
    requiresAmd64Only: boolean;
    dockerInstallCommand: string | null; // e.g. "RUN playwright install chrome"
    platforms: string[]; // ['linux/amd64', 'linux/arm64'] or ['linux/amd64']
    warningMessage: string | null;
}

async function fileExists(path: string): Promise<boolean> {
    try {
        await stat(path);
        return true;
    } catch {
        return false;
    }
}

async function readFileIfExists(path: string): Promise<string> {
    if (await fileExists(path)) {
        return await readFile(path, "utf-8");
    }
    return "";
}

async function detectBrowserConfig(projectDir: string): Promise<BrowserConfig> {
    const pytestIni = await readFileIfExists(join(projectDir, 'pytest.ini'));
    const setupCfg = await readFileIfExists(join(projectDir, 'setup.cfg'));
    const pyprojectToml = await readFileIfExists(join(projectDir, 'pyproject.toml'));

    // Check all possible config files
    const configContent = (pytestIni + "\n" + setupCfg + "\n" + pyprojectToml).toLowerCase();

    const hasChrome = configContent.includes('--browser-channel chrome');
    const hasMsEdge = configContent.includes('--browser-channel msedge');
    const hasFirefox = configContent.includes('--browser firefox');
    const hasWebkit = configContent.includes('--browser webkit');

    if (hasChrome) {
        return {
            browser: 'chromium',
            channel: 'chrome',
            requiresAmd64Only: true,
            dockerInstallCommand: 'RUN playwright install chrome',
            platforms: ['linux/amd64'],
            warningMessage: 'Google Chrome does not support Linux ARM64. Building for linux/amd64 only.'
        };
    }

    if (hasMsEdge) {
        return {
            browser: 'chromium',
            channel: 'msedge',
            requiresAmd64Only: true,
            dockerInstallCommand: 'RUN playwright install msedge',
            platforms: ['linux/amd64'],
            warningMessage: 'Microsoft Edge does not support Linux ARM64. Building for linux/amd64 only.'
        };
    }

    // Default: multi-platform
    return {
        browser: hasFirefox ? 'firefox' : hasWebkit ? 'webkit' : 'chromium',
        channel: null,
        requiresAmd64Only: false,
        dockerInstallCommand: null,
        platforms: ['linux/amd64', 'linux/arm64'],
        warningMessage: null
    };
}

/**
 * Analyzes the project directory to detect python dependencies and configuration.
 */
export async function analyzePythonProject(projectDir: string): Promise<PythonProjectAnalysis> {
    const hasRequirementsTxt = await fileExists(join(projectDir, "requirements.txt"));
    const hasPyprojectToml = await fileExists(join(projectDir, "pyproject.toml"));
    const hasPoetryLock = await fileExists(join(projectDir, "poetry.lock"));

    let dependencies = "";
    let packageManager: "pip" | "poetry" = "pip";
    let pythonVersion: string | null = null;

    // Check for Poetry
    if (hasPyprojectToml) {
        const pyprojectContent = await readFile(join(projectDir, "pyproject.toml"), "utf-8");
        // It's poetry if there's a [tool.poetry] section or we see poetry.lock
        if (hasPoetryLock || pyprojectContent.includes("[tool.poetry]")) {
            packageManager = "poetry";
            dependencies += pyprojectContent;

            // Try to extract python version from poetry config
            // Example: python = "^3.11" or python = ">=3.9,<3.12"
            // We just want a reasonable base image version like "3.11"
            const versionMatch = pyprojectContent.match(/python\s*=\s*"([^"]+)"/);
            if (versionMatch) {
                // Extract the first X.Y version we find
                const v = versionMatch[1].match(/(\d+\.\d+)/);
                if (v) pythonVersion = v[1];
            }
        }
    }

    // Check for pip/requirements.txt
    // If we haven't found a python version yet, check .python-version (common in pyenv)
    if (!pythonVersion && await fileExists(join(projectDir, ".python-version"))) {
        const v = (await readFile(join(projectDir, ".python-version"), "utf-8")).trim();
        const match = v.match(/(\d+\.\d+)/);
        if (match) pythonVersion = match[1];
    }

    if (hasRequirementsTxt) {
        const reqContent = await readFile(join(projectDir, "requirements.txt"), "utf-8");
        dependencies += "\n" + reqContent;
    }

    const hasPlaywright = dependencies.includes("playwright") || dependencies.includes("pytest-playwright");
    const hasAllure = dependencies.includes("allure-pytest");
    const hasSelenium = dependencies.includes("selenium") || dependencies.includes("pytest-selenium");

    // "API only" heuristic: if no browser automation tool is found.
    const isApiOnly = !hasPlaywright && !hasSelenium;

    // Detect specific Playwright version
    let playwrightVersion: string | null = null;
    // requirements.txt: playwright==1.50.0
    // poetry.lock / pyproject.toml might need more robust parsing, but for now we focus on deps string
    const pwMatch = dependencies.match(/playwright==([\d.]+)/) || dependencies.match(/pytest-playwright==([\d.]+)/);
    // If pytest-playwright version is found, it might NOT match the playwright version exactly 
    // but usually, people install playwright directly too.
    // If only pytest-playwright is present, we might be guessing, but let's stick to explicit playwright pkg if possible
    // or just take the version found.
    // The user bug report says: "requirements.txt contains playwright==1.55.0" -> detect "1.55.0".

    // Let's refine the regex to be multi-line compliant and strict
    const strictPwMatch = dependencies.match(/^playwright==(\d+\.\d+\.\d+)/m);
    if (strictPwMatch) {
        playwrightVersion = strictPwMatch[1];
    }

    // Detect browser config (channel, platform, etc.)
    const browserConfig = await detectBrowserConfig(projectDir);

    return {
        hasPlaywright,
        hasAllure,
        hasSelenium,
        isApiOnly,
        packageManager,
        pythonVersion,
        playwrightVersion,
        browserConfig
    };
}
