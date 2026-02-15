package cmd

import (
	"fmt"
	"os"

	"github.com/charmbracelet/huh"
	"github.com/keinar/aac-cli/internal/generator"
	"github.com/spf13/cobra"
)

var initCmd = &cobra.Command{
	Use:   "init",
	Short: "Initialize AAC integration files for your test automation project",
	Long: `Generates the Dockerfile, entrypoint.sh, and .dockerignore required to
run your test suite inside the Agnostic Automation Center platform.`,
	RunE: runInit,
}

func init() {
	rootCmd.AddCommand(initCmd)
}

func runInit(cmd *cobra.Command, args []string) error {
	// --- Step 1: Framework selection ---
	var framework string

	selectForm := huh.NewForm(
		huh.NewGroup(
			huh.NewSelect[string]().
				Title("Select your automation project framework:").
				Options(
					huh.NewOption("Playwright (TypeScript/Node.js)", "playwright"),
					huh.NewOption("Pytest (Python)", "pytest"),
				).
				Value(&framework),
		),
	)

	if err := selectForm.Run(); err != nil {
		return fmt.Errorf("prompt cancelled: %w", err)
	}

	// Map selection to framework type.
	var fw generator.Framework
	switch framework {
	case "playwright":
		fw = generator.Playwright
	case "pytest":
		fw = generator.Pytest
	}

	// --- Step 2: Resolve target directory ---
	dir, err := os.Getwd()
	if err != nil {
		return fmt.Errorf("failed to determine working directory: %w", err)
	}

	// --- Step 3: Build file list and detect conflicts ---
	files := generator.FilesForFramework(fw)
	conflicts := generator.FindConflicts(dir, files)

	skip := make(map[string]bool)

	if len(conflicts) > 0 {
		for _, name := range conflicts {
			var overwrite bool

			confirmForm := huh.NewForm(
				huh.NewGroup(
					huh.NewConfirm().
						Title(fmt.Sprintf("File '%s' already exists. Overwrite?", name)).
						Affirmative("Yes, overwrite").
						Negative("No, skip").
						Value(&overwrite),
				),
			)

			if err := confirmForm.Run(); err != nil {
				return fmt.Errorf("prompt cancelled: %w", err)
			}

			if !overwrite {
				skip[name] = true
			}
		}

		// If all files were skipped, abort gracefully.
		if len(skip) == len(files) {
			fmt.Println("\n⚠️  All files were skipped. No changes were made.")
			return nil
		}
	}

	// --- Step 4: Write files ---
	written, err := generator.WriteFiles(dir, files, skip)
	if err != nil {
		return err
	}

	// --- Step 5: Print results and next steps ---
	fmt.Println()
	for _, name := range written {
		fmt.Printf("  📄 Created: %s\n", name)
	}

	fmt.Println(generator.NextSteps())

	return nil
}
