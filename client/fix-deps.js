// Fix nested ajv-keywords dependency issue
const fs = require('fs');
const path = require('path');

const nestedPath = path.join(__dirname, 'node_modules', 'fork-ts-checker-webpack-plugin', 'node_modules', 'schema-utils', 'node_modules', 'ajv-keywords');

if (fs.existsSync(nestedPath)) {
  console.log('Found nested ajv-keywords, checking version...');
  const pkgPath = path.join(nestedPath, 'package.json');
  if (fs.existsSync(pkgPath)) {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    console.log(`Current nested ajv-keywords version: ${pkg.version}`);
  }
}

console.log('Dependency check complete.');

