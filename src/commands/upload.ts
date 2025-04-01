import { Command } from 'commander';
import * as p from '@clack/prompts';
import fs from 'fs/promises';
import path from 'path';
import chalk from 'chalk';
import { glob } from 'glob';
import * as yaml from 'js-yaml';
import { setConfig, getConfig } from '../config.js';
import { createApiService } from '../services/api.js';
import { buildComponent, detectComponentType, buildAllComponents, ComponentBuildResult } from '../utils/build.js';
import {
  processComponentFiles,
  createComponentPayload
} from '../utils/component-files.js';

/**
 * Component payload for API requests
 */
interface ComponentPayload {
  machineName: string;
  name: string;
  framework: string;
  status: boolean;
  required: string[];
  props: any;
  slots: Record<string, any>;
  source_code_js: string;
  compiled_js: string;
  source_code_css: string;
  compiled_css: string;
}

/**
 * Parameters for creating component payload
 */
interface ComponentPayloadParams {
  metadata: any;
  machineName: string;
  componentName: string;
  framework: string;
  sourceCodeJs: string;
  compiledJs: string;
  sourceCodeCss: string;
  compiledCss: string;
}

interface UploadOptions {
  token?: string;
  url?: string;
  framework?: 'react';
  dir?: string;
  nonInteractive?: boolean;
}

/**
 * Result of the component build and upload process
 */
interface ComponentResult {
  name: string;
  machineName?: string;
  framework?: string;
  action?: string;
  success: boolean;
  error?: string;
}

/**
 * Registers the upload command
 */
export function uploadCommand(program: Command): void {
  program
    .command('upload')
    .description('Upload components to Experience Builder')
    .option('-t, --token <token>', 'Authentication token')
    .option('-u, --url <url>', 'Site URL')
    .option('-f, --framework <framework>', 'Component framework (currently only react)')
    .option('-d, --dir <directory>', 'Component directory')
    .option('--non-interactive', 'Run in non-interactive mode (useful for scripts)')
    .action(async (options: UploadOptions) => {
      const nonInteractive = options.nonInteractive || false;

      try {
        // Show intro unless in non-interactive mode
        if (!nonInteractive) {
          p.intro('Experience Builder Component Upload');
        } else {
          console.log('Experience Builder Component Upload');
        }

        // Update config with CLI options
        if (options.token) setConfig({ auth_token: options.token });
        if (options.url) setConfig({ site_url: options.url });
        if (options.framework) setConfig({ framework: options.framework as 'react' });
        if (options.dir) setConfig({ component_dir: options.dir });

        const config = getConfig();

        // In non-interactive mode, skip the prompts
        if (!nonInteractive) {
          // Prompt for any missing required configurations
          await promptForMissingConfig();
        } else if (!config.auth_token || !config.site_url) {
          throw new Error('In non-interactive mode, you must provide --token and --url');
        }

        // Find component directories
        const componentDirs = await findComponentDirectories(config.component_dir, nonInteractive);
        if (componentDirs.length === 0) {
          const message = 'No components found. Upload canceled.';
          if (!nonInteractive) {
            p.outro('Upload canceled - no components were found');
          } else {
            console.log(message);
          }
          return;
        }

        // Select components to upload
        const componentsToUpload = await selectComponentsToUpload(componentDirs, nonInteractive);
        if (!componentsToUpload || componentsToUpload.length === 0) {
          return;
        }

        // Create API service
        const apiService = createApiService();

        // Build and upload components
        const results = await processComponents(
          componentsToUpload as string[],
          apiService,
          nonInteractive
        );

        // Display results
        displayResults(results, nonInteractive);

      } catch (error) {
        handleError(error, nonInteractive);
        process.exit(1);
      }
    });
}

/**
 * Prompt user for missing configuration values
 */
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

  if (!config.framework) {
    const framework = await p.select({
      message: 'Select component framework',
      options: [
        { value: 'react', label: 'React' },
      ],
    });

    if (p.isCancel(framework)) {
      p.cancel('Operation cancelled');
      process.exit(0);
    }

    setConfig({ framework: framework as 'react' });
  }
}

/**
 * Find all component directories
 */
async function findComponentDirectories(baseDir: string, nonInteractive: boolean): Promise<string[]> {
  try {
    let spinner: any = null;

    // Start a spinner in interactive mode
    if (!nonInteractive) {
      spinner = p.spinner();
      spinner.start('Searching for components');
    } else {
      console.log(`Searching for components in ${baseDir}...`);
    }

    // Find directories containing component.yml files (with variants)
    const standardYmls = await glob(`${baseDir}/**/component.yml`);
    const namedYmls = await glob(`${baseDir}/**/*.component.yml`);

    // Combine results and remove duplicates
    const allComponentPaths = [...standardYmls, ...namedYmls];
    const uniqueDirs = new Set(allComponentPaths.map(filePath => path.dirname(filePath)));

    // Convert to array
    const componentDirs = Array.from(uniqueDirs);

    // Update spinner status
    if (!nonInteractive && spinner) {
      if (componentDirs.length === 0) {
        spinner.stop('No components found');
      } else {
        spinner.stop(`Found ${componentDirs.length} components`);
      }
    } else if (componentDirs.length > 0) {
      console.log(`Found ${componentDirs.length} components`);
    }

    return componentDirs;
  } catch (error) {
    console.error('Error finding component directories:', error);
    return [];
  }
}

/**
 * Select components to upload (all in non-interactive, user selection in interactive)
 */
async function selectComponentsToUpload(componentDirs: string[], nonInteractive: boolean): Promise<string[] | null> {
  // In non-interactive mode, select all components
  if (nonInteractive) {
    console.log(`Selected all ${componentDirs.length} components to upload`);
    return componentDirs;
  }

  // Interactive mode: let user select components
  const selectedDirs = await p.multiselect({
    message: 'Select components to upload',
    options: componentDirs.map(dir => ({
      value: dir,
      label: path.basename(dir),
    })),
    required: true,
  });

  if (p.isCancel(selectedDirs)) {
    p.cancel('Operation cancelled');
    return null;
  }

  // Confirm upload
  const config = getConfig();
  const confirmUpload = await p.confirm({
    message: `Upload ${selectedDirs.length} components to ${config.site_url}?`,
    initialValue: true,
  });

  if (p.isCancel(confirmUpload) || !confirmUpload) {
    p.cancel('Operation cancelled');
    return null;
  }

  return selectedDirs;
}

/**
 * Build and upload components
 */
async function processComponents(
  componentsToUpload: string[],
  apiService: ReturnType<typeof createApiService>,
  nonInteractive: boolean
): Promise<ComponentResult[]> {
  const config = getConfig();
  const results: ComponentResult[] = [];

  // Build components
  const buildResults = await buildSelectedComponents(componentsToUpload, config, nonInteractive);

  // Filter successful builds
  const successfulBuilds = buildResults.filter(build => build.success);

  // If no successful builds, return early
  if (successfulBuilds.length === 0) {
    const message = 'All component builds failed. Upload process aborted.';
    if (!nonInteractive) {
      p.note(chalk.red(message));
    } else {
      console.log(message);
    }
    return results;
  }

  // Process and upload each component
  let spinner: any = null;
  if (!nonInteractive) {
    spinner = p.spinner();
    spinner.start('Uploading components');
  } else {
    console.log('Uploading components...');
  }

  for (const buildResult of successfulBuilds) {
    const dir = buildResult.componentName ?
      componentsToUpload.find(d => path.basename(d) === buildResult.componentName) as string :
      undefined;

    if (!dir) continue;

    try {
      // Process component files
      const componentName = path.basename(dir);
      let logPrefix = nonInteractive ? '' : '[VERBOSE] ';

      if (nonInteractive) {
        console.log(`Processing component ${componentName}...`);
      } else if (config.verbose) {
        console.log(`${logPrefix}Processing component: ${componentName}`);
      }

      // Process all component files
      const {
        jsContent,
        cssContent,
        metadata
      } = await processComponentFiles(dir, componentName, config.verbose);

      const machineName = buildResult.machineName ||
                       metadata.machineName ||
                       componentName.toLowerCase().replace(/[^a-z0-9_-]/g, '_');

      // Create component payload
      // First, make sure we have the sources separated
      // For source code, NEVER use compiled code (jsContent) as a fallback
      const sourceCodeJs = buildResult.sourceCode?.js || '';
      const sourceCodeCss = buildResult.sourceCode?.css || '';

      // For compiled code, use whatever is available
      const compiledJs = buildResult.sourceCode?.compiledJs || jsContent;
      const compiledCss = buildResult.sourceCode?.compiledCss || cssContent;

      const component = createComponentPayload({
        metadata,
        machineName,
        componentName,
        framework: buildResult.framework || 'react',
        sourceCodeJs,
        compiledJs,
        sourceCodeCss,
        compiledCss
      });

      if (config.verbose) {
        console.log(`Component payload: ${JSON.stringify(component)}`)
      }

      // Check if component exists already
      let componentExists = false;
      let action = 'created';

      try {
        if (config.verbose) {
          console.log(`${logPrefix}Checking if component ${machineName} exists...`);
        }
        await apiService.getComponent(machineName);
        componentExists = true;
        if (config.verbose) {
          console.log(`${logPrefix}Component ${machineName} exists, will update`);
        }
      } catch (error) {
        if (config.verbose) {
          console.log(`${logPrefix}Component ${machineName} does not exist, will create new`);
        }
      }

      // Create or update the component
      if (componentExists) {
        await apiService.updateComponent(machineName, component);
        action = 'updated';
      } else {
        await apiService.createComponent(component);
      }

      if (config.verbose) {
        console.log(`${logPrefix}Component ${machineName} ${action} successfully`);
      }

      results.push({
        name: componentName,
        machineName,
        framework: buildResult.framework,
        action,
        success: true,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (config.verbose) {
        console.error(`Error uploading component ${buildResult.componentName}: ${errorMessage}`);
      }

      results.push({
        name: buildResult.componentName || 'Unknown',
        success: false,
        error: errorMessage,
      });
    }
  }

  // Stop spinner in interactive mode
  if (!nonInteractive && spinner) {
    spinner.stop('Upload completed');
  }

  return results;
}

/**
 * Build all selected components
 */
async function buildSelectedComponents(
  componentDirs: string[],
  config: ReturnType<typeof getConfig>,
  nonInteractive: boolean
): Promise<ComponentBuildResult[]> {
  let spinner: any = null;

  // Show progress indicator based on mode
  if (!nonInteractive) {
    spinner = p.spinner();
    spinner.start('Building components');
  } else {
    console.log('Building components...');
  }

  // Build components before upload
  const buildResults: ComponentBuildResult[] = [];

  for (const dir of componentDirs) {
    // Detect component type first to provide better feedback
    const typeResult = await detectComponentType(dir);
    let framework = config.framework;

    // If we can detect the framework from the component, use that instead
    if (typeResult.framework !== 'unknown') {
      framework = typeResult.framework;
    }

    // Log in non-interactive mode
    if (nonInteractive) {
      console.log(`Building ${path.basename(dir)}`);
    }

    // Build the component
    const result = await buildComponent(dir, framework);
    buildResults.push(result);

    // Handle build failures
    if (!result.success) {
      const message = `Failed to build ${path.basename(dir)}: ${result.message}`;
      if (!nonInteractive) {
        if (spinner) spinner.stop('Component build failed');
        console.log(chalk.red(message));
      } else {
        console.log(message);
      }
    }
  }

  // Show build summary
  const successfulBuilds = buildResults.filter(r => r.success).length;
  const failedBuilds = buildResults.filter(r => !r.success).length;

  if (!nonInteractive && spinner) {
    if (failedBuilds > 0) {
      spinner.stop(`Components built with issues: ${successfulBuilds} successful, ${failedBuilds} failed`);
    } else {
      spinner.stop(`All ${successfulBuilds} components built successfully`);
    }
  } else {
    console.log(`Components built: ${successfulBuilds} successful, ${failedBuilds} failed`);
  }

  return buildResults;
}

/**
 * Display upload results
 */
function displayResults(results: ComponentResult[], nonInteractive: boolean): void {
  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;

  if (nonInteractive) {
    console.log(`Upload summary: ${successful} components uploaded successfully, ${failed} failed`);

    if (successful > 0) {
      console.log('Successfully processed components:');
      results
        .filter(r => r.success)
        .forEach(r => {
          const actionVerb = r.action === 'updated' ? 'Updated' : 'Created';
          console.log(`  - ${actionVerb}: ${r.name} (${r.machineName || 'unknown'}) [${r.framework || 'unknown'}]`);
        });
    }

    if (failed > 0) {
      console.log('\nFailed uploads:');
      results
        .filter(r => !r.success)
        .forEach(r => {
          console.log(`  - ${r.name}: ${r.error || 'Unknown error'}`);
        });
    }

    console.log('Component upload completed');
  } else {
    // Show results in interactive mode
    p.note(`Upload summary: ${successful} components uploaded successfully, ${failed} failed`);

    if (successful > 0) {
      console.log(chalk.green('Successfully processed components:'));
      results
        .filter(r => r.success)
        .forEach(r => {
          const actionVerb = r.action === 'updated' ? 'Updated' : 'Created';
          console.log(chalk.green(`  - ${actionVerb}: ${r.name} (${r.machineName || 'unknown'}) [${r.framework || 'unknown'}]`));
        });
    }

    if (failed > 0) {
      console.log(chalk.red('\nFailed uploads:'));
      results
        .filter(r => !r.success)
        .forEach(r => {
          console.log(chalk.red(`  - ${r.name}: ${r.error || 'Unknown error'}`));
        });
    }

    p.outro('Component upload completed');
  }
}

/**
 * Handle errors based on mode
 */
function handleError(error: unknown, nonInteractive: boolean): void {
  if (nonInteractive) {
    console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
  } else {
    if (error instanceof Error) {
      p.note(chalk.red(`Error: ${error.message}`));
    } else {
      p.note(chalk.red(`Unknown error: ${String(error)}`));
    }
  }
}
