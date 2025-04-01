#!/usr/bin/env node

import { Command } from 'commander';
import { uploadCommand } from './commands/upload.js';
import { downloadCommand } from './commands/download.js';
import { updateCommand } from './commands/update.js';
import { listCommand } from './commands/list.js';
import { buildCommand } from './commands/build.js';
import { scaffoldCommand } from './commands/scaffold.js';
import { initCommand } from './commands/init.js';
import chalk from 'chalk';
import { getConfig } from './config.js';

// Config is already loaded from .env files in config.ts

// Program metadata
const program = new Command();
program
  .name('xb')
  .description('Experience Builder CLI for component management')
  .version('0.1.0')
  .addHelpText('after', `
Environment Variables:
  EXPERIENCE_BUILDER_SITE_URL     The URL of your Drupal site
  EXPERIENCE_BUILDER_AUTH_TOKEN   Your authentication token
  EXPERIENCE_BUILDER_FRAMEWORK    Component framework (react)
  EXPERIENCE_BUILDER_COMPONENT_DIR Default directory for components
  EXPERIENCE_BUILDER_VERBOSE      Enable verbose output (true/false)

Environment variables can be set in:
  - .env file in your current working directory
  - .xbrc file in your home directory
  - Command line arguments (take precedence over environment variables)
`);

// Register commands
initCommand(program);
uploadCommand(program);
downloadCommand(program);
updateCommand(program);
listCommand(program);
buildCommand(program);
scaffoldCommand(program);

// Handle errors
program.showHelpAfterError();
program.showSuggestionAfterError(true);

try {
  // Parse command line arguments and execute the command
  await program.parseAsync(process.argv);
} catch (error) {
  if (error instanceof Error) {
    console.error(chalk.red(`Error: ${error.message}`));
    process.exit(1);
  }
}