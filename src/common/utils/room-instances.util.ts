/**
 * A room "type" (e.g. NDDC's "4-bed room", capacity 4, bedsTotal 64) spans
 * many real physical rooms — 64/4 = 16 of them. Beds are numbered 1..bedsTotal
 * across that whole pool with no separate "which physical room" field, so a
 * room instance is *derived*: consecutive capacity-sized chunks of that
 * numbering. "Room 1" = beds 1..capacity, "Room 2" = capacity+1..2*capacity,
 * and so on. These indexes/labels are synthetic — not real FUTO room numbers,
 * which don't exist as data anywhere.
 */
export interface RoomInstance {
  index: number; // 1-based
  bedsTotal: number;
  occupiedBeds: number[]; // LOCAL numbers within this instance (1..bedsTotal)
}

type BedLike = { number: number; reservations: { id: string }[] };

export function computeRoomInstances(beds: BedLike[], capacity: number): RoomInstance[] {
  const sorted = [...beds].sort((a, b) => a.number - b.number);
  const instances: RoomInstance[] = [];

  for (let i = 0; i < sorted.length; i += capacity) {
    const chunk = sorted.slice(i, i + capacity);
    const occupiedBeds = chunk
      .map((bed, localIdx) => ({ occupied: bed.reservations.length > 0, localNumber: localIdx + 1 }))
      .filter((b) => b.occupied)
      .map((b) => b.localNumber);
    instances.push({ index: instances.length + 1, bedsTotal: chunk.length, occupiedBeds });
  }

  return instances;
}

/** Inverse of the instance grouping — global bed number for a (Room N, local bed) pick. */
export function toGlobalBedNumber(instanceIndex: number, localBed: number, capacity: number): number {
  return (instanceIndex - 1) * capacity + localBed;
}

/** Which instance a global bed number falls in, and its local number within it. */
export function fromGlobalBedNumber(globalBed: number, capacity: number): { instanceIndex: number; localBed: number } {
  return {
    instanceIndex: Math.floor((globalBed - 1) / capacity) + 1,
    localBed: ((globalBed - 1) % capacity) + 1,
  };
}
