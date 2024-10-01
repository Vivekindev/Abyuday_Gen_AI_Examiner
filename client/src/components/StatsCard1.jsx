import React from "react";
import './StatsCard.css'

const StatsCard = () => {
  return (
    
      <div className="stats-outer">
        <div className="stats-dot" />
        <div className="stats-card">
          <div className="stats-ray" />
          <div className="stats-text">26</div>
          <div>Test Generated</div>
          <div className="stats-line stats-topl" />
          <div className="stats-line stats-leftl" />
          <div className="stats-line stats-bottoml" />
          <div className="stats-line stats-rightl" />
        </div>
      </div>
    
  );
};



export default StatsCard;
