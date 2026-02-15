import { Command } from "commander";
import * as p from "@clack/prompts";
import pc from "picocolors";
import { generate, type Framework } from "./generator.js";
import { deploy } from "./deployer.js";

const program = new Command();

program
    .name("aac-cli")
    .description(
        "Agnostic Automation Center CLI — Prepare any test automation repo for the AAC platform"
    )
    .version("1.1.0");

program
    .command("init")
    .description(
        "Generate AAC integration files and optionally build & push your Docker image"
    )
    .action(async () => {
        p.intro(pc.bgCyan(pc.black(" AAC CLI ")));

        // --- Framework selection ---
        const framework = (await p.select({
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

        // --- File generation ---
        const s = p.spinner();
        s.start("Generating AAC integration files...");
        await new Promise((resolve) => setTimeout(resolve, 300));
        s.stop("Files ready.");

        const targetDir = process.cwd();
        await generate(framework, targetDir);

        // --- Deployment flow ---
        const shouldDeploy = await p.confirm({
            message: "Do you want to build and push the image to Docker Hub right now?",
        });

        if (p.isCancel(shouldDeploy)) {
            p.cancel("Operation cancelled.");
            process.exit(0);
        }

        if (shouldDeploy) {
            await deploy(targetDir);
        }

        p.outro(
            pc.green("Done!") + " " + pc.dim("Run `aac-cli init` again anytime.")
        );
    });

program.parse();
