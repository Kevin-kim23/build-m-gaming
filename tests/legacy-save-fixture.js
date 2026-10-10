import { serializeSave } from '../src/money.js';

// Old fixtures often start from freshState(), whose campaign has since expanded.
// Encode the actual historical 80-region shape; leave the current expected object
// intact so migration assertions still check newly appended regions are empty.
export function serializeLegacySave(state) {
  if (state.version >= 22 && state.version < 34 && state.campaignStars?.length === 160)
    return serializeSave({ ...state, campaignStars:state.campaignStars.slice(0, 80) });
  return serializeSave(state);
}
