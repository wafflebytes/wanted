import { listArtists } from '@/server/artists';
import { handler, json } from '@/server/http';
import { publicArtist } from '@/server/service';

export const GET = handler(async () => json({ artists: (await listArtists()).filter((a) => a.isDemo).map(publicArtist) }));
