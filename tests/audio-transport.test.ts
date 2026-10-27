import assert from 'node:assert/strict';import {test} from 'node:test';
import {readAudioBounded} from '../src/server/audio-transport';
test('declared oversized audio is canceled before reading', async()=>{
 let canceled=false;const res=new Response(new ReadableStream({cancel(){canceled=true;}}),{headers:{'content-length':'9999'}});
 await assert.rejects(readAudioBounded(res,10),/bounded/);assert.equal(canceled,true);
});
test('chunked audio cannot escape the limit by omitting content-length',async()=>{
 let canceled=false;const res=new Response(new ReadableStream({start(c){c.enqueue(new Uint8Array(8));c.enqueue(new Uint8Array(8));},cancel(){canceled=true;}}));
 await assert.rejects(readAudioBounded(res,10),/bounded/);assert.equal(canceled,true);
});
test('valid bounded audio is returned byte for byte',async()=>{
 const bytes=new Uint8Array([1,2,3]);const out=await readAudioBounded(new Response(bytes),10);assert.deepEqual([...out],[1,2,3]);
});
