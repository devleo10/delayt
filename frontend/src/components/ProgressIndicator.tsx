import React from 'react';
import './ProgressIndicator.css';

interface ProgressIndicatorProps {
  percentage: number;
  message?: string;
  showSteps?: boolean;
  currentStep?: number;
  totalSteps?: number;
  status?: 'pending' | 'running' | 'completed' | 'failed';
}

const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({
  percentage,
  message = 'Processing...',
  showSteps = false,
  currentStep = 0,
  totalSteps = 0,
  status = 'running'
}) => {
  const clampedPercentage = Math.min(Math.max(percentage, 0), 100);
  
  return (
    <div className={`progress-indicator progress-${status}`} role="progressbar" aria-valuenow={clampedPercentage} aria-valuemin={0} aria-valuemax={100} aria-live="polite">
      <div className="progress-header">
        <span className="progress-message">{message}</span>
        <span className="progress-percentage" aria-label={`${clampedPercentage}% complete`}>
          {clampedPercentage}%
        </span>
      </div>
      
      <div className="progress-bar-container">
        <div 
          className="progress-bar-fill" 
          style={{ width: `${clampedPercentage}%` }}
          aria-hidden="true"
        />
      </div>
      
      {showSteps && totalSteps > 0 && (
        <div className="progress-steps">
          <span className="steps-text">
            Step {currentStep} of {totalSteps}
          </span>
        </div>
      )}
      
      {status === 'running' && (
        <div className="progress-spinner" aria-hidden="true">
          <div className="spinner-dot"></div>
          <div className="spinner-dot"></div>
          <div className="spinner-dot"></div>
        </div>
      )}
    </div>
  );
};

export default ProgressIndicator;