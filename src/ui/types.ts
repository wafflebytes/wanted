/** Shapes of Wanted's API responses, as the UI reads them. */
import type { ActKind, CityProof, ClaimView, InboxMessage, Locality, MetroScore, Receipt, Room, RoomBand, Sound, TasteItem, TourPlan, VibeTag, ActEntity } from '@/lib/types';

export type PublicArtist = { id: string; slug: string; name: string; kind: ActKind; sound: Sound; imageUrl: string | null; portrait: string | null; homeBase: string | null; roomBand: RoomBand; isDemo: boolean };

export type OpenedCity = {
  city: string;
  name: string;
  state: string;
  heat: number | null;
  heatShare: number | null;
  topNeighborhoods: string[];
  openedAt: number;
  playedAt: number | null;
  playedVenue: string | null;
  proof: CityProof | null;
  posterPath: string;
};

export type ArtistState = { artist: PublicArtist; opened: OpenedCity[]; inbox: InboxMessage[]; unread: number };

export type MapMetroRow = Pick<MetroScore, 'id' | 'name' | 'state' | 'lat' | 'lon' | 'pop' | 'kind' | 'score' | 'heat' | 'lift' | 'heatPct' | 'liftPct' | 'heatRank' | 'liftRank' | 'rank' | 'sleeper' | 'cells'>;

export type MapData = {
  sound: Sound;
  notices: string[];
  baselineSize: number;
  metros: MapMetroRow[];
  hexes: { h3: string; heat: number; score: number | null; metro: string | null }[];
  sleepers: string[];
  opened: string[];
  proof: CityProof[];
  dots: { lat: number; lon: number; count: number; neighborhood: string; city: string; confirmed: boolean }[];
  receipts: Receipt[];
};

export type CityRoom = Room & {
  rank: number;
  neighborhoodRank: number | null;
  openDays: string[] | null;
  closedDays: string[] | null;
  sizeGuess: 'intimate' | 'small' | 'mid' | 'big' | null;
  sizeReason: string | null;
  pulledBy: { name: string; share: number }[] | null;
};

export type CityData = {
  metro: { id: string; name: string; state: string; stateName: string; query: string; lat: number; lon: number; pop: number; kind: string };
  hexes: { h3: string; heat: number; lat: number; lon: number }[];
  cellCount: number;
  thin: boolean;
  neighborhoods: Locality[];
  neighborhoodsPending: boolean;
  outline: [number, number][] | null;
  rooms: CityRoom[];
  droppedClosed: { name: string }[];
  receipts: Receipt[];
  notices: string[];
  score: MetroScore | null;
  proof: CityProof | null;
  opened: boolean;
  gusLine?: string | null;
};

export type SkewBar = { key: string; label: string; skew: number };
export type Crowd = {
  who: { age: SkewBar[]; gender: SkewBar[]; line: string | null } | null;
  love: { shows: TasteItem[]; brands: TasteItem[]; podcasts: TasteItem[] };
  vibe: VibeTag[];
  openers: (ActEntity & { shared: { name: string; score: number }[] })[];
  hang: { neighborhood: string; spots: TasteItem[] } | null;
  receipts: Receipt[];
  city?: string | null;
};

export type PlanResponse = { plan: (TourPlan & { receipts?: Receipt[] }) | null };

export type PosterState = {
  artist: { slug: string; name: string; kind: ActKind; portrait: string | null; imageUrl: string | null; isDemo: boolean };
  city: { id: string; name: string; state: string; lat: number; lon: number };
  count: number;
  wear: 0 | 1 | 2 | 3;
  deputiesLeft: number;
  topNeighborhoods: string[];
  neighborhoods: { name: string; rank: number; lat: number | null; lon: number | null }[];
  signatures: (ClaimView & { refCode?: string; earlyAccess?: boolean })[];
  mine: (ClaimView & { refCode: string; earlyAccess: boolean; friends: number }) | null;
  played: { at: number; venue: string | null } | null;
  rank: number | null;
  /** The Bounty (FR-23d): one signer meets the artist. Mirrors the server's BountyView. */
  bounty?: {
    prize: string;
    status: 'open' | 'drawn';
    commit: string;
    signers: number;
    totalEntries: number;
    rules: string;
    mine: { entries: number; deputy: boolean; friends: number } | null;
    drawn: {
      at: number;
      by: 'artist' | 'gus';
      winner: { number: number; initials: string; neighborhood: string | null };
      mineWon: boolean;
      proof: { secret: string; snapshotHash: string; snapshot: string; ticket: number; total: number };
    } | null;
  };
  hexes: { h3: string; heat: number; lat: number; lon: number }[];
};

export type Pitch = {
  evidence: Record<string, unknown> & { city: string; room: string | null; affinity: number | null; signatures: number; ratio: number | null; neighborhoods: string[]; opener: string | null };
  email: { subject: string; body: string; to: string | null; model: string; words: number; grounded: boolean; violations?: string[] };
  room: CityRoom | null;
  receipts: Receipt[];
};

export type TraceCall = Receipt & { at: number; scope: string };
