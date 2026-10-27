import { handler, json, limit } from '@/server/http';
import { handleMcp, mcpTools } from '@/server/mcp';

/** Gus as a remote MCP server (src/server/mcp.ts). Streamable HTTP, stateless: POST only. */
export const POST = handler(async (req: Request) => {
  await limit(req, 'mcp', 60);
  let msg: unknown;
  try {
    msg = await req.json();
  } catch {
    return json({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Parse error' } }, { status: 400 });
  }
  const out = await handleMcp(msg);
  return out === null ? new Response(null, { status: 202 }) : json(out);
});

/** No server-to-client stream: say so, and say what this is for a person who opens it. */
export const GET = handler(async () =>
  json({ name: 'Gus from Wanted', about: 'Add this URL as a custom connector in Claude or ChatGPT.', tools: mcpTools }, { status: 405, headers: { Allow: 'POST' } }),
);
