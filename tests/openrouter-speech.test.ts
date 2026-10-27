import assert from 'node:assert/strict';
import { test } from 'node:test';
process.env.TURSO_DATABASE_URL = `file:${process.cwd()}/.data/test-speech-${process.pid}.db`;
process.env.TURSO_AUTH_TOKEN = '';
process.env.OPENROUTER_API_KEY = 'sk-or-v1-synthetic-speech-a';
process.env.OPENROUTER_API_KEYS = 'sk-or-v1-synthetic-speech-b';
process.env.FISH_AUDIO_API_KEY = 'sk-fish-synthetic-direct';
import { openrouterSpeech, resetSpeechBackoffForTests, SpeechUnavailable, SPEECH_MODEL } from '../src/server/openrouter-speech';
import { speak } from '../src/server/voice';
import { setOutboundRecorder } from '../src/server/outbound';
const audio = () => new Response(new Uint8Array(1800),{status:200,headers:{'content-type':'audio/mpeg','x-generation-id':'synthetic-generation'}});
async function withFetch(fn:typeof fetch,work:()=>Promise<void>){const original=globalThis.fetch;globalThis.fetch=fn;try{await work();}finally{globalThis.fetch=original;setOutboundRecorder(undefined);await resetSpeechBackoffForTests();}}
test('speech route uses dedicated endpoint, raw audio, explicit voice/instructions and per-slot backoff',async()=>{
  let calls=0;const bodies:string[]=[];setOutboundRecorder(r=>bodies.push(r.body));
  await withFetch(async(u,init)=>{assert.equal(String(u),'https://openrouter.ai/api/v1/audio/speech');calls++;const body=JSON.parse(String(init!.body));assert.equal(body.model,SPEECH_MODEL);assert.equal(body.response_format,'mp3');assert.ok(body.voice);assert.equal(body.instructions,'dry and clear');return calls===1?new Response(JSON.stringify({error:{message:'daily speech quota'}}),{status:429}):audio();},async()=>{
    const r=await openrouterSpeech('Exact test terms.','dry and clear');assert.equal(r.audio.length,1800);assert.equal(r.generationId,'synthetic-generation');assert.equal(calls,2);assert.ok(bodies.every(b=>!b.includes('synthetic-speech-a')));
    await openrouterSpeech('Exact test terms.','dry and clear');assert.equal(calls,3,'limited slot skipped on next call');
  });
});
test('all speech slots limited means no new request; errors never reveal keys',async()=>{
  let calls=0;
  await withFetch(async()=>{calls++;return new Response(process.env.OPENROUTER_API_KEY!,{status:402});},async()=>{
    await assert.rejects(openrouterSpeech('Quota test.','clear'),e=>e instanceof SpeechUnavailable&&!JSON.stringify(e.attempts).includes(process.env.OPENROUTER_API_KEY!));assert.equal(calls,2);
    await assert.rejects(openrouterSpeech('Quota test.','clear'),SpeechUnavailable);assert.equal(calls,2);
  });
});
test('auto voice uses OpenRouter free speech before Fish direct and cached audio stays labeled cached',async()=>{
  const urls:string[]=[];
  await withFetch(async u=>{urls.push(String(u));return audio();},async()=>{
    const r=await speak('Free speech rail integration.');assert.equal(r.model,SPEECH_MODEL);assert.equal(r.cached,false);
    const hit=await speak('Free speech rail integration.');assert.equal(hit.cached,true);assert.equal(urls.length,1);assert.ok(urls[0].includes('openrouter.ai'));
  });
});
test('JSON/text output is not speech, and an explicitly OpenRouter-only request cannot silently fall back',async()=>{
  const urls:string[]=[];
  await withFetch(async u=>{urls.push(String(u));return new Response('{}',{status:200,headers:{'content-type':'application/json'}});},async()=>{
    await assert.rejects(speak('Audio MIME guard.','idle',{rail:'openrouter',noCache:true}),/OpenRouter free speech/);assert.equal(urls.length,1);
  });
});
