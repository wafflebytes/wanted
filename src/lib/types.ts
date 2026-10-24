/** Types shared by the server, the API client and the UI. */

export type ActKind = 'music' | 'comedy';

export type ActEntity = {
  id: string;
  name: string;
  type: 'artist' | 'person';
  popularity: number;
  image: string | null;
  description: string | null;
  disambiguation: string | null;
  spotifyId: string | null;
  genres: string[];
};

/** One member of a Sound: the 1 to 3 Qloo entities that define an act's taste signal. */
export type SoundEntity = { id: string; name: string; weight?: number; role?: 'self' | 'reference' };

export type Sound = {
  hash: string;
  entities: SoundEntity[];
  kind: ActKind;
  /** True when the act's own heat was thin and reference acts were blended in by weight. */
  blended: boolean;
  thin: boolean;
  cellCount: number;
};

export type HeatCell = { gh: string; lat: number; lon: number; a: number; r: number; p: number };

/** A map hex: H3 index plus heat in 0..1 and the Wanted Score it inherits from its metro. */
export type MapHex = { h3: string; heat: number; score: number | null; metro: string | null };

export type MetroScore = {
  id: string;
  name: string;
  state: string;
  query: string;
  lat: number;
  lon: number;
  pop: number;
  kind: 'metro' | 'college';
  cells: number;
  /** Mean affinity_rank of the act's cells within the metro radius (0..1). */
  heat: number | null;
  /** Act heat minus the baseline panel heat for the same metro. */
  lift: number | null;
  heatPct: number | null;
  liftPct: number | null;
  /** 0..100. */
  score: number | null;
  heatRank: number | null;
  liftRank: number | null;
  rank: number | null;
  sleeper: boolean;
  thin: boolean;
};

export type Locality = {
  id: string;
  name: string;
  /** 1-based rank in Qloo's list after hygiene. Scores step evenly, so show order, not percentages. */
  rank: number;
  score: number;
  lat: number | null;
  lon: number | null;
  areaKm2: number | null;
};

export type DayKey = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';
export type RoomHours = Partial<Record<DayKey, { closed: boolean; opens: string | null; closes: string | null }>>;

export type Room = {
  id: string;
  name: string;
  address: string | null;
  lat: number | null;
  lon: number | null;
  neighborhood: string | null;
  website: string | null;
  phone: string | null;
  hours: RoomHours | null;
  isClosed: boolean;
  description: string | null;
  ambience: string | null;
  crowd: string | null;
  rating: number | null;
  affinity: number | null;
  popularity: number | null;
  explain: { entityId: string; score: number }[];
  tags: string[];
  image: string | null;
};

export type CrowdDemographics = { entityId: string; age: Record<string, number>; gender: Record<string, number> };
export type TasteItem = { id: string; name: string; image: string | null; affinity: number | null };
export type VibeTag = { id: string; name: string; type: string; affinity: number | null };

/** A Qloo call as the user sees it on a receipt (no key, ever). */
export type Receipt = {
  id: string;
  endpoint: string;
  method: 'GET' | 'POST';
  params: Record<string, unknown>;
  status: number | null;
  latencyMs: number;
  cached: boolean;
  cachedAt: number | null;
  stale: boolean;
  purpose: string;
  resultCount: number | null;
};

export type Provenance = 'qloo' | 'fans' | 'gus';

export type RoomBand = 'small' | 'mid' | 'big';

export type TourConstraints = {
  region: 'all' | 'midwest' | 'east' | 'south' | 'west' | 'northeast';
  startDate: string; // yyyy-mm-dd
  dates: number; // 5..20
  roomBand: RoomBand;
  homeBase: string | null; // metro id
};

export type TourStop = {
  metroId: string;
  city: string;
  state: string;
  lat: number;
  lon: number;
  date: string; // yyyy-mm-dd
  day: DayKey;
  locked: boolean;
  room: Room | null;
  roomNeighborhoodRank: number | null;
  driveKmFromPrev: number;
  driveHoursFromPrev: number;
  score: StopScore;
  blurb?: string;
  /** The artist picked this room by hand; re-scoring keeps it even if it's dark that night. */
  roomPinned?: boolean;
};

export type StopScore = {
  total: number; // 0..100
  parts: { wanted: number; proof: number; roomFit: number; openNight: number; drive: number };
  inputs: {
    wantedScore: number | null;
    proofRatio: number | null;
    neighborhoodRank: number | null;
    openThatNight: boolean | null;
    driveHours: number;
  };
};

export type Roast = {
  id: string;
  rule:
    | 'cold-city'
    | 'long-haul'
    | 'weekday-trap'
    | 'wrong-side'
    | 'crowd-split'
    | 'famous-hub'
    | 'ignored-proof'
    | 'closed-night';
  stopIndex: number | null;
  line: string;
  why: string;
  fix: RoastFix | null;
  /** Tour Score change if the Fix is applied, simulated before it's offered. */
  gain?: number;
  severity: 1 | 2 | 3;
  /** The card in plain words: a headline, what changes (from → to), one short reason, the button. */
  card?: RoastCard;
};

export type RoastCard = { title: string; from: string | null; to: string | null; note: string; action: string };

export type RoastFix =
  | { kind: 'swap-city'; stopIndex: number; metroId: string }
  | { kind: 'swap-dates'; a: number; b: number }
  | { kind: 'drop'; stopIndex: number }
  | { kind: 'add-city'; metroId: string }
  | { kind: 'change-room'; stopIndex: number; roomId: string }
  | { kind: 'move-date'; stopIndex: number; date: string };

export type TourPlan = {
  id: string;
  artistId: string;
  constraints: TourConstraints;
  stops: TourStop[];
  total: number;
  splitPenalty: number;
  roasts: Roast[];
  gusLine: string;
  gusModel: string;
  updatedAt: number;
};

export type ClaimView = {
  number: number;
  neighborhood: string | null;
  city: string;
  deputy: boolean;
  initials: string;
  font: number;
  createdAt: number;
  isDemo: boolean;
};

export type CityProof = {
  city: string;
  signatures: number;
  realSignatures: number;
  demoSignatures: number;
  signatureShare: number | null;
  heatShare: number | null;
  ratio: number | null;
  wear: 0 | 1 | 2 | 3;
  neighborhoods: { name: string; count: number }[];
  crossed: boolean;
};

export type InboxMessage = {
  id: string;
  kind: 'threshold' | 'sunday' | 'info' | 'drift' | 'welcome' | 'deal';
  body: string;
  action: { label: string; kind: string; city?: string; roomId?: string; dealId?: string } | null;
  evidence: Record<string, unknown> | null;
  createdAt: number;
  read: boolean;
};

/**
 * A date hold Gus worked out with a room's booking agent (agent to agent). Rooms don't run
 * agents yet, so Wanted runs a stand-in for each one; money only ever moves in test mode.
 */
export type DealTerms = { date: string; day: DayKey; /** The artist's share of the door, in percent. */ split: number; deposit: number; capacity: number | null };
/** One step of the conversation: a letter between the agents, or a tool Gus ran, with what it found. */
export type DealLetter = { from: 'gus' | 'house'; kind: 'letter' | 'tool'; text: string; tool?: string; terms: Pick<DealTerms, 'split' | 'deposit'> | null };
export type DealPayment = {
  /** Stripe test mode when a test key is set, else Wanted's own sandbox ledger. Never live. */
  rail: 'stripe-test' | 'sandbox';
  ref: string;
  amount: number;
  at: number;
  /** The one-time pass Gus paid with: this amount, this room, until this time. */
  pass: { amount: number; payee: string; expiresAt: number };
};
export type Deal = {
  id: string;
  city: string;
  cityName: string;
  roomId: string;
  roomName: string;
  neighborhood: string | null;
  /** talking: the agents are still trading letters. waiting: they agreed; the artist's call. held: deposit paid. */
  status: 'talking' | 'waiting' | 'held' | 'declined' | 'passed';
  terms: DealTerms | null;
  thread: DealLetter[];
  withinLimits: boolean;
  payment: DealPayment | null;
  createdAt: number;
  updatedAt: number;
};
/** What Gus may agree to without asking twice. */
export type DealLimits = { maxDeposit: number; minSplit: number };

/**
 * Everything Gus may do without asking (PRD 9.3d). Money always needs a yes; this sets how far
 * he goes before he asks, and how loudly he's allowed to ask.
 */
export type Mandate = DealLimits & {
  /** When a city proves demand, Gus asks rooms for a hold on his own. */
  autoAsk: boolean;
  /** How many rooms he asks at once (1 to 3). */
  roomsAtOnce: number;
  /** Local hours when he never calls (start inclusive, end exclusive, 24h clock). */
  quietStart: number;
  quietEnd: number;
  /** Calls a week, at most. 0 turns calls off. */
  callsPerWeek: number;
  /** He calls when a paid hold would expire within this many hours. */
  callBeforeExpiryHours: number;
};

/** The escalation ladder (PRD 9.3e): 0 log, 1 notify, 2 ask, 3 review, 4 call. */
export type EscalationLevel = 0 | 1 | 2 | 3 | 4;

/** One line in Gus's Logbook: something he did on his own, why, and from whose data. */
export type LogEntry = {
  id: string;
  kind: 'lookup' | 'decision' | 'letter' | 'escalation' | 'payment' | 'bounty';
  city: string | null;
  title: string;
  detail: string | null;
  source: 'qloo' | 'fans' | 'gus' | 'room' | 'artist';
  level: EscalationLevel;
  ref: { dealId?: string; callId?: string } | null;
  createdAt: number;
};

/** Gus ringing the artist: one decision, said out loud, with the same choice as the review card. */
export type GusCall = {
  id: string;
  dealId: string;
  city: string;
  script: string;
  status: 'ringing' | 'answered' | 'declined' | 'missed' | 'done';
  outcome: 'yes' | 'no' | null;
  createdAt: number;
};
