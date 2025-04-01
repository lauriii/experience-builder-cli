import * as p from '@clack/prompts';
import fs from 'fs/promises';
import path from 'path';
import chalk from 'chalk';
import os from 'os';
import { setConfig, getConfig } from '../config.js';

import { Command } from 'commander';

/**
 * Command for initializing the CLI configuration
 */
export function initCommand(program: Command) {
  program
    .command('init')
    .description('Initialize Experience Builder CLI configuration')
    .option('-g, --global', 'Save settings globally (in home directory)')
    .action(async (options: { global?: boolean }) => {
      p.intro('Experience Builder CLI Initialization');

      try {
        const isGlobal = options.global;
        const configPath = isGlobal 
          ? path.join(os.homedir(), '.xbrc')
          : path.join(process.cwd(), '.env');
        
        // Check if config file already exists
        let configExists = false;
        try {
          await fs.access(configPath);
          configExists = true;
        } catch (error) {
          // File doesn't exist, which is fine
        }

        if (configExists) {
          const overwrite = await p.confirm({
            message: `Configuration file already exists at ${configPath}. Do you want to overwrite it?`,
            initialValue: false,
          });

          if (p.isCancel(overwrite) || !overwrite) {
            p.cancel('Operation cancelled');
            return;
          }
        }

        // Get current config
        const config = getConfig();

        // Prompt for site URL
        const siteUrl = await p.text({
          message: 'Enter your Drupal site URL',
          placeholder: 'https://example.com',
          initialValue: config.site_url,
          validate: (value) => {
            if (!value) return 'Site URL is required';
            if (!value.startsWith('http')) return 'URL must start with http:// or https://';
            return;
          },
        });

        if (p.isCancel(siteUrl)) {
          p.cancel('Operation cancelled');
          return;
        }

        // Prompt for authentication token
        const authToken = await p.password({
          message: 'Enter your authentication token',
          validate: (value) => {
            if (!value) return 'Authentication token is required';
            return;
          },
        });

        if (p.isCancel(authToken)) {
          p.cancel('Operation cancelled');
          return;
        }

        // Prompt for framework - React only
        const framework = await p.select({
          message: 'Select your preferred component framework',
          initialValue: 'react',
          options: [
            { value: 'react', label: 'React' },
          ],
        });

        if (p.isCancel(framework)) {
          p.cancel('Operation cancelled');
          return;
        }

        // Prompt for component directory
        const componentDir = await p.text({
          message: 'Enter your component directory',
          placeholder: './components',
          initialValue: config.component_dir,
        });

        if (p.isCancel(componentDir)) {
          p.cancel('Operation cancelled');
          return;
        }

        // Create configuration file content
        const configContent = `# Experience Builder CLI Configuration
EXPERIENCE_BUILDER_SITE_URL=${siteUrl}
EXPERIENCE_BUILDER_AUTH_TOKEN=${authToken}
EXPERIENCE_BUILDER_FRAMEWORK=${framework}
EXPERIENCE_BUILDER_COMPONENT_DIR=${componentDir || './components'}
EXPERIENCE_BUILDER_VERBOSE=${config.verbose ? 'true' : 'false'}
`;

        // Write configuration file
        await fs.writeFile(configPath, configContent, 'utf-8');

        p.note(chalk.green(`Configuration saved to ${configPath}`));

        if (!isGlobal) {
          p.note(`
Make sure to add .env to your .gitignore file to avoid
accidentally committing your authentication token.
          `);
        }

        // Show next steps
        p.note(`
Next steps:
1. Try 'xb list' to see your existing components
2. Use 'xb upload' to upload components to your site
        `);

        p.outro('Configuration complete!');
      } catch (error) {
        if (error instanceof Error) {
          p.note(chalk.red(`Error: ${error.message}`));
        } else {
          p.note(chalk.red(`Unknown error: ${String(error)}`));
        }
        process.exit(1);
      }
    });
}