// Development-only static preview. Bind to localhost and never connect to a real database.
import http from 'node:http';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {adminFixture} from './admin-fixture.mjs';

const state = adminFixture();
const root = process.cwd();
const port = Number(process.env.STUDIO_PREVIEW_PORT || 3108);
const server = http.createServer(async (request, response) => {
  const pathname = new URL(request.url, 'http://localhost').pathname;
  const send = data => { response.writeHead(200, {'Content-Type': 'application/json'}); response.end(JSON.stringify({data})); };
  if (pathname === '/api/v1/auth/session') return send({email: 'preview@example.test'});
  if (pathname === '/api/v1/admin/state') return send(state);
  if (pathname === '/api/v1/public/content') return send({settings: state.settings, links: [], sections: []});
  if (pathname === '/api/v1/public/books') return send([]);
  if (pathname === '/api/v1/admin/reminders') return send([]);
  if (pathname.startsWith('/api/')) { response.writeHead(422, {'Content-Type': 'application/json'}); response.end(JSON.stringify({error: {message: 'Bản xem trước cục bộ chỉ dùng kiểm tra giao diện.'}})); return; }
  const file = pathname === '/' ? path.join(root, 'index.html') : path.resolve(root, '.' + pathname);
  if (!file.startsWith(root + path.sep)) { response.writeHead(404); response.end(); return; }
  try {
    let content = await readFile(file);
    if (pathname === '/') content = Buffer.from(content.toString().replace('<body>', '<body><div style="position:fixed;bottom:0;right:0;z-index:900;background:#fff3cd;padding:3px 8px;font:10px sans-serif">BẢN XEM THỬ · DỮ LIỆU KIỂM THỬ</div>'));
    const contentType = {'.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript'}[path.extname(file)] || 'application/octet-stream';
    response.writeHead(200, {'Content-Type': contentType});
    response.end(content);
  } catch { response.writeHead(404); response.end(); }
});
server.listen(port, '127.0.0.1', () => console.log(`Admin studio preview http://127.0.0.1:${port}/#/admin/dashboard`));
