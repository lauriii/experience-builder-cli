import { describe, it, expect, vi, beforeEach } from 'vitest';
import fs from 'fs/promises';
import path from 'path';
import * as yaml from 'js-yaml';

// Mock external dependencies
vi.mock('fs/promises');
vi.mock('path', () => ({
  join: vi.fn((...args) => args.join('/')),
  basename: vi.fn((p) => p.split('/').pop()),
  dirname: vi.fn((p) => p.split('/').slice(0, -1).join('/')),
}));
vi.mock('js-yaml');
vi.mock('@swc/core');

// Import the function to test after mocks
import { createComponentPayload } from '../src/utils/component-files.js';

describe('Props Handling Tests', () => {
  beforeEach(() => {
    // Reset all mocks
    vi.resetAllMocks();
  });

  describe('Props Structure Preservation', () => {
    it('should preserve simple props structure', () => {
      // Create a simple props structure
      const simpleProps = {
        properties: {
          text: { type: 'string', title: 'Text' },
          color: { type: 'string', title: 'Color', enum: ['red', 'green', 'blue'] }
        }
      };
      
      const metadata = {
        name: 'Test Component',
        props: simpleProps,
        required: ['text']
      };
      
      // Call the function under test
      const result = createComponentPayload({
        metadata,
        machineName: 'test_component',
        componentName: 'TestComponent',
        framework: 'react',
        sourceCodeJs: 'console.log("test");',
        compiledJs: 'console.log("test");',
        sourceCodeCss: '',
        compiledCss: ''
      });
      
      // Verify props are passed through
      expect(result.props).toBeDefined();
      
      // The implementation uses metadata.props.properties
      expect(result.props).toBe(simpleProps.properties);
    });
    
    it('should preserve complex nested props structure', () => {
      // Create a complex props structure with nested objects
      const complexProperties = {
        settings: {
          type: 'object',
          title: 'Settings',
          properties: {
            appearance: {
              type: 'object',
              properties: {
                theme: {
                  type: 'string',
                  enum: ['light', 'dark', 'auto'],
                  default: 'light'
                },
                spacing: {
                  type: 'number',
                  minimum: 0,
                  maximum: 100
                }
              }
            },
            behavior: {
              type: 'object',
              properties: {
                animation: {
                  type: 'boolean',
                  default: true
                },
                autoplay: {
                  type: 'boolean',
                  default: false
                }
              }
            }
          }
        }
      };
      
      const metadata = {
        name: 'Complex Component',
        props: {
          properties: complexProperties
        }
      };
      
      // Call the function under test
      const result = createComponentPayload({
        metadata,
        machineName: 'complex_component',
        componentName: 'ComplexComponent',
        framework: 'react',
        sourceCodeJs: '',
        compiledJs: '',
        sourceCodeCss: '',
        compiledCss: ''
      });
      
      // Verify props are passed through directly from metadata.props.properties
      expect(result.props).toBe(complexProperties);
      
      // Verify structure is preserved
      expect(result.props.settings.properties.appearance.properties.theme.enum)
        .toEqual(['light', 'dark', 'auto']);
      expect(result.props.settings.properties.behavior.properties.animation.default)
        .toBe(true);
    });
    
    it('should preserve JSON Schema features like $ref', () => {
      // Create props with references
      const propertiesWithRefs = {
        billingAddress: { 
          $ref: '#/definitions/address',
          title: 'Billing Address'
        },
        shippingAddress: { 
          $ref: '#/definitions/address',
          title: 'Shipping Address'
        }
      };
      
      const metadata = {
        name: 'Address Component',
        props: {
          definitions: {
            address: {
              type: 'object',
              properties: {
                street: { type: 'string' },
                city: { type: 'string' },
                zipcode: { type: 'string' }
              }
            }
          },
          properties: propertiesWithRefs
        }
      };
      
      // Call the function under test
      const result = createComponentPayload({
        metadata,
        machineName: 'address_component',
        componentName: 'AddressComponent',
        framework: 'react',
        sourceCodeJs: '',
        compiledJs: '',
        sourceCodeCss: '',
        compiledCss: ''
      });
      
      // Properties should be passed through from metadata.props.properties
      expect(result.props).toBe(propertiesWithRefs);
      
      // Verify references are preserved
      expect(result.props.billingAddress.$ref).toBe('#/definitions/address');
      expect(result.props.shippingAddress.$ref).toBe('#/definitions/address');
    });
    
    it('should handle required props array', () => {
      // Create metadata with required array
      const metadata = {
        name: 'Required Props Component',
        props: {
          properties: {
            title: { type: 'string' },
            description: { type: 'string' }
          }
        },
        required: ['title']
      };
      
      // Call the function under test
      const result = createComponentPayload({
        metadata,
        machineName: 'required_props',
        componentName: 'RequiredPropsComponent',
        framework: 'react',
        sourceCodeJs: '',
        compiledJs: '',
        sourceCodeCss: '',
        compiledCss: ''
      });
      
      // Verify required array is present
      expect(result.required).toEqual(['title']);
    });
  });
  
  describe('Edge Cases', () => {
    it('should handle empty props', () => {
      // Create metadata with empty props
      const metadata = {
        name: 'Empty Props Component',
        props: {
          properties: {}
        }
      };
      
      // Call the function under test
      const result = createComponentPayload({
        metadata,
        machineName: 'empty_props',
        componentName: 'EmptyPropsComponent',
        framework: 'react',
        sourceCodeJs: '',
        compiledJs: '',
        sourceCodeCss: '',
        compiledCss: ''
      });
      
      // Should be an empty object from metadata.props.properties
      expect(result.props).toEqual({});
    });
    
    it('should handle props with unusual types', () => {
      // Create props with non-standard but valid JSON Schema types
      const propsWithUnusualTypes = {
        // Standard types
        text: { type: 'string' },
        number: { type: 'number' },
        boolean: { type: 'boolean' },
        
        // Less common types
        integer: { type: 'integer' },
        nullValue: { type: 'null' },
        
        // Multiple types
        multipleTypes: { type: ['string', 'number'] },
        
        // Array types
        stringArray: {
          type: 'array',
          items: { type: 'string' }
        },
        
        // Format specifiers
        date: { type: 'string', format: 'date' },
        email: { type: 'string', format: 'email' }
      };
      
      const metadata = {
        name: 'Unusual Types Component',
        props: {
          properties: propsWithUnusualTypes
        }
      };
      
      // Call the function under test
      const result = createComponentPayload({
        metadata,
        machineName: 'unusual_types',
        componentName: 'UnusualTypesComponent',
        framework: 'react',
        sourceCodeJs: '',
        compiledJs: '',
        sourceCodeCss: '',
        compiledCss: ''
      });
      
      // Properties should be passed through from metadata.props.properties
      expect(result.props).toBe(propsWithUnusualTypes);
      
      // Check specific types are preserved
      expect(result.props.integer.type).toBe('integer');
      expect(result.props.multipleTypes.type).toEqual(['string', 'number']);
      expect(result.props.stringArray.items.type).toBe('string');
    });
  });
});