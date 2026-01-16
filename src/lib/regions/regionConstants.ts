/**
 * Regional Constants - East vs West State Mappings
 * This is the single source of truth for regional filtering across the entire application.
 * Used in Pipeline Analytics, Communications Funnel, and all regional filtering.
 */

export type RegionFilter = "all" | "west" | "east";

// West Coast + Mountain + Great Plains states
export const WEST_STATES = [
  'WA', 'OR', 'CA', 'NV', 'ID', 'MT', 'WY', 'UT', 'CO', 'AZ', 'NM',
  'TX', 'OK', 'KS', 'NE', 'SD', 'ND', 'AK', 'HI'
] as const;

// East Coast + Midwest + Southeast states
export const EAST_STATES = [
  'MN', 'IA', 'MO', 'AR', 'LA', 'WI', 'IL', 'IN', 'MI', 'OH',
  'KY', 'TN', 'MS', 'AL', 'GA', 'FL', 'SC', 'NC', 'VA', 'WV',
  'MD', 'DE', 'PA', 'NJ', 'NY', 'CT', 'RI', 'MA', 'VT', 'NH', 'ME', 'DC'
] as const;

// All states combined
export const ALL_STATES = [...WEST_STATES, ...EAST_STATES] as const;

/**
 * Get the array of states for a given region filter.
 * Returns null for "all" (no filtering), otherwise returns the relevant state array.
 */
export function getFilterStates(regionFilter: RegionFilter): string[] | null {
  if (regionFilter === "west") return [...WEST_STATES];
  if (regionFilter === "east") return [...EAST_STATES];
  return null;
}

/**
 * Determine which region a state belongs to
 */
export function getRegionForState(state: string): "west" | "east" | null {
  const upperState = state?.toUpperCase();
  if (WEST_STATES.includes(upperState as typeof WEST_STATES[number])) return "west";
  if (EAST_STATES.includes(upperState as typeof EAST_STATES[number])) return "east";
  return null;
}

/**
 * Check if a state belongs to a specific region filter
 */
export function stateMatchesRegion(state: string | null | undefined, regionFilter: RegionFilter): boolean {
  if (regionFilter === "all") return true;
  if (!state) return false;
  
  const upperState = state.toUpperCase();
  if (regionFilter === "west") return WEST_STATES.includes(upperState as typeof WEST_STATES[number]);
  if (regionFilter === "east") return EAST_STATES.includes(upperState as typeof EAST_STATES[number]);
  return false;
}
