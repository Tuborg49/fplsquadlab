import React from 'react';

const TeamSummary = ({ squad, gameSettings }) => {
  const maxBudget = (gameSettings?.squad_total_spend || 1000) / 10;
  const maxSquadSize = gameSettings?.squad_squadsize || 15;
  
  const squadValue = squad.reduce((total, player) => total + (player.now_cost / 10), 0);
  const remainingBudget = maxBudget - squadValue;
  
  return (
    <div className="team-summary card">
      <h2>Squad Summary</h2>
      
      <div className="summary-stats">
        <div className="summary-stat-box">
          <span className="stat-label">Players Selected</span>
          <span className={`stat-value ${squad.length === maxSquadSize ? 'complete' : ''}`}>
            {squad.length} / {maxSquadSize}
          </span>
        </div>
        
        <div className="summary-stat-box">
          <span className="stat-label">Squad Value</span>
          <span className="stat-value">£{squadValue.toFixed(1)}m</span>
        </div>
        
        <div className="summary-stat-box">
          <span className="stat-label">Remaining Budget</span>
          <span className={`stat-value ${remainingBudget < 0 ? 'negative' : ''}`}>
            £{remainingBudget.toFixed(1)}m
          </span>
        </div>
      </div>
    </div>
  );
};

export default TeamSummary;
