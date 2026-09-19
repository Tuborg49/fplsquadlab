import React, { useState, useEffect, useMemo } from 'react';
import { getBootstrap, getFixtures, asArray } from '../services/fplApi';
import './Fixtures.css';

const Fixtures = () => {
  const [fixtures, setFixtures] = useState([]);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [gameweekFilter, setGameweekFilter] = useState('');
  const [teamFilter, setTeamFilter] = useState('');

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [bootstrapData, fixturesData] = await Promise.all([
        getBootstrap(),
        getFixtures()
      ]);

      setTeams(asArray(bootstrapData.teams));
      setFixtures(asArray(fixturesData));
      
      // Default gameweek filter to current gameweek if available
      const events = asArray(bootstrapData.events);
      const currentEvent = events.find(e => e.is_current)?.id;
      if (currentEvent) {
        setGameweekFilter(String(currentEvent));
      } else if (events.length > 0) {
        // If no current event (e.g. pre-season), default to first event
        setGameweekFilter(String(events[0].id));
      }
    } catch (err) {
      setError(err.message || 'Failed to load fixtures data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const teamMap = useMemo(() => {
    const map = {};
    teams.forEach(t => { map[t.id] = t; });
    return map;
  }, [teams]);

  const uniqueGameweeks = useMemo(() => {
    const gwSet = new Set();
    fixtures.forEach(f => {
      if (f.event) gwSet.add(f.event);
    });
    return Array.from(gwSet).sort((a, b) => a - b);
  }, [fixtures]);

  const filteredFixtures = useMemo(() => {
    let result = fixtures;

    if (gameweekFilter) {
      result = result.filter(f => f.event && f.event.toString() === gameweekFilter);
    }

    if (teamFilter) {
      const tId = parseInt(teamFilter);
      result = result.filter(f => f.team_a === tId || f.team_h === tId);
    }

    // Sort by date
    return result.sort((a, b) => new Date(a.kickoff_time) - new Date(b.kickoff_time));
  }, [fixtures, gameweekFilter, teamFilter]);

  const getDifficultyLabel = (fdr) => {
    if (fdr <= 2) return 'Easy';
    if (fdr === 3) return 'Medium';
    return 'Difficult';
  };

  const getDifficultyClass = (fdr) => {
    if (fdr <= 2) return 'fdr-easy';
    if (fdr === 3) return 'fdr-medium';
    return 'fdr-difficult';
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'TBD';
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-GB', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  if (loading) {
    return (
      <div className="page-container">
        <h1>Fixtures</h1>
        <div className="card loading-card"><p>Loading fixtures...</p></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-container">
        <h1>Fixtures</h1>
        <div className="card error-card">
          <p>Couldn’t load fixtures data.</p>
          <p style={{ color: 'var(--text-secondary)' }}>{error}</p>
          <button onClick={fetchData} className="action-button">Retry</button>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <h1>Fixtures & Difficulty</h1>
      
      <div className="card filters-container">
        <div className="filter-group">
          <label>Gameweek</label>
          <select 
            value={gameweekFilter} 
            onChange={(e) => setGameweekFilter(e.target.value)}
          >
            <option value="">All Gameweeks</option>
            {uniqueGameweeks.map(gw => (
              <option key={gw} value={gw}>Gameweek {gw}</option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label>Team</label>
          <select 
            value={teamFilter} 
            onChange={(e) => setTeamFilter(e.target.value)}
          >
            <option value="">All Teams</option>
            {teams.map(t => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="fixtures-grid">
        {filteredFixtures.length === 0 ? (
          <div className="card empty-card"><p>No fixtures found for the selected criteria.</p></div>
        ) : (
          filteredFixtures.map(fixture => {
            const teamH = teamMap[fixture.team_h];
            const teamA = teamMap[fixture.team_a];
            
            if (!teamH || !teamA) return null;

            return (
              <div key={fixture.id} className="fixture-card card">
                <div className="fixture-header">
                  <span className="fixture-gw">GW {fixture.event || 'TBA'}</span>
                  <span className="fixture-date">{formatDate(fixture.kickoff_time)}</span>
                </div>
                
                <div className="fixture-teams">
                  <div className="team-container home">
                    <span className="team-name">{teamH.name}</span>
                    <div className={`fdr-badge ${getDifficultyClass(fixture.team_h_difficulty)}`} title={`Difficulty: ${getDifficultyLabel(fixture.team_h_difficulty)}`}>
                      {fixture.team_h_difficulty}
                    </div>
                  </div>
                  
                  <div className="vs-badge">VS</div>
                  
                  <div className="team-container away">
                    <div className={`fdr-badge ${getDifficultyClass(fixture.team_a_difficulty)}`} title={`Difficulty: ${getDifficultyLabel(fixture.team_a_difficulty)}`}>
                      {fixture.team_a_difficulty}
                    </div>
                    <span className="team-name">{teamA.name}</span>
                  </div>
                </div>
                
                {/* Visual Label */}
                <div className="fixture-difficulty-labels">
                  <span className={`diff-text ${getDifficultyClass(fixture.team_h_difficulty)}`}>
                    {getDifficultyLabel(fixture.team_h_difficulty)}
                  </span>
                  <span className="diff-text-separator">-</span>
                  <span className={`diff-text ${getDifficultyClass(fixture.team_a_difficulty)}`}>
                    {getDifficultyLabel(fixture.team_a_difficulty)}
                  </span>
                </div>

              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default Fixtures;
