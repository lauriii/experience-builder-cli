import { Command } from 'commander';
import * as p from '@clack/prompts';
import chalk from 'chalk';
import { setConfig, getConfig } from '../config.js';
import { createApiService } from '../services/api.js';

interface ListOptions {
  token?: string;
  url?: string;
  json?: boolean;
}

export function listCommand(program: Command): void {
  program
    .command('list')
    .description('List components in Experience Builder')
    .option('-t, --token <token>', 'Authentication token')
    .option('-u, --url <url>', 'Site URL')
    .option('--json', 'Output as JSON')
    .action(async (options: ListOptions) => {
      if (!options.json) {
        p.intro('Experience Builder Component List');
      }

      try {
        // Update config with CLI options
        if (options.token) setConfig({ auth_token: options.token });
        if (options.url) setConfig({ site_url: options.url });

        // Prompt for any missing required configurations if not in JSON mode
        if (!options.json) {
          await promptForMissingConfig();
        }

        const apiService = createApiService();

        // Get components
        let components;

        if (!options.json) {
          const s = p.spinner();
          s.start('Fetching components');
          components = await apiService.listComponents();
          s.stop(`Found ${components.length} components`);
        } else {
          components = await apiService.listComponents();
        }

        // Output results
        if (options.json) {
          // Output in JSON format
          console.log(JSON.stringify(components, null, 2));
        } else {
          // Output in human-readable format
          if (components.length === 0) {
            p.note('No components found');
          } else {
            console.log('\n' + chalk.bold('Components:'));
            console.log('===========\n');

            Object.keys(components).forEach((key, index) => {
              const component = components[key];
              const status = component.status ? chalk.green('enabled') : chalk.yellow('disabled');
              console.log(`${index + 1}. ${chalk.cyan(component.name)} (${component.machineName}) - ${status}`);

              if (component.slots && Object.keys(component.slots).length > 0) {
                console.log(`   ${chalk.dim('Slots:')} ${Object.keys(component.slots).join(', ')}`);
              }

              if (component.props && Object.keys(component.props).length > 0) {
                console.log(`   ${chalk.dim('Props:')} ${Object.keys(component.props).length} defined`);

                if (component.required && component.required.length > 0) {
                  console.log(`   ${chalk.dim('Required props:')} ${component.required.join(', ')}`);
                }
              }

              if (index < components.length - 1) {
                console.log('');
              }
            });
          }

          p.outro('List operation completed');
        }
      } catch (error) {
        if (!options.json) {
          if (error instanceof Error) {
            p.note(chalk.red(`Error: ${error.message}`));
          } else {
            p.note(chalk.red(`Unknown error: ${String(error)}`));
          }
        } else {
          console.error(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }));
        }
        process.exit(1);
      }
    });
}

async function promptForMissingConfig(): Promise<void> {
  const config = getConfig();

  // If any required config is missing, prompt for it
  if (!config.site_url) {
    const url = await p.text({
      message: 'Enter the site URL',
      placeholder: 'https://example.com',
      validate: (value) => {
        if (!value) return 'Site URL is required';
        if (!value.startsWith('http')) return 'URL must start with http:// or https://';
        return;
      }
    });

    if (p.isCancel(url)) {
      p.cancel('Operation cancelled');
      process.exit(0);
    }

    setConfig({ site_url: url });
  }

  if (!config.auth_token) {
    const token = await p.password({
      message: 'Enter your authentication token',
      validate: (value) => {
        if (!value) return 'Authentication token is required';
        return;
      }
    });

    if (p.isCancel(token)) {
      p.cancel('Operation cancelled');
      process.exit(0);
    }

    setConfig({ auth_token: token });
  }
}
