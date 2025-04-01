#!/usr/bin/env node

/**
 * Simple test script for the upload command
 * Usage:
 *   EXPERIENCE_BUILDER_SITE_URL=https://example.com EXPERIENCE_BUILDER_AUTH_TOKEN=your_token node upload-test.js [component]
 * 
 * Set EXPERIENCE_BUILDER_VERBOSE=true for verbose output
 * 
 * Available components:
 *   - simple-button (default)
 *   - hero-banner
 *   - image-card
 *   - tabs-component (Vue)
 *   - content-accordion (Vue)
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// Get environment variables
const siteUrl = process.env.EXPERIENCE_BUILDER_SITE_URL;
const token = process.env.EXPERIENCE_BUILDER_AUTH_TOKEN;
const verbose = process.env.EXPERIENCE_BUILDER_VERBOSE === 'true';

// Check if required variables are set
if (!siteUrl || !token) {
  console.error('Error: Please set EXPERIENCE_BUILDER_SITE_URL and EXPERIENCE_BUILDER_AUTH_TOKEN environment variables');
  process.exit(1);
}

// Parse component name from arguments or use default
const componentName = process.argv[2] || 'simple-button';
const testComponentsDir = path.join(__dirname, 'test-components');
const componentDir = path.join(testComponentsDir, componentName);

// Check if component directory exists
if (!fs.existsSync(componentDir)) {
  console.error(`Error: Component '${componentName}' not found in ${testComponentsDir}`);
  console.error('Available components:');
  fs.readdirSync(testComponentsDir)
    .filter(dir => fs.statSync(path.join(testComponentsDir, dir)).isDirectory())
    .filter(dir => dir !== 'node_modules')
    .forEach(dir => console.error(`  - ${dir}`));
  process.exit(1);
}

console.log(`Using test component: ${componentName}`);
console.log(`Component directory: ${componentDir}`);

// Command to run
const cmd = `node dist/index.js upload --token "${token}" --url "${siteUrl}" --dir "${componentDir}" --non-interactive`;

try {
  console.log('Running upload command...');
  
  // Execute command with environment variables
  const env = { ...process.env };
  if (verbose) {
    env.EXPERIENCE_BUILDER_VERBOSE = 'true';
  }
  
  // Run the command
  const result = execSync(cmd, { 
    env, 
    stdio: 'inherit',
  });
  
  console.log('Upload completed successfully');
} catch (error) {
  console.error(`Error executing command: ${error.message}`);
  process.exit(1);
}