# Advanced Usage Guide

This document provides advanced usage scenarios and best practices for the Experience Builder CLI.

## CI/CD Integration

### GitHub Actions

Example workflow for automated component publishing:

```yaml
name: Publish Components

on:
  push:
    branches: [ main ]
    paths:
      - 'components/**'

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 16
      
      - name: Install dependencies
        run: npm ci
        
      - name: Install Experience Builder CLI
        run: npm install -g @drupal/experience-builder-cli
        
      - name: Upload components
        run: xb upload --token ${{ secrets.EB_TOKEN }} --url ${{ secrets.EB_URL }} --framework react --dir ./components --non-interactive
```

### GitLab CI

Example GitLab CI configuration:

```yaml
stages:
  - deploy

deploy_components:
  stage: deploy
  image: node:16
  script:
    - npm install -g @drupal/experience-builder-cli
    - xb upload --token $EB_TOKEN --url $EB_URL --framework react --dir ./components --non-interactive
  only:
    changes:
      - components/**/*
    refs:
      - main
  variables:
    EB_TOKEN: $EB_TOKEN
    EB_URL: $EB_URL
```

## Monorepo Setup

For projects using a monorepo structure:

```
monorepo/
├── packages/
│   ├── core/
│   ├── ui-components/
│   │   ├── button/
│   │   │   ├── component.yml
│   │   │   ├── index.jsx
│   │   │   └── index.css
│   │   ├── card/
│   │   └── nav/
│   └── shared/
├── apps/
│   ├── web/
│   └── admin/
└── package.json
```

Use the CLI with specific directories:

```bash
# Upload components from a specific directory
xb upload --dir ./packages/ui-components

# Download to a specific directory
xb download --dir ./packages/new-components
```

## Multiple Environments

For managing components across different environments:

```bash
# Create environment-specific scripts in package.json
{
  "scripts": {
    "upload:dev": "xb upload --url https://dev.example.com --token $DEV_TOKEN",
    "upload:stage": "xb upload --url https://stage.example.com --token $STAGE_TOKEN",
    "upload:prod": "xb upload --url https://www.example.com --token $PROD_TOKEN"
  }
}
```

## Component Versioning

When working with component versions, use Git tags:

```bash
# Tag a specific version
git tag -a v1.0.0 -m "Version 1.0.0"

# Build and upload specific version
git checkout v1.0.0
xb upload
```

## Component Libraries

For organized component libraries:

```
components/
├── atoms/
│   ├── button/
│   ├── input/
│   └── icon/
├── molecules/
│   ├── search-box/
│   ├── card/
│   └── menu-item/
└── organisms/
    ├── header/
    ├── footer/
    └── sidebar/
```

## Script Generation

To generate component upload/download scripts:

```javascript
// scripts/generate-components.js
const fs = require('fs');
const path = require('path');

// Create a basic component template
function createComponent(name, description) {
  const dirPath = path.join('components', name);
  
  // Create directory if it doesn't exist
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
  
  // Create component.yml
  const yml = `name: ${name}
machineName: ${name.toLowerCase().replace(/[^a-z0-9_]/g, '_')}
description: ${description}
props:
  properties:
    title:
      type: string
      title: Title
      default: ${name}
slots:
  content:
    title: Content
`;
  
  fs.writeFileSync(path.join(dirPath, 'component.yml'), yml);
  
  // Create index.jsx
  const jsx = `import React from 'react';
import './index.css';

function ${name.replace(/[^a-zA-Z0-9]/g, '')}(props) {
  const { title } = props;
  
  return (
    <div className="${name.toLowerCase()}-component">
      <h2>{title}</h2>
      <div className="content">
        {props.children?.content}
      </div>
    </div>
  );
}

export default ${name.replace(/[^a-zA-Z0-9]/g, '')};
`;
  
  fs.writeFileSync(path.join(dirPath, 'index.jsx'), jsx);
  
  // Create index.css
  const css = `.${name.toLowerCase()}-component {
  padding: 1rem;
  border: 1px solid #eee;
  border-radius: 4px;
}

.${name.toLowerCase()}-component h2 {
  margin-top: 0;
  margin-bottom: 1rem;
}

.content {
  min-height: 50px;
}
`;
  
  fs.writeFileSync(path.join(dirPath, 'index.css'), css);
  
  console.log(`Component ${name} created successfully!`);
}

// Usage
createComponent('ProductCard', 'A card for displaying product information');
```

## Bulk Operations

For handling multiple components:

```javascript
// scripts/upload-all.js
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const componentsDir = path.join(__dirname, '..', 'components');
const componentDirs = fs.readdirSync(componentsDir)
  .filter(file => fs.statSync(path.join(componentsDir, file)).isDirectory());

console.log(`Found ${componentDirs.length} components`);

// Build all components first
console.log('Building all components...');
componentDirs.forEach(dir => {
  console.log(`Building ${dir}...`);
  try {
    execSync('npm run build', { 
      cwd: path.join(componentsDir, dir),
      stdio: 'inherit'
    });
  } catch (e) {
    console.error(`Failed to build ${dir}`);
  }
});

// Upload all components
console.log('Uploading all components...');
execSync('xb upload --non-interactive', { stdio: 'inherit' });
```

## Component Dependencies

For components with dependencies:

```
button/
├── component.yml
├── index.jsx
├── index.css
└── package.json  # Component-specific dependencies
```

With package.json:

```json
{
  "name": "button",
  "version": "1.0.0",
  "dependencies": {
    "classnames": "^2.3.1"
  },
  "devDependencies": {
    "@babel/core": "^7.14.0",
    "webpack": "^5.36.2"
  },
  "scripts": {
    "build": "webpack --mode production"
  }
}
```

## TypeScript Configuration

For TypeScript components:

```typescript
// tsconfig.json
{
  "compilerOptions": {
    "target": "ES2015",
    "module": "ESNext",
    "moduleResolution": "node",
    "jsx": "react",
    "strict": true,
    "esModuleInterop": true,
    "outDir": "dist",
    "declaration": true
  },
  "include": ["*.tsx", "*.ts"],
  "exclude": ["node_modules", "dist"]
}
```

## Performance Tips

1. **Parallel Uploads**: When uploading multiple components, the CLI uses parallel processes for better performance

2. **Selective Uploads**: Use the interactive mode to select only the components you need to upload

3. **Build Caching**: For faster builds, implement caching in your build scripts:

```json
{
  "scripts": {
    "build": "webpack --cache --mode production"
  }
}
```

4. **Component Size**: Keep components small and focused for faster builds and uploads

5. **Split Large Libraries**: If you have many components, split them into separate directories and upload them separately