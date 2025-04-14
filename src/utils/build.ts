import { promises as fs } from 'fs';
import path from 'path';
import * as yaml from 'js-yaml';
import * as swc from '@swc/core';

/**
 * Component type detection result
 */
export interface ComponentTypeResult {
  framework: 'react' | 'unknown';
  hasPackageJson: boolean;
  hasComponentYml: boolean;
  name?: string;
  machineName?: string;
}

/**
 * Component build result
 */
export interface ComponentBuildResult {
  success: boolean;
  message: string;
  framework?: 'react' | 'unknown';
  componentName?: string;
  machineName?: string;
  distFiles?: string[];
  sourceCode?: {
    js?: string;
    css?: string;
    compiledJs?: string;
    compiledCss?: string;
  };
}

/**
 * Transpile JavaScript with SWC
 * @param sourceCode - The source JavaScript code
 * @returns Transpiled JavaScript code
 */
async function transpileWithSwc(sourceCode: string): Promise<string> {
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
      target: "es2015",
    },
    module: {
      type: "es6"
    },
    minify: false,
    sourceMaps: false
  });
  return result.code;
}

/**
 * Detects the component framework type based on source files and dependencies
 *
 * @param componentDir - The path to the component directory
 * @returns Component type detection result
 */
export async function detectComponentType(componentDir: string): Promise<ComponentTypeResult> {
  const result: ComponentTypeResult = {
    framework: 'unknown',
    hasPackageJson: false,
    hasComponentYml: false
  };

  // Check if component.yml exists (or alternative formats)
  const componentName = path.basename(componentDir);
  const componentYmlPaths = [
    path.join(componentDir, `${componentName}.component.yml`),
  ];

  let foundYmlPath = null;

  for (const ymlPath of componentYmlPaths) {
    try {
      await fs.access(ymlPath);
      foundYmlPath = ymlPath;
      break;
    } catch {
      // File doesn't exist, try next one
    }
  }

  if (foundYmlPath) {
    result.hasComponentYml = true;

    // Parse component.yml to get machine name
    try {
      const ymlContent = await fs.readFile(foundYmlPath, 'utf8');
      const componentConfig = yaml.load(ymlContent) as any;
      result.machineName = componentConfig.machineName;
      result.name = componentConfig.name;
    } catch (error) {
      console.error(`Error parsing component file ${foundYmlPath}: ${error}`);
    }
  } else {
    result.hasComponentYml = false;
  }

  return result;
}

/**
 * Process a component's JavaScript file with SWC
 * @param componentSource - Path to component JavaScript source.
 * @param verbose - Whether to log verbose output
 */
async function processComponentWithSwc(componentSource: string, verbose = false): Promise<{jsPath: string, jsContent: string}> {
  // Create dist directory if it doesn't exist
  const distDir = path.join(path.dirname(componentSource), 'dist');
  if (verbose) {
    console.log(`[VERBOSE] Dist directory: ${distDir}`);
  }

  try {
    await fs.mkdir(distDir, { recursive: true });
  } catch (err) {
    if (verbose) {
      console.log(`[VERBOSE] Error creating dist directory: ${err}`);
    }
  }

  // Find and process the first JavaScript file that exists
  await fs.access(componentSource);
  if (verbose) {
    console.log(`[VERBOSE] Found JS file at: ${componentSource}`);
  }

  // Read the file
  if (verbose) {
    console.log(`[VERBOSE] read the file: ${componentSource}`);
  }
  console.log((await fs.stat(componentSource)).isFile());
  const sourceCode = await fs.readFile(componentSource, 'utf-8');

  // Transpile with SWC
  if (verbose) {
    console.log(`[VERBOSE] transpiling`);
  }
  const transpiledCode = await transpileWithSwc(sourceCode);

  // Write to dist directory
  const outputPath = path.join(distDir, 'index.js');
  await fs.writeFile(outputPath, transpiledCode);

  if (verbose) {
    console.log(`[VERBOSE] Transpiled and wrote output to: ${outputPath}`);
  }

  return { jsPath: outputPath, jsContent: transpiledCode };
}

/**
 * Build a component using its framework-specific build process
 *
 * @param componentDir Path to the component directory
 * @param framework The component framework (react or unknown)
 * @returns Promise resolving to build result
 */
export async function buildComponent(componentDir: string, framework?: 'react' | 'unknown'): Promise<ComponentBuildResult> {
  // Check if verbose mode is enabled
  const verbose = process.env.EXPERIENCE_BUILDER_VERBOSE === 'true';

  const componentName = path.basename(componentDir);
  const result: ComponentBuildResult = {
    success: false,
    message: '',
    componentName
  };

  if (verbose) {
    console.log(`[VERBOSE] Building component: ${componentName}`);
    console.log(`[VERBOSE] Component directory: ${componentDir}`);
    console.log(`[VERBOSE] Provided framework: ${framework || 'not specified'}`);
  }

  try {
    // First detect the component type if framework is not specified
    let detectedFramework = framework;
    let machineName;

    if (!detectedFramework) {
      if (verbose) {
        console.log(`[VERBOSE] No framework specified, detecting component type...`);
      }

      const typeResult = await detectComponentType(componentDir);
      detectedFramework = typeResult.framework;
      machineName = typeResult.machineName;

      if (verbose) {
        console.log(`[VERBOSE] Component type detection results:`);
        console.log(`[VERBOSE] - Framework: ${typeResult.framework}`);
        console.log(`[VERBOSE] - Machine name: ${machineName}`);
        console.log(`[VERBOSE] - Has component.yml: ${typeResult.hasComponentYml}`);
        console.log(`[VERBOSE] - Has package.json: ${typeResult.hasPackageJson}`);
      }

      // Check if component.yml exists
      if (!typeResult.hasComponentYml) {
        result.message = 'Missing component.yml file';
        if (verbose) {
          console.error(`[VERBOSE] Error: Missing component.yml file`);
        }
        return result;
      }

      result.framework = detectedFramework;
      result.machineName = machineName;
    }

    // Make sure we have a valid framework detected
    if (detectedFramework === 'unknown') {
      result.message = 'Unable to determine component framework (should be React)';
      if (verbose) {
        console.error(`[VERBOSE] Error: Unable to determine component framework`);
      }
      return result;
    }

    if (verbose) {
      console.log(`[VERBOSE] Using framework: ${detectedFramework}`);
    }

    // Check if package.json exists
    const packageJsonPath = path.join(componentDir, 'package.json');
    let hasPackageJson = false;

    try {
      await fs.access(packageJsonPath);
      hasPackageJson = true;
    } catch {
      hasPackageJson = false;
    }

    // Create dist directory if it doesn't exist
    const distDir = path.join(componentDir, 'dist');
    try {
      await fs.mkdir(distDir, { recursive: true });
    } catch (error) {
      console.error(`Error creating dist directory: ${error}`);
    }

    try {
      if (verbose) {
        console.log(`[VERBOSE] Processing component ${componentDir} with SWC...`);
      }

      // Check for JavaScript files in different locations
      const componentName = path.basename(componentDir);
      const componentJs = path.join(componentDir, 'index.jsx');

      // Process with SWC
      const { jsContent } = await processComponentWithSwc(componentJs, verbose);

      if (!jsContent) {
        result.message = 'No React source file found';
        return result;
      }

      // Handle CSS files
      let cssContent = '';
      const cssPath = path.join(componentDir, 'index.css');

      if (verbose) {
        console.log(`[VERBOSE] Processing component CSS: ${cssPath}...`);
      }

      // Try each CSS path
      try {
        await fs.access(cssPath);
        cssContent = await fs.readFile(cssPath, 'utf-8');
        // Copy CSS to dist
        await fs.writeFile(path.join(distDir, 'index.css'), cssContent);
      } catch {
        // Continue to next path
      }

      // Store source and compiled code
      result.sourceCode = {
        js: await fs.readFile(componentJs, 'utf-8'),
        css: cssContent,
        compiledJs: jsContent,
        compiledCss: cssContent
      };

      result.distFiles = ['index.js'];
      if (cssContent) {
        result.distFiles.push('index.css');
      }

      result.success = true;
      result.message = `Successfully processed component ${componentName} with SWC`;

      return result;
    } catch (error) {
      console.error(`Error building component with SWC: ${error}`);
      result.message = `Failed to build component: ${error instanceof Error ? error.message : String(error)}`;
      return result;
    }
  } catch (error) {
    console.error(`Error building component: ${error}`);
    result.message = `Failed to build component: ${error instanceof Error ? error.message : String(error)}`;
    return result;
  }
}

/**
 * Builds all components in a directory
 *
 * @param directoryPath - The path to the directory containing components
 * @returns Array of build results for each component
 */
export async function buildAllComponents(directoryPath: string): Promise<ComponentBuildResult[]> {
  const results: ComponentBuildResult[] = [];

  try {
    const entries = await fs.readdir(directoryPath, { withFileTypes: true });
    const componentDirs = entries.filter(entry => entry.isDirectory());

    for (const dir of componentDirs) {
      // Skip node_modules and other special directories
      if (dir.name === 'node_modules' || dir.name.startsWith('.')) {
        continue;
      }

      const componentPath = path.join(directoryPath, dir.name);

      // Detect component type first
      const typeResult = await detectComponentType(componentPath);

      // Only process directories that have a component.yml file
      if (typeResult.hasComponentYml) {
        const result = await buildComponent(componentPath, typeResult.framework);
        results.push(result);

        console.log(`${result.success ? '✅' : '❌'} ${dir.name}: ${result.message}`);
      } else {
        console.log(`⚠️ Skipping ${dir.name}: Not a valid component (missing component.yml)`);
      }
    }
  } catch (error) {
    console.error(`Error building components: ${error}`);
  }

  return results;
}
