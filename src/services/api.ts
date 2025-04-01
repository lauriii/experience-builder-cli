import axios, { AxiosInstance } from 'axios';
import FormData from 'form-data';
import fs from 'fs/promises';
import https from 'https';
import { getConfig } from '../config.js';

export interface ApiOptions {
  token: string;
  baseUrl: string;
}

export interface Component {
  machineName: string;
  name: string;
  status: boolean;
  framework?: 'react' | 'vue' | 'unknown';
  required?: string[];
  props?: Record<string, any>;
  slots?: Record<string, any>;
  source_code_js?: string;
  compiled_js?: string;
  source_code_css?: string;
  compiled_css?: string;
  block_override?: string | null;
}

export class ApiService {
  private client: AxiosInstance;
  private baseUrl: string;
  private authToken: string;

  constructor(options: ApiOptions) {
    this.baseUrl = options.baseUrl;
    
    // Create the client without authorization headers by default
    this.client = axios.create({
      baseURL: options.baseUrl,
      headers: {
        'Content-Type': 'application/json',
        // Add the CLI marker header to identify CLI requests
        'X-Experience-Builder-CLI': '1',
      },
      // Allow longer timeout for uploads
      timeout: 30000
    });
    
    // Store the token for use in Experience Builder API requests
    this.authToken = options.token;
  }

  /**
   * List all components
   */
  async listComponents(): Promise<Component[]> {
    try {
      const response = await this.client.get('/xb/api/config/js_component', {
        headers: {
          'Authorization': `Bearer ${this.authToken}`
        }
      });
      return response.data;
    } catch (error) {
      this.handleApiError(error);
      throw new Error('Failed to list components');
    }
  }
  
  /**
   * Get a specific component
   */
  async getComponent(machineName: string): Promise<Component> {
    try {
      const response = await this.client.get(`/xb/api/config/js_component/${machineName}`, {
        headers: {
          'Authorization': `Bearer ${this.authToken}`
        }
      });
      return response.data;
    } catch (error) {
      this.handleApiError(error);
      throw new Error(`Component '${machineName}' not found`);
    }
  }

  /**
   * Create a new component
   */
  async createComponent(component: Component): Promise<Component> {
    try {
      const response = await this.client.post('/xb/api/config/js_component', component, {
        headers: {
          'Authorization': `Bearer ${this.authToken}`
        }
      });
      return response.data;
    } catch (error) {
      this.handleApiError(error);
      throw new Error(`Failed to create component '${component.machineName}'`);
    }
  }

  /**
   * Update an existing component
   */
  async updateComponent(machineName: string, component: Partial<Component>): Promise<Component> {
    try {
      const response = await this.client.patch(`/xb/api/config/js_component/${machineName}`, component, {
        headers: {
          'Authorization': `Bearer ${this.authToken}`
        }
      });
      return response.data;
    } catch (error) {
      this.handleApiError(error);
      throw new Error(`Failed to update component '${machineName}'`);
    }
  }

  /**
   * Delete a component
   */
  async deleteComponent(machineName: string): Promise<void> {
    try {
      await this.client.delete(`/xb/api/config/js_component/${machineName}`, {
        headers: {
          'Authorization': `Bearer ${this.authToken}`
        }
      });
    } catch (error) {
      this.handleApiError(error);
      throw new Error(`Failed to delete component '${machineName}'`);
    }
  }

  private handleApiError(error: any): void {
    const config = getConfig();
    const verbose = config.verbose;
    
    if (axios.isAxiosError(error)) {
      if (error.response) {
        const status = error.response.status;
        const data = error.response.data;
        
        if (verbose) {
          console.error('API Error Details:');
          console.error(`- Status: ${status}`);
          console.error(`- URL: ${error.config?.url || 'unknown'}`);
          console.error(`- Method: ${error.config?.method?.toUpperCase() || 'unknown'}`);
          console.error('- Response data:', JSON.stringify(data, null, 2));
          
          // Hide auth token in logs
          const safeHeaders = { ...error.config?.headers };
          if (safeHeaders && safeHeaders.Authorization) {
            safeHeaders.Authorization = 'Bearer ********';
          }
          console.error('- Request headers:', JSON.stringify(safeHeaders, null, 2));
        }
        
        if (status === 401) {
          throw new Error('Authentication failed. Please check your API token.');
        } else if (status === 403) {
          throw new Error('You do not have permission to perform this action. Make sure your user has the "administer code components" permission.');
        } else if (data && data.message) {
          throw new Error(`API Error (${status}): ${data.message}`);
        } else {
          throw new Error(`API Error (${status}): ${error.message}`);
        }
      } else if (error.request) {
        // Request was made but no response received
        if (verbose) {
          console.error('Network Error Details:');
          console.error(`- No response received from server`);
          console.error(`- URL: ${error.config?.url || 'unknown'}`);
          console.error(`- Method: ${error.config?.method?.toUpperCase() || 'unknown'}`);
          
          // Hide auth token in logs
          const safeHeaders = { ...error.config?.headers };
          if (safeHeaders && safeHeaders.Authorization) {
            safeHeaders.Authorization = 'Bearer ********';
          }
          console.error('- Request headers:', JSON.stringify(safeHeaders, null, 2));
          
          // Check if this is a local development site
          const baseUrl = this.baseUrl;
          if (baseUrl.includes('ddev.site')) {
            console.error('\nDDEV Local Development Troubleshooting Tips:');
            console.error('1. Make sure DDEV is running: try "ddev status"');
            console.error('2. Try using HTTP instead of HTTPS: use "http://drupal-dev.ddev.site" as URL');
            console.error('3. Check if the site is accessible in your browser');
            console.error('4. For HTTPS issues: Try "ddev auth ssl" to set up local SSL certificates');
          }
        }
        
        if (this.baseUrl.includes('ddev.site')) {
          throw new Error(`Network error: No response from DDEV site. Is DDEV running? Try using HTTP instead of HTTPS.`);
        } else {
          throw new Error(`Network error: No response from server. Check your site URL and internet connection.`);
        }
      } else {
        if (verbose) {
          console.error('Request Setup Error:');
          console.error(`- Error: ${error.message}`);
          console.error('- Stack:', error.stack);
        }
        throw new Error(`Request setup error: ${error.message}`);
      }
    } else if (error instanceof Error) {
      if (verbose) {
        console.error('General Error:');
        console.error(`- Message: ${error.message}`);
        console.error('- Stack:', error.stack);
      }
      throw new Error(`Network error: ${error.message}`);
    } else {
      if (verbose) {
        console.error('Unknown Error:', error);
      }
      throw new Error('Unknown API error occurred');
    }
  }
}

export function createApiService(): ApiService {
  const config = getConfig();
  
  if (!config.auth_token) {
    throw new Error('Authentication token is required. Set it in the EXPERIENCE_BUILDER_AUTH_TOKEN environment variable or pass it with --token.');
  }
  
  if (!config.site_url) {
    throw new Error('Site URL is required. Set it in the EXPERIENCE_BUILDER_SITE_URL environment variable or pass it with --url.');
  }
  
  return new ApiService({
    token: config.auth_token,
    baseUrl: config.site_url,
  });
}