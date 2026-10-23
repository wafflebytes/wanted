/** Tour regions as state lists. "east" is the East Coast; regions can be combined. */
export const REGIONS = {
  midwest: ['OH', 'IN', 'IL', 'MI', 'WI', 'MN', 'IA', 'MO', 'KS', 'NE', 'ND', 'SD'],
  east: ['ME', 'NH', 'VT', 'MA', 'RI', 'CT', 'NY', 'NJ', 'PA', 'DE', 'MD', 'DC', 'VA', 'NC', 'SC', 'GA', 'FL'],
  northeast: ['ME', 'NH', 'VT', 'MA', 'RI', 'CT', 'NY', 'NJ', 'PA'],
  south: ['VA', 'WV', 'KY', 'TN', 'NC', 'SC', 'GA', 'FL', 'AL', 'MS', 'LA', 'AR', 'TX', 'OK', 'DE', 'MD', 'DC'],
  west: ['WA', 'OR', 'CA', 'NV', 'ID', 'MT', 'WY', 'UT', 'CO', 'AZ', 'NM', 'AK', 'HI'],
} as const;

export type Region = keyof typeof REGIONS;

export const REGION_LABELS: Record<Region, string> = {
  midwest: 'Midwest',
  east: 'East Coast',
  northeast: 'Northeast',
  south: 'South',
  west: 'West',
};

export function inRegions(state: string, regions: Region[]): boolean {
  if (!regions.length) return true;
  return regions.some((r) => (REGIONS[r] as readonly string[]).includes(state));
}

/** Parses region words out of free text ("Midwest and East Coast"). */
export function regionsFromText(text: string): Region[] {
  const t = text.toLowerCase();
  const out: Region[] = [];
  if (/mid-?west/.test(t)) out.push('midwest');
  if (/east coast|eastern seaboard/.test(t)) out.push('east');
  else if (/north-?east|new england/.test(t)) out.push('northeast');
  if (/\bsouth(ern)?\b|south-?east/.test(t)) out.push('south');
  if (/west coast|pacific|(?<!mid-?)\bwest\b/.test(t)) out.push('west');
  return [...new Set(out)];
}
