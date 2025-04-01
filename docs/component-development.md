# Component Development Guide

This guide covers best practices for developing components that work well with the Experience Builder CLI.

## Component Structure

Each component should be in its own directory with the following structure:

```
my-component/
├── component.yml (or my-component.component.yml)
├── index.jsx (or index.js)
├── index.css (optional)
└── package.json (optional)
```

## Component Metadata

The `component.yml` file defines your component's metadata:

```yaml
name: My Component
machineName: my_component
description: A reusable component for Experience Builder
framework: react
props:
  properties:
    title:
      type: string
      title: Title
      description: The main heading
      default: Welcome
    subtitle:
      type: string
      title: Subtitle
      description: Smaller text below the title
    backgroundColor:
      type: string
      title: Background Color
      default: "#ffffff"
      format: color
    padding:
      type: number
      title: Padding
      default: 16
slots:
  main:
    title: Main Content
    description: The main content area
  footer:
    title: Footer
    description: Optional footer content
required:
  - title
```

### Properties Schema

Props follow the JSON Schema specification:

| Property Type | Description |
|--------------|-------------|
| `string` | Text input |
| `number` | Numeric input |
| `boolean` | True/false toggle |
| `object` | Nested properties |
| `array` | List of items |

Common property attributes:
- `title`: Display name in the UI
- `description`: Help text
- `default`: Default value
- `format`: Special format (e.g., `color`, `date`, `url`)
- `enum`: Array of allowed values

## Component Source Files

### React Components

React components should export a default function component:

```jsx
import React from 'react';
import './index.css';

function MyComponent(props) {
  const { title, subtitle, backgroundColor, padding } = props;
  
  return (
    <div style={{ backgroundColor, padding: `${padding}px` }}>
      <h2>{title}</h2>
      {subtitle && <p>{subtitle}</p>}
      
      <div className="main-content">
        {props.children?.main}
      </div>
      
      {props.children?.footer && (
        <footer>
          {props.children.footer}
        </footer>
      )}
    </div>
  );
}

export default MyComponent;
```

### CSS Files

CSS is optional but recommended for styling:

```css
.my-component {
  font-family: sans-serif;
  border-radius: 4px;
}

.my-component h2 {
  margin-top: 0;
}

.main-content {
  min-height: 100px;
}

footer {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid #eee;
}
```

## Build Configuration

If your component has a `package.json`, the CLI will use its build script:

```json
{
  "name": "my-component",
  "version": "1.0.0",
  "scripts": {
    "build": "webpack --mode production"
  },
  "dependencies": {
    "react": "^17.0.2"
  },
  "devDependencies": {
    "@babel/core": "^7.14.0",
    "babel-loader": "^8.2.2",
    "css-loader": "^5.2.4",
    "style-loader": "^2.0.0",
    "webpack": "^5.36.2",
    "webpack-cli": "^4.7.0"
  }
}
```

If no `package.json` is found, the CLI will use SWC to transpile your component.

## Best Practices

1. **Props Naming**: Use camelCase for prop names
2. **Source Code**: Keep source code human-readable; the CLI handles transpilation
3. **Component Size**: Keep components focused on a single responsibility
4. **Documentation**: Add descriptions to your props and slots
5. **Defaults**: Provide sensible default values for props
6. **Framework**: Specify the framework in component.yml
7. **Dependencies**: List all dependencies in package.json
8. **TypeScript**: Use TypeScript for better type safety (optional)

## Advanced Usage

### Custom Build Process

If your component requires a custom build process, create a `package.json` with a `build` script:

```json
{
  "scripts": {
    "build": "your-custom-build-command"
  }
}
```

The build script should:
1. Process source files
2. Output compiled files to a `dist` directory
3. Create `dist/index.js` and optionally `dist/index.css`

### Component Testing

For testable components, add a testing setup:

```json
{
  "scripts": {
    "build": "webpack --mode production",
    "test": "jest"
  },
  "devDependencies": {
    "jest": "^27.0.0",
    "react-test-renderer": "^17.0.2"
  }
}
```

### TypeScript Components

TypeScript is supported through the standard build process:

```tsx
import React from 'react';
import './index.css';

interface MyComponentProps {
  title: string;
  subtitle?: string;
  backgroundColor?: string;
  padding?: number;
  children?: {
    main?: React.ReactNode;
    footer?: React.ReactNode;
  };
}

function MyComponent(props: MyComponentProps) {
  const { 
    title, 
    subtitle, 
    backgroundColor = '#ffffff', 
    padding = 16 
  } = props;
  
  return (
    <div style={{ backgroundColor, padding: `${padding}px` }}>
      <h2>{title}</h2>
      {subtitle && <p>{subtitle}</p>}
      
      <div className="main-content">
        {props.children?.main}
      </div>
      
      {props.children?.footer && (
        <footer>
          {props.children.footer}
        </footer>
      )}
    </div>
  );
}

export default MyComponent;
```

## Troubleshooting

### Component Not Found

If your component is not detected by the CLI:
- Ensure your component.yml file is named correctly
- Check if the directory structure matches the expected format
- Run with the `--verbose` flag to see detailed output

### Build Failures

If component building fails:
- Check the console for error messages
- Ensure all dependencies are installed
- Verify your build script works when run directly 

### Upload Issues

If uploads fail:
- Verify your authentication token is valid
- Check your site URL is correct
- Ensure the component metadata is valid YAML