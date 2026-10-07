import React, { useState, useEffect, useRef } from 'react';
import { 
  Mic, 
  X, 
  Sparkles, 
  Plus, 
  Minus, 
  Trash2, 
  RotateCcw, 
  AlertTriangle, 
  HelpCircle, 
  ShoppingBag, 
  Send,
  Volume2,
  CheckCircle2,
  Globe
} from 'lucide-react';
import { 
  SUPPORTED_LANGUAGES, 
  speakKioskPrompt 
} from '../../utils/multilingualVoiceEngine.js';
import { matchVoiceOrderWithMenu } from '../../utils/voiceParser.js';
import { 
  classifyIntent, 
  INTENT_TYPES, 
  getConversationalResponse 
} from '../../utils/intentClassifier.js';
import { useCart } from '../../context/CartContext';

export const VoiceOrderModal = ({ isOpen, onClose, menuItems = [] }) => {
  const { addItem } = useCart();

  const [activeLanguage, setActiveLanguage] = useState('en-IN');
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [speechSupported, setSpeechSupported] = useState(true);
  const [micError, setMicError] = useState(null);

  const [parsedResult, setParsedResult] = useState(null);
  const [confirmedItems, setConfirmedItems] = useState([]);
  const [addedToCartSuccess, setAddedToCartSuccess] = useState(false);
  const [manualText, setManualText] = useState('');

  const recognitionRef = useRef(null);
  const currentLangConfig = SUPPORTED_LANGUAGES.find(l => l.code === activeLanguage) || SUPPORTED_LANGUAGES[0];

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setSpeechSupported(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      setTranscript('');
      setInterimTranscript('');
      setParsedResult(null);
      setConfirmedItems([]);
      setAddedToCartSuccess(false);
      setMicError(null);
      setManualText('');

      startListening();
    } else {
      stopListening();
    }
    return () => {
      stopListening();
    };
  }, [isOpen, activeLanguage]);

  const startListening = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setSpeechSupported(false);
      return;
    }

    try {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }

      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = currentLangConfig.speechLang;

      recognition.onstart = () => {
        setIsListening(true);
        setMicError(null);
        setInterimTranscript('');
      };

      recognition.onresult = (event) => {
        let final = '';
        let interim = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            final += event.results[i][0].transcript;
          } else {
            interim += event.results[i][0].transcript;
          }
        }
        if (final) {
          setTranscript(final);
          processVoiceInput(final);
        } else {
          setInterimTranscript(interim);
        }
      };

      recognition.onerror = (event) => {
        console.warn('Speech recognition error:', event.error);
        if (event.error === 'not-allowed') {
          setMicError('Microphone permission was denied. Please allow microphone access or type your order below.');
        } else if (event.error === 'no-speech') {
          setMicError('No speech detected. Please tap the microphone and speak clearly.');
        } else {
          setMicError(`Voice input error (${event.error}). You can also type your order below.`);
        }
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.error('Failed to start speech recognition:', err);
      setIsListening(false);
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // Ignore
      }
      setIsListening(false);
    }
  };

  const processVoiceInput = (text) => {
    if (!text || !text.trim()) return;

    const hasPending = parsedResult && confirmedItems.length > 0;
    const intent = classifyIntent(text, hasPending);

    if (intent.type === INTENT_TYPES.CONFIRMATION && hasPending) {
      handleAddToCart();
      return;
    }

    if (intent.type === INTENT_TYPES.CANCEL) {
      setConfirmedItems([]);
      setParsedResult(null);
      setTranscript('');
      const cancelMsg = getConversationalResponse(INTENT_TYPES.CANCEL, activeLanguage);
      setMicError(cancelMsg);
      speakKioskPrompt(cancelMsg, activeLanguage);
      return;
    }

    if (intent.type === INTENT_TYPES.GREETING || intent.type === INTENT_TYPES.HELP || intent.type === INTENT_TYPES.GRATITUDE) {
      const reply = getConversationalResponse(intent.type, activeLanguage);
      setMicError(reply);
      speakKioskPrompt(reply, activeLanguage);
      return;
    }

    setIsProcessing(true);
    setTimeout(() => {
      const result = matchVoiceOrderWithMenu(text, menuItems, activeLanguage);
      setParsedResult(result);
      setConfirmedItems(result.matchedItems.map(item => ({ ...item })));
      setIsProcessing(false);

      if (result.matchedItems.length > 0) {
        speakKioskPrompt(currentLangConfig.confirmPrompt, activeLanguage);
      } else {
        setMicError(
          result.unrecognizedItems.length > 0
            ? `We could not find "${result.unrecognizedItems.map(u => u.query).join(', ')}" on our menu.`
            : getConversationalResponse(INTENT_TYPES.UNKNOWN, activeLanguage)
        );
      }
    }, 300);
  };

  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (!manualText.trim()) return;
    setTranscript(manualText);
    processVoiceInput(manualText);
  };

  const updateItemQty = (index, delta) => {
    const updated = [...confirmedItems];
    const newQty = updated[index].quantity + delta;
    if (newQty <= 0) {
      updated.splice(index, 1);
    } else {
      updated[index].quantity = newQty;
      updated[index].subtotal = updated[index].dish.price * newQty;
    }
    setConfirmedItems(updated);
  };

  const removeItem = (index) => {
    const updated = [...confirmedItems];
    updated.splice(index, 1);
    setConfirmedItems(updated);
  };

  const handleAddToCart = () => {
    if (confirmedItems.length === 0) return;

    confirmedItems.forEach(item => {
      addItem(item.dish, item.quantity);
    });

    setAddedToCartSuccess(true);
    const successMsg = activeLanguage === 'kn-IN'
      ? 'ಕಾರ್ಟ್‌ಗೆ ಸೇರಿಸಲಾಗಿದೆ!'
      : activeLanguage === 'hi-IN'
      ? 'कार्ट में जोड़ दिया गया!'
      : 'Added to cart successfully!';
    speakKioskPrompt(successMsg, activeLanguage);

    setTimeout(() => {
      onClose();
    }, 1200);
  };

  if (!isOpen) return null;

  const totalCalculated = confirmedItems.reduce((acc, curr) => acc + curr.subtotal, 0);

  return (
    <div className="voice-modal-overlay" onClick={onClose}>
      <div className="voice-modal-card" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="voice-modal-header">
          <div className="voice-header-brand">
            <div className="voice-mic-badge">
              <Sparkles size={18} />
            </div>
            <div>
              <h3 className="voice-modal-title">Kiosk Voice Ordering</h3>
              <span className="voice-modal-sub">Speak naturally in English, Kannada, or Hindi</span>
            </div>
          </div>
          <button className="voice-close-btn" onClick={onClose} aria-label="Close voice assistant">
            <X size={20} />
          </button>
        </div>

        {/* Language Tabs */}
        <div className="voice-lang-bar">
          <Globe size={14} />
          <span>Select Language:</span>
          <div className="voice-lang-buttons">
            {SUPPORTED_LANGUAGES.map((lang) => (
              <button
                key={lang.code}
                className={`voice-lang-pill ${activeLanguage === lang.code ? 'active' : ''}`}
                onClick={() => setActiveLanguage(lang.code)}
              >
                <span>{lang.flag}</span>
                <span>{lang.nativeName}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Modal Body */}
        <div className="voice-modal-body">
          {/* Listening Wave & Action Center */}
          <div className="voice-active-area">
            <button
              className={`voice-mic-button ${isListening ? 'listening' : ''}`}
              onClick={isListening ? stopListening : startListening}
              title={isListening ? 'Tap to stop listening' : 'Tap to speak'}
              aria-label={isListening ? 'Stop listening' : 'Start speaking'}
            >
              {isListening ? (
                <>
                  <span className="mic-ripple ring-1" />
                  <span className="mic-ripple ring-2" />
                  <Mic size={36} className="mic-icon animate-pulse" />
                </>
              ) : (
                <Mic size={36} className="mic-icon" />
              )}
            </button>

            <div className="voice-status-text">
              {isListening ? (
                <span className="listening-badge">
                  <span className="pulse-dot" /> {currentLangConfig.listeningPrompt}
                </span>
              ) : isProcessing ? (
                <span>Identifying items in {currentLangConfig.name}...</span>
              ) : parsedResult ? (
                <span>Tap microphone to speak another dish or confirm below</span>
              ) : (
                <span>Say: <em>{currentLangConfig.tryExample}</em></span>
              )}
            </div>

            {/* Live Transcript Display */}
            {(transcript || interimTranscript) && (
              <div className="voice-transcript-bubble">
                <Volume2 size={16} className="transcript-icon" />
                <p>"{transcript || interimTranscript}"</p>
              </div>
            )}

            {/* Mic Error Notice */}
            {micError && (
              <div className="voice-alert-warning">
                <AlertTriangle size={16} />
                <span>{micError}</span>
              </div>
            )}
          </div>

          {/* Interpreted Order Section */}
          {parsedResult && (
            <div className="voice-results-box">
              <div className="voice-results-header">
                <h4 className="results-title">
                  {currentLangConfig.confirmPrompt}
                </h4>
                {confirmedItems.length > 0 && (
                  <span className="items-count-pill">{confirmedItems.length} {confirmedItems.length === 1 ? 'dish' : 'dishes'}</span>
                )}
              </div>

              {confirmedItems.length > 0 ? (
                <div className="voice-items-list">
                  {confirmedItems.map((item, idx) => (
                    <div key={idx} className="voice-item-card">
                      <div className="voice-item-info">
                        <span className={`voice-type-dot ${item.dish.type === 'veg' ? 'veg' : 'nonveg'}`} />
                        <div>
                          <strong className="voice-item-name">{item.dish.name}</strong>
                          <span className="voice-item-price-each">₹{item.dish.price} each</span>
                        </div>
                      </div>

                      <div className="voice-item-actions">
                        <div className="voice-qty-box">
                          <button
                            className="btn-qty-mini"
                            onClick={() => updateItemQty(idx, -1)}
                            aria-label="Decrease quantity"
                          >
                            <Minus size={13} />
                          </button>
                          <span className="qty-val">{item.quantity}</span>
                          <button
                            className="btn-qty-mini"
                            onClick={() => updateItemQty(idx, 1)}
                            aria-label="Increase quantity"
                          >
                            <Plus size={13} />
                          </button>
                        </div>
                        <span className="voice-item-subtotal">₹{item.subtotal}</span>
                        <button
                          className="btn-remove-item"
                          onClick={() => removeItem(idx)}
                          title="Remove item"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}

                  <div className="voice-total-row">
                    <span>Estimated Total:</span>
                    <strong>₹{totalCalculated}</strong>
                  </div>
                </div>
              ) : (
                <div className="voice-no-match-box">
                  <HelpCircle size={28} className="text-warning" />
                  <p>Could not match any available menu items from your speech.</p>
                </div>
              )}

              {/* Unavailable Items Notice */}
              {parsedResult.unavailableItems?.length > 0 && (
                <div className="voice-unavailable-alert">
                  <div className="alert-title">
                    <AlertTriangle size={15} /> Sold Out in Kitchen
                  </div>
                  {parsedResult.unavailableItems.map((un, idx) => (
                    <div key={idx} className="unavailable-line">
                      • <strong>{un.dish.name}</strong> is currently unavailable.
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Manual Text Fallback */}
          <div className="voice-manual-fallback">
            <span className="fallback-divider-text">Or type your order</span>
            <form className="voice-text-form" onSubmit={handleManualSubmit}>
              <input
                type="text"
                className="voice-text-input"
                placeholder={`Type here in ${currentLangConfig.name}...`}
                value={manualText}
                onChange={(e) => setManualText(e.target.value)}
              />
              <button type="submit" className="btn btn-primary btn-sm voice-text-btn">
                <Send size={15} /> Add
              </button>
            </form>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="voice-modal-footer">
          {addedToCartSuccess ? (
            <div className="voice-success-banner">
              <CheckCircle2 size={20} color="#16a34a" />
              <span>Added to kiosk cart successfully!</span>
            </div>
          ) : (
            <div className="voice-modal-actions">
              <button className="btn btn-outline" onClick={startListening}>
                <RotateCcw size={15} /> Speak Again
              </button>

              <button
                className="btn btn-primary btn-lg voice-add-cart-btn"
                onClick={handleAddToCart}
                disabled={confirmedItems.length === 0}
              >
                <ShoppingBag size={18} /> Confirm ({confirmedItems.length} Dishes)
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
