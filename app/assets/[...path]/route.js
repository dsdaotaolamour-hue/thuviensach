import { readFile } from 'node:fs/promises';
import path from 'node:path';
export async function GET(request, context) {
  const parts = (await context.params).path;
  const base = path.resolve('assets');
  const file = path.resolve(base, ...parts);
  if (!file.startsWith(base + path.sep)) return new Response('', {status:404});
  try {
    const types = {'.js':'text/javascript', '.css':'text/css', '.png':'image/png', '.jpg':'image/jpeg', '.svg':'image/svg+xml'};
    return new Response(await readFile(file), {headers:{'Content-Type':types[path.extname(file)] || 'application/octet-stream'}});
  } catch { return new Response('', {status:404}); }
}
