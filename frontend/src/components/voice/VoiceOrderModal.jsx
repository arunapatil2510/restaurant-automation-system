import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
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
  speakKioskPrompt,
  formatOrderConfirmationPrompt,
  formatUnknownItemPrompt,
  getSpeechRecognitionErrorMessage
} from '../../utils/multilingualVoiceEngine.js';
import { matchVoiceOrderWithMenu, mergeOrderItems } from '../../utils/voiceParser.js';
import { parseVoiceIntent } from '../../services/voiceIntentService.js';
import { 
  classifyIntent, 
  INTENT_TYPES, 
  getConversationalResponse 
} from '../../utils/intentClassifier.js';
import { useCart } from '../../context/CartContext';

export const VoiceOrderModal = ({ isOpen, onClose, menuItems = [] }) => {
  const navigate = useNavigate();
  const { addItem, kioskLanguage, setKioskLanguage } = useCart();

  const [activeLanguage, setActiveLanguage] = useState(kioskLanguage || 'en-IN');
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isAskingMore, setIsAskingMore] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [speechSupported, setSpeechSupported] = useState(true);
  const [micError, setMicError] = useState(null);

  const [parsedResult, setParsedResult] = useState(null);
  const [confirmedItems, setConfirmedItems] = useState([]);
  const [candidateItems, setCandidateItems] = useState([]);
  const [addedToCartSuccess, setAddedToCartSuccess] = useState(false);
  const [manualText, setManualText] = useState('');

  // Multi-Turn Conversational Memory
  const [conversationHistory, setConversationHistory] = useState([]);
  const [lastDiscussedDish, setLastDiscussedDish] = useState(null);

  const recognitionRef = useRef(null);
  const silenceTimerRef = useRef(null);
  const autoListenTimeoutRef = useRef(null);
  const hasProcessedRef = useRef(false);
  const pendingTranscriptRef = useRef('');
  const navigatedRef = useRef(false);
  const hasCommittedCartRef = useRef(false);
  const isSpeakingRef = useRef(false);
  const isConfirmingRef = useRef(isConfirming);
  const isAskingMoreRef = useRef(isAskingMore);
  const confirmedItemsRef = useRef(confirmedItems);
  const candidateItemsRef = useRef(candidateItems);
  const activeLanguageRef = useRef(activeLanguage);
  const conversationHistoryRef = useRef(conversationHistory);
  const lastDiscussedDishRef = useRef(lastDiscussedDish);
  const isParsingRef = useRef(false);

  useEffect(() => {
    isConfirmingRef.current = isConfirming;
  }, [isConfirming]);

  useEffect(() => {
    isAskingMoreRef.current = isAskingMore;
  }, [isAskingMore]);

  useEffect(() => {
    confirmedItemsRef.current = confirmedItems;
  }, [confirmedItems]);

  useEffect(() => {
    candidateItemsRef.current = candidateItems;
  }, [candidateItems]);

  useEffect(() => {
    activeLanguageRef.current = activeLanguage;
  }, [activeLanguage]);

  useEffect(() => {
    conversationHistoryRef.current = conversationHistory;
  }, [conversationHistory]);

  useEffect(() => {
    lastDiscussedDishRef.current = lastDiscussedDish;
  }, [lastDiscussedDish]);

  useEffect(() => {
    if (kioskLanguage && kioskLanguage !== activeLanguage) {
      setActiveLanguage(kioskLanguage);
    }
  }, [kioskLanguage]);

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
      confirmedItemsRef.current = [];
      setCandidateItems([]);
      candidateItemsRef.current = [];
      setAddedToCartSuccess(false);
      setMicError(null);
      setManualText('');
      setIsConfirming(false);
      isConfirmingRef.current = false;
      setIsAskingMore(false);
      isAskingMoreRef.current = false;
      hasCommittedCartRef.current = false;
      navigatedRef.current = false;

      startListening();
    } else {
      stopListening();
    }
    return () => {
      stopListening();
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
      }
      if (autoListenTimeoutRef.current) {
        clearTimeout(autoListenTimeoutRef.current);
      }
    };
  }, [isOpen, activeLanguage]);

  const speakAndListen = (text, langCode = activeLanguage, willConfirm = false, willAskMore = false) => {
    stopListening();
    setIsConfirming(willConfirm);
    isConfirmingRef.current = willConfirm;
    setIsAskingMore(willAskMore);
    isAskingMoreRef.current = willAskMore;
    isSpeakingRef.current = true;

    speakKioskPrompt(text, langCode, () => {
      isSpeakingRef.current = false;
      autoListenTimeoutRef.current = setTimeout(() => {
        startListening();
      }, 350);
    });
  };

  const startListening = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setSpeechSupported(false);
      return;
    }

    try {
      stopListening();

      hasProcessedRef.current = false;
      pendingTranscriptRef.current = '';

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

        const currentSpeech = (final || interim).trim();
        if (currentSpeech) {
          pendingTranscriptRef.current = currentSpeech;
          setInterimTranscript(currentSpeech);

          if (silenceTimerRef.current) {
            clearTimeout(silenceTimerRef.current);
          }

          if (final && !hasProcessedRef.current) {
            hasProcessedRef.current = true;
            stopListening();
            setTranscript(final.trim());
            processVoiceInput(final.trim());
            return;
          }

          silenceTimerRef.current = setTimeout(() => {
            if (!hasProcessedRef.current && pendingTranscriptRef.current.trim()) {
              hasProcessedRef.current = true;
              const textToProcess = pendingTranscriptRef.current.trim();
              stopListening();
              setTranscript(textToProcess);
              processVoiceInput(textToProcess);
            }
          }, 750);
        }
      };

      recognition.onerror = (event) => {
        console.warn('[VoiceOrderModal] Speech recognition error event:', event.error, event);
        if (event.error === 'not-allowed' || event.error === 'permission-denied') {
          setMicError(getSpeechRecognitionErrorMessage(event.error, activeLanguage));
        } else if (event.error === 'no-speech') {
          // Gracefully stay ready
        } else if (event.error !== 'aborted') {
          setMicError(getSpeechRecognitionErrorMessage(event.error, activeLanguage));
        }
        setIsListening(false);
      };

      recognition.onend = () => {
        if (silenceTimerRef.current) {
          clearTimeout(silenceTimerRef.current);
        }
        if (!hasProcessedRef.current && pendingTranscriptRef.current.trim()) {
          hasProcessedRef.current = true;
          const textToProcess = pendingTranscriptRef.current.trim();
          setTranscript(textToProcess);
          processVoiceInput(textToProcess);
        }
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      console.log(`[VoiceOrderModal] Starting speech recognition for: ${recognition.lang}`);
      recognition.start();
    } catch (err) {
      console.warn('[VoiceOrderModal] SpeechRecognition.start() threw:', err);
      if (err.name !== 'InvalidStateError') {
        setMicError(`Could not start microphone: ${err.message || err.name}`);
      }
      setIsListening(false);
    }
  };

  const stopListening = () => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch {}
      try {
        recognitionRef.current.stop();
      } catch {}
      recognitionRef.current = null;
    }
    setIsListening(false);
  };

  // Step 3 & 4: Confirm candidate item and ask "Would you like anything else?"
  const confirmCandidateItem = () => {
    const candidate = candidateItemsRef.current;
    if (!candidate || candidate.length === 0) return;

    // Merge candidate item into confirmed items
    const merged = mergeOrderItems(confirmedItemsRef.current, candidate);
    setConfirmedItems(merged);
    confirmedItemsRef.current = merged;

    setCandidateItems([]);
    candidateItemsRef.current = [];

    const currentLang = activeLanguageRef.current || activeLanguage;
    const langConfig = SUPPORTED_LANGUAGES.find(l => l.code === currentLang) || SUPPORTED_LANGUAGES[0];
    const askPrompt = langConfig.addedAskAnythingElse || "Added to your order. Would you like anything else?";

    speakAndListen(askPrompt, currentLang, false, true);
  };

  // Step 10: Reject candidate item without losing previously confirmed items
  const rejectCandidateItem = () => {
    setCandidateItems([]);
    candidateItemsRef.current = [];

    const currentLang = activeLanguageRef.current || activeLanguage;
    const langConfig = SUPPORTED_LANGUAGES.find(l => l.code === currentLang) || SUPPORTED_LANGUAGES[0];
    const rejectPrompt = langConfig.itemRejected || langConfig.askChange || "Okay. What would you like to order instead?";

    speakAndListen(rejectPrompt, currentLang, false, false);
  };

  // Step 5: Resume listening for more food items while preserving existing order
  const requestMoreItems = () => {
    const currentLang = activeLanguageRef.current || activeLanguage;
    const langConfig = SUPPORTED_LANGUAGES.find(l => l.code === currentLang) || SUPPORTED_LANGUAGES[0];
    const prompt = langConfig.askWhatElse || "What else would you like to order?";

    speakAndListen(prompt, currentLang, false, false);
  };

  // Step 7 & 8: Finish voice-ordering session, add collected items to cart exactly once, and navigate to /cart
  const handleFinalizeOrder = () => {
    if (hasCommittedCartRef.current) return;
    const itemsToAdd = confirmedItemsRef.current.length > 0 ? confirmedItemsRef.current : confirmedItems;
    if (itemsToAdd.length === 0) return;

    hasCommittedCartRef.current = true;
    navigatedRef.current = true;
    stopListening();

    // 1. Add all accumulated confirmed items to CartContext exactly once
    itemsToAdd.forEach(item => {
      addItem(item.dish || item, item.quantity);
    });

    setAddedToCartSuccess(true);

    // 2. Give spoken confirmation
    const currentLang = activeLanguageRef.current || activeLanguage;
    const langConfig = SUPPORTED_LANGUAGES.find(l => l.code === currentLang) || SUPPORTED_LANGUAGES[0];
    const successMsg = langConfig.orderFinalized || langConfig.orderConfirmed || "Your order is confirmed. Taking you to the cart to review.";

    const triggerCartNavigation = () => {
      onClose();
      navigate('/cart');
    };

    speakKioskPrompt(successMsg, currentLang, () => {
      triggerCartNavigation();
    });

    // 3. Fallback timeout to guarantee navigation to Cart/Checkout flow
    setTimeout(() => {
      triggerCartNavigation();
    }, 1400);
  };

  // Main Phase 2 Continuous Voice Order Processing
  const processVoiceInput = async (text) => {
    if (!text || !text.trim() || isSpeakingRef.current || isParsingRef.current) return;

    stopListening();

    const isConfirmingCurrent = isConfirmingRef.current;
    const isAskingMoreCurrent = isAskingMoreRef.current;
    const currentConfirmed = confirmedItemsRef.current;
    const currentCandidate = candidateItemsRef.current;
    const currentLang = activeLanguageRef.current || activeLanguage;
    const langConfig = SUPPORTED_LANGUAGES.find(l => l.code === currentLang) || SUPPORTED_LANGUAGES[0];

    const currentStage = isAskingMoreCurrent
      ? 'ASK_MORE'
      : (isConfirmingCurrent ? 'CONFIRM_ITEM' : 'GENERAL');

    const intent = classifyIntent(text, {
      stage: currentStage,
      hasPendingOrder: currentCandidate.length > 0
    });

    // 1. User is in ASK_MORE stage ("Added to your order. Would you like anything else?")
    if (isAskingMoreCurrent) {
      // 1A. User says NO / Nothing else / That's all -> Finish session and go to cart exactly once
      if (intent.type === INTENT_TYPES.FINISH_ORDER || intent.type === INTENT_TYPES.CANCEL) {
        handleFinalizeOrder();
        return;
      }

      // 1B. User says YES / Add more -> Resume listening for next item without clearing confirmed items
      if (intent.type === INTENT_TYPES.ADD_MORE || intent.type === INTENT_TYPES.CONFIRMATION) {
        requestMoreItems();
        return;
      }

      // 1C. User directly speaks a new food item -> fall through to intent service below!
    }

    // 2. User is in CONFIRM_ITEM stage ("Shall I add it to your order?")
    if (isConfirmingCurrent) {
      // 2A. User confirms item ("Yes") -> Add item to order exactly once, then ask "Would you like anything else?"
      if (intent.type === INTENT_TYPES.CONFIRMATION) {
        confirmCandidateItem();
        return;
      }

      // 2B. User rejects item ("No" / "Change it") -> Discard only candidate item, keep confirmed items intact
      if (intent.type === INTENT_TYPES.CANCEL || intent.type === INTENT_TYPES.MODIFY) {
        rejectCandidateItem();
        return;
      }
    }

    // 3. Conversational Intents
    if (intent.type === INTENT_TYPES.GREETING || intent.type === INTENT_TYPES.HELP || intent.type === INTENT_TYPES.GRATITUDE) {
      const reply = getConversationalResponse(intent.type, currentLang);
      setMicError(reply);
      speakAndListen(reply, currentLang, false, isAskingMoreCurrent);
      return;
    }

    // 4. Standalone No/Finish when customer has confirmed items
    if ((intent.type === INTENT_TYPES.FINISH_ORDER || intent.type === INTENT_TYPES.CANCEL) && currentConfirmed.length > 0) {
      handleFinalizeOrder();
      return;
    }

    // 5. Intelligent Conversational Intent Parsing & Menu Grounding via Shared Gemini Service
    setIsProcessing(true);
    isParsingRef.current = true;

    // Track user utterance in conversation history
    const userTurn = { role: 'user', text };
    const updatedHistory = [...(conversationHistoryRef.current || []), userTurn].slice(-10);
    setConversationHistory(updatedHistory);
    conversationHistoryRef.current = updatedHistory;

    const currentDraftOrder = [...currentConfirmed, ...currentCandidate];

    try {
      const result = await parseVoiceIntent({
        text,
        language: currentLang,
        menuItems,
        context: currentStage,
        conversationHistory: updatedHistory,
        currentOrder: currentDraftOrder,
        lastDiscussedDish: lastDiscussedDishRef.current
      });
      setParsedResult(result);

      if (result.lastDiscussedDish) {
        setLastDiscussedDish(result.lastDiscussedDish);
        lastDiscussedDishRef.current = result.lastDiscussedDish;
      }

      // Record assistant reply in conversation history
      if (result.response) {
        const assistantTurn = { role: 'assistant', text: result.response };
        const historyWithReply = [...updatedHistory, assistantTurn].slice(-10);
        setConversationHistory(historyWithReply);
        conversationHistoryRef.current = historyWithReply;
      }

      // Handle Ambiguity Clarification ("Do you mean three dosas or three coffees?")
      if (result.intent === 'ASK_CLARIFICATION' || result.requiresClarification) {
        const clarQuestion = result.response || result.clarificationQuestion;
        setMicError(clarQuestion);
        speakAndListen(clarQuestion, currentLang, false, isAskingMoreCurrent);
        return;
      }

      // Handle Quantity Modification ("Actually make that three")
      if (result.intent === 'MODIFY_QUANTITY' || result.action === 'UPDATE_QUANTITY') {
        if (result.updatedOrder && result.updatedOrder.length > 0) {
          if (currentCandidate.length > 0) {
            setCandidateItems(result.updatedOrder);
            candidateItemsRef.current = result.updatedOrder;
          } else {
            setConfirmedItems(result.updatedOrder);
            confirmedItemsRef.current = result.updatedOrder;
          }
        }
        const confirmMsg = result.response || "Updated! Would you like anything else?";
        setMicError(null);
        speakAndListen(confirmMsg, currentLang, currentCandidate.length > 0, currentConfirmed.length > 0);
        return;
      }

      // Handle Item Removal ("Remove the coffee")
      if (result.intent === 'REMOVE_ITEM' || result.action === 'REMOVE') {
        if (result.updatedOrder) {
          if (currentCandidate.length > 0) {
            setCandidateItems(result.updatedOrder);
            candidateItemsRef.current = result.updatedOrder;
          }
          setConfirmedItems(result.updatedOrder);
          confirmedItemsRef.current = result.updatedOrder;
        } else if (result.targetItem) {
          const filterFn = (i) => !(i.name || i.dish?.name || '').toLowerCase().includes(result.targetItem.toLowerCase());
          const newCand = currentCandidate.filter(filterFn);
          const newConf = currentConfirmed.filter(filterFn);
          setCandidateItems(newCand);
          candidateItemsRef.current = newCand;
          setConfirmedItems(newConf);
          confirmedItemsRef.current = newConf;
        }
        const removeMsg = result.response || `Removed ${result.targetItem || 'item'} from your order.`;
        setMicError(null);
        speakAndListen(removeMsg, currentLang, false, confirmedItemsRef.current.length > 0);
        return;
      }

      // Handle Ordering or Adding Items
      if (result.intent === 'ORDER' || result.intent === 'ADD_ITEM' || result.action === 'ADD') {
        if (result.items && result.items.length > 0) {
          const itemsToConfirm = result.items.map(item => ({ ...item }));
          setCandidateItems(itemsToConfirm);
          candidateItemsRef.current = itemsToConfirm;
          setIsAskingMore(false);
          isAskingMoreRef.current = false;

          const confirmationPrompt = result.response || formatOrderConfirmationPrompt(itemsToConfirm, currentLang);
          speakAndListen(confirmationPrompt, currentLang, true, false);
        } else {
          const fallbackAskMore = currentConfirmed.length > 0 && isAskingMoreCurrent;
          setIsConfirming(false);
          isConfirmingRef.current = false;
          setIsAskingMore(fallbackAskMore);
          isAskingMoreRef.current = fallbackAskMore;

          const unMsg = result.response || (result.unrecognizedItems?.length > 0
            ? formatUnknownItemPrompt(result.unrecognizedItems, currentLang)
            : getConversationalResponse(INTENT_TYPES.UNKNOWN, currentLang));
          setMicError(unMsg);
          speakAndListen(unMsg, currentLang, false, fallbackAskMore);
        }
      } else if (result.intent === 'CONFIRM') {
        if (candidateItemsRef.current.length > 0) {
          confirmCandidateItem();
        } else if (currentConfirmed.length > 0) {
          handleFinalizeOrder();
        } else {
          speakAndListen(result.response || langConfig.greeting, currentLang, false, false);
        }
      } else if (result.intent === 'CANCEL' || result.intent === 'MODIFY') {
        if (candidateItemsRef.current.length > 0) {
          rejectCandidateItem();
        } else if (currentConfirmed.length > 0) {
          handleFinalizeOrder();
        } else {
          speakAndListen(result.response || langConfig.askChange, currentLang, false, false);
        }
      } else if (result.intent === 'FINISH_ORDER') {
        if (currentConfirmed.length > 0) {
          handleFinalizeOrder();
        } else {
          speakAndListen(result.response, currentLang, false, false);
        }
      } else if (result.intent === 'ADD_MORE') {
        requestMoreItems();
      } else {
        // Conversational (PRICE_QUERY, INGREDIENT_QUERY, MENU_QUERY, RECOMMENDATION, HELP, GREETING, GRATITUDE)
        setMicError(result.response);
        speakAndListen(result.response || getConversationalResponse(INTENT_TYPES.UNKNOWN, currentLang), currentLang, false, isAskingMoreCurrent);
      }
    } catch (err) {
      console.warn('[VoiceOrderModal] Error during intent parsing:', err);
      const fallbackAskMore = currentConfirmed.length > 0 && isAskingMoreCurrent;
      setIsConfirming(false);
      isConfirmingRef.current = false;
      setIsAskingMore(fallbackAskMore);
      isAskingMoreRef.current = fallbackAskMore;
      const unkMsg = getConversationalResponse(INTENT_TYPES.UNKNOWN, currentLang);
      setMicError(unkMsg);
      speakAndListen(unkMsg, currentLang, false, fallbackAskMore);
    } finally {
      setIsProcessing(false);
      isParsingRef.current = false;
    }
  };

  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (!manualText.trim()) return;
    setTranscript(manualText);
    processVoiceInput(manualText);
  };

  const updateItemQty = (index, delta, isCandidate = false) => {
    if (isCandidate) {
      const updated = [...candidateItems];
      const newQty = updated[index].quantity + delta;
      if (newQty <= 0) {
        updated.splice(index, 1);
      } else {
        updated[index].quantity = newQty;
        updated[index].subtotal = updated[index].dish.price * newQty;
      }
      setCandidateItems(updated);
      candidateItemsRef.current = updated;
      if (updated.length === 0) {
        setIsConfirming(false);
        isConfirmingRef.current = false;
      }
      return;
    }

    const updated = [...confirmedItems];
    const newQty = updated[index].quantity + delta;
    if (newQty <= 0) {
      updated.splice(index, 1);
    } else {
      updated[index].quantity = newQty;
      updated[index].subtotal = updated[index].dish.price * newQty;
    }
    setConfirmedItems(updated);
    confirmedItemsRef.current = updated;
    if (updated.length === 0) {
      setIsAskingMore(false);
      isAskingMoreRef.current = false;
    }
  };

  const removeItem = (index, isCandidate = false) => {
    if (isCandidate) {
      const updated = [...candidateItems];
      updated.splice(index, 1);
      setCandidateItems(updated);
      candidateItemsRef.current = updated;
      if (updated.length === 0) {
        setIsConfirming(false);
        isConfirmingRef.current = false;
      }
      return;
    }

    const updated = [...confirmedItems];
    updated.splice(index, 1);
    setConfirmedItems(updated);
    confirmedItemsRef.current = updated;
    if (updated.length === 0) {
      setIsAskingMore(false);
      isAskingMoreRef.current = false;
    }
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
                onClick={() => {
                  setActiveLanguage(lang.code);
                  if (setKioskLanguage) setKioskLanguage(lang.code);
                  speakAndListen(lang.greeting, lang.code, false);
                }}
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
                  <span className="pulse-dot" /> {isConfirming ? currentLangConfig.listeningConfirm : isAskingMore ? (currentLangConfig.listeningAskMore || 'Would you like anything else? Say "Yes" or "No"') : currentLangConfig.listeningPrompt}
                </span>
              ) : isProcessing ? (
                <span>Understanding your order...</span>
              ) : isConfirming ? (
                <span>Say <strong>"Yes"</strong> to confirm item or <strong>"No"</strong> to change</span>
              ) : isAskingMore ? (
                <span>Say <strong>"Yes"</strong> to order more or <strong>"No"</strong> to finish & review cart</span>
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

            {/* Mic Notice / Prompt */}
            {micError && (
              <div className="voice-alert-warning">
                <AlertTriangle size={16} />
                <span>{micError}</span>
              </div>
            )}
          </div>

          {/* Candidate Item Awaiting Confirmation */}
          {candidateItems.length > 0 && isConfirming && (
            <div className="voice-results-box" style={{ borderColor: 'var(--color-primary, #ea580c)' }}>
              <div className="voice-results-header">
                <h4 className="results-title">
                  {formatOrderConfirmationPrompt(candidateItems, activeLanguage)}
                </h4>
                <span className="items-count-pill">Awaiting confirmation</span>
              </div>

              <div className="voice-items-list">
                {candidateItems.map((item, idx) => (
                  <div key={idx} className="voice-item-card">
                    <div className="voice-item-info">
                      <span className={`voice-type-dot ${item.dish?.type === 'veg' ? 'veg' : 'nonveg'}`} />
                      <div>
                        <strong className="voice-item-name">{item.dish?.name}</strong>
                        <span className="voice-item-price-each">₹{item.dish?.price} each</span>
                      </div>
                    </div>
                    <div className="voice-item-actions">
                      <span className="qty-val">× {item.quantity}</span>
                      <span className="voice-item-subtotal">₹{item.subtotal}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem', justifyContent: 'flex-end' }}>
                <button
                  className="btn btn-primary btn-sm"
                  onClick={confirmCandidateItem}
                >
                  <CheckCircle2 size={15} /> Yes, Add Item
                </button>
                <button
                  className="btn btn-outline btn-sm"
                  onClick={rejectCandidateItem}
                >
                  <X size={15} /> No, Change
                </button>
              </div>
            </div>
          )}

          {/* Accumulated Confirmed Order Section */}
          {confirmedItems.length > 0 && (
            <div className="voice-results-box">
              <div className="voice-results-header">
                <h4 className="results-title">
                  {isAskingMore
                    ? (currentLangConfig.addedAskAnythingElse || "Added to your order! Would you like anything else?")
                    : "Confirmed in Your Order"}
                </h4>
                <span className="items-count-pill">{confirmedItems.length} {confirmedItems.length === 1 ? 'dish' : 'dishes'}</span>
              </div>

              <div className="voice-items-list">
                {confirmedItems.map((item, idx) => (
                  <div key={idx} className="voice-item-card">
                    <div className="voice-item-info">
                      <span className={`voice-type-dot ${item.dish?.type === 'veg' ? 'veg' : 'nonveg'}`} />
                      <div>
                        <strong className="voice-item-name">{item.dish?.name}</strong>
                        <span className="voice-item-price-each">₹{item.dish?.price} each</span>
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
                  <span>Current Order Total:</span>
                  <strong>₹{totalCalculated}</strong>
                </div>
              </div>

              {/* Unavailable Items Notice */}
              {parsedResult?.unavailableItems?.length > 0 && (
                <div className="voice-unavailable-alert">
                  <div className="alert-title">
                    <AlertTriangle size={15} /> Sold Out in Kitchen
                  </div>
                  {parsedResult.unavailableItems.map((un, idx) => (
                    <div key={idx} className="unavailable-line">
                      • <strong>{un.dish?.name}</strong> is currently unavailable.
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
                placeholder={`Type here in ${currentLangConfig.name} (e.g. 1 Masala Dosa, 1 Mango Lassi)...`}
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
              <span>Added to kiosk cart! Taking you to cart to review...</span>
            </div>
          ) : (
            <div className="voice-modal-actions">
              <button
                className="btn btn-outline"
                onClick={isAskingMore ? requestMoreItems : startListening}
              >
                {isAskingMore ? <><Plus size={15} /> Order More</> : <><RotateCcw size={15} /> Speak Again</>}
              </button>

              <button
                className="btn btn-primary btn-lg voice-add-cart-btn"
                onClick={handleFinalizeOrder}
                disabled={confirmedItems.length === 0}
              >
                <ShoppingBag size={18} /> Finish & View Cart ({confirmedItems.length} {confirmedItems.length === 1 ? 'Dish' : 'Dishes'})
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
