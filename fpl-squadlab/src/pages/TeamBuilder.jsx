import React, { useState, useEffect, useMemo } from 'react';
import { getBootstrap } from '../services/fplApi';
import Pitch from '../components/Pitch';
import TeamSummary from '../components/TeamSummary';
import { addPlayerToSquad, isValidStartingFormation } from '../utils/teamRules';
import './TeamBuilder.css';

const TeamBuilder = () => {
  const [data, setData] = useState({ elements: [], teams: [], element_types: [], game_settings: {} });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load from localStorage or empty array
  const [squad, setSquad] = useState(() => {
    const saved = localStorage.getItem('fpl_squad');
    if (saved) {
      try { return JSON.parse(saved); } catch { return []; }
    }
    return [];
  });
  
  const [searchTerm, setSearchTerm] = useState('');
  const [positionFilter, setPositionFilter] = useState('');

  // Interactive states
  const [actionPlayerId, setActionPlayerId] = useState(null);
  const [subActiveId, setSubActiveId] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getBootstrap();
      setData({
        elements: result.elements || [],
        teams: result.teams || [],
        element_types: result.element_types || [],
        game_settings: result.game_settings || {}
      });
    } catch (err) {
      setError(err.message || 'Failed to load players data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Save to localStorage when squad changes
  useEffect(() => {
    localStorage.setItem('fpl_squad', JSON.stringify(squad));
  }, [squad]);

  const teamMap = useMemo(() => {
    const map = {};
    data.teams.forEach(t => { map[t.id] = t.name; });
    return map;
  }, [data.teams]);

  const filteredPlayers = useMemo(() => {
    let players = data.elements;

    if (searchTerm) {
      const lowerTerm = searchTerm.toLowerCase();
      players = players.filter(p => 
        p.first_name.toLowerCase().includes(lowerTerm) || 
        p.second_name.toLowerCase().includes(lowerTerm) ||
        p.web_name.toLowerCase().includes(lowerTerm)
      );
    }

    if (positionFilter) {
      players = players.filter(p => p.element_type.toString() === positionFilter);
    }

    return players.sort((a, b) => b.now_cost - a.now_cost).slice(0, 100);
  }, [data.elements, searchTerm, positionFilter]);

  const handleAddPlayer = (player) => {
    const result = addPlayerToSquad(squad, player, data);

    if (!result.added) {
      alert(result.message);
      return;
    }

    setSquad(result.squad);
  };

  const handlePlayerClick = (playerId) => {
    if (subActiveId) {
      // Execute swap
      handleSwap(subActiveId, playerId);
    } else {
      // Open action modal
      setActionPlayerId(playerId);
    }
  };

  const handleSwap = (id1, id2) => {
    if (id1 === id2) {
      setSubActiveId(null);
      return;
    }

    const p1 = squad.find(p => p.id === id1);
    const p2 = squad.find(p => p.id === id2);

    // Swap is only meaningful between a starting and a bench player
    if (p1.isStarting === p2.isStarting) {
      alert("You must swap a starting player with a bench player.");
      setSubActiveId(null);
      return;
    }

    const newSquad = squad.map(p => {
      if (p.id === id1) return { ...p, isStarting: p2.isStarting };
      if (p.id === id2) return { ...p, isStarting: p1.isStarting };
      return p;
    });

    const newStarting = newSquad.filter(p => p.isStarting);
    const validation = isValidStartingFormation(newStarting);
    
    if (!validation.valid) {
      alert(`Invalid substitution: ${validation.message}`);
      setSubActiveId(null);
      return;
    }

    setSquad(newSquad);
    setSubActiveId(null);
  };

  const handleSetCaptain = (playerId, type) => {
    const newSquad = squad.map(p => {
      const playerCopy = { ...p };
      if (type === 'captain') {
        if (playerCopy.id === playerId) {
          playerCopy.isCaptain = true;
          if (playerCopy.isViceCaptain) playerCopy.isViceCaptain = false;
        } else if (playerCopy.isCaptain) {
          playerCopy.isCaptain = false;
        }
      } else if (type === 'vice') {
        if (playerCopy.id === playerId) {
          playerCopy.isViceCaptain = true;
          if (playerCopy.isCaptain) playerCopy.isCaptain = false;
        } else if (playerCopy.isViceCaptain) {
          playerCopy.isViceCaptain = false;
        }
      }
      return playerCopy;
    });
    setSquad(newSquad);
    setActionPlayerId(null);
  };

  const handleRemovePlayer = (playerId) => {
    setSquad(squad.filter(p => p.id !== playerId));
    setActionPlayerId(null);
  };

  if (loading) {
    return (
      <div className="page-container">
        <h1>Team Builder</h1>
        <div className="card loading-card"><p>Loading player data...</p></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-container">
        <h1>Team Builder</h1>
        <div className="card error-card">
          <p>Couldn’t load player data.</p>
          <p style={{ color: 'var(--text-secondary)' }}>{error}</p>
          <button onClick={fetchData} className="action-button">Retry</button>
        </div>
      </div>
    );
  }

  const activePlayer = actionPlayerId ? squad.find(p => p.id === actionPlayerId) : null;

  return (
    <div className="page-container">
      <h1>Team Builder</h1>
      
      <div className="team-builder-layout">
        
        {/* Pitch Area */}
        <div className="pitch-area">
          <TeamSummary squad={squad} gameSettings={data.game_settings} />
          
          {subActiveId && (
            <div className="sub-banner">
              Select a player to swap with...
              <button onClick={() => setSubActiveId(null)} className="cancel-sub-btn">Cancel</button>
            </div>
          )}
          
          <Pitch 
            squad={squad} 
            elementTypes={data.element_types}
            onPlayerClick={handlePlayerClick}
            subActiveId={subActiveId}
          />
        </div>

        {/* Player Selection Sidebar */}
        <div className="player-selection-sidebar card">
          <h3>Player Search</h3>
          
          <div className="sidebar-filters">
            <input 
              type="text" 
              placeholder="Search by name..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="sidebar-input"
            />
            <select 
              value={positionFilter} 
              onChange={(e) => setPositionFilter(e.target.value)}
              className="sidebar-input"
            >
              <option value="">All Positions</option>
              {data.element_types.map(p => (
                <option key={p.id} value={p.id}>{p.singular_name_short}</option>
              ))}
            </select>
          </div>

          <div className="sidebar-player-list">
            {filteredPlayers.map(player => {
              const inSquad = squad.some(p => p.id === player.id);
              return (
                <div key={player.id} className={`sidebar-player-item ${inSquad ? 'in-squad' : ''}`}>
                  <div className="sidebar-player-info">
                    <strong>{player.web_name}</strong>
                    <span className="sidebar-player-meta">
                      {data.element_types.find(et => et.id === player.element_type)?.singular_name_short || 'N/A'} • {teamMap[player.team]}
                    </span>
                  </div>
                  <div className="sidebar-player-action">
                    <span className="sidebar-player-price">£{(player.now_cost / 10).toFixed(1)}m</span>
                    <button 
                      className={`add-btn ${inSquad ? 'disabled' : ''}`}
                      onClick={() => !inSquad && handleAddPlayer(player)}
                      disabled={inSquad}
                    >
                      {inSquad ? '✓' : '+'}
                    </button>
                  </div>
                </div>
              );
            })}
            {filteredPlayers.length === 0 && <p className="no-results">No players found.</p>}
          </div>
        </div>
      </div>

      {/* Action Modal */}
      {activePlayer && (
        <div className="modal-overlay" onClick={() => setActionPlayerId(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3>{activePlayer.web_name} Actions</h3>
            <div className="modal-buttons">
              <button 
                className="modal-btn"
                onClick={() => {
                  setSubActiveId(activePlayer.id);
                  setActionPlayerId(null);
                }}
              >
                Substitute {activePlayer.isStarting ? '(Move to Bench)' : '(Move to Starting XI)'}
              </button>
              <button 
                className="modal-btn"
                onClick={() => handleSetCaptain(activePlayer.id, 'captain')}
                disabled={activePlayer.isCaptain}
              >
                Make Captain
              </button>
              <button 
                className="modal-btn"
                onClick={() => handleSetCaptain(activePlayer.id, 'vice')}
                disabled={activePlayer.isViceCaptain}
              >
                Make Vice Captain
              </button>
              <button 
                className="modal-btn danger"
                onClick={() => handleRemovePlayer(activePlayer.id)}
              >
                Remove from Squad
              </button>
              <button 
                className="modal-btn secondary"
                onClick={() => setActionPlayerId(null)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default TeamBuilder;
