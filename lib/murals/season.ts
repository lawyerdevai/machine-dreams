/**
 * Season record stub for Arena Murals.
 * Later this becomes the Arena adapter; for now it reads dummy v2 seasons.
 */
import {
  pickDummySeasonV2,
  type DummySeasonV2,
} from "@/lib/arena-murals-dummy-v2";

/**
 * Load a season record. When seasonId is set it is treated as the last used
 * season and excluded from the pick (same as the generator history).
 */
export function getSeasonRecord(seasonId?: string): DummySeasonV2 {
  return pickDummySeasonV2({
    lastSeasonId: seasonId,
  });
}
