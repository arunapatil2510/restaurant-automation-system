import React from 'react';
import { Mic, Sparkles } from 'lucide-react';

export const VoiceOrderButton = ({ onClick, variant = 'banner' }) => {
  if (variant === 'floating') {
    return (
      <button
        className="voice-floating-fab"
        onClick={onClick}
        title="Order by Voice"
        aria-label="Order food using speech recognition"
      >
        <span className="fab-glow-ring" />
        <Mic size={22} className="fab-icon" />
        <span className="fab-label">Voice Order</span>
      </button>
    );
  }

  if (variant === 'compact') {
    return (
      <button
        className="btn-voice-compact"
        onClick={onClick}
        title="Order by Voice"
        aria-label="Order by Voice"
      >
        <Mic size={16} />
        <span>Order by Voice</span>
        <span className="voice-badge-chip">AI Powered</span>
      </button>
    );
  }

  // Default Banner Hero Trigger
  return (
    <div className="voice-order-banner" onClick={onClick} role="button" tabIndex={0}>
      <div className="voice-banner-left">
        <div className="voice-icon-pulsing">
          <Mic size={24} />
          <span className="pulse-wave" />
        </div>
        <div>
          <div className="voice-banner-title-row">
            <h3 className="voice-banner-title">🎤 Order by Voice</h3>
            <span className="voice-pill-tag">Hands-Free Ordering</span>
          </div>
          <p className="voice-banner-sub">
            Tap and say: <em>"Two Masala Dosa and one Mango Lassi"</em> — dishes will be recognized and added to your cart instantly.
          </p>
        </div>
      </div>
      <div className="voice-banner-right">
        <button className="btn btn-primary btn-sm voice-action-btn" onClick={(e) => { e.stopPropagation(); onClick(); }}>
          <Sparkles size={15} /> Start Speaking
        </button>
      </div>
    </div>
  );
};
