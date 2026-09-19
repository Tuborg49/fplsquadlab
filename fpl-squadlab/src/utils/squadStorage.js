// The squad is kept in localStorage so it survives reloads and is shared between
// the Team Builder, Team Analysis and player details pages.
//
// Saved data can never be trusted: it may come from an older version of the app,
// have been edited by hand, or be truncated. On top of that localStorage itself
// can throw (Safari private mode, storage disabled by browser policy, quota).
// Every read is therefore validated and every write is guarded, so a bad saved
// value can never crash a page.

const STORAGE_KEY = 'fpl_squad';

const isSquadEntry = value =>
  value !== null &&
  typeof value === 'object' &&
  Number.isFinite(Number(value.id));

// Re-normalise the fields the rest of the app relies on so a value saved by an
// older build (or a hand-edited one) still behaves predictably.
const normaliseEntry = entry => ({
  ...entry,
  id: Number(entry.id),
  isStarting: entry.isStarting === true,
  isCaptain: entry.isCaptain === true,
  isViceCaptain: entry.isViceCaptain === true
});

export const loadSquad = () => {
  let raw = null;

  try {
    raw = window.localStorage.getItem(STORAGE_KEY);
  } catch {
    // Storage is unavailable - the app still works, the squad just won't persist.
    return [];
  }

  if (!raw) {
    return [];
  }

  let parsed = null;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }

  if (!Array.isArray(parsed)) {
    return [];
  }

  return parsed.filter(isSquadEntry).map(normaliseEntry);
};

export const saveSquad = squad => {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.isArray(squad) ? squad : []));
  } catch {
    // Nothing to do: a failed save must never break an interaction.
  }
};

export { STORAGE_KEY };
