import React from 'react';

const SensorCard = ({ label, value }) => {
  return (
    <div className="sensor-card">
      <h3>{label}</h3>
      <p>{value}</p>
    </div>
  );
};

export default SensorCard;
