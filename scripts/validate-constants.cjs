const assert = require('node:assert/strict');
const { SERVER_NAME, SERVER_VERSION } = require('../dist/constants.js');
const packageJson = require('../package.json');

assert.equal(SERVER_NAME, packageJson.name, 'SERVER_NAME should match package name');
assert.equal(SERVER_VERSION, packageJson.version, 'SERVER_VERSION should match package version');
assert.match(SERVER_NAME, /^mcp-glpi$/, 'SERVER_NAME should be the MCP GLPI server name');
assert.match(SERVER_VERSION, /^\d+\.\d+\.\d+$/, 'SERVER_VERSION should be semver-like');

console.log('constants validation passed');
