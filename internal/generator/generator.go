package generator

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"github.com/keinar/aac-cli/internal/templates"
)

// Framework represents a supported test automation framework.
type Framework int

const (
	Playwright Framework = iota
	Pytest
)

// FileSpec describes a single file to be generated.
type FileSpec struct {
	Name    string
	Content string
	Perm    os.FileMode
}

// FilesForFramework returns the ordered list of files to generate.
func FilesForFramework(fw Framework) []FileSpec {
	var dockerfile, entrypoint string

	switch fw {
	case Playwright:
		dockerfile = templates.PlaywrightDockerfile
		entrypoint = templates.PlaywrightEntrypoint
	case Pytest:
		dockerfile = templates.PytestDockerfile
		entrypoint = templates.PytestEntrypoint
	}

	return []FileSpec{
		{Name: ".dockerignore", Content: templates.Dockerignore, Perm: 0644},
		{Name: "entrypoint.sh", Content: entrypoint, Perm: 0755},
		{Name: "Dockerfile", Content: dockerfile, Perm: 0644},
	}
}

// FindConflicts returns the names of files that already exist in dir.
func FindConflicts(dir string, files []FileSpec) []string {
	var conflicts []string
	for _, f := range files {
		path := filepath.Join(dir, f.Name)
		if _, err := os.Stat(path); err == nil {
			conflicts = append(conflicts, f.Name)
		}
	}
	return conflicts
}

// WriteFiles writes the given files to dir, enforcing LF line endings.
// skip contains file names that should NOT be written (user chose not to overwrite).
func WriteFiles(dir string, files []FileSpec, skip map[string]bool) ([]string, error) {
	var written []string

	for _, f := range files {
		if skip[f.Name] {
			continue
		}

		path := filepath.Join(dir, f.Name)

		// Enforce strict LF line endings — critical for entrypoint.sh on Linux containers.
		content := strings.ReplaceAll(f.Content, "\r\n", "\n")

		if err := os.WriteFile(path, []byte(content), f.Perm); err != nil {
			return written, fmt.Errorf("failed to write %s: %w", f.Name, err)
		}

		written = append(written, f.Name)
	}

	return written, nil
}

// NextSteps returns the post-generation guidance message.
func NextSteps() string {
	return `
✅ AAC Integration files generated successfully!

Next steps to connect your project to the AAC:

  1. Build your Docker image:
     docker build -t your-username/my-automation-tests:latest .

  2. Push the image to your registry:
     docker push your-username/my-automation-tests:latest

  3. Go to the AAC Dashboard and enter this image name
     in your environment setup.
`
}
