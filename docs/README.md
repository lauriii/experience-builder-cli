# Experience Builder CLI

The Experience Builder CLI is a command-line tool for managing components in Drupal Experience Builder. It allows developers to upload, download, update, and list components using a command-line interface, integrating seamlessly with existing Git workflows.

## Installation

```bash
# Install globally
npm install -g @drupal/experience-builder-cli

# Or install in a project
npm install --save-dev @drupal/experience-builder-cli
```

## Configuration

The CLI can be configured using environment variables, command-line options, or an interactive prompt. Options specified via command-line take precedence.

### Environment Variables

Create a `.env` file in your project directory with the following variables:

```
EXPERIENCE_BUILDER_SITE_URL=https://example.com
EXPERIENCE_BUILDER_AUTH_TOKEN=your_token_here
EXPERIENCE_BUILDER_FRAMEWORK=react
EXPERIENCE_BUILDER_COMPONENT_DIR=./components
EXPERIENCE_BUILDER_VERBOSE=true
```

### Command-Line Options

Most commands support the following options:

```
-t, --token <token>         Authentication token
-u, --url <url>             Site URL
-f, --framework <framework> Component framework (react or vue)
-d, --dir <directory>       Component directory
--non-interactive           Run in non-interactive mode (useful for scripts)
```

## Commands

### Upload

Upload components to Experience Builder:

```bash
xb upload
```

This command:
1. Searches for component directories with component.yml files
2. Builds components using their framework's build process
3. Uploads components to the Experience Builder backend

Options:
- `-t, --token <token>`: Authentication token
- `-u, --url <url>`: Site URL
- `-f, --framework <framework>`: Component framework (react or vue)
- `-d, --dir <directory>`: Component directory
- `--non-interactive`: Run in non-interactive mode

### List 

List available components:

```bash
xb list
```

This command displays all components available in Experience Builder.

Options:
- `-t, --token <token>`: Authentication token
- `-u, --url <url>`: Site URL
- `--json`: Output in JSON format for scripting
- `--non-interactive`: Run in non-interactive mode

### Download

Download components from Experience Builder:

```bash
xb download
```

This command:
1. Fetches components from Experience Builder
2. Creates local component structure with source files
3. Organizes components by name

Options:
- `-t, --token <token>`: Authentication token
- `-u, --url <url>`: Site URL
- `-d, --dir <directory>`: Output directory
- `--non-interactive`: Run in non-interactive mode

### Update

Update existing components in Experience Builder:

```bash
xb update
```

This command:
1. Identifies local components that exist in Experience Builder
2. Builds components using their framework's build process
3. Updates the remote components with the new code

Options:
- `-t, --token <token>`: Authentication token
- `-u, --url <url>`: Site URL
- `-f, --framework <framework>`: Component framework (react or vue)
- `-d, --dir <directory>`: Component directory
- `--non-interactive`: Run in non-interactive mode

## Component Structure

Components should follow this directory structure:

```
component-name/
├── component.yml (or component-name.component.yml)
├── index.js (or index.jsx)
├── index.css (optional)
└── dist/ (generated during build)
    ├── index.js
    └── index.css
```

### Component Metadata

The component.yml file defines the component's metadata:

```yaml
name: My Component
machineName: my_component
props:
  properties:
    title:
      type: string
      title: Title
      default: Default Title
    showImage:
      type: boolean
      title: Show Image
      default: true
slots:
  main:
    title: Main Content
  footer:
    title: Footer
```

## Authentication

The CLI uses token-based authentication. You can generate tokens from the Experience Builder admin interface under Configuration → Services → Experience Builder CLI Tokens.

## Examples

### Upload in interactive mode

```bash
xb upload
```

### Upload in non-interactive mode

```bash
xb upload --token YOUR_TOKEN --url https://example.com --framework react --dir ./components --non-interactive
```

### List components in JSON format

```bash
xb list --token YOUR_TOKEN --url https://example.com --json
```