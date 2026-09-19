export const validatePlayerAddition = (player, currentSquad, gameData) => {
  const { element_types, game_settings } = gameData;
  
  if (!element_types || !game_settings) {
    return { valid: false, message: "Game data is not fully loaded." };
  }

  // 1. Check if already in squad
  if (currentSquad.some(p => p.id === player.id)) {
    return { valid: false, message: "Player is already in your squad." };
  }

  // 2. Check max squad size
  const maxSquadSize = game_settings.squad_squadsize || 15;
  if (currentSquad.length >= maxSquadSize) {
    return { valid: false, message: "Squad is already full." };
  }

  // 3. Check position limit
  const posId = player.element_type;
  const positionConfig = element_types.find(et => et.id === posId);
  const maxInPosition = positionConfig ? positionConfig.squad_select : 0;
  const posName = positionConfig ? positionConfig.singular_name : 'Position';
  
  const playersInPos = currentSquad.filter(p => p.element_type === posId).length;
  if (playersInPos >= maxInPosition) {
    return { valid: false, message: `${posName} limit reached.` };
  }

  // 4. Check club limit
  const maxPerClub = game_settings.squad_team_limit || 3;
  const playersFromClub = currentSquad.filter(p => p.team === player.team).length;
  if (playersFromClub >= maxPerClub) {
    return { valid: false, message: "Maximum players from this club reached." };
  }

  // 5. Check budget
  // game_settings.squad_total_spend is typically 1000 (representing £100.0m)
  const maxBudget = (game_settings.squad_total_spend || 1000) / 10;
  const currentSquadValue = currentSquad.reduce((total, p) => total + (p.now_cost / 10), 0);
  const newPlayerValue = player.now_cost / 10;
  
  // Use a small epsilon to handle floating point precision issues
  if (currentSquadValue + newPlayerValue > maxBudget + 0.001) {
    return { valid: false, message: "Not enough budget." };
  }

  return { valid: true, message: "" };
};

// Absolute maximums for any starting XI.
export const startingPositionLimits = { 1: 1, 2: 5, 3: 5, 4: 3 };

export const getStartingPlayerCount = (squad) => squad.filter(p => p.isStarting).length;

// Adds a player to a squad after validating the FPL squad rules, and places them
// in the starting XI when a legal slot is still free. Returns the unchanged squad
// together with the reason when the player cannot be added.
export const addPlayerToSquad = (squad, player, gameData) => {
  const validation = validatePlayerAddition(player, squad, gameData);
  if (!validation.valid) {
    return { squad, added: false, message: validation.message };
  }

  let isStarting = false;
  if (getStartingPlayerCount(squad) < 11) {
    const startingInPosition = squad.filter(p => p.isStarting && p.element_type === player.element_type).length;
    isStarting = startingInPosition < (startingPositionLimits[player.element_type] || 0);
  }

  const newPlayer = {
    ...player,
    isStarting,
    isCaptain: squad.length === 0,
    isViceCaptain: squad.length === 1
  };

  return { squad: [...squad, newPlayer], added: true, message: '' };
};

export const isValidStartingFormation = (startingSquad) => {
  const counts = { 1: 0, 2: 0, 3: 0, 4: 0 };
  startingSquad.forEach(p => {
    counts[p.element_type] = (counts[p.element_type] || 0) + 1;
  });

  // Absolute maximums for any starting XI
  if (counts[1] > 1) return { valid: false, message: "Too many Goalkeepers in starting XI." };
  if (counts[2] > 5) return { valid: false, message: "Too many Defenders in starting XI." };
  if (counts[3] > 5) return { valid: false, message: "Too many Midfielders in starting XI." };
  if (counts[4] > 3) return { valid: false, message: "Too many Forwards in starting XI." };

  // If full 11, check minimums
  if (startingSquad.length === 11) {
    if (counts[1] !== 1) return { valid: false, message: "Must have 1 Goalkeeper in starting XI." };
    if (counts[2] < 3) return { valid: false, message: "Must have at least 3 Defenders in starting XI." };
    if (counts[4] < 1) return { valid: false, message: "Must have at least 1 Forward in starting XI." };
  }

  return { valid: true, message: "" };
};
