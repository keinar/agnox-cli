package cmd

import (
	"fmt"
	"os"

	"github.com/spf13/cobra"
)

var rootCmd = &cobra.Command{
	Use:   "aac",
	Short: "Agnostic Automation Center CLI",
	Long: `AAC CLI — Agnostic Automation Center

Automatically prepare any test automation repository to run
seamlessly inside the AAC containerized platform.

Run 'aac init' to get started.`,
}

// Execute runs the root command and exits on error.
func Execute() {
	if err := rootCmd.Execute(); err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
}
