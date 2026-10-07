import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Mic, 
  MicOff, 
  Sparkles, 
  Check, 
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
  Globe,
  ArrowRight,
  Utensils,
  X,
  MessageSquare
} from 'lucide-react';
import { 
  SARVAM_SUPPORTED_LANGUAGES, 
  speakKioskSpeech 
} from '../../services/sarvamVoiceService.js';
import { matchVoiceOrderWithMenu } from '../../utils/voiceParser.js';
import { 
  classifyIntent, 
  INTENT_TYPES, 
  getConversationalResponse 
} from '../../utils/intentClassifier.js';
import { useCart } from '../../context/CartContext';

// True Voice-First Kiosk States
export const VOICE_STATES = {
  IDLE: 'idle',
  SPEAKING: 'speaking',
  LISTENING: 'listening',
  PROCESSING: 'processing',
  CONVERSATION: 'conversation',
  CONFIRMATION: 'confirmation',
  CONFIRMED: 'confirmed',
  PERMISSION_DENIED: 'permission_denied',
  ERROR: 'error'
};

export const KioskVoiceSection = ({ 
  menuItems = [], 
  activeLanguage = 'en-IN', 
  onLanguageChange,
  onOpenTouchMenu 
}) => {
  const navigate = useNavigate();
  const { addItem, tableNumber } = useCart();

  // Voice State Machine
  const [voiceState, setVoiceState] = useState(VOICE_STATES.IDLE);
  const [systemSpeech, setSystemSpeech] = useState("Hello! Welcome to RESTOSMART. What would you like to order?");
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isEditingManually, setIsEditingManually] = useState(false);

  // Parsed Food Order Items
  const [parsedResult, setParsedResult] = useState(null);
  const [orderItems, setOrderItems] = useState([]);
  const [manualInput, setManualInput] = useState('');

  const recognitionRef = useRef(null);
  const autoListenTimeoutRef = useRef(null);
  const navigatedRef = useRef(false);
  const currentLangConfig = SARVAM_SUPPORTED_LANGUAGES.find(l => l.code === activeLanguage) || SARVAM_SUPPORTED_LANGUAGES[0];

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopListening();
      if (autoListenTimeoutRef.current) {
        clearTimeout(autoListenTimeoutRef.current);
      }
    };
  }, []);

  // Speak a prompt and automatically start listening afterwards for true hands-free voice loop
  const speakAndAutoListen = (text, langCode = activeLanguage) => {
    setSystemSpeech(text);
    setVoiceState(VOICE_STATES.SPEAKING);

    speakKioskSpeech(text, langCode, () => {
      // Once speech finishes, open microphone after a tiny pause to avoid self-pickup
      autoListenTimeoutRef.current = setTimeout(() => {
        startListening();
      }, 350);
    });
  };

  // Language Change Handler
  const handleLangSelect = (code) => {
    stopListening();
    if (onLanguageChange) {
      onLanguageChange(code);
    }
    const newLang = SARVAM_SUPPORTED_LANGUAGES.find(l => l.code === code) || SARVAM_SUPPORTED_LANGUAGES[0];
    speakAndAutoListen(newLang.greeting, code);
  };

  // Start Speech Recognition
  const startListening = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setVoiceState(VOICE_STATES.ERROR);
      setErrorMessage('Speech recognition is not supported in this browser. Please use touch menu or manual entry.');
      return;
    }

    try {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {}
      }

      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = currentLangConfig.sarvamSttCode || activeLanguage;

      recognition.onstart = () => {
        setVoiceState(VOICE_STATES.LISTENING);
        setErrorMessage('');
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
          processUserInput(final);
        } else {
          setInterimTranscript(interim);
        }
      };

      recognition.onerror = (event) => {
        console.warn('Speech recognition error:', event.error);
        if (event.error === 'not-allowed' || event.error === 'permission-denied') {
          setVoiceState(VOICE_STATES.PERMISSION_DENIED);
        } else if (event.error === 'no-speech') {
          setVoiceState(VOICE_STATES.IDLE);
        } else {
          setVoiceState(VOICE_STATES.ERROR);
          setErrorMessage(`Could not capture audio (${event.error}). Please tap speak or try again.`);
        }
      };

      recognition.onend = () => {
        if (voiceState === VOICE_STATES.LISTENING) {
          setVoiceState(VOICE_STATES.IDLE);
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.error('Failed to start speech recognition:', err);
      setVoiceState(VOICE_STATES.PERMISSION_DENIED);
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
    }
  };

  // Explicit Microphone Permission Request Handler
  const requestMicPermission = async () => {
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach(track => track.stop());
      }
      setVoiceState(VOICE_STATES.IDLE);
      speakAndAutoListen(currentLangConfig.greeting, activeLanguage);
    } catch (err) {
      console.warn('Microphone permission request error:', err);
      setVoiceState(VOICE_STATES.PERMISSION_DENIED);
    }
  };

  // Main Intent & Food Processing Pipeline
  const processUserInput = (text) => {
    if (!text || !text.trim()) return;

    const hasPendingOrder = (voiceState === VOICE_STATES.CONFIRMATION || orderItems.length > 0);
    const intent = classifyIntent(text, hasPendingOrder);

    // 1. CONFIRMATION INTENT (Customer says "Yes", "Confirm", "ಹೌದು", "हाँ", "Correct")
    if (intent.type === INTENT_TYPES.CONFIRMATION && hasPendingOrder) {
      confirmAndAddToCart();
      return;
    }

    // 2. CANCEL / MODIFY INTENT (Customer says "No", "Cancel", "Change", "ಬೇಡ", "नहीं")
    if (intent.type === INTENT_TYPES.CANCEL || intent.type === INTENT_TYPES.MODIFY) {
      const askMsg = currentLangConfig.askChange;
      speakAndAutoListen(askMsg, activeLanguage);
      return;
    }

    // 3. CONVERSATIONAL INTENTS (Greeting, Help, Gratitude)
    if (intent.type === INTENT_TYPES.GREETING || intent.type === INTENT_TYPES.HELP || intent.type === INTENT_TYPES.GRATITUDE) {
      const reply = getConversationalResponse(intent.type, activeLanguage);
      speakAndAutoListen(reply, activeLanguage);
      return;
    }

    // 4. FOOD ORDER INTENT -> Ground against menu
    setVoiceState(VOICE_STATES.PROCESSING);

    setTimeout(() => {
      const result = matchVoiceOrderWithMenu(text, menuItems, activeLanguage);
      setParsedResult(result);

      if (result.matchedItems.length > 0) {
        setOrderItems(result.matchedItems.map(item => ({ ...item })));
        setVoiceState(VOICE_STATES.CONFIRMATION);
        setIsEditingManually(false);

        const totalAmt = result.matchedItems.reduce((acc, curr) => acc + curr.subtotal, 0);
        const itemSummary = result.matchedItems.map(i => `${i.quantity} ${i.dish.name}`).join(' and ');

        // Natural spoken confirmation: "I heard 1 Masala Dosa and 2 Cold Coffees. Your total is 320 rupees. Is that correct?"
        const spokenConfirmation = activeLanguage === 'kn-IN'
          ? `ನಾನು ${result.matchedItems.map(i => `${i.dish.name} ${i.quantity}`).join(' ಮತ್ತು ')} ಕೇಳಿದೆ. ಒಟ್ಟು ಮೊತ್ತ ${totalAmt} ರೂಪಾಯಿಗಳು. ಇದು ಸರಿಯಾಗಿದೆಯೇ?`
          : activeLanguage === 'hi-IN'
          ? `मैंने ${result.matchedItems.map(i => `${i.quantity} ${i.dish.name}`).join(' और ')} सुना। कुल ${totalAmt} रुपये है। क्या यह सही है?`
          : `I heard ${itemSummary}. Your total is ${totalAmt} rupees. Is that correct?`;

        speakAndAutoListen(spokenConfirmation, activeLanguage);
      } else {
        setVoiceState(VOICE_STATES.ERROR);
        if (result.unrecognizedItems.length > 0) {
          const unNames = result.unrecognizedItems.map(u => u.query).join(', ');
          const unMsg = `We could not find "${unNames}" on our menu. Please try saying your order again.`;
          speakAndAutoListen(unMsg, activeLanguage);
        } else {
          const unkMsg = getConversationalResponse(INTENT_TYPES.UNKNOWN, activeLanguage);
          speakAndAutoListen(unkMsg, activeLanguage);
        }
      }
    }, 350);
  };

  // Adjust line item quantity
  const handleUpdateQty = (index, delta) => {
    const updated = [...orderItems];
    const newQty = updated[index].quantity + delta;
    if (newQty <= 0) {
      updated.splice(index, 1);
    } else {
      updated[index].quantity = newQty;
      updated[index].subtotal = updated[index].dish.price * newQty;
    }
    setOrderItems(updated);
    if (updated.length === 0) {
      handleReset();
    }
  };

  const handleRemoveItem = (index) => {
    const updated = [...orderItems];
    updated.splice(index, 1);
    setOrderItems(updated);
    if (updated.length === 0) {
      handleReset();
    }
  };

  // Confirm order and sync to cart
  const confirmAndAddToCart = () => {
    if (orderItems.length === 0) return;

    orderItems.forEach(item => {
      addItem(item.dish, item.quantity);
    });

    setVoiceState(VOICE_STATES.CONFIRMED);

    const successMessage = activeLanguage === 'kn-IN'
      ? 'ಉತ್ತಮ! ನಿಮ್ಮ ಆರ್ಡರ್ ಖಚಿತವಾಗಿದೆ ಮತ್ತು ಕಾರ್ಟ್‌ಗೆ ಸೇರಿಸಲಾಗಿದೆ.'
      : activeLanguage === 'hi-IN'
      ? 'बहुत बढ़िया! आपका ऑर्डर कन्फर्म हो गया है और कार्ट में जोड़ दिया गया है।'
      : 'Perfect! Your order has been added to your cart.';

    // Safe navigation helper that prevents duplicate calls
    const triggerCartNavigation = () => {
      if (!navigatedRef.current) {
        navigatedRef.current = true;
        navigate('/cart');
      }
    };

    speakKioskSpeech(successMessage, activeLanguage, () => {
      triggerCartNavigation();
    });

    // Fallback navigation timeout in case audio callback is blocked by browser
    setTimeout(() => {
      triggerCartNavigation();
    }, 1200);
  };

  // Reset to Idle
  const handleReset = () => {
    stopListening();
    setTranscript('');
    setInterimTranscript('');
    setParsedResult(null);
    setOrderItems([]);
    setErrorMessage('');
    setManualInput('');
    setIsEditingManually(false);
    setVoiceState(VOICE_STATES.IDLE);
  };

  // Manual Input Submit
  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (!manualInput.trim()) return;
    setTranscript(manualInput);
    processUserInput(manualInput);
  };

  const totalCalculated = orderItems.reduce((acc, curr) => acc + curr.subtotal, 0);

  return (
    <section className="kiosk-voice-hero-card" id="kiosk-voice-hero">
      {/* 1. TOP BRANDING & LANGUAGE SELECTOR */}
      <div className="kiosk-hero-top">
        <div className="kiosk-brand-title-wrap">
          <span className="kiosk-welcome-pill">WELCOME TO RESTOSMART</span>
          <h1 className="kiosk-hero-main-title">ORDER YOUR FOOD</h1>
        </div>

        {/* Multilingual Selector */}
        <div className="kiosk-lang-selector-section">
          <span className="kiosk-lang-title">
            <Globe size={16} /> Choose your language:
          </span>
          <div className="kiosk-lang-buttons-row">
            {SARVAM_SUPPORTED_LANGUAGES.map((lang) => (
              <button
                key={lang.code}
                className={`kiosk-lang-chip ${activeLanguage === lang.code ? 'selected' : ''}`}
                onClick={() => handleLangSelect(lang.code)}
              >
                <span className="lang-chip-flag">{lang.flag}</span>
                <span className="lang-chip-name">{lang.name}</span>
                <span className="lang-chip-native">({lang.nativeName})</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 2. MAIN CONVERSATIONAL / VOICE INTERACTION BODY */}
      <div className="kiosk-hero-body">
        {/* ASSISTANT SPEECH DIALOGUE BUBBLE */}
        <div className="kiosk-assistant-dialogue-bubble">
          <div className="dialogue-bot-avatar">
            <Volume2 size={24} />
          </div>
          <div className="dialogue-text-wrap">
            <span className="dialogue-speaker-tag">RESTOSMART KIOSK</span>
            <p className="dialogue-speech-text">"{systemSpeech}"</p>
          </div>
        </div>

        {/* STATE 1: IDLE / SPEAKING / LISTENING */}
        {(voiceState === VOICE_STATES.IDLE || voiceState === VOICE_STATES.SPEAKING || voiceState === VOICE_STATES.LISTENING) && (
          <div className="kiosk-voice-idle-center">
            {/* GIANT CENTRAL MICROPHONE / VOICE ORB */}
            <div className="kiosk-giant-mic-wrapper">
              <button
                className={`kiosk-giant-mic-button ${voiceState === VOICE_STATES.LISTENING ? 'listening-mode' : ''} ${voiceState === VOICE_STATES.SPEAKING ? 'speaking-mode' : ''}`}
                onClick={() => {
                  if (voiceState === VOICE_STATES.LISTENING) {
                    stopListening();
                  } else {
                    startListening();
                  }
                }}
                aria-label="Voice Interaction"
              >
                <div className="mic-outer-ring" />
                <div className="mic-inner-ring" />
                <div className="mic-circle-core">
                  <Mic size={56} className="mic-icon-svg" />
                </div>
              </button>
              <div className="mic-action-caption">
                <span className="mic-caption-main">
                  {voiceState === VOICE_STATES.LISTENING ? "🔴 LISTENING..." : voiceState === VOICE_STATES.SPEAKING ? "🔊 SPEAKING..." : "🎤 TAP TO SPEAK"}
                </span>
              </div>
            </div>

            {/* Audio Waveform Equalizer when Listening */}
            {voiceState === VOICE_STATES.LISTENING && (
              <div className="kiosk-audio-equalizer">
                <span className="eq-bar bar1" />
                <span className="eq-bar bar2" />
                <span className="eq-bar bar3" />
                <span className="eq-bar bar4" />
                <span className="eq-bar bar5" />
                <span className="eq-bar bar6" />
                <span className="eq-bar bar7" />
                <span className="eq-bar bar8" />
              </div>
            )}

            {/* Real-time Customer Transcript */}
            {(interimTranscript || transcript) && (
              <div className="kiosk-live-transcript-bubble">
                <span className="transcript-user-tag">You said:</span>
                <p className="bubble-text">"{interimTranscript || transcript}"</p>
              </div>
            )}

            <p className="kiosk-instruction-text">
              "Tell me what you'd like to order."
            </p>

            <div className="kiosk-example-tag">
              <span className="example-label">Example:</span>
              <span className="example-text">"One Masala Dosa and two Cold Coffees"</span>
            </div>

            {/* Secondary Touch Option */}
            <div className="kiosk-or-browse-divider">
              <div className="divider-line" />
              <span className="divider-text">OR</span>
              <div className="divider-line" />
            </div>

            <button
              className="btn btn-outline btn-lg kiosk-browse-menu-btn"
              onClick={onOpenTouchMenu}
            >
              <Utensils size={18} /> Browse Menu
            </button>
          </div>
        )}

        {/* STATE 2: PROCESSING */}
        {voiceState === VOICE_STATES.PROCESSING && (
          <div className="kiosk-voice-processing-center">
            <div className="kiosk-simple-spinner">
              <Sparkles size={36} className="animate-spin-slow" />
            </div>
            <h3 className="processing-main-text">Understanding your order...</h3>
            <p className="processing-sub-text">Matching against kitchen menu</p>
            <div className="kiosk-spoken-tag">
              <span>"{transcript}"</span>
            </div>
          </div>
        )}

        {/* STATE 3: ORDER CONFIRMATION / VOICE READ-BACK */}
        {voiceState === VOICE_STATES.CONFIRMATION && (
          <div className="kiosk-voice-confirmation-center">
            <div className="kiosk-confirmation-header">
              <h2 className="confirm-main-title">Detected Order</h2>
              <div className="confirm-voice-hint-pill">
                <Mic size={15} /> <span>Say <strong>"Yes"</strong> to confirm or <strong>"No"</strong> to change</span>
              </div>
            </div>

            {/* Order Items Table */}
            <div className="kiosk-confirm-card">
              <div className="kiosk-items-list">
                {orderItems.map((item, idx) => (
                  <div key={idx} className="kiosk-item-entry">
                    <div className="item-info-col">
                      <span className="item-dish-icon">
                        {item.dish.categorySlug === 'beverages' ? '☕' : '🍽️'}
                      </span>
                      <div>
                        <strong className="item-dish-name">{item.dish.name}</strong>
                        {item.customizations && item.customizations.length > 0 && (
                          <div className="item-cust-tags">
                            {item.customizations.map((c, i) => (
                              <span key={i} className="cust-pill">✨ {c}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="item-controls-col">
                      {isEditingManually ? (
                        <div className="item-stepper-box">
                          <button
                            className="btn-step"
                            onClick={() => handleUpdateQty(idx, -1)}
                            aria-label="Decrease"
                          >
                            <Minus size={14} />
                          </button>
                          <span className="step-qty">{item.quantity}</span>
                          <button
                            className="btn-step"
                            onClick={() => handleUpdateQty(idx, 1)}
                            aria-label="Increase"
                          >
                            <Plus size={14} />
                          </button>
                          <button
                            className="btn-del"
                            onClick={() => handleRemoveItem(idx)}
                            aria-label="Delete"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      ) : (
                        <span className="item-qty-badge">× {item.quantity}</span>
                      )}
                      <span className="item-price-val">₹{item.subtotal}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Total Calculation */}
              <div className="kiosk-total-row">
                <span className="total-label">Total:</span>
                <span className="total-amount">₹{totalCalculated}</span>
              </div>
            </div>

            {/* Fallback Action Buttons */}
            <div className="kiosk-confirmation-actions-bar">
              <button
                className="btn btn-primary btn-lg kiosk-confirm-action-btn"
                onClick={confirmAndAddToCart}
              >
                <CheckCircle2 size={22} />
                <span>CONFIRM ORDER (Say "Yes")</span>
              </button>

              <button
                className={`btn btn-outline btn-md ${isEditingManually ? 'active' : ''}`}
                onClick={() => setIsEditingManually(!isEditingManually)}
              >
                ✏️ {isEditingManually ? 'Done Editing' : 'Change Order'}
              </button>

              <button
                className="btn btn-ghost btn-md text-danger"
                onClick={handleReset}
              >
                ❌ Cancel
              </button>
            </div>
          </div>
        )}

        {/* STATE 4: ORDER CONFIRMED */}
        {voiceState === VOICE_STATES.CONFIRMED && (
          <div className="kiosk-voice-confirmed-center">
            <div className="confirmed-check-circle">
              <Check size={48} />
            </div>
            <h2 className="confirmed-title">Order Confirmed!</h2>
            <p className="confirmed-sub">
              Your dishes have been added to your cart for Table #{tableNumber}.
            </p>

            <div className="confirmed-actions-row">
              <button
                className="btn btn-outline btn-lg"
                onClick={handleReset}
              >
                <Mic size={18} /> Order More Dishes
              </button>
              <button
                className="btn btn-primary btn-lg"
                onClick={onOpenTouchMenu}
              >
                <ShoppingBag size={18} /> Proceed to Pay
              </button>
            </div>
          </div>
        )}

        {/* STATE 5: PERMISSION DENIED */}
        {voiceState === VOICE_STATES.PERMISSION_DENIED && (
          <div className="kiosk-voice-permission-center">
            <div className="permission-icon-box">
              <MicOff size={44} />
            </div>
            <h3 className="permission-title">🎤 Microphone access needed</h3>
            <p className="permission-text">
              To order by voice, allow microphone access in your browser.
            </p>
            <div className="permission-actions">
              <button
                className="btn btn-primary btn-lg"
                onClick={requestMicPermission}
              >
                <Mic size={18} /> Allow Microphone
              </button>
              <button
                className="btn btn-outline btn-lg"
                onClick={onOpenTouchMenu}
              >
                <Utensils size={18} /> Browse Menu Instead
              </button>
            </div>
          </div>
        )}

        {/* STATE 6: ERROR / UNRECOGNIZED */}
        {voiceState === VOICE_STATES.ERROR && (
          <div className="kiosk-voice-error-center">
            <div className="error-icon-box">
              <HelpCircle size={40} />
            </div>
            <h3 className="error-main-title">Could not understand order</h3>
            <p className="error-sub-text">
              {errorMessage || 'Please try speaking your order again or browse our touch menu.'}
            </p>

            <div className="error-actions-row">
              <button
                className="btn btn-primary btn-lg"
                onClick={startListening}
              >
                <RotateCcw size={18} /> Try Voice Again
              </button>
              <button
                className="btn btn-outline btn-lg"
                onClick={onOpenTouchMenu}
              >
                <Utensils size={18} /> Browse Menu
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 3. SUBTLE BOTTOM FALLBACK TEXT INPUT */}
      <div className="kiosk-hero-footer">
        <form className="kiosk-fallback-type-bar" onSubmit={handleManualSubmit}>
          <input
            type="text"
            className="kiosk-type-input"
            placeholder={`Or type here in ${currentLangConfig.name} (e.g. 1 Masala Dosa, 2 Cold Coffee)...`}
            value={manualInput}
            onChange={(e) => setManualInput(e.target.value)}
          />
          <button type="submit" className="btn btn-primary btn-sm">
            <Send size={14} /> Send
          </button>
        </form>
      </div>
    </section>
  );
};
