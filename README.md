# Experience Builder CLI Tool

A command-line interface for working with Experience Builder React components.

> **Note:** This tool focuses exclusively on React components. Vue support has been removed to simplify the development workflow.

## Installation

```bash
npm install
npm run build
```

## Usage

### Scaffold New Components

Create a new component with proper structure:

```bash
node dist/index.js scaffold -n my-component
```

Or adapt an existing component to the proper structure:

```bash
node dist/index.js scaffold --adapt -n existing-component
```

### Build Components

Build components for use with Experience Builder:

```bash
# Build a specific component
node dist/index.js build -n component-name

# Build all components in a directory
node dist/index.js build --all -d ./path/to/components
```

### Upload Components

Upload components to your Drupal site:

```bash
node dist/index.js upload --token YOUR_AUTH_TOKEN --url YOUR_SITE_URL --dir ./path/to/components
```

Or use the interactive mode:

```bash
node dist/index.js upload
```

### Testing with Sample Components

The `upload-test.js` script provides a simple way to test the upload functionality with sample components:

```bash
# Set environment variables (replace with your values)
export EXPERIENCE_BUILDER_SITE_URL=https://example.com
export EXPERIENCE_BUILDER_AUTH_TOKEN=your_token

# Optional: Enable verbose output
export EXPERIENCE_BUILDER_VERBOSE=true

# Upload a specific component (defaults to simple-button if not specified)
node upload-test.js hero-banner
```

Available test components:
- `simple-button` - Basic button component
- `hero-banner` - Hero banner with title, subtitle, and CTA
- `image-card` - Image card component

## Component Format

Components should follow this structure:

```
my-component/
  ├── component.yml     # Component metadata and configuration
  ├── index.jsx         # React component source
  ├── index.css         # Optional CSS
  └── dist/             # Generated during build process
```

### component.yml

```yaml
machineName: my_component
name: My Component
required:
  - label
props:
  label:
    type: string
    title: Button Text
slots:
  content:
    title: Content
    description: Main content area
```

## Authentication

The CLI uses token authentication to communicate with your Drupal site. To generate a token:

1. Log in to your Drupal site as an administrator
2. Navigate to the Experience Builder settings page
3. Generate an API token in the CLI Access section

## Component Transformation

When uploading components:

1. JSX components are automatically converted to work with Preact's `h()` function using SWC
2. Source code is preserved and uploaded alongside the compiled code
3. CSS files are included directly with the component

## Technical Notes

- The CLI adds an `X-Experience-Builder-CLI` header to identify requests from the CLI tool
- For local development with DDEV, HTTP is used instead of HTTPS
- CSS files are optional - if present, they will be included in the upload