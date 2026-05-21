// scripts/obfuscate.js
const { execSync } = require('child_process');
const { existsSync } = require('fs');
const path = require('path');
const glob = require('glob');

const cfg = path.resolve('obfuscator.config.json');

function run(file) {
  console.log('Obfuscating', file);
  execSync(`npx javascript-obfuscator "${file}" --output "${file}" --config "${cfg}"`, { stdio: 'inherit' });
}

if (existsSync('dist/app.js')) run('dist/app.js');

const files = glob.sync('dist/js/**/*.js', { nodir: true, ignore: ['**/js/vendor/**', '**/*.min.js'] });
files.forEach(run);
