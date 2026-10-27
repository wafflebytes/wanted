'use client';
import { Art, type ArtName } from '@web/components/Art';
import { Gus, type GusMood } from '@web/components/Gus';

const ARTS: ArtName[] = ['map', 'van', 'poster', 'mail', 'logbook', 'pass', 'dial', 'ticket', 'pick', 'cassette', 'room', 'route', 'mic', 'reply', 'phone', 'coin', 'megaphone', 'stapler', 'seal', 'pin'];
const MOODS: GusMood[] = ['idle', 'listening', 'thinking', 'talking', 'proud', 'worried', 'sleeping', 'done'];

export default function Lab() {
  return (
    <main style={{ padding: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
        {ARTS.map((a) => (
          <div key={a} className="card" style={{ display: 'grid', placeItems: 'center', padding: 6 }}>
            <Art name={a} size={84} />
            <small className="ink-3">{a}</small>
          </div>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginTop: 12 }}>
        {MOODS.map((m) => (
          <div key={m} className="card" style={{ display: 'grid', placeItems: 'center', padding: 6 }}>
            <Gus mood={m} size={84} />
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <Gus mood={m} size={28} />
              <Gus mood={m} size={18} />
            </div>
            <small className="ink-3">{m}</small>
          </div>
        ))}
      </div>
    </main>
  );
}
