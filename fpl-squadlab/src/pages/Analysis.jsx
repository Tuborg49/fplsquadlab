import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { getBootstrap, getFixtures } from '../services/fplApi';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend
} from 'recharts';
import AIAssistant from '../components/AIAssistant';
import './Analysis.css';

const POSITION_COLORS = {
  GK: '#eab308',
  DEF: '#3b82f6',
  MID: '#22c55e',
  FWD: '#ef4444'
};

const CHART_COLORS = ['#02894e', '#3b82f6', '#eab308', '#ef4444', '#7c3aed', '#0891b2', '#db2777'];

const toNumber = value => Number.parseFloat(value) || 0;

const getUpcomingFixtures = (player, fixtures, currentEvent) => fixtures
  .filter(fixture => (fixture.team_h === player.team || fixture.team_a === player.team) && fixture.event > currentEvent)
  .sort((first, second) => first.event - second.event)
  .slice(0, 3);

const formatMoney = value => `£${value.toFixed(1)}m`;
const formatDifference = (value, digits = 1, suffix = '') => {
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(digits)}${suffix}`;
};

const Analysis = () => {
  const [data, setData] = useState(null);
  const [fixtures, setFixtures] = useState([]);
  const [squad, setSquad] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPlayerId, setCurrentPlayerId] = useState(null);
  const [replacementId, setReplacementId] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);

    try {
      const [bootstrapData, fixturesData] = await Promise.all([
        getBootstrap(),
        getFixtures()
      ]);

      setData(bootstrapData);
      setFixtures(fixturesData || []);

      let savedSquad = [];
      try {
        savedSquad = JSON.parse(localStorage.getItem('fpl_squad') || '[]');
      } catch {
        savedSquad = [];
      }
      const liveSquad = savedSquad.map(savedPlayer => {
        const livePlayer = bootstrapData.elements.find(player => player.id === savedPlayer.id);
        if (!livePlayer) {
          return savedPlayer;
        }

        return {
          ...savedPlayer,
          ...livePlayer,
          isStarting: savedPlayer.isStarting,
          isCaptain: savedPlayer.isCaptain,
          isViceCaptain: savedPlayer.isViceCaptain
        };
      });

      setSquad(liveSquad);
    } catch (err) {
      setError(err.message || 'Failed to load analysis data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const analysis = useMemo(() => {
    if (!data || squad.length === 0) {
      return null;
    }

    const maxBudget = (data.game_settings?.squad_total_spend || 1000) / 10;
    const currentEvent = data.events?.find(event => event.is_current)?.id || 0;

    const positionMap = { GK: { count: 0, value: 0 }, DEF: { count: 0, value: 0 }, MID: { count: 0, value: 0 }, FWD: { count: 0, value: 0 } };
    const clubMap = {};
    const difficultyData = [];

    let squadValue = 0;
    let totalPoints = 0;
    let totalForm = 0;
    let totalPPG = 0;

    squad.forEach(player => {
      const price = toNumber(player.now_cost) / 10;
      const points = toNumber(player.total_points);
      const form = toNumber(player.form);
      const ppg = toNumber(player.points_per_game);
      const position = data.element_types.find(item => item.id === player.element_type)?.singular_name_short || 'UNK';
      const club = data.teams.find(team => team.id === player.team)?.short_name || data.teams.find(team => team.id === player.team)?.name || 'Unknown';

      squadValue += price;
      totalPoints += points;
      totalForm += form;
      totalPPG += ppg;

      if (positionMap[position]) {
        positionMap[position].count += 1;
        positionMap[position].value += price;
      }

      clubMap[club] = (clubMap[club] || 0) + 1;

      const upcomingFixtures = getUpcomingFixtures(player, fixtures, currentEvent);
      if (upcomingFixtures.length > 0) {
        const averageDifficulty = upcomingFixtures.reduce((sum, fixture) => {
          const difficulty = fixture.team_h === player.team ? fixture.team_h_difficulty : fixture.team_a_difficulty;
          return sum + difficulty;
        }, 0) / upcomingFixtures.length;

        difficultyData.push({
          name: player.web_name,
          difficulty: averageDifficulty,
          fixtures: upcomingFixtures.length
        });
      }
    });

    const positionData = Object.entries(positionMap)
      .map(([name, value]) => ({
        name,
        count: value.count,
        value: value.value
      }))
      .filter(item => item.count > 0);

    const clubData = Object.entries(clubMap)
      .map(([name, count]) => ({ name, count }))
      .sort((first, second) => second.count - first.count || first.name.localeCompare(second.name));

    const averageForm = totalForm / squad.length;
    const averagePointsPerGame = totalPPG / squad.length;
    const remainingBudget = maxBudget - squadValue;
    const estimatedFixtureDifficulty = difficultyData.length > 0
      ? difficultyData.reduce((sum, item) => sum + item.difficulty, 0) / difficultyData.length
      : null;

    const insights = [];
    clubData
      .filter(item => item.count >= 3)
      .forEach(item => {
        insights.push(`Your squad contains ${item.count} players from ${item.name}.`);
      });

    const valueShareByPosition = positionData
      .map(item => ({
        name: item.name,
        share: squadValue > 0 ? (item.value / squadValue) * 100 : 0
      }))
      .sort((first, second) => second.share - first.share);

    const leadingValuePosition = valueShareByPosition[0];
    if (leadingValuePosition && leadingValuePosition.share >= 40) {
      insights.push(`${leadingValuePosition.name} players account for ${leadingValuePosition.share.toFixed(0)}% of squad value.`);
    }

    const difficultPlayers = difficultyData.filter(player => player.difficulty >= 3.5);
    if (difficultPlayers.length > 0) {
      insights.push(`${difficultPlayers.length} selected players have difficult upcoming fixtures based on an estimated average FDR of 3.5 or higher.`);
    }

    if (squad.length < 15) {
      insights.push(`This squad currently has ${squad.length} players, so the statistics reflect the current selection only.`);
    }

    return {
      squadValue,
      remainingBudget,
      totalPoints,
      averageForm,
      averagePointsPerGame,
      estimatedFixtureDifficulty,
      positionData,
      clubData,
      difficultyData: difficultyData.sort((first, second) => second.difficulty - first.difficulty),
      insights
    };
  }, [data, fixtures, squad]);

  const comparison = useMemo(() => {
    if (!data || squad.length === 0) {
      return null;
    }

    const currentPlayer = squad.find(player => player.id === currentPlayerId) || squad[0];
    const replacementPool = data.elements.filter(player => player.id !== currentPlayer.id);
    const replacementPlayer = replacementPool.find(player => player.id === replacementId) || replacementPool[0] || null;

    if (!currentPlayer || !replacementPlayer) {
      return null;
    }

    const currentEvent = data.events?.find(event => event.is_current)?.id || 0;
    const currentFixtures = getUpcomingFixtures(currentPlayer, fixtures, currentEvent);
    const replacementFixtures = getUpcomingFixtures(replacementPlayer, fixtures, currentEvent);
    const teamNames = Object.fromEntries(data.teams.map(team => [team.id, team.short_name || team.name]));

    const formatFixtureList = (playerFixtures, player) => playerFixtures.length > 0
      ? playerFixtures.map(fixture => {
        const isHome = fixture.team_h === player.team;
        const opponent = isHome ? fixture.team_a : fixture.team_h;
        const difficulty = isHome ? fixture.team_h_difficulty : fixture.team_a_difficulty;
        return `${teamNames[opponent] || 'Unknown'} (${isHome ? 'H' : 'A'}, FDR ${difficulty})`;
      }).join(' • ')
      : 'No upcoming fixture data';

    const averageFixtureDifficulty = (playerFixtures, player) => playerFixtures.length > 0
      ? playerFixtures.reduce((sum, fixture) => {
        return sum + (fixture.team_h === player.team ? fixture.team_h_difficulty : fixture.team_a_difficulty);
      }, 0) / playerFixtures.length
      : null;

    const currentFdr = averageFixtureDifficulty(currentFixtures, currentPlayer);
    const replacementFdr = averageFixtureDifficulty(replacementFixtures, replacementPlayer);

    const rows = [
      { label: 'Price', current: formatMoney(toNumber(currentPlayer.now_cost) / 10), replacement: formatMoney(toNumber(replacementPlayer.now_cost) / 10), difference: formatDifference((toNumber(replacementPlayer.now_cost) - toNumber(currentPlayer.now_cost)) / 10, 1, 'm') },
      { label: 'Total points', current: toNumber(currentPlayer.total_points).toFixed(0), replacement: toNumber(replacementPlayer.total_points).toFixed(0), difference: formatDifference(toNumber(replacementPlayer.total_points) - toNumber(currentPlayer.total_points), 0) },
      { label: 'Form', current: toNumber(currentPlayer.form).toFixed(1), replacement: toNumber(replacementPlayer.form).toFixed(1), difference: formatDifference(toNumber(replacementPlayer.form) - toNumber(currentPlayer.form), 1) },
      { label: 'Points per game', current: toNumber(currentPlayer.points_per_game).toFixed(2), replacement: toNumber(replacementPlayer.points_per_game).toFixed(2), difference: formatDifference(toNumber(replacementPlayer.points_per_game) - toNumber(currentPlayer.points_per_game), 2) },
      { label: 'Minutes', current: toNumber(currentPlayer.minutes).toFixed(0), replacement: toNumber(replacementPlayer.minutes).toFixed(0), difference: formatDifference(toNumber(replacementPlayer.minutes) - toNumber(currentPlayer.minutes), 0) },
      { label: 'Goals', current: toNumber(currentPlayer.goals_scored).toFixed(0), replacement: toNumber(replacementPlayer.goals_scored).toFixed(0), difference: formatDifference(toNumber(replacementPlayer.goals_scored) - toNumber(currentPlayer.goals_scored), 0) },
      { label: 'Assists', current: toNumber(currentPlayer.assists).toFixed(0), replacement: toNumber(replacementPlayer.assists).toFixed(0), difference: formatDifference(toNumber(replacementPlayer.assists) - toNumber(currentPlayer.assists), 0) },
      { label: 'Ownership', current: `${toNumber(currentPlayer.selected_by_percent).toFixed(1)}%`, replacement: `${toNumber(replacementPlayer.selected_by_percent).toFixed(1)}%`, difference: formatDifference(toNumber(replacementPlayer.selected_by_percent) - toNumber(currentPlayer.selected_by_percent), 1, '%') },
      { label: 'Upcoming fixtures', current: formatFixtureList(currentFixtures, currentPlayer), replacement: formatFixtureList(replacementFixtures, replacementPlayer), difference: currentFdr !== null && replacementFdr !== null ? `Avg FDR ${formatDifference(replacementFdr - currentFdr, 2)}` : 'Not available' }
    ];

    return {
      currentPlayer,
      replacementPlayer,
      rows,
      currentFixtures,
      replacementFixtures,
      currentFdr,
      replacementFdr
    };
  }, [data, fixtures, squad, currentPlayerId, replacementId]);

  useEffect(() => {
    if (!data || squad.length === 0) {
      return;
    }

    if (currentPlayerId === null) {
      setCurrentPlayerId(squad[0].id);
    }
  }, [data, squad, currentPlayerId]);

  useEffect(() => {
    if (!data || squad.length === 0 || currentPlayerId === null) {
      return;
    }

    const replacementPool = data.elements.filter(player => player.id !== currentPlayerId);
    if (replacementPool.length === 0) {
      return;
    }

    if (replacementId === null || !replacementPool.some(player => player.id === replacementId)) {
      setReplacementId(replacementPool[0].id);
    }
  }, [data, squad, currentPlayerId, replacementId]);

  if (loading) {
    return (
      <div className="page-container">
        <h1>Team Analysis</h1>
        <div className="card loading-card"><p>Loading analysis...</p></div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="page-container">
        <h1>Team Analysis</h1>
        <div className="card error-card">
          <p>Couldn’t load analysis data.</p>
          <p style={{ color: 'var(--text-secondary)' }}>{error}</p>
          <button onClick={fetchData} className="action-button">Retry</button>
        </div>
      </div>
    );
  }

  if (squad.length === 0) {
    return (
      <div className="page-container">
        <h1>Team Analysis</h1>
        <div className="card empty-card">
          <p>Add players in Team Builder to see squad analysis here.</p>
          <Link to="/team-builder" className="action-button">Go to Team Builder</Link>
        </div>
      </div>
    );
  }

  const {
    squadValue,
    remainingBudget,
    totalPoints,
    averageForm,
    averagePointsPerGame,
    estimatedFixtureDifficulty,
    positionData,
    clubData,
    difficultyData,
    insights
  } = analysis;

  return (
    <div className="page-container">
      <h1>Team Analysis</h1>

      <div className="analysis-intro card">
        <p>Statistics below are direct calculations from your current Team Builder squad and live FPL data. Fixture difficulty is an estimate based on published FDR ratings for each player's next three available fixtures.</p>
      </div>

      <div className="analysis-section card">
        <div className="section-heading">
          <div>
            <h2>Statistics</h2>
            <p>Calculated from the current squad selection.</p>
          </div>
        </div>

        <div className="stats-grid">
          <div className="stat-box">
            <span className="stat-label">Squad Value</span>
            <span className="stat-value">{formatMoney(squadValue)}</span>
          </div>
          <div className="stat-box">
            <span className="stat-label">Remaining Budget</span>
            <span className={`stat-value ${remainingBudget < 0 ? 'text-danger' : ''}`}>{formatMoney(remainingBudget)}</span>
          </div>
          <div className="stat-box">
            <span className="stat-label">Total Squad Points</span>
            <span className="stat-value">{totalPoints}</span>
          </div>
          <div className="stat-box">
            <span className="stat-label">Average Form</span>
            <span className="stat-value">{averageForm.toFixed(2)}</span>
          </div>
          <div className="stat-box">
            <span className="stat-label">Average Points per Game</span>
            <span className="stat-value">{averagePointsPerGame.toFixed(2)}</span>
          </div>
        </div>
      </div>

      <div className="charts-grid">
        <div className="card chart-card">
          <h3>Position Distribution</h3>
          <div className="chart-wrapper">
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={positionData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={4} dataKey="count">
                  {positionData.map(entry => (
                    <Cell key={entry.name} fill={POSITION_COLORS[entry.name] || CHART_COLORS[0]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={value => [value, 'Players']}
                  contentStyle={{ backgroundColor: '#08120d', border: '1px solid rgba(151, 184, 165, 0.18)', borderRadius: '10px', color: '#f4fbf7' }}
                  labelStyle={{ color: '#a1b3aa' }}
                />
                <Legend wrapperStyle={{ color: '#dbe5df' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card chart-card">
          <h3>Club Distribution</h3>
          <div className="chart-wrapper">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={clubData} margin={{ top: 20, right: 20, left: -10, bottom: 50 }}>
                <CartesianGrid stroke="rgba(255,255,255,0.08)" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" interval={0} angle={-35} textAnchor="end" height={60} tick={{ fontSize: 12, fill: '#cbd5d1' }} />
                <YAxis allowDecimals={false} tick={{ fill: '#cbd5d1' }} />
                <Tooltip
                  formatter={value => [value, 'Players']}
                  contentStyle={{ backgroundColor: '#08120d', border: '1px solid rgba(151, 184, 165, 0.18)', borderRadius: '10px', color: '#f4fbf7' }}
                  labelStyle={{ color: '#a1b3aa' }}
                />
                <Bar dataKey="count" fill="#2ee07a" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="card estimate-card">
        <div className="section-heading">
          <div>
            <h2>Upcoming Fixture Difficulty</h2>
            <p>Estimated average FDR across each player's next three fixtures. Higher values mean more difficult fixtures.</p>
          </div>
          <span className="estimate-badge">ESTIMATE</span>
        </div>

        <div className="estimate-summary">
          <strong>Squad-wide estimated FDR:</strong>{' '}
          {estimatedFixtureDifficulty === null ? 'No fixture data available' : estimatedFixtureDifficulty.toFixed(2)}
        </div>

        {difficultyData.length > 0 ? (
          <div className="fixture-chart">
            <ResponsiveContainer width="100%" height={Math.max(280, difficultyData.length * 34)}>
              <BarChart data={difficultyData} layout="vertical" margin={{ top: 8, right: 20, left: 8, bottom: 8 }}>
                <CartesianGrid stroke="rgba(255,255,255,0.08)" strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" domain={[1, 5]} ticks={[1, 2, 3, 4, 5]} tick={{ fill: '#cbd5d1' }} />
                <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 12, fill: '#cbd5d1' }} />
                <Tooltip
                  formatter={value => [Number(value).toFixed(2), 'Average FDR']}
                  contentStyle={{ backgroundColor: '#08120d', border: '1px solid rgba(151, 184, 165, 0.18)', borderRadius: '10px', color: '#f4fbf7' }}
                  labelStyle={{ color: '#a1b3aa' }}
                />
                <Bar dataKey="difficulty" fill="#ff9d4d" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="empty-state">No upcoming fixture data is available for the selected squad.</p>
        )}
      </div>

      <div className="card insights-container">
        <div className="section-heading">
          <div>
            <h2>Team Insights</h2>
            <p>Transparent observations from the current squad and published data.</p>
          </div>
        </div>
        <p className="insights-disclaimer">These observations describe the current squad only. They are not predictions and do not guarantee future performance.</p>

        {insights.length > 0 ? (
          <ul className="insights-list">
            {insights.map((insight, index) => (
              <li key={index}>{insight}</li>
            ))}
          </ul>
        ) : (
          <p>No major structural observations for this squad right now.</p>
        )}
      </div>

      {comparison && (
        <div className="card comparison-card">
          <div className="section-heading">
            <div>
              <h2>Transfer Comparison</h2>
              <p>Compare current available statistics before considering a transfer.</p>
            </div>
          </div>

          <div className="comparison-selectors">
            <label>
              Current Player
              <select value={comparison.currentPlayer.id} onChange={event => setCurrentPlayerId(Number(event.target.value))}>
                {squad.map(player => <option key={player.id} value={player.id}>{player.web_name}</option>)}
              </select>
            </label>
            <span className="comparison-arrow" aria-hidden="true">→</span>
            <label>
              Potential Replacement
              <select value={comparison.replacementPlayer.id} onChange={event => setReplacementId(Number(event.target.value))}>
                {data.elements.filter(player => player.id !== comparison.currentPlayer.id).map(player => <option key={player.id} value={player.id}>{player.web_name}</option>)}
              </select>
            </label>
          </div>

          <p className="comparison-disclaimer">This comparison uses available statistics only and does not guarantee that one player will perform better than another.</p>

          <div className="comparison-table-wrapper">
            <table className="comparison-table">
              <thead>
                <tr>
                  <th>Metric</th>
                  <th>{comparison.currentPlayer.web_name}</th>
                  <th>{comparison.replacementPlayer.web_name}</th>
                  <th>Difference</th>
                </tr>
              </thead>
              <tbody>
                {comparison.rows.map(row => (
                  <tr key={row.label}>
                    <th scope="row">{row.label}</th>
                    <td>{row.current}</td>
                    <td>{row.replacement}</td>
                    <td className="comparison-difference">{row.difference}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="card factors-card">
        <h2>Factors to Consider</h2>
        <p>These comparisons describe available statistics only. A higher or lower value does not guarantee that either player will perform better in future gameweeks.</p>
        <ul>
          <li>Review recent form, season totals, minutes, and points per game together.</li>
          <li>Consider price and ownership alongside the numbers before making a move.</li>
          <li>Upcoming fixtures use published FDR ratings and remain estimates, not predictions.</li>
        </ul>
      </div>

      <AIAssistant squad={squad} data={data} fixtures={fixtures} />
    </div>
  );
};

export default Analysis;
