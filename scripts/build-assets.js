'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');
const esbuild = require('esbuild');

const root = path.resolve(__dirname, '..');
const javascriptFiles = [
  'app.js',
  'member.js',
  'lessons-page.js',
  'lesson-page.js',
  'account.js',
  'journal.js'
];

async function minifyFile(file, loader) {
  const input = path.join(root, file);
  const source = await fs.readFile(input, 'utf8');
  const result = await esbuild.transform(source, {
    loader,
    minify: true,
    target: 'es2020',
    legalComments: 'none'
  });
  const output = path.join(root, file.replace(/\.(js|css)$/, '.min.$1'));
  await fs.writeFile(output, result.code, 'utf8');
  const before = Buffer.byteLength(source);
  const after = Buffer.byteLength(result.code);
  console.log(`${path.basename(output)}: ${before} -> ${after} bytes (${Math.round((1 - after / before) * 100)}% smaller)`);
}

async function main() {
  await minifyFile('styles.css', 'css');
  for (const file of javascriptFiles) await minifyFile(file, 'js');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
