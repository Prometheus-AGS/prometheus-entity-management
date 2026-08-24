import {createReadStream} from 'node:fs';
import {createServer} from 'node:http';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createGzip} from 'node:zlib';
import {resolveContainedFile} from './contained-file.mjs';

const websiteRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const buildRoot = path.join(websiteRoot, 'build');
const basePath = '/prometheus-entity-management/';
const host = process.env.DOCS_HOST ?? '127.0.0.1';
const port = Number(process.env.DOCS_PORT ?? 4177);
const contentTypes = new Map([
  ['.css', 'text/css; charset=utf-8'],
  ['.html', 'text/html; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.png', 'image/png'],
  ['.svg', 'image/svg+xml'],
  ['.webp', 'image/webp'],
  ['.woff2', 'font/woff2'],
  ['.xml', 'application/xml; charset=utf-8'],
]);
const compressible = new Set(['.css', '.html', '.js', '.json', '.svg', '.xml']);

function resolveRequest(requestUrl) {
  const pathname = decodeURIComponent(new URL(requestUrl, `http://${host}:${port}`).pathname);
  if (!pathname.startsWith(basePath)) return null;
  const relative = pathname.slice(basePath.length);
  const candidate = path.resolve(buildRoot, relative || 'index.html');
  if (candidate !== buildRoot && !candidate.startsWith(`${buildRoot}${path.sep}`)) return null;
  return candidate;
}

async function findFile(candidate) {
  return resolveContainedFile(buildRoot, candidate);
}

function pipeFile(target, response, gzip) {
  const source = createReadStream(target);
  source.on('error', () => response.destroy());
  if (!gzip) {
    source.pipe(response);
    return;
  }
  const compressor = createGzip();
  compressor.on('error', () => response.destroy());
  source.pipe(compressor).pipe(response);
}

const server = createServer(async (request, response) => {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    response.writeHead(405, {'content-type': 'text/plain; charset=utf-8'}).end('Method not allowed');
    return;
  }
  let candidate = null;
  try {
    candidate = request.url ? resolveRequest(request.url) : null;
  } catch {
    response.writeHead(400, {'content-type': 'text/plain; charset=utf-8'}).end('Bad request');
    return;
  }
  const file = candidate ? await findFile(candidate) : null;
  const notFound = await findFile(path.join(buildRoot, '404.html'));
  if (!notFound) {
    response.writeHead(500, {'content-type': 'text/plain; charset=utf-8'}).end('Missing 404 artifact');
    return;
  }
  const target = file ?? notFound;
  const extension = path.extname(target);
  const gzip = compressible.has(extension) && request.headers['accept-encoding']?.includes('gzip');
  response.writeHead(file ? 200 : 404, {
    'content-type': contentTypes.get(extension) ?? 'application/octet-stream',
    'vary': 'Accept-Encoding',
    ...(gzip ? {'content-encoding': 'gzip'} : {}),
  });
  if (request.method === 'HEAD') response.end();
  else pipeFile(target, response, gzip);
});

server.listen(port, host, () => {
  console.log(`Serving the built Pages artifact at http://${host}:${port}${basePath}`);
});
