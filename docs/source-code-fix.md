# Source Code vs. Compiled Code Fix

## Issue Description

There was a bug in the Experience Builder CLI where compiled JavaScript code was being incorrectly sent as source code to the API. This was problematic because:

1. Source code is expected to be human-readable JSX, not compiled JavaScript
2. When users downloaded components to edit them, they would see the compiled code instead of the original source
3. This made component editing difficult since developers prefer to work with JSX rather than compiled React.createElement calls

## Changes Made

### 1. Fixed `upload.ts` Component Processing

In the upload command, we modified how component code is handled:

```typescript
// Before:
const component = createComponentPayload({
  metadata,
  machineName,
  componentName,
  framework: buildResult.framework || 'react',
  sourceCodeJs: buildResult.sourceCode?.js || jsContent,  // Using compiled code as fallback
  compiledJs: buildResult.sourceCode?.compiledJs || jsContent,
  sourceCodeCss: buildResult.sourceCode?.css || cssContent,
  compiledCss: buildResult.sourceCode?.compiledCss || cssContent
});
```

```typescript
// After:
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
```

The key change is that we now never use the compiled code (`jsContent`) as a fallback for source code. Instead, if no source code is available, we use an empty string. This ensures source code is always original JSX, not compiled JavaScript.

### 2. Improved Source Code Detection in `build.ts`

We enhanced the component building process to look for and store the original source files:

```typescript
// Added code to find and store original source
const possibleSourceJsPaths = [
  path.join(componentDir, 'index.jsx'),
  path.join(componentDir, 'index.js'),
  path.join(componentDir, componentName, 'index.jsx'),
  path.join(componentDir, componentName, 'index.js'),
  path.join(componentDir, 'src', 'index.jsx'),
  path.join(componentDir, 'src', 'index.js'),
];

// Find the original source code
let originalSourceCode = '';
for (const sourcePath of possibleSourceJsPaths) {
  try {
    await fs.access(sourcePath);
    originalSourceCode = await fs.readFile(sourcePath, 'utf-8');
    if (verbose) {
      console.log(`[VERBOSE] Found original source code at: ${sourcePath}`);
    }
    break;
  } catch {
    // Try next path
  }
}

// Store source and compiled code separately
result.sourceCode = {
  js: originalSourceCode || jsContent, // Use original source when available
  css: cssContent,
  compiledJs: jsContent,
  compiledCss: cssContent
};
```

### 3. Comprehensive Test Coverage

To ensure source code integrity, we added extensive tests:

1. **Source code separation tests**: Verify that source and compiled code remain separate
2. **Upload handling tests**: Verify correct handling during the upload process
3. **No-fallback tests**: Ensure we never use compiled code as source code

## Benefits

With these fixes:

1. Original JSX/TSX source code is preserved in the Experience Builder system
2. When downloading components, developers will get the original human-readable code
3. Component editing will be much easier with the proper JSX structure
4. Original syntax/formatting/comments in source code will be preserved

## Testing Verification

We've verified through tests that:

1. Source code and compiled code are kept separate throughout the process
2. When original source isn't available, we don't substitute compiled code
3. The API receives the correct payload with both source and compiled code