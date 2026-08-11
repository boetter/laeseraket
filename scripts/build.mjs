import { cp, mkdir, rm } from 'node:fs/promises';

await rm('dist', { recursive: true, force: true });
await mkdir('dist');
await Promise.all(['index.html', 'styles.css', 'app.js'].map(file => cp(file, `dist/${file}`)));
console.log('Built static site in dist/');
