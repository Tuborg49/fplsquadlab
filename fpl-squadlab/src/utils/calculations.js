const clamp = (value, minimum = 0, maximum = 100) => value === null ? null : Math.min(maximum, Math.max(minimum, value));

const toNumber = value => Number.parseFloat(value) || 0;

const factor = (key, label, rawValue, score, weight, unit = '') => ({
  key,
  label,
  rawValue,
  score: clamp(score),
  weight,
  unit
});

export const buildSquadLabScoreBreakdown = (player, { fixtureDifficulty = null } = {}) => {
  const price = toNumber(player.now_cost) / 10;
  const form = toNumber(player.form);
  const pointsPerGame = toNumber(player.points_per_game);
  const minutes = toNumber(player.minutes);
  const totalPoints = toNumber(player.total_points);
  const valueEfficiency = price > 0 ? totalPoints / price : 0;

  const factors = [
    factor('form', 'Form', form, (form / 10) * 100, 20),
    factor('pointsPerGame', 'Points per game', pointsPerGame, (pointsPerGame / 10) * 100, 20),
    factor('minutes', 'Minutes', minutes, (minutes / 2700) * 100, 15),
    factor('totalPoints', 'Total points', totalPoints, (totalPoints / 300) * 100, 15),
    fixtureDifficulty === null
      ? factor('fixtureDifficulty', 'Fixture difficulty', null, null, 15)
      : factor('fixtureDifficulty', 'Fixture difficulty', fixtureDifficulty, ((5 - fixtureDifficulty) / 4) * 100, 15),
    factor('value', 'Value', valueEfficiency, (valueEfficiency / 40) * 100, 15, ' pts/£m')
  ];

  const availableFactors = factors.filter(item => item.score !== null);
  const availableWeight = availableFactors.reduce((sum, item) => sum + item.weight, 0);
  const score = availableWeight > 0
    ? availableFactors.reduce((sum, item) => sum + (item.score * item.weight), 0) / availableWeight
    : 0;

  return {
    score: Number(score.toFixed(1)),
    factors,
    methodology: {
      form: 'Form is normalized against 10.',
      pointsPerGame: 'Points/game is normalized against 10.',
      minutes: 'Minutes are normalized against 2,700 minutes.',
      totalPoints: 'Total points are normalized against 300 points.',
      fixtureDifficulty: 'Fixture difficulty reverses the 1-5 FDR scale, so easier fixtures score higher.',
      value: 'Value efficiency uses total points per £1m and is normalized against 40 points per £1m.'
    }
  };
};

export const calculateSquadLabScore = (player, options = {}) => buildSquadLabScoreBreakdown(player, options);
