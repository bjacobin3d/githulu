/**
 * Post-build script to fix absolute paths for Electron file:// protocol
 * Converts /_nuxt/ paths to ./_nuxt/ for proper loading in Electron
 */

import { readdir, readFile, writeFile } from 'fs/promises';
import { join } from 'path';

const OUTPUT_DIR = '.output/public';

async function fixHtmlFile(filePath) {
  const content = await readFile(filePath, 'utf-8');

  // Fix paths from absolute to relative
  const fixed = content
    // Fix href="/_nuxt/..." to href="./_nuxt/..."
    .replace(/href="\/_nuxt\//g, 'href="./_nuxt/')
    // Fix src="/_nuxt/..." to src="./_nuxt/..."
    .replace(/src="\/_nuxt\//g, 'src="./_nuxt/')
    // Fix imports in importmap
    .replace(/"#entry":"\/_nuxt\//g, '"#entry":"./_nuxt/')
    // Fix baseURL in config
    .replace(/baseURL:"\/"/g, 'baseURL:"./"');

  if (fixed !== content) {
    await writeFile(filePath, fixed, 'utf-8');
    console.log(`Fixed paths in: ${filePath}`);
  }
}

async function processDirectory(dir) {
  const entries = await readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = join(dir, entry.name);

    if (entry.isDirectory()) {
      await processDirectory(fullPath);
    } else if (entry.name.endsWith('.html')) {
      await fixHtmlFile(fullPath);
    }
  }
}

console.log('Fixing paths for Electron compatibility...');
await processDirectory(OUTPUT_DIR);
console.log('Done!');
