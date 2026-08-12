export type RoostStatus = 'available' | 'limited' | 'full';

// Thresholds from BACKEND-README.md §4.6 — hostel and room use different cutoffs.
export function hostelStatus(bedsAvailable: number): RoostStatus {
  if (bedsAvailable === 0) return 'full';
  if (bedsAvailable <= 6) return 'limited';
  return 'available';
}

export function roomStatus(bedsAvailable: number): RoostStatus {
  if (bedsAvailable === 0) return 'full';
  if (bedsAvailable <= 4) return 'limited';
  return 'available';
}

/** REQUIREMENTS.md §2/§5: 100-level and final-year students get allocation priority. */
export function isPriorityLevel(level: string | null | undefined): boolean {
  if (!level) return false;
  return /100 ?level/i.test(level) || /final ?year/i.test(level);
}
