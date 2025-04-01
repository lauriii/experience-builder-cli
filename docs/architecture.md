# Experience Builder CLI - Technical Architecture

This document describes the internal architecture of the Experience Builder CLI tool.

## Overview

The Experience Builder CLI is designed to facilitate component management for Drupal Experience Builder. It's built with TypeScript and follows a modular architecture with clear separation of concerns.

## Core Modules

```
cli/
├── src/
│   ├── index.ts           # Entry point
│   ├── config.ts          # Configuration management
│   ├── commands/          # Command implementations
│   │   ├── upload.ts      # Upload command
│   │   ├── download.ts    # Download command
│   │   ├── list.ts        # List command
│   │   └── update.ts      # Update command
│   ├── services/          # External services
│   │   └── api.ts         # API communication
│   └── utils/             # Utility functions
│       ├── build.ts       # Component building
│       ├── component-files.ts # Component file processing
│       └── validation.ts  # Validation utilities
├── test/                  # Test files
└── dist/                  # Compiled output
```

## Key Components

### Command Pattern

The CLI uses Commander.js for command management. Each command is implemented separately and registered in the main `index.ts` file:

```typescript
// index.ts
import { Command } from 'commander';
import { uploadCommand } from './commands/upload.js';
import { downloadCommand } from './commands/download.js';
import { listCommand } from './commands/list.js';
import { updateCommand } from './commands/update.js';

const program = new Command();
program.version('1.0.0');

// Register commands
uploadCommand(program);
downloadCommand(program);
listCommand(program);
updateCommand(program);

program.parse();
```

### Configuration Management

Configuration is managed centrally using environment variables, command-line arguments, and user prompts:

```typescript
// config.ts
export interface Config {
  site_url?: string;
  auth_token?: string;
  framework?: 'react' | 'vue';
  component_dir?: string;
  verbose?: boolean;
}

let config: Config = {
  component_dir: process.cwd(),
  verbose: process.env.EXPERIENCE_BUILDER_VERBOSE === 'true'
};

export function getConfig(): Config {
  return { ...config };
}

export function setConfig(newConfig: Partial<Config>): void {
  config = { ...config, ...newConfig };
}
```

### API Service

The API service handles communication with the Drupal Experience Builder API:

```typescript
// services/api.ts
export function createApiService() {
  const config = getConfig();
  
  return {
    async getComponent(machineName: string) { /* ... */ },
    async createComponent(component: any) { /* ... */ },
    async updateComponent(machineName: string, component: any) { /* ... */ },
    async listComponents() { /* ... */ },
  };
}
```

### Component Building

Component building is handled by the `build.ts` utility:

```typescript
// utils/build.ts
export async function buildComponent(
  componentDir: string, 
  framework?: 'react' | 'vue' | 'unknown'
): Promise<ComponentBuildResult> {
  // Detect component type
  // Try to build using package.json build script
  // Fall back to SWC for simple transpilation
  // Return build results with source and compiled code
}
```

### Component File Processing

Component files are processed by the `component-files.ts` utility:

```typescript
// utils/component-files.ts
export async function processComponentFiles(
  componentDir: string, 
  componentName: string,
  verbose = false
): Promise<ComponentFiles> {
  // Find metadata file
  // Read and process metadata
  // Find and process JS/CSS files
  // Return processed files
}

export function createComponentPayload(params: ComponentPayloadParams): any {
  // Create standardized component payload for API
  // Handle source code vs compiled code
  // Process props and slots
  // Return formatted payload
}
```

## Data Flow

1. User invokes a command with options
2. Command parses options and updates config
3. Command prompts for missing config (if interactive)
4. Command processes files and builds components if needed
5. API service communicates with the server
6. Results are displayed to the user

## Source Code vs Compiled Code Handling

One of the key architectural decisions is maintaining a clear distinction between source code and compiled code:

1. Source code is the original, human-readable code (JSX, CSS)
2. Compiled code is the processed code ready for use in Experience Builder

This separation allows developers to:
- View and edit the original source code
- Use the compiled code for runtime execution
- Maintain the component's readability and maintainability

Implementation details:
- Source files are searched for in standard locations
- Original source code is preferred over build outputs
- Empty string is used if no source code is available (never fallback to compiled code)
- Both source and compiled code are sent to the API separately

## Error Handling

Error handling follows these principles:

1. Command-specific errors are caught and handled
2. User-friendly error messages are displayed
3. Verbose logging is available for debugging
4. Non-interactive mode has appropriate error codes for CI/CD

## Testing Strategy

The CLI is tested using Vitest with these types of tests:

1. **Unit Tests**: Testing individual functions and utilities
2. **Integration Tests**: Testing the interaction between modules
3. **Mock API Tests**: Testing API service with mock responses
4. **Source Code Handling Tests**: Ensuring source and compiled code separation

## Build System

The CLI uses the following build system:

1. TypeScript for type safety during development
2. ESBuild for fast compilation
3. Node.js compatibility for cross-platform support

## Future Improvements

Potential areas for future enhancements:

1. Component validation before upload
2. Preview functionality
3. Component versioning and rollback
4. Batch operations for large component libraries
5. Enhanced error recovery
6. Support for additional frameworks