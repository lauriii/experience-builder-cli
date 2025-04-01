import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import axios from 'axios';
import { ApiService, createApiService } from '../src/services/api.js';

// Mock axios
vi.mock('axios');

// Mock config
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

describe('API Service Mock Tests', () => {
  let mockAxiosInstance: any;
  let apiService: ApiService;

  beforeEach(() => {
    vi.resetAllMocks();
    
    // Create mock axios instance with all needed methods
    mockAxiosInstance = {
      get: vi.fn(),
      post: vi.fn(),
      patch: vi.fn(),
      delete: vi.fn(),
      defaults: {
        headers: {
          common: {}
        }
      }
    };
    
    // Mock axios create to return our mock instance
    (axios.create as any).mockReturnValue(mockAxiosInstance);
    
    // Create real API service but with our mocked axios
    apiService = new ApiService({
      token: 'test-token',
      baseUrl: 'http://test.example'
    });
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('API Service Component Operations', () => {
    // Sample component for testing
    const sampleComponent = {
      machineName: 'test_component',
      name: 'Test Component',
      framework: 'react',
      status: true,
      required: [],
      props: {
        type: 'object',
        properties: {
          text: { type: 'string', title: 'Text' }
        }
      },
      slots: {},
      source_code_js: 'function TestComponent() { return <div>Test</div>; }',
      compiled_js: 'function TestComponent() { return React.createElement("div", null, "Test"); }',
      source_code_css: '.test { color: blue; }',
      compiled_css: '.test { color: blue; }'
    };

    it('should correctly format API requests for creating components', async () => {
      // Setup mock response
      mockAxiosInstance.post.mockResolvedValueOnce({ 
        data: { ...sampleComponent, id: '123' } 
      });

      // Call the API service method
      await apiService.createComponent(sampleComponent);

      // Verify the request was formatted correctly
      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        '/xb/api/config/js_component',
        sampleComponent,
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-token'
          })
        })
      );
    });

    it('should correctly format API requests for updating components', async () => {
      // Setup mock response
      mockAxiosInstance.patch.mockResolvedValueOnce({ 
        data: { ...sampleComponent, id: '123' } 
      });

      // Call the API service method
      await apiService.updateComponent('test_component', sampleComponent);

      // Verify the request was formatted correctly
      expect(mockAxiosInstance.patch).toHaveBeenCalledWith(
        '/xb/api/config/js_component/test_component',
        sampleComponent,
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-token'
          })
        })
      );
    });

    it('should correctly format API requests for getting components', async () => {
      // Setup mock response
      mockAxiosInstance.get.mockResolvedValueOnce({ 
        data: { ...sampleComponent, id: '123' } 
      });

      // Call the API service method
      const result = await apiService.getComponent('test_component');

      // Verify the request was formatted correctly
      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        '/xb/api/config/js_component/test_component',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-token'
          })
        })
      );

      // Verify the response is processed correctly
      expect(result).toEqual({ ...sampleComponent, id: '123' });
    });

    it('should correctly format API requests for listing components', async () => {
      // Setup mock response
      mockAxiosInstance.get.mockResolvedValueOnce({ 
        data: [
          { ...sampleComponent, id: '123' },
          { ...sampleComponent, machineName: 'another_component', id: '456' }
        ]
      });

      // Call the API service method
      const result = await apiService.listComponents();

      // Verify the request was formatted correctly
      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        '/xb/api/config/js_component',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-token'
          })
        })
      );

      // Verify the response is processed correctly
      expect(result).toHaveLength(2);
      expect(result[0].machineName).toBe('test_component');
      expect(result[1].machineName).toBe('another_component');
    });
  });

  describe('API Service Basics', () => {
    it('should make proper API requests with authentication', async () => {
      // Setup mock response
      mockAxiosInstance.get.mockResolvedValueOnce({ data: {} });
      
      // Call API method
      await apiService.getComponent('test_component');
      
      // Verify headers are set correctly
      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-token'
          })
        })
      );
    });
    
    it('should correctly construct API URLs', async () => {
      // Setup mock response
      mockAxiosInstance.get.mockResolvedValueOnce({ data: {} });
      
      // Call API method
      await apiService.getComponent('test_component');
      
      // Verify URL is correct
      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        '/xb/api/config/js_component/test_component',
        expect.any(Object)
      );
    });
  });
});

// Test API client features specific to Experience Builder
describe('Experience Builder API Features', () => {
  let mockAxiosInstance: any;
  let apiService: ApiService;

  beforeEach(() => {
    vi.resetAllMocks();
    
    // Create mock axios instance
    mockAxiosInstance = {
      get: vi.fn(),
      post: vi.fn(),
      patch: vi.fn(),
      delete: vi.fn(),
      defaults: { headers: { common: {} } }
    };
    
    (axios.create as any).mockReturnValue(mockAxiosInstance);
    
    apiService = new ApiService({
      token: 'test-token',
      baseUrl: 'http://test.example'
    });
  });

  it('should add the X-Experience-Builder-CLI header to identify CLI requests', () => {
    mockAxiosInstance.get.mockResolvedValueOnce({ data: {} });
    
    apiService.getComponent('test_component');
    
    // Verify the specific header is present in the request
    const createCall = (axios.create as any).mock.calls[0][0];
    expect(createCall.headers).toHaveProperty('X-Experience-Builder-CLI', '1');
  });

  it('should use the provided URL directly without modifying protocol', () => {
    // Reset mocks to recreate API service with a custom URL
    vi.resetAllMocks();
    mockAxiosInstance = { 
      get: vi.fn().mockResolvedValue({ data: {} }),
      defaults: { headers: { common: {} } }
    };
    (axios.create as any).mockReturnValue(mockAxiosInstance);
    
    // Create an API service with HTTPS URL
    const httpsApiService = new ApiService({
      token: 'test-token',
      baseUrl: 'https://example.com'
    });
    
    // Verify that axios.create was called with the exact URL (preserved HTTPS)
    const createCall = (axios.create as any).mock.calls[0][0];
    expect(createCall.baseURL).toBe('https://example.com');
  });

  it('should have a longer timeout for component uploads', () => {
    // Verify that axios.create was called with an extended timeout
    const createCall = (axios.create as any).mock.calls[0][0];
    expect(createCall.timeout).toBeGreaterThan(5000); // Default is usually 0 or 1000ms
  });
});