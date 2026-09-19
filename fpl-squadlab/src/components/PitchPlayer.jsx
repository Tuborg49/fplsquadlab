import React from 'react';

const PitchPlayer = ({ 
  player, 
  positionType, 
  onClick, 
  isSubActive, 
  isCaptain, 
  isViceCaptain 
}) => {
  if (!player) {
    return (
      <div className="pitch-player empty">
        <div className="shirt empty-shirt">+</div>
        <div className="player-label empty-label">{positionType}</div>
      </div>
    );
  }

  return (
    <div 
      className={`pitch-player filled ${isSubActive ? 'sub-active' : ''}`} 
      onClick={() => onClick(player.id)}
    >
      <div className="shirt-container">
        <div className="shirt filled-shirt"></div>
        {isCaptain && <div className="captain-badge" title="Captain">⭐</div>}
        {isViceCaptain && <div className="vice-captain-badge" title="Vice Captain">VC</div>}
      </div>
      <div className="player-label">
        <div className="player-name">{player.web_name}</div>
        <div className="player-price">£{(player.now_cost / 10).toFixed(1)}m</div>
      </div>
    </div>
  );
};

export default PitchPlayer;
