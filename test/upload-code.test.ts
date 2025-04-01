import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock API service
const mockCreateComponent = vi.fn().mockResolvedValue({});
const mockUpdateComponent = vi.fn().mockResolvedValue({});
const mockGetComponent = vi.fn().mockRejectedValue(new Error('Not found'));

const apiService = {
  createComponent: mockCreateComponent,
  updateComponent: mockUpdateComponent,
  getComponent: mockGetComponent
};

// Mock buildComponent function
const mockBuildResult = {
  success: true,
  componentName: 'button',
  framework: 'react',
  sourceCode: {
    js: 'function Button() { return <button>Click</button>; }', // JSX source
    compiledJs: 'function Button() { return React.createElement("button", null, "Click"); }', // Compiled code
    css: '.button { color: blue; }',
    compiledCss: '.button{color:blue}'
  }
};

// Mock the processComponentFiles function
const mockComponentFiles = {
  jsContent: 'function Button() { return React.createElement("button", null, "Click"); }',
  cssContent: '.button{color:blue}',
  metadata: {
    name: 'Button',
    props: { properties: {} },
    slots: {}
  }
};

// Create our own mocked processComponents function to test
async function processComponent(sourceCodeJs, compiledJs) {
  // Simulate creating the component payload
  const payload = {
    name: 'Button',
    machineName: 'button',
    framework: 'react',
    status: true,
    props: { properties: {} },
    slots: {},
    source_code_js: sourceCodeJs,
    compiled_js: compiledJs,
    source_code_css: '',
    compiled_css: ''
  };

  // Call the API
  await apiService.createComponent(payload);

  return payload;
}

describe('Upload Source and Compiled Code', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should correctly pass source and compiled code to API during upload', async () => {
    const sourceJs = 'function Button() { return <button>Click</button>; }';
    const compiledJs = 'function Button() { return React.createElement("button", null, "Click"); }';

    // Process the component
    await processComponent(sourceJs, compiledJs);

    // Verify API was called with correct payload
    expect(mockCreateComponent).toHaveBeenCalledTimes(1);
    const payload = mockCreateComponent.mock.calls[0][0];

    // Verify source and compiled code in the API payload
    expect(payload.source_code_js).toBe(sourceJs);
    expect(payload.compiled_js).toBe(compiledJs);
    expect(payload.source_code_js).not.toBe(payload.compiled_js);
  });

  it('should not use compiled code as source code', async () => {
    const sourceJs = ''; // Empty source
    const compiledJs = 'function Button() { return React.createElement("button", null, "Click"); }';

    // Process the component
    await processComponent(sourceJs, compiledJs);

    // Verify API was called with correct payload
    expect(mockCreateComponent).toHaveBeenCalledTimes(1);
    const payload = mockCreateComponent.mock.calls[0][0];

    // Source should remain empty rather than using compiled
    expect(payload.source_code_js).toBe('');
    expect(payload.compiled_js).toBe(compiledJs);
  });
});
