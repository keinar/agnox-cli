import { Command } from "commander";
import * as p from "@clack/prompts";
import pc from "picocolors";
import { generate, detectFramework, type Framework } from "./generator.js";
import { deploy } from "./deployer.js";

const program = new Command();

program
    .name("agnox-cli")
    .description(
        "Agnox CLI — Prepare any test automation repo for the Agnox platform"
    )
    .version("2.0.4");

program
    .command("init")
    .description(
        "Generate Agnox integration files and optionally build & push your Docker image"
    )
    .action(async () => {
        p.intro(pc.bgCyan(pc.black(" Agnox CLI ")));

        const targetDir = process.cwd();

        // --- Smart Detection ---
        const detected = await detectFramework(targetDir);
        let framework: Framework | symbol | null = null;

        if (detected) {
            const useDetected = await p.confirm({
                message: `Detected ${pc.cyan(detected.toUpperCase())} project. Use this framework?`,
                initialValue: true,
            });

            if (p.isCancel(useDetected)) {
                p.cancel("Operation cancelled.");
                process.exit(0);
            }

            if (useDetected) {
                framework = detected;
            }
        }

        // --- Manual selection (if detection failed or was declined) ---
        if (!framework) {
            framework = (await p.select({
                message: "Select your automation project framework:",
                options: [
                    {
                        value: "playwright",
                        label: "Playwright (TypeScript/Node.js)",
                    },
                    {
                        value: "pytest",
                        label: "Pytest (Python)",
                    },
                ],
            })) as Framework | symbol;

            if (p.isCancel(framework)) {
                p.cancel("Operation cancelled.");
                process.exit(0);
            }
        }

        // --- File generation ---
        const s = p.spinner();
        s.start("Generating Agnox integration files...");
        await new Promise((resolve) => setTimeout(resolve, 300));
        s.stop("Files ready.");

        // We cast to Framework because we've handled the cancel/symbol cases above
        const platforms = await generate(framework as Framework, targetDir);

        // --- Deployment flow ---
        const shouldDeploy = await p.confirm({
            message: "Do you want to build and push the image to Docker Hub right now?",
        });

        if (p.isCancel(shouldDeploy)) {
            p.cancel("Operation cancelled.");
            process.exit(0);
        }

        if (shouldDeploy) {
            await deploy(targetDir, platforms);
        }

        p.outro(
            pc.green("Done!") + " " + pc.dim("Run `agnox-cli init` again anytime.")
        );
    });

program.parse();