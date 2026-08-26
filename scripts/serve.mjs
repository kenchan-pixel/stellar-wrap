import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const host = process.env.HOST || '127.0.0.1';
const port = Number(process.env.PORT || 8080);

const mime = new Map([
  ['.html', 'text/html; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.mjs', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'],
  ['.png', 'image/png'],
  ['.jpg', 'image/jpeg'],
  ['.jpeg', 'image/jpeg'],
  ['.svg', 'image/svg+xml'],
  ['.md', 'text/markdown; charset=utf-8'],
]);

function safePath(urlPath) {
  const clean = decodeURIComponent(urlPath.split('?')[0]).replace(/^\/+/, '');
  const requested = resolve(root, normalize(clean || 'index.html'));
  return requested === root || requested.startsWith(`${root}/`) ? requested : null;
}

const server = createServer((req, res) => {
  let path = safePath(req.url || '/');
  if (!path) {
    res.writeHead(400, { 'content-type': 'text/plain; charset=utf-8' });
    res.end('Bad request');
    return;
  }

  if (existsSync(path) && statSync(path).isDirectory()) path = join(path, 'index.html');
  if (!existsSync(path) || !statSync(path).isFile()) {
    res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
    res.end('Not found');
    return;
  }

  res.writeHead(200, {
    'content-type': mime.get(extname(path).toLowerCase()) || 'application/octet-stream',
    'cache-control': 'no-store',
    'x-content-type-options': 'nosniff',
  });
  createReadStream(path).pipe(res);
});

server.listen(port, host, () => {
  console.log(`Stellar Warp Explorer: http://${host}:${port}`);
  console.log('Press Ctrl+C to stop.');
});
