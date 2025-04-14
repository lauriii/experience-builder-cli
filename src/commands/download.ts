import { Command } from 'commander';
import * as p from '@clack/prompts';
import fs from 'fs/promises';
import path from 'path';
import chalk from 'chalk';
import yaml from 'js-yaml';
import { setConfig, getConfig } from '../config.js';
import { createApiService, Component } from '../services/api.js';

interface DownloadOptions {
  token?: string;
  url?: string;
  dir?: string;
  component?: string;
}

export function downloadCommand(program: Command): void {
  program
    .command('download')
    .description('Download components from Experience Builder')
    .option('-t, --token <token>', 'Authentication token')
    .option('-u, --url <url>', 'Site URL')
    .option('-d, --dir <directory>', 'Component directory')
    .option('-c, --component <name>', 'Specific component to download')
    .action(async (options: DownloadOptions) => {
      p.intro('Experience Builder Component Download');

      try {
        // Update config with CLI options
        if (options.token) setConfig({ auth_token: options.token });
        if (options.url) setConfig({ site_url: options.url });
        if (options.dir) setConfig({ component_dir: options.dir });

        const config = getConfig();

        // Prompt for any missing required configurations
        await promptForMissingConfig();

        const apiService = createApiService();

        // Get components
        const s = p.spinner();
        s.start('Fetching components');

        const components = await apiService.listComponents();

        if (components.length === 0) {
          s.stop('No components found');
          p.outro('Download canceled - no components were found');
          return;
        }

        s.stop(`Found ${components.length} components`);

        // If a specific component was requested, filter for it
        let componentsToDownload: Component[] = [];

        if (options.component) {
          const component = components.find(c => c.machineName === options.component || c.name === options.component);
          if (!component) {
            p.note(chalk.red(`Component "${options.component}" not found`));
            p.outro('Download canceled');
            return;
          }
          componentsToDownload = [component];
        } else {
          // Choose components to download
          const selectedComponents = await p.multiselect({
            message: 'Select components to download',
            options: Object.keys(components).map(key => ({
              value: components[key].machineName,
              label: components[key].name,
            })),
            required: true,
          });

          if (p.isCancel(selectedComponents)) {
            p.cancel('Operation cancelled');
            return;
          }

          componentsToDownload = Object.fromEntries(
            Object.entries(components).filter(([key, component]) =>
              (selectedComponents as string[]).includes(component.machineName)
            )
          );
        }

        // Confirm download
        const confirmDownload = await p.confirm({
          message: `Download ${Object.keys(componentsToDownload).length} components to ${config.component_dir}?`,
          initialValue: true,
        });

        if (p.isCancel(confirmDownload) || !confirmDownload) {
          p.cancel('Operation cancelled');
          return;
        }

        // Download components
        const results = [];

        s.start('Downloading components');

        for (const key in componentsToDownload) {
          const component = componentsToDownload[key];
          try {
            // Create component directory structure
            const componentDir = path.join(config.component_dir, component.machineName);
            const distDir = path.join(componentDir, 'dist');

            await fs.rm(componentDir, { recursive: true, force: true });
            await fs.mkdir(componentDir, { recursive: true });

            // Create component.yml metadata file
            const metadata = {
              name: component.name,
              required: component.required || [],
              props: component.props || {},
              slots: component.slots || {},
            };

            await fs.writeFile(
              path.join(componentDir, `${component.machineName}.component.yml`),
              yaml.dump(metadata),
              'utf-8'
            );

            // Create JS file
            if (component.source_code_js) {
              await fs.writeFile(
                path.join(componentDir, 'index.jsx'),
                component.source_code_js,
                'utf-8'
              );
            }

            // Create CSS file
            if (component.source_code_css) {
              await fs.writeFile(
                path.join(componentDir, 'index.css'),
                component.source_code_css,
                'utf-8'
              );
            }

            results.push({
              name: component.name,
              success: true,
              path: componentDir,
            });
          } catch (error) {
            results.push({
              name: component.name,
              success: false,
              error: error instanceof Error ? error.message : String(error),
            });
          }
        }

        s.stop('Download completed');

        // Report results
        const successful = results.filter(r => r.success).length;
        const failed = results.filter(r => !r.success).length;

        p.note(`${successful} components downloaded successfully, ${failed} failed`);

        // Output failures with details
        if (failed > 0) {
          console.log(chalk.red('Failed downloads:'));
          results
            .filter(r => !r.success)
            .forEach(r => {
              console.log(chalk.red(`  - ${r.name}: ${r.error}`));
            });
        }

        // Output successful downloads
        if (successful > 0) {
          console.log(chalk.green('Successfully downloaded:'));
          results
            .filter(r => r.success)
            .forEach(r => {
              console.log(chalk.green(`  - ${r.name}: ${r.path}`));
            });
        }

        p.outro('Component download completed');
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
