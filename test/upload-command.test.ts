import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Command } from 'commander';
import { uploadCommand } from '../src/commands/upload.js';

// Mock dependencies
vi.mock('axios');
vi.mock('fs/promises');
vi.mock('glob', () => ({
  glob: vi.fn().mockResolvedValue(['./test-components/image/image.component.yml']),
}));
vi.mock('@clack/prompts', () => ({
  intro: vi.fn(),
  outro: vi.fn(),
  note: vi.fn(),
  spinner: vi.fn().mockReturnValue({
    start: vi.fn(),
    stop: vi.fn(),
  }),
  multiselect: vi.fn().mockResolvedValue(['./test-components/image']),
  confirm: vi.fn().mockResolvedValue(true),
  isCancel: vi.fn().mockReturnValue(false),
}));

vi.mock('../src/config.js', () => ({
  getConfig: vi.fn(() => ({
    auth_token: 'test-token',
    site_url: 'http://test.example',
    component_dir: './test-components',
    verbose: true,
    framework: 'react',
  })),
  setConfig: vi.fn(),
}));

// Create mock for API
const mockCreateComponent = vi.fn().mockResolvedValue({});
const mockUpdateComponent = vi.fn().mockResolvedValue({});
const mockGetComponent = vi.fn();

vi.mock('../src/services/api.js', () => ({
  createApiService: vi.fn(() => ({
    createComponent: mockCreateComponent,
    updateComponent: mockUpdateComponent,
    getComponent: mockGetComponent,
  })),
}));

// Mock build utility functions
vi.mock('../src/utils/build.js', () => ({
  buildComponent: vi.fn().mockResolvedValue({
    success: true,
    message: 'Success',
    componentName: 'image',
    framework: 'react',
    machineName: 'image',
  }),
  detectComponentType: vi.fn().mockResolvedValue({
    framework: 'react',
    hasPackageJson: true,
    hasComponentYml: true,
    name: 'Image',
    machineName: 'image',
  }),
  buildAllComponents: vi.fn(),
}));

// Mock component files utilities
vi.mock('../src/utils/component-files.js', () => ({
  processComponentFiles: vi.fn().mockResolvedValue({
    jsContent: 'function Image() { return React.createElement("img", { src: "test.jpg", alt: "Test" }); } export default Image;',
    cssContent: '',
    metadata: {
      name: 'Image Component',
      props: {
        type: 'object',
        properties: {
          src: { type: 'string', title: 'Source' },
          alt: { type: 'string', title: 'Alt Text' },
        }
      },
      slots: {},
    },
  }),
  createComponentPayload: vi.fn().mockImplementation((params) => ({
    machineName: params.machineName,
    name: params.metadata.name,
    framework: params.framework,
    status: true,
    props: params.metadata.props,
    slots: params.metadata.slots || {},
    source_code_js: params.sourceCodeJs,
    compiled_js: params.compiledJs,
    source_code_css: params.sourceCodeCss,
    compiled_css: params.compiledCss,
  })),
}));

describe('Upload Command Basic Tests', () => {
  let program: Command;
  
  beforeEach(() => {
    vi.resetAllMocks();
    program = new Command();
    // Mock the component not existing
    mockGetComponent.mockRejectedValueOnce(new Error('Not found'));
  });
  
  afterEach(() => {
    vi.resetAllMocks();
  });
  
  it('should register upload command with options', () => {
    uploadCommand(program);
    
    const uploadCmd = program.commands.find(cmd => cmd.name() === 'upload');
    expect(uploadCmd).toBeDefined();
    
    // Check that required options are registered
    const options = uploadCmd?.options || [];
    const optionNames = options.map(opt => opt.long);
    
    expect(optionNames).toContain('--token');
    expect(optionNames).toContain('--url');
    expect(optionNames).toContain('--framework');
  });
  
  // This test just ensures the command registers properly
  // Full integration tests would be in a separate file
  it('should set up command structure correctly', () => {
    uploadCommand(program);
    expect(program.commands.length).toBe(1);
    expect(program.commands[0].name()).toBe('upload');
  });
});