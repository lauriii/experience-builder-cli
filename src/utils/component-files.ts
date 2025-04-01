import { promises as fs } from 'fs';
import path from 'path';
import * as swc from '@swc/core';
import * as yaml from 'js-yaml';

/**
 * Component file processing result
 */
export interface ComponentFiles {
  jsPath: string;
  jsContent: string;
  cssPath: string;
  cssContent: string;
  metadataPath: string;
  metadata: any;
}

/**
 * Process and read component files from the dist directory
 * @param componentDir Component directory path
 * @param componentName Component name
 * @param verbose Enable verbose logging
 * @returns Processed component files and paths
 */
export async function processComponentFiles(componentDir: string, componentName: string, verbose = false): Promise<ComponentFiles> {
  // Find metadata
  const metadataPath = await findMetadataPath(componentDir, componentName, verbose);
  const metadata = await readComponentMetadata(metadataPath);

  // Find and process JS/CSS files
  const { jsPath, jsContent, cssPath, cssContent } = await processFiles(componentDir, componentName, verbose);

  return {
    jsPath,
    jsContent,
    cssPath,
    cssContent,
    metadataPath,
    metadata
  };
}

/**
 * Find the component metadata file
 * @param componentDir Component directory path
 * @param componentName Component name
 * @param verbose Enable verbose logging
 * @returns Path to the found metadata file
 */
export async function findMetadataPath(componentDir: string, componentName: string, verbose = false): Promise<string> {
  // Try different possible metadata file paths
  let metadataPath = path.join(componentDir, `${componentName}.component.yml`);

  // Check if the standard path exists, if not try alternatives
  try {
    await fs.access(metadataPath);
    if (verbose) {
      console.log(`[VERBOSE] Found component metadata at: ${metadataPath}`);
    }
    return metadataPath;
  } catch (e) {
    console.error(`Error finding component metadata at ${metadataPath}:`, e);
  }
}

/**
 * Reads and validates component metadata from a YAML file
 * @param filePath Path to the YAML file
 * @returns Properly structured component metadata
 */
export async function readComponentMetadata(filePath: string): Promise<any> {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    // Make sure we return an object even if the file is empty
    const rawMetadata = yaml.load(content) || {};

    if (typeof rawMetadata !== 'object') {
      console.error(`Invalid metadata format in ${filePath}. Expected an object, got ${typeof rawMetadata}`);
      return { name: path.basename(path.dirname(filePath)) };
    }

    // Basic validation and normalization
    const metadata = rawMetadata as any;

    // Ensure other required fields
    if (!metadata.name) {
      metadata.name = path.basename(path.dirname(filePath));
    }
    if (!metadata.machineName) {
      metadata.machineName = path.basename(path.dirname(filePath));
    }

    if (!metadata.slots || typeof metadata.slots !== 'object') {
      metadata.slots = {};
    }

    return metadata;
  } catch (error) {
    console.error(`Error reading component metadata from ${filePath}:`, error);
  }
}

/**
 * Process source files and compile them to the dist directory
 * @param componentDir Component directory path
 * @param componentName Component name
 * @param verbose Enable verbose logging
 * @returns JS and CSS paths and contents
 */
export async function processFiles(componentDir: string, componentName: string, verbose = false): Promise<{
  jsPath: string,
  jsContent: string,
  cssPath: string,
  cssContent: string
}> {
  const distDir = path.join(componentDir, 'dist');
  const jsPath = path.join(distDir, 'index.js');
  const cssPath = path.join(distDir, 'index.css');

  // Ensure the dist directory exists
  try {
    await fs.mkdir(distDir, { recursive: true });
  } catch (err) {
    if (verbose) {
      console.log(`[VERBOSE] Error ensuring dist directory: ${err}`);
    }
  }

  // Process source JS files if they exist
  const possibleJsPaths = [
    path.join(componentDir, componentName, 'index.js'),
    path.join(componentDir, componentName, 'index.jsx'),
  ];

  // Process source CSS files if they exist
  const possibleCssPaths = [
    path.join(componentDir, componentName, 'index.css'),
    path.join(componentDir, 'src', 'index.css'),
  ];


  // Try to find and process a JS source file
  for (const sourcePath of possibleJsPaths) {
    try {
      await fs.access(sourcePath);
      if (verbose) {
        console.log(`[VERBOSE] Found JS source file at: ${sourcePath}`);
      }

      // Read the file
      const sourceCode = await fs.readFile(sourcePath, 'utf-8');

      // Transpile with SWC
      const transpiledCode = await swc.transform(sourceCode, {
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
        }
      });

      // Write to dist directory
      await fs.writeFile(jsPath, transpiledCode.code);

      if (verbose) {
        console.log(`[VERBOSE] Transpiled and wrote JS to: ${jsPath}`);
      }
      break;
    } catch (err) {
      if (verbose) {
        console.log(`[VERBOSE] Error processing JS source at ${sourcePath}: ${err}`);
      }
      // Try next path
    }
  }

  // Check for CSS
  let needsCssBuild = false;

  try {
    await fs.access(cssPath);
    if (verbose) {
      console.log(`[VERBOSE] Found compiled CSS file at: ${cssPath}`);
    }
  } catch {
    needsCssBuild = true;
  }

  // Build/copy CSS if needed
  if (needsCssBuild) {
    if (verbose) {
      console.log(`[VERBOSE] Need to copy CSS for component ${componentName}`);
    }

    // Try to find a CSS source file
    for (const sourcePath of possibleCssPaths) {
      try {
        await fs.access(sourcePath);
        if (verbose) {
          console.log(`[VERBOSE] Found CSS source file at: ${sourcePath}`);
        }

        // Read the file and write to dist
        const cssContent = await fs.readFile(sourcePath, 'utf-8');
        await fs.writeFile(cssPath, cssContent);

        if (verbose) {
          console.log(`[VERBOSE] Copied CSS to: ${cssPath}`);
        }
        break;
      } catch (err) {
        // Try next path
      }
    }
  }

  // Now read the actual files from dist to return
  let jsContent = '';
  let cssContent = '';

  try {
    jsContent = await fs.readFile(jsPath, 'utf-8');
    if (verbose) {
      console.log(`[VERBOSE] Read compiled JS (${jsContent.length} bytes)`);
    }
  } catch (err) {
    if (verbose) {
      console.log(`[VERBOSE] No compiled JS found at ${jsPath}`);
    }
  }

  try {
    cssContent = await fs.readFile(cssPath, 'utf-8');
    if (verbose) {
      console.log(`[VERBOSE] Read compiled CSS (${cssContent.length} bytes)`);
    }
  } catch (err) {
    if (verbose) {
      console.log(`[VERBOSE] No compiled CSS found at ${cssPath}`);
    }
  }

  return { jsPath, jsContent, cssPath, cssContent };
}

/**
 * Creates a standardized component payload for API requests
 * @param params Component payload parameters
 * @returns Component payload for API
 */
export function createComponentPayload(params: {
  metadata: any;
  machineName: string;
  componentName: string;
  framework: string;
  sourceCodeJs: string;
  compiledJs: string;
  sourceCodeCss: string;
  compiledCss: string;
}): any {
  const { metadata, machineName, componentName, framework, sourceCodeJs, compiledJs, sourceCodeCss, compiledCss } = params;

  // Ensure props is correctly structured
  const propsData = metadata.props.properties;

  // Ensure slots has correct format
  let slotsData = metadata.slots || {};
  if (typeof slotsData === 'string' || Array.isArray(slotsData)) {
    slotsData = {};
  }

  return {
    machineName,
    name: metadata.name || componentName,
    framework: framework,
    status: true,
    required: Array.isArray(metadata.required) ? metadata.required : [],
    props: propsData,
    slots: slotsData,
    source_code_js: sourceCodeJs,
    compiled_js: compiledJs,
    source_code_css: sourceCodeCss,
    compiled_css: compiledCss,
  };
}
