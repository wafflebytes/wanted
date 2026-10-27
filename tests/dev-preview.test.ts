import assert from 'node:assert/strict';
import test from 'node:test';
import { GET } from '../src/app/api/dev/preview+api';
test('phone preview cannot expose a dev iframe in production', async () => {
  const before = process.env.NODE_ENV;
  try { process.env.NODE_ENV = 'production'; const r = GET(new Request('http://localhost/api/dev/preview')); assert.equal(r.status, 404); assert.equal(await r.text(), 'Not found'); }
  finally { process.env.NODE_ENV = before; }
});
test('phone preview uses a fixed real viewport and allowlisted screens', async () => {
  const before = process.env.NODE_ENV;
  try { process.env.NODE_ENV = 'development'; const r = GET(new Request('http://localhost/api/dev/preview?screen=%3Cscript%3E')); const body = await r.text(); assert.match(body, /width="393" height="852"/); assert.match(body, /src="\/a\/maya-ortiz\/desk"/); assert.equal(body.includes('<script>'), false); }
  finally { process.env.NODE_ENV = before; }
});
