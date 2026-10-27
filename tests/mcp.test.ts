import assert from 'node:assert/strict';
import { test } from 'node:test';
import { handleMcp } from '../src/server/mcp';

type R = { id?: unknown; result?: Record<string, unknown>; error?: { code: number } };
const rpc = (method: string, params?: unknown, id: number | undefined = 1) => handleMcp({ jsonrpc: '2.0', id, method, params }) as Promise<R>;

test('initialize echoes a supported protocol and offers tools', async () => {
  const r = await rpc('initialize', { protocolVersion: '2025-03-26', capabilities: {}, clientInfo: { name: 't', version: '1' } });
  assert.equal(r.result?.protocolVersion, '2025-03-26');
  assert.ok((r.result?.capabilities as Record<string, unknown>).tools);
});
test('an unknown protocol gets the newest one we speak', async () => {
  const r = await rpc('initialize', { protocolVersion: '1999-01-01' });
  assert.equal(r.result?.protocolVersion, '2025-11-25');
});
test('tools carry schemas and say which ones only read', async () => {
  const r = await rpc('tools/list');
  const tools = r.result?.tools as { name: string; inputSchema: { type: string }; annotations: { readOnlyHint: boolean } }[];
  assert.deepEqual(tools.map((t) => t.name), ['where_am_i_wanted', 'city_brief', 'deals', 'ask_gus', 'ask_rooms']);
  assert.ok(tools.every((t) => t.inputSchema.type === 'object'));
  assert.equal(tools.find((t) => t.name === 'ask_rooms')?.annotations.readOnlyHint, false);
  assert.ok(tools.filter((t) => t.name !== 'ask_rooms').every((t) => t.annotations.readOnlyHint));
});
test('no tool can pay', async () => {
  const r = await rpc('tools/list');
  const names = (r.result?.tools as { name: string }[]).map((t) => t.name).join(' ');
  assert.doesNotMatch(names, /pay|approve|deposit|decide/);
});
test('notifications get no reply', async () => assert.equal(await handleMcp({ jsonrpc: '2.0', method: 'notifications/initialized' }), null));
test('unknown method is a JSON-RPC error', async () => assert.equal((await rpc('nope')).error?.code, -32601));
test('unknown tool is a JSON-RPC error', async () => assert.equal((await rpc('tools/call', { name: 'nope', arguments: {} })).error?.code, -32602));
test('batches answer each request', async () => {
  const out = (await handleMcp([{ jsonrpc: '2.0', id: 1, method: 'ping' }, { jsonrpc: '2.0', method: 'notifications/initialized' }, { jsonrpc: '2.0', id: 2, method: 'ping' }])) as R[];
  assert.deepEqual(out.map((r) => r.id), [1, 2]);
});
