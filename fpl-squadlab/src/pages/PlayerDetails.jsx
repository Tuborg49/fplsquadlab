import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getBootstrap, getPlayerDetails } from '../services/fplApi';
import { addPlayerToSquad } from '../utils/teamRules';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { calculateSquadLabScore } from '../utils/calculations';
import './PlayerDetails.css';

const PlayerDetails = () => {
  const { id } = useParams();
  
  const [basicInfo, setBasicInfo] = useState(null);
  const [details, setDetails] = useState(null);
  const [teams, setTeams] = useState({});
  const [positions, setPositions] = useState({});
  const [gameData, setGameData] = useState(null);
  const [addFeedback, setAddFeedback] = useState(null);
  const [squad, setSquad] = useState(() => {
    try {
      const saved = localStorage.getItem('fpl_squad');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    setAddFeedback(null);
    try {
      // Fetch both bootstrap (for name, etc) and specific player details
      const [bootstrapData, playerDetailsData] = await Promise.all([
        getBootstrap(),
        getPlayerDetails(id)
      ]);

      // Create lookup maps
      const teamMap = {};
      bootstrapData.teams.forEach(t => { teamMap[t.id] = t; });
      setTeams(teamMap);

      const posMap = {};
      bootstrapData.element_types.forEach(p => { posMap[p.id] = p.singular_name; });
      setPositions(posMap);

      // Needed to validate squad rules when adding this player to a squad.
      setGameData({
        element_types: bootstrapData.element_types,
        game_settings: bootstrapData.game_settings
      });

      // Find basic info for this player
      const playerInfo = bootstrapData.elements.find(p => p.id.toString() === id);
      
      if (!playerInfo) {
        throw new Error('Player not found');
      }

      setBasicInfo(playerInfo);
      setDetails(playerDetailsData);
    } catch (err) {
      setError(err.message || 'Failed to load player details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [id]);

  const squadLabAnalysis = useMemo(() => {
    if (!basicInfo) {
      return null;
    }

    const upcomingFixtures = details?.fixtures?.slice(0, 3) || [];
    const fixtureDifficulty = upcomingFixtures.length > 0
      ? upcomingFixtures.reduce((sum, fixture) => sum + fixture.difficulty, 0) / upcomingFixtures.length
      : null;

    return calculateSquadLabScore(basicInfo, { fixtureDifficulty });
  }, [basicInfo, details]);

  if (loading) {
    return (
      <div className="page-container">
        <Link to="/players" className="back-link">← Back to Players</Link>
        <div className="card loading-card"><p>Loading player details...</p></div>
      </div>
    );
  }

  if (error || !basicInfo) {
    return (
      <div className="page-container">
        <Link to="/players" className="back-link">← Back to Players</Link>
        <div className="card error-card">
          <p>Couldn’t load player details.</p>
          <p style={{ color: 'var(--text-secondary)' }}>{error}</p>
          <button onClick={fetchData} className="action-button">Retry</button>
        </div>
      </div>
    );
  }

  const team = teams[basicInfo.team];
  const positionName = positions[basicInfo.element_type];
  const isInSquad = squad.some(p => p.id === basicInfo.id);

  const handleAddToSquad = () => {
    if (!gameData) {
      return;
    }

    const result = addPlayerToSquad(squad, basicInfo, gameData);

    if (!result.added) {
      setAddFeedback(result.message);
      return;
    }

    setSquad(result.squad);
    localStorage.setItem('fpl_squad', JSON.stringify(result.squad));
    setAddFeedback(`${basicInfo.web_name} added to your squad.`);
  };
  
  // Format history for chart
  const historyData = details?.history?.map(gw => ({
    name: `GW${gw.round}`,
    points: gw.total_points,
    minutes: gw.minutes
  })) || [];

  return (
    <div className="page-container">
      <Link to="/players" className="back-link">← Back to Players</Link>
      
      <div className="card">
        <div className="player-header">
          <div className="player-info">
            <h1>{basicInfo.first_name} {basicInfo.second_name}</h1>
            <div className="player-subtitle">
              {team?.name} • {positionName}
            </div>
          </div>
          <div className="player-actions">
            <button
              className={`add-button ${isInSquad ? 'in-squad' : ''}`}
              onClick={handleAddToSquad}
              disabled={isInSquad}
            >
              {isInSquad ? '✓ In Squad' : 'Add to Team'}
            </button>
            {addFeedback && <p className="player-add-feedback">{addFeedback}</p>}
          </div>
        </div>

        <div className="player-stats-grid">
          <div className="stat-box">
            <span className="stat-label">Price</span>
            <span className="stat-value">£{(basicInfo.now_cost / 10).toFixed(1)}m</span>
          </div>
          <div className="stat-box">
            <span className="stat-label">Total Points</span>
            <span className="stat-value">{basicInfo.total_points}</span>
          </div>
          <div className="stat-box">
            <span className="stat-label">Form</span>
            <span className="stat-value">{basicInfo.form}</span>
          </div>
          <div className="stat-box">
            <span className="stat-label">PPG</span>
            <span className="stat-value">{basicInfo.points_per_game}</span>
          </div>
          <div className="stat-box">
            <span className="stat-label">Minutes</span>
            <span className="stat-value">{basicInfo.minutes}</span>
          </div>
          <div className="stat-box">
            <span className="stat-label">Goals</span>
            <span className="stat-value">{basicInfo.goals_scored}</span>
          </div>
          <div className="stat-box">
            <span className="stat-label">Assists</span>
            <span className="stat-value">{basicInfo.assists}</span>
          </div>
          <div className="stat-box">
            <span className="stat-label">Ownership</span>
            <span className="stat-value">{basicInfo.selected_by_percent}%</span>
          </div>
        </div>
      </div>

      {squadLabAnalysis && (
        <div className="card squadlab-card">
          <div className="section-header">
            <div>
              <h2 className="section-title" style={{ marginTop: 0 }}>SquadLab Analysis Score</h2>
              <p className="squadlab-disclaimer">This is a custom SquadLab metric and is not an official FPL score. It is not a guaranteed prediction of future points.</p>
            </div>
            <div className="score-pill">{squadLabAnalysis.score.toFixed(1)}</div>
          </div>

          <div className="factor-grid">
            {squadLabAnalysis.factors.map(factor => (
              <div key={factor.key} className="factor-card">
                <span className="factor-label">{factor.label}</span>
                <span className="factor-score">{factor.score === null ? 'N/A' : factor.score.toFixed(0)}</span>
                <span className="factor-raw">
                  {factor.rawValue === null ? 'No fixture data' : `${factor.rawValue.toFixed(factor.key === 'fixtureDifficulty' ? 2 : 1)}${factor.unit}`}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {historyData.length > 0 && (
        <div className="card">
          <h2 className="section-title" style={{marginTop: 0}}>Recent Performance</h2>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={historyData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                <Line type="monotone" dataKey="points" stroke="#2ee07a" strokeWidth={3} activeDot={{ r: 8 }} />
                <CartesianGrid stroke="rgba(255,255,255,0.08)" strokeDasharray="5 5" vertical={false} />
                <XAxis dataKey="name" tick={{ fill: '#cbd5d1' }} />
                <YAxis tick={{ fill: '#cbd5d1' }} />
                <Tooltip 
                  formatter={(value, name) => [value, name === 'points' ? 'Points' : name]}
                  contentStyle={{ backgroundColor: '#08120d', color: '#f4fbf7', border: '1px solid rgba(151, 184, 165, 0.18)', borderRadius: '10px', boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }}
                  labelStyle={{ color: '#a1b3aa' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {details?.fixtures && details.fixtures.length > 0 && (
        <div className="card">
          <h2 className="section-title" style={{marginTop: 0}}>Upcoming Fixtures</h2>
          <div className="fixtures-list">
            {details.fixtures.slice(0, 5).map(fixture => {
              const isHome = fixture.is_home;
              const opponentId = isHome ? fixture.team_a : fixture.team_h;
              const opponent = teams[opponentId]?.short_name || 'TBD';
              const diffClass = `diff-${fixture.difficulty}`;
              
              return (
                <div key={fixture.id} className="fixture-item">
                  <div>
                    <strong>GW{fixture.event || 'TBD'}</strong>
                    <span style={{ marginLeft: '1rem' }}>
                      {opponent} ({isHome ? 'H' : 'A'})
                    </span>
                  </div>
                  <div className={`fixture-difficulty ${diffClass}`}>
                    FDR: {fixture.difficulty}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default PlayerDetails;
