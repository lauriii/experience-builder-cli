// Test script to manually verify our changes
const { buildComponent, detectComponentType } = require('./dist/utils/build');
const path = require('path');

async function testBuild() {
  const componentDir = path.join(__dirname, 'test-components/test-image');
  
  console.log('Detecting component type...');
  const typeResult = await detectComponentType(componentDir);
  
  console.log('Detection result:');
  console.log(JSON.stringify(typeResult, null, 2));
  
  console.log('Building component...');
  const buildResult = await buildComponent(componentDir, typeResult.framework);
  
  console.log('Build result:');
  console.log(JSON.stringify(buildResult, null, 2));
}

testBuild().catch(console.error);