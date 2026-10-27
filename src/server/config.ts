/**
 * Every tunable knob in Wanted lives here (PRD 16.10). The Gauntlet hashes this object
 * into each report, so a change here is a change in the eval record.
 */
export const config = {
  version: '2026-10-23.1',

  score: {
    /** Wanted Score = heatWeight x heat percentile + liftWeight x lift percentile. */
    heatWeight: 0.6,
    liftWeight: 0.4,
    /** Cells within this distance of a metro center count toward its heat. */
    metroRadiusKm: 30,
    /**
     * Which per-cell field is "heat". The PRD named affinity_rank, but on 23 Oct it measured
     * as saturated (median 0.98, p75 0.994 across all cells), so metros differed only in the
     * 4th decimal. `affinity` is uniform 0..1 and separates them (Wallen: Knoxville 0.99,
     * NYC 0.46). Cells are weighted by Qloo's per-cell popularity so the dense core counts more.
     */
    heatField: 'a' as 'a' | 'r',
    popularityWeighted: true,
    /** Below this many cells in a metro, the metro is "data thin" and gets no score. */
    minCellsPerMetro: 2,
    /** Localities bigger than this are counties, not neighborhoods (see trimLocalities). */
    maxLocalityKm2: 1200,
    /** Sleeper = top N by lift and outside top N by heat. */
    sleeperTopN: 15,
  },

  sound: {
    /** Below this many country cells, the act's own heat is thin and reference acts get blended in. */
    thinCellThreshold: 1500,
    ownWeight: 3,
    referenceWeight: 1,
  },

  /**
   * The baseline panel: 20 popular artists across genres. Lift = act heat minus panel
   * heat for the same metro, which removes the "heat follows population" bias.
   */
  baselinePanel: [
    'Taylor Swift', 'Drake', 'Morgan Wallen', 'Bad Bunny', 'The Weeknd',
    'Billie Eilish', 'Kendrick Lamar', 'Luke Combs', 'Karol G', 'Imagine Dragons',
    'SZA', 'Post Malone', 'Zach Bryan', 'Peso Pluma', 'Foo Fighters',
    'Olivia Rodrigo', 'Travis Scott', 'Calvin Harris', 'Bruno Mars', 'Arctic Monkeys',
  ],
  /** Used in order when a panel member comes back thin (Drake returned 2 cells on 23 Oct). */
  baselineSpares: ['Lil Baby', 'Chris Stapleton', 'Doja Cat', 'Coldplay', 'Feid'],

  rooms: {
    perCity: 5,
    fetch: 12,
    musicTags: [
      'urn:tag:category:place:live_music_venue',
      'urn:tag:genre:place:live_music_venue',
      'urn:tag:category:place:live_music_bar',
      'urn:tag:category:place:concert_hall',
    ],
    comedyTags: [
      'urn:tag:category:place:comedy_club',
      'urn:tag:genre:place:comedy_club',
      // Comedy-room coverage is thin (2 rooms in St. Louis in testing), so comedy also tries bars.
      'urn:tag:category:place:bar',
      'urn:tag:category:place:live_music_bar',
    ],
    hangTags: ['urn:tag:category:place:bar', 'urn:tag:category:place:coffee_shop', 'urn:tag:category:place:cafe'],
  },

  proof: {
    /** Gus fires when a city has this many signatures... */
    minSignatures: 50,
    /** ...and its share of signatures is at least this many times its share of heat. */
    ratioThreshold: 1.5,
    cooldownMs: 24 * 60 * 60 * 1000,
    deputyLimit: 50,
    /** Poster wear levels. */
    batteredAt: [50, 100, 250],
    friendsForEarlyAccess: 2,
  },

  tour: {
    /** Per-stop Tour Score weights (PRD 9.5). Must sum to 1. */
    weights: { wanted: 0.4, proof: 0.2, roomFit: 0.15, openNight: 0.1, drive: 0.15 },
    proofCap: 3,
    /** Crowd-split penalty: two stops within this distance and this many days. */
    splitKm: 150,
    splitDays: 21,
    splitPenalty: 6,
    /** Road distance is roughly haversine x this factor; vans average this speed. */
    roadFactor: 1.25,
    vanKmh: 88,
    longHaulHours: 5,
  },

  llm: {
    /** Fast tool planner first; Super VL is the independent model fallback.
     * Both IDs and tool support verified against OpenRouter’s catalog on 25 Oct. */
    taskModels: ['nvidia/nemotron-3.5-lightning:free', 'nvidia/nemotron-3.5-super-vl:free'] as const,
    promptVersion: 'gus-v2',
    taskPromptVersion: 'gus-task-v3-stale-first',
    /** OpenRouter models, tried in order. The deterministic "Gus (lite)" runs if all fail. */
    models: [
      'nvidia/nemotron-3.5-super-vl:free',
      'nvidia/nemotron-3-super-120b-a12b:free',
      'nvidia/nemotron-3.5-lightning:free',
    ],
    /** The voice judge must be a different model from the writer (PRD 16.5). */
    judgeModel: 'nvidia/nemotron-3-ultra-550b-a55b:free',
    timeoutMs: 45_000,
  },

  voice: {
    /** Fish Audio voice "Verity" (8d21b053...): middle-aged male character voice. */
    referenceId: '8d21b053e2804e2a890e1cf62f267b6f',
    /** Drama 3 first; S2.1 Pro takes the same bracket directions if Drama 3 is unavailable. */
    models: ['drama-3', 's2.1-pro', 's2.1-pro-free'],
  },

  qloo: {
    baseUrl: 'https://hackathon.api.qloo.com',
    maxInFlight: 6,
    perSecond: 8,
    retries: 2,
    timeoutMs: 20_000,
    localityTimeoutMs: 60_000,
    cacheTtlMs: 7 * 24 * 60 * 60 * 1000,
    /** The server sends the phone at most this many map cells. */
    maxMapCells: 3000,
  },
} as const;

export type Config = typeof config;
