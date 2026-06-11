import React, { useEffect, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPowerOff, faCircle } from '@fortawesome/free-solid-svg-icons';

const ShutdownModal = ({ isOpen, devices, onComplete }) => {
  const [shutdownProgress, setShutdownProgress] = useState([]);

  useEffect(() => {
    if (!isOpen || devices.length === 0) return;

    setShutdownProgress([]);
    let currentIndex = 0;

    const shutdownInterval = setInterval(() => {
      if (currentIndex < devices.length) {
        setShutdownProgress(prev => [...prev, devices[currentIndex].id]);
        currentIndex++;
      } else {
        clearInterval(shutdownInterval);
        setTimeout(() => {
          if (onComplete) onComplete();
        }, 800);
      }
    }, 400);

    return () => clearInterval(shutdownInterval);
  }, [isOpen, devices, onComplete]);

  if (!isOpen) return null;

  return (
    <div className="s-modal-overlay s-shutdown-overlay">
      <div className="s-modal s-shutdown-modal" onClick={e => e.stopPropagation()}>
        <div className="s-shutdown-header">
          <div className="s-shutdown-icon">
            <FontAwesomeIcon icon={faPowerOff} />
          </div>
          <h3 className="s-shutdown-title">System Shutdown</h3>
          <p className="s-shutdown-subtitle">Powering down devices...</p>
        </div>

        <div className="s-shutdown-list">
          {devices.map((device, idx) => {
            const isShuttingDown = shutdownProgress.includes(device.id);
            const hasShutdown = shutdownProgress.indexOf(device.id) < idx;

            return (
              <div
                key={device.id}
                className={`s-shutdown-item ${isShuttingDown ? 'shutting-down' : ''} ${
                  hasShutdown ? 'shutdown-complete' : ''
                }`}
              >
                <div className="s-shutdown-dot">
                  <FontAwesomeIcon icon={faCircle} />
                </div>
                <span className="s-shutdown-name">{device.name}</span>
                {isShuttingDown && (
                  <div className="s-shutdown-spinner">
                    <div className="spinner-ring"></div>
                  </div>
                )}
                {hasShutdown && (
                  <span className="s-shutdown-checkmark">✓</span>
                )}
              </div>
            );
          })}
        </div>

        <p className="s-shutdown-footer">
          {shutdownProgress.length}/{devices.length} devices powered down
        </p>
      </div>
    </div>
  );
};

export default ShutdownModal;
