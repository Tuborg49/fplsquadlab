import React, { useState, useEffect } from 'react';
import { getBootstrap } from '../services/fplApi';

const Dashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getBootstrap();
      setData(result);
    } catch (err) {
      setError(err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="page-container">
        <h1>Dashboard</h1>
        <div className="card loading-card">
          <p>Loading FPL data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-container">
        <h1>Dashboard</h1>
        <div className="card error-card">
          <p>Couldn’t load the latest FPL data.</p>
          <p style={{ color: 'var(--text-secondary)' }}>{error}</p>
          <button onClick={fetchData} className="action-button">
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Calculate required stats
  const currentGw = data?.events?.find(event => event.is_current)?.name || 'N/A';
  const numPlayers = data?.elements?.length || 0;
  const numTeams = data?.teams?.length || 0;
  const totalManagers = data?.total_players || 'N/A';

  return (
    <div className="page-container">
      <div className="hero-card card">
        <p className="eyebrow">FPL SquadLab</p>
        <h1>Dashboard</h1>
        <p className="hero-tagline">Build. Analyse. Improve.</p>
        <p>Live competition-wide snapshot powered by the official Fantasy Premier League API.</p>
      </div>

      <div className="metrics-grid">
        <div className="metric-card card">
          <h3>Current Gameweek</h3>
          <p className="metric-value">{currentGw}</p>
        </div>
        
        <div className="metric-card card">
          <h3>Total Players</h3>
          <p className="metric-value">{numPlayers}</p>
        </div>
        
        <div className="metric-card card">
          <h3>Number of Teams</h3>
          <p className="metric-value">{numTeams}</p>
        </div>
        
        <div className="metric-card card">
          <h3>Total FPL Managers</h3>
          <p className="metric-value">{totalManagers.toLocaleString()}</p>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
