import { Command } from 'commander';
import * as p from '@clack/prompts';
import fs from 'fs/promises';
import path from 'path';
import chalk from 'chalk';
import * as swc from '@swc/core';
import { setConfig, getConfig } from '../config.js';

interface BuildOptions {
  framework?: 'react';
  dir?: string;
  all?: boolean;
  name?: string;
}

/**
 * Transpile JavaScript with SWC
 * @param sourceCode - The source JavaScript code
 * @returns Transpiled JavaScript code
 */
async function transpileWithSwc(sourceCode: string): Promise<string> {
  try {
    const result = await swc.transform(sourceCode, {
      jsc: {
        parser: {
          syntax: "ecmascript",
          jsx: true,
        },
        transform: {
          react: {
            pragma: 'h',
            pragmaFrag: 'Fragment',
            throwIfNamespace: true,
            development: false,
            runtime: 'automatic',
          },
        },
        target: 'es2015',
      },
      module: {
        type: "es6"
      },
      minify: false,
      sourceMaps: false
    });
    return result.code;
  } catch (error) {
    console.error('SWC transpilation error:', error);
    // Return original source if transpilation fails
    return sourceCode;
  }
}

/**
 * Process a component's JavaScript file with SWC
 * @param componentDir - Path to component directory
 * @param verbose - Whether to log verbose output
 */
async function processComponentWithSwc(componentDir: string, verbose = false): Promise<{jsPath: string, jsContent: string}> {
  // Check for JavaScript files in different locations
  const componentName = path.basename(componentDir);
  const possibleJsPaths = [
    // Root directory (primary location)
    path.join(componentDir, 'index.js'),
    path.join(componentDir, 'index.jsx'),
    // Component subdir
    path.join(componentDir, componentName, 'index.js'),
    path.join(componentDir, componentName, 'index.jsx'),
    // Src directory
    path.join(componentDir, 'src', 'index.js'),
    path.join(componentDir, 'src', 'index.jsx'),
  ];

  // Create dist directory if it doesn't exist
  const distDir = path.join(componentDir, 'dist');
  try {
    await fs.mkdir(distDir, { recursive: true });
  } catch (err) {
    if (verbose) {
      console.log(`[VERBOSE] Error creating dist directory: ${err}`);
    }
  }

  // Find and process the first JavaScript file that exists
  for (const jsPath of possibleJsPaths) {
    try {
      await fs.access(jsPath);
      if (verbose) {
        console.log(`[VERBOSE] Found JS file at: ${jsPath}`);
      }

      // Read the file
      const sourceCode = await fs.readFile(jsPath, 'utf-8');

      if (verbose) {
        console.log(`[VERBOSE] Processing file: ${jsPath}`);
      }

      // Transpile with SWC
      const transpiledCode = await transpileWithSwc(sourceCode);

      // Write to dist directory
      const outputPath = path.join(distDir, 'index.js');
      await fs.writeFile(outputPath, transpiledCode);

      if (verbose) {
        console.log(`[VERBOSE] Transpiled and wrote output to: ${outputPath}`);
      }

      // Also handle CSS if exists
      const jsDir = path.dirname(jsPath);
      const cssPaths = [
        path.join(jsDir, 'index.css'),
        path.join(componentDir, 'index.css'),
        path.join(componentDir, componentName, 'index.css'),
        path.join(componentDir, 'src', 'index.css'),
      ];

      for (const cssPath of cssPaths) {
        try {
          await fs.access(cssPath);
          if (verbose) {
            console.log(`[VERBOSE] Found CSS file at: ${cssPath}`);
          }
          const cssContent = await fs.readFile(cssPath, 'utf-8');
          await fs.writeFile(path.join(distDir, 'index.css'), cssContent);
          if (verbose) {
            console.log(`[VERBOSE] Copied CSS to: ${path.join(distDir, 'index.css')}`);
          }
          break;
        } catch {
          // CSS file not found, continue
        }
      }

      return { jsPath: outputPath, jsContent: transpiledCode };
    } catch (err) {
      // File doesn't exist or can't be read, try the next one
    }
  }

  // No JavaScript file found
  return { jsPath: path.join(distDir, 'index.js'), jsContent: '' };
}

/**
 * Find component directories in a given path
 * @param baseDir - Base directory to search in
 * @returns Array of component directory paths
 */
async function findComponentDirectories(baseDir: string): Promise<string[]> {
  try {
    // Look for component directories by checking for component.yml or *.component.yml files
    const directories = new Set<string>();

    const entries = await fs.readdir(baseDir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        const dirPath = path.join(baseDir, entry.name);
        // Check for *.component.yml
        try {
          await fs.access(path.join(dirPath, `${entry.name}.component.yml`));
          directories.add(dirPath);
          continue;
        } catch {
          // No named component YAML
        }
      }
    }

    return Array.from(directories);
  } catch (error) {
    console.error('Error finding components:', error);
    return [];
  }
}

export function buildCommand(program: Command): void {
  program
    .command('build')
    .description('Build components for Experience Builder')
    .option('-f, --framework <framework>', 'Component framework (react)')
    .option('-d, --dir <directory>', 'Component directory')
    .option('-a, --all', 'Build all components in directory')
    .option('-n, --name <n>', 'Build a specific component by name')
    .action(async (options: BuildOptions) => {
      try {
        p.intro('Experience Builder Component Build');

        // Update config with CLI options
        if (options.framework) setConfig({ framework: options.framework as 'react' });
        if (options.dir) setConfig({ component_dir: options.dir });

        const config = getConfig();
        const componentDir = options.dir || config.component_dir || process.cwd();

        // Find components
        const s = p.spinner();
        s.start('Searching for components');

        let componentDirs: string[] = [];

        if (options.name) {
          // Build a specific component by name
          const specificDir = path.join(componentDir, options.name);
          try {
            await fs.access(specificDir);
            componentDirs = [specificDir];
          } catch {
            s.stop('Component not found');
            p.note(chalk.red(`Component "${options.name}" not found in ${componentDir}`));
            return;
          }
        } else if (options.all) {
          // Build all components in directory
          componentDirs = await findComponentDirectories(componentDir);
        } else {
          // Build components in the current directory
          componentDirs = [componentDir];
        }

        if (componentDirs.length === 0) {
          s.stop('No components found');
          p.note(chalk.yellow('No components found. Please check the directory path.'));
          p.outro('Build canceled');
          return;
        }

        s.stop(`Found ${componentDirs.length} components`);

        // Process each component
        for (const dir of componentDirs) {
          const componentName = path.basename(dir);

          p.log.step(`Building ${chalk.cyan(componentName)}...`);

          try {
            // Process with SWC
            const { jsPath, jsContent } = await processComponentWithSwc(dir, config.verbose);

            if (jsContent) {
              p.log.success(`Built ${chalk.green(componentName)} - JS: ${jsContent.length} bytes`);
            } else {
              p.log.warn(`No source files found for ${chalk.yellow(componentName)}`);
            }
          } catch (error) {
            p.log.error(`Failed to build ${chalk.red(componentName)}: ${error instanceof Error ? error.message : String(error)}`);
          }
        }

        p.outro('Build completed');
      } catch (error) {
        p.cancel(`Error: ${error instanceof Error ? error.message : String(error)}`);
      }
    });
}
