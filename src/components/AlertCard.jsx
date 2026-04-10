import React from 'react';

const AlertCard = ({ title, device, time, severity }) => {
  const getSeverityClass = (severity) => {
    switch (severity.toLowerCase()) {
      case 'high':
        return 'alert-high';
      case 'medium':
        return 'alert-medium';
      case 'low':
        return 'alert-low';
      default:
        return 'alert-low';
    }
  };

  return (
    <div className={`alert-card ${getSeverityClass(severity)}`}>
      <div className="alert-header">
        <h3>{title}</h3>
        <span className="severity-badge">{severity}</span>
      </div>
      <div className="alert-details">
        <p><strong>Device:</strong> {device}</p>
        <p><strong>Time:</strong> {time}</p>
      </div>
    </div>
  );
};

export default AlertCard;
