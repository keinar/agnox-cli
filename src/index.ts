import { Command } from "commander";
import * as p from "@clack/prompts";
import pc from "picocolors";
import { generate, type Framework } from "./generator.js";

const program = new Command();

program
    .name("aac-cli")
    .description(
        "Agnostic Automation Center CLI — Prepare any test automation repo for the AAC platform"
    )
    .version("1.0.0");

program
    .command("init")
    .description(
        "Generate Dockerfile, entrypoint.sh, and .dockerignore for the AAC platform"
    )
    .action(async () => {
        p.intro(pc.bgCyan(pc.black(" AAC CLI ")));

        const framework = await p.select<
            { value: Framework; label: string }[],
            Framework
        >({
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
        });

        if (p.isCancel(framework)) {
            p.cancel("Operation cancelled.");
            process.exit(0);
        }

        const s = p.spinner();
        s.start("Generating AAC integration files...");

        // Small delay for visual feedback.
        await new Promise((resolve) => setTimeout(resolve, 300));
        s.stop("Files ready.");

        await generate(framework, process.cwd());

        p.outro(
            pc.green("Done!") + " " + pc.dim("Run `aac-cli init` again anytime.")
        );
    });

program.parse();
