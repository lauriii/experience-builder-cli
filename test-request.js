import https from 'https';
import http from 'http';
import { promises as dns } from 'dns';

// Try both HTTP and HTTPS
const urls = [
  'https://drupal-dev.ddev.site/xb/api/cli/auth/validate',
  'http://drupal-dev.ddev.site/xb/api/cli/auth/validate',
  'https://drupal-dev.ddev.site/xb/api/config/js_component',
  'http://drupal-dev.ddev.site/xb/api/config/js_component',
  'https://127.0.0.1/xb/api/config/js_component',
  'http://127.0.0.1/xb/api/config/js_component'
];

// Auth token from logs
const token = 'c9d562b7c16934052bd8c595b9f0377ec24eea0ef248850bebca7585948e1e9c';

// Function to test a URL
const testUrl = (url) => {
  return new Promise((resolve) => {
    console.log(`\nTesting URL: ${url}`);
    
    const isHttps = url.startsWith('https');
    const lib = isHttps ? https : http;
    
    const urlObj = new URL(url);
    
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || (isHttps ? 443 : 80),
      path: urlObj.pathname,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      // For HTTPS, disable certificate validation for local dev
      ...(isHttps && {
        rejectUnauthorized: false
      }),
      timeout: 5000
    };
    
    try {
      const req = lib.request(options, (res) => {
        console.log(`Status Code: ${res.statusCode}`);
        console.log(`Headers: ${JSON.stringify(res.headers, null, 2)}`);
        
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          if (data) {
            console.log(`Response data: ${data.substring(0, 200)}${data.length > 200 ? '...' : ''}`);
          } else {
            console.log('No response data');
          }
          resolve();
        });
      });
      
      req.on('error', (e) => {
        console.error(`Problem with request: ${e.message}`);
        resolve();
      });
      
      req.on('timeout', () => {
        console.error('Request timed out');
        req.destroy();
        resolve();
      });
      
      req.end();
    } catch (err) {
      console.error(`Error with ${url}: ${err.message}`);
      resolve();
    }
  });
};

// Process URLs sequentially
(async () => {
  for (const url of urls) {
    await testUrl(url);
  }
  
  // Also check DNS resolution
  try {
    const { address, family } = await dns.lookup('drupal-dev.ddev.site');
    console.log('\nDNS Lookup:');
    console.log(`drupal-dev.ddev.site resolves to ${address} (IPv${family})`);
  } catch (err) {
    console.log('\nDNS Lookup:');
    console.error(`DNS lookup failed: ${err.message}`);
  }
})();