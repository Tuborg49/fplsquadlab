import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { getBootstrap, asArray } from '../services/fplApi';
import './Players.css';

const Players = () => {
  const navigate = useNavigate();
  const [data, setData] = useState({ elements: [], teams: [], element_types: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters and Sorting State
  const [searchTerm, setSearchTerm] = useState('');
  const [positionFilter, setPositionFilter] = useState('');
  const [teamFilter, setTeamFilter] = useState('');
  const [maxPriceFilter, setMaxPriceFilter] = useState('');
  const [sortBy, setSortBy] = useState('total_points');
  const [sortOrder, setSortOrder] = useState('desc');

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getBootstrap();
      setData({
        elements: asArray(result.elements),
        teams: asArray(result.teams),
        element_types: asArray(result.element_types)
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

  // Helper Maps for quick lookup
  const teamMap = useMemo(() => {
    const map = {};
    data.teams.forEach(t => { map[t.id] = t.name; });
    return map;
  }, [data.teams]);

  const positionMap = useMemo(() => {
    const map = {};
    data.element_types.forEach(p => { map[p.id] = p.singular_name_short; });
    return map;
  }, [data.element_types]);

  // Derived filtered and sorted data
  const filteredAndSortedPlayers = useMemo(() => {
    let players = [...data.elements];

    // Search filter
    if (searchTerm) {
      const lowerTerm = searchTerm.toLowerCase();
      // FPL fields can be missing or null for some players, so never assume a string.
      players = players.filter(p =>
        String(p.first_name ?? '').toLowerCase().includes(lowerTerm) ||
        String(p.second_name ?? '').toLowerCase().includes(lowerTerm) ||
        String(p.web_name ?? '').toLowerCase().includes(lowerTerm)
      );
    }

    // Position filter
    if (positionFilter) {
      players = players.filter(p => String(p.element_type) === positionFilter);
    }

    // Team filter
    if (teamFilter) {
      players = players.filter(p => String(p.team) === teamFilter);
    }

    // Price filter
    if (maxPriceFilter) {
      players = players.filter(p => (p.now_cost / 10) <= parseFloat(maxPriceFilter));
    }

    // Sorting
    players.sort((a, b) => {
      let valA, valB;
      
      switch(sortBy) {
        case 'total_points':
          valA = a.total_points;
          valB = b.total_points;
          break;
        case 'form':
          valA = parseFloat(a.form);
          valB = parseFloat(b.form);
          break;
        case 'price':
          valA = a.now_cost;
          valB = b.now_cost;
          break;
        default:
          valA = a.total_points;
          valB = b.total_points;
      }

      if (valA < valB) return sortOrder === 'desc' ? 1 : -1;
      if (valA > valB) return sortOrder === 'desc' ? -1 : 1;
      return 0;
    });

    return players;
  }, [data.elements, searchTerm, positionFilter, teamFilter, maxPriceFilter, sortBy, sortOrder]);

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc'); // Default to desc when changing sort field
    }
  };

  if (loading) {
    return (
      <div className="page-container">
        <h1>Players</h1>
        <div className="card loading-card"><p>Loading players data...</p></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-container">
        <h1>Players</h1>
        <div className="card error-card">
          <p>Couldn’t load players data.</p>
          <p style={{ color: 'var(--text-secondary)' }}>{error}</p>
          <button onClick={fetchData} className="action-button">Retry</button>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <h1>Players Analysis</h1>
      
      {/* Filters Section */}
      <div className="card filters-container">
        <div className="filter-group">
          <label>Search Player</label>
          <input 
            type="text" 
            placeholder="Search by name..." 
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)} 
          />
        </div>
        
        <div className="filter-group">
          <label>Position</label>
          <select value={positionFilter} onChange={(e) => setPositionFilter(e.target.value)}>
            <option value="">All Positions</option>
            {data.element_types.map(p => (
              <option key={p.id} value={p.id}>{p.singular_name}</option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label>Club</label>
          <select value={teamFilter} onChange={(e) => setTeamFilter(e.target.value)}>
            <option value="">All Clubs</option>
            {data.teams.map(t => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label>Max Price (£m)</label>
          <input 
            type="number" 
            placeholder="e.g. 10.0" 
            step="0.1"
            value={maxPriceFilter} 
            onChange={(e) => setMaxPriceFilter(e.target.value)} 
          />
        </div>
      </div>

      {/* Players Table */}
      <div className="card table-wrapper">
        <p className="results-count">Showing {filteredAndSortedPlayers.length} players</p>
        <div className="table-responsive">
          <table className="players-table">
            <thead>
              <tr>
                <th>Player</th>
                <th>Club</th>
                <th>Pos</th>
                <th onClick={() => handleSort('price')} className="sortable-header">
                  Price {sortBy === 'price' && (sortOrder === 'desc' ? '↓' : '↑')}
                </th>
                <th onClick={() => handleSort('total_points')} className="sortable-header">
                  Points {sortBy === 'total_points' && (sortOrder === 'desc' ? '↓' : '↑')}
                </th>
                <th onClick={() => handleSort('form')} className="sortable-header">
                  Form {sortBy === 'form' && (sortOrder === 'desc' ? '↓' : '↑')}
                </th>
                <th>PPG</th>
                <th>Mins</th>
                <th>G</th>
                <th>A</th>
                <th>Own %</th>
              </tr>
            </thead>
            <tbody>
              {filteredAndSortedPlayers.slice(0, 100).map(player => (
                <tr key={player.id} onClick={() => navigate(`/players/${player.id}`)} className="clickable-row">
                  <td className="player-name-cell">
                    <strong>{player.web_name}</strong>
                    <span className="full-name">{player.first_name} {player.second_name}</span>
                  </td>
                  <td>{teamMap[player.team]}</td>
                  <td>{positionMap[player.element_type]}</td>
                  <td>£{(player.now_cost / 10).toFixed(1)}m</td>
                  <td><strong>{player.total_points}</strong></td>
                  <td>{player.form}</td>
                  <td>{player.points_per_game}</td>
                  <td>{player.minutes}</td>
                  <td>{player.goals_scored}</td>
                  <td>{player.assists}</td>
                  <td>{player.selected_by_percent}%</td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredAndSortedPlayers.length > 100 && (
            <p className="table-footer-note">* Showing top 100 results. Use filters to narrow down.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Players;
