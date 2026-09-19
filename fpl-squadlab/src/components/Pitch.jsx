import React from 'react';
import PitchPlayer from './PitchPlayer';

const Pitch = ({ squad, elementTypes, onPlayerClick, subActiveId }) => {
  const defaultNames = { 1: 'GK', 2: 'DEF', 3: 'MID', 4: 'FWD' };

  const startingSquad = squad.filter(p => p.isStarting);
  const benchSquad = squad.filter(p => !p.isStarting).sort((a, b) => a.element_type - b.element_type);

  const renderStartingRow = (posId) => {
    const typeConfig = elementTypes.find(et => et.id === posId);
    const posName = typeConfig ? typeConfig.singular_name_short : defaultNames[posId];
    
    const playersInPos = startingSquad.filter(p => p.element_type === parseInt(posId));
    
    // We only render the exact number of players present in the starting line-up for this position,
    // plus empty slots to pad up to a reasonable visual limit (e.g. 5) if we wanted to enforce layout.
    // For a cleaner look, let's just render the actual starting players for this row.
    // Except if the squad is empty, we show the 1-4-4-2 placeholder structure maybe?
    // Let's use standard FPL visual structure: 1 GK, up to 5 DEF, up to 5 MID, up to 3 FWD.
    
    // We'll render empty slots if the squad isn't full yet (11 players). 
    // Just to keep the pitch looking good, we can render exact slots if squad length < 11.
    const slots = [];
    
    // Determine how many slots to show.
    // If the team is full (11 starters), we just show `playersInPos`.
    // If not full, we might just show the players we have. 
    
    playersInPos.forEach(p => {
      slots.push(
        <PitchPlayer 
          key={p.id} 
          player={p} 
          positionType={posName}
          onClick={onPlayerClick}
          isSubActive={subActiveId === p.id}
          isCaptain={p.isCaptain}
          isViceCaptain={p.isViceCaptain}
        />
      );
    });
    
    // If no players in this row at all, show one empty placeholder to keep the row visible
    if (slots.length === 0) {
      slots.push(
        <PitchPlayer 
          key={`empty-${posId}`} 
          player={null} 
          positionType={posName}
        />
      );
    }
    
    return (
      <div className="pitch-row" key={posId}>
        {slots}
      </div>
    );
  };

  return (
    <div className="pitch-wrapper">
      <div className="pitch-container">
        <div className="pitch">
          {/* Render Starting XI rows */}
          {[1, 2, 3, 4].map(posId => renderStartingRow(posId))}
        </div>
      </div>
      
      <div className="bench-container">
        <h3 className="bench-title">Bench</h3>
        <div className="bench-row">
          {benchSquad.map(p => (
            <PitchPlayer 
              key={p.id} 
              player={p} 
              positionType={elementTypes.find(et => et.id === p.element_type)?.singular_name_short || 'SUB'}
              onClick={onPlayerClick}
              isSubActive={subActiveId === p.id}
              isCaptain={p.isCaptain}
              isViceCaptain={p.isViceCaptain}
            />
          ))}
          
          {/* Fill remaining bench slots (max 4) with empty placeholders */}
          {Array.from({ length: 4 - benchSquad.length }).map((_, i) => (
            <PitchPlayer 
              key={`empty-bench-${i}`} 
              player={null} 
              positionType="SUB"
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default Pitch;
