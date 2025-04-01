import { Command } from 'commander';
import * as p from '@clack/prompts';
import fs from 'fs/promises';
import path from 'path';
import chalk from 'chalk';
import { getConfig, setConfig } from '../config.js';

interface ScaffoldOptions {
  name?: string;
  dir?: string;
}

/**
 * Scaffolding command for creating new Hello World React component
 */
export function scaffoldCommand(program: Command): void {
  program
    .command('scaffold')
    .description('Create a new Hello World React component for Experience Builder')
    .option('-n, --name <n>', 'Component name (used for directory and metadata)')
    .option('-d, --dir <directory>', 'Parent directory to create component in')
    .action(async (options: ScaffoldOptions) => {
      p.intro('Experience Builder Component Scaffold');

      try {
        // Update config with CLI options
        if (options.dir) setConfig({ component_dir: options.dir });
        const config = getConfig();
        const baseDir = config.component_dir;

        // Get component name
        let componentName = options.name;
        if (!componentName) {
          const name = await p.text({
            message: 'Enter the component name',
            placeholder: 'hello-world',
            validate: (value) => {
              if (!value) return 'Component name is required';
              if (!/^[a-zA-Z0-9-_]+$/.test(value)) return 'Component name can only contain letters, numbers, hyphens, and underscores';
              return;
            }
          });

          if (p.isCancel(name)) {
            p.cancel('Operation cancelled');
            return;
          }

          componentName = name;
        }

        // Create component directory
        const componentDir = path.join(baseDir, componentName);
        const s = p.spinner();
        s.start(`Creating component "${componentName}"`);

        try {
          // Create directory
          await fs.mkdir(componentDir, { recursive: true });
          
          // Get template directory path
          const templateDir = path.join(
            path.dirname(new URL(import.meta.url).pathname),
            '../../templates/react-component'
          );
          
          // List template files
          const files = await fs.readdir(templateDir);
          
          // Copy and process each template file
          for (const file of files) {
            const srcPath = path.join(templateDir, file);
            const destPath = path.join(componentDir, file);
            
            // Read template content
            let content = await fs.readFile(srcPath, 'utf-8');
            
            // Replace placeholders with component name
            const pascalCaseName = componentName
              .replace(/[-_\s]+(.)?/g, (_, c) => c ? c.toUpperCase() : '')
              .replace(/^(.)/, c => c.toUpperCase());
            
            const displayName = componentName
              .replace(/-/g, ' ')
              .replace(/_/g, ' ')
              .replace(/\b\w/g, c => c.toUpperCase());
            
            const machineName = componentName.replace(/-/g, '_').toLowerCase();
            
            content = content
              .replace(/HelloWorld/g, pascalCaseName)
              .replace(/hello-world-component/g, `${componentName}-component`)
              .replace(/Hello World/g, displayName)
              .replace(/hello_world/g, machineName);
            
            // Write processed file
            await fs.writeFile(destPath, content, 'utf-8');
          }
          
          s.stop(chalk.green(`Successfully created component "${componentName}"`));
          
          // Show summary and next steps
          p.note(`Component "${componentName}" has been created:
- Directory: ${componentDir}
- Component metadata: ${path.join(componentDir, 'component.yml')}
- Source file: ${path.join(componentDir, 'index.jsx')}
- CSS file: ${path.join(componentDir, 'index.css')}

Next steps:
1. Customize the component files to fit your needs
2. If needed, run: cd ${componentDir} && npm install
3. Build the component: cd ${componentDir} && npm run build
4. Upload to Experience Builder: xb upload --dir ${componentDir}`);
          
          p.outro('Happy coding!');
        } catch (error) {
          s.stop(chalk.red(`Failed to create component "${componentName}"`));
          throw error;
        }
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

// Helper function to convert PascalCase
function pascalCase(str: string): string {
  return str
    .replace(/[-_\s]+(.)?/g, (_, c) => c ? c.toUpperCase() : '')
    .replace(/^(.)/, c => c.toUpperCase());
}