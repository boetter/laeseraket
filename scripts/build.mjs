import { cp, mkdir, rm } from 'node:fs/promises';

await rm('dist', { recursive: true, force: true });
await mkdir('dist');
await Promise.all(['index.html', 'styles.css', 'app.js', 'manifest.webmanifest', 'sw.js', 'src', 'icons', 'fonts'].map(file => cp(file, `dist/${file}`, { recursive: true })));
console.log('Built static site in dist/');
