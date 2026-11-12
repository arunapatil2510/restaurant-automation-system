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
import {
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
import { VoiceGuidancePanel } from './VoiceGuidancePanel.jsx';

// True Voice-First Kiosk States
export const VOICE_STATES = {
  IDLE: 'idle',
  SPEAKING: 'speaking',
  LISTENING: 'listening',
  PROCESSING: 'processing',
  CONVERSATION: 'conversation',
  CONFIRMATION: 'confirmation',
  ASK_MORE: 'ask_more',
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
  const [systemSpeech, setSystemSpeech] = useState("Welcome! What would you like to order today?");
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isEditingManually, setIsEditingManually] = useState(false);

  // Parsed Food Order Items: confirmedItems persists across turns, candidateItems is the turn's item awaiting confirmation
  const [parsedResult, setParsedResult] = useState(null);
  const [confirmedItems, setConfirmedItems] = useState([]);
  const [candidateItems, setCandidateItems] = useState([]);
  const [manualInput, setManualInput] = useState('');

  // Conversational Multi-Turn Session Memory
  const [conversationHistory, setConversationHistory] = useState([]);
  const [lastDiscussedDish, setLastDiscussedDish] = useState(null);

  const recognitionRef = useRef(null);
  const autoListenTimeoutRef = useRef(null);
  const silenceTimerRef = useRef(null);
  const hasProcessedRef = useRef(false);
  const pendingTranscriptRef = useRef('');
  const navigatedRef = useRef(false);
  const hasCommittedCartRef = useRef(false);
  const isSpeakingRef = useRef(false);
  const voiceStateRef = useRef(voiceState);
  const confirmedItemsRef = useRef(confirmedItems);
  const candidateItemsRef = useRef(candidateItems);
  const activeLanguageRef = useRef(activeLanguage);
  const conversationHistoryRef = useRef(conversationHistory);
  const lastDiscussedDishRef = useRef(lastDiscussedDish);
  const isParsingRef = useRef(false);

  // Keep refs synchronized on every render
  useEffect(() => {
    voiceStateRef.current = voiceState;
  }, [voiceState]);

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

  const currentLangConfig = SARVAM_SUPPORTED_LANGUAGES.find(l => l.code === activeLanguage) || SARVAM_SUPPORTED_LANGUAGES[0];

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopListening();
      if (autoListenTimeoutRef.current) {
        clearTimeout(autoListenTimeoutRef.current);
      }
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
      }
    };
  }, []);

  // Speak a prompt and automatically start listening afterwards for true hands-free voice loop
  const speakAndAutoListen = (text, langCode = activeLanguage, targetState = null) => {
    stopListening();
    setSystemSpeech(text);
    isSpeakingRef.current = true;

    if (targetState) {
      setVoiceState(targetState);
      voiceStateRef.current = targetState;
    } else {
      setVoiceState(VOICE_STATES.SPEAKING);
      voiceStateRef.current = VOICE_STATES.SPEAKING;
    }

    speakKioskSpeech(text, langCode, () => {
      isSpeakingRef.current = false;
      // Once speech finishes, open microphone after a tiny pause to avoid speaker feedback
      autoListenTimeoutRef.current = setTimeout(() => {
        if (targetState) {
          setVoiceState(targetState);
          voiceStateRef.current = targetState;
        }
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
    speakAndAutoListen(newLang.greeting, code, VOICE_STATES.LISTENING);
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
      stopListening();

      hasProcessedRef.current = false;
      pendingTranscriptRef.current = '';

      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = currentLangConfig.sarvamSttCode || activeLanguage;

      recognition.onstart = () => {
        setVoiceState(prev => prev === VOICE_STATES.CONFIRMATION ? VOICE_STATES.CONFIRMATION : VOICE_STATES.LISTENING);
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
            processUserInput(final.trim());
            return;
          }

          // Silence detection: when customer finishes speaking, auto-finalize after 750ms of silence
          silenceTimerRef.current = setTimeout(() => {
            if (!hasProcessedRef.current && pendingTranscriptRef.current.trim()) {
              hasProcessedRef.current = true;
              const textToProcess = pendingTranscriptRef.current.trim();
              stopListening();
              setTranscript(textToProcess);
              processUserInput(textToProcess);
            }
          }, 750);
        }
      };

      recognition.onerror = (event) => {
        console.warn('[KioskVoiceSection] Speech recognition error event:', event.error, event);
        if (event.error === 'not-allowed' || event.error === 'permission-denied') {
          const errorMsg = getSpeechRecognitionErrorMessage(event.error, activeLanguageRef.current || activeLanguage);
          setErrorMessage(errorMsg);
          setVoiceState(VOICE_STATES.PERMISSION_DENIED);
          voiceStateRef.current = VOICE_STATES.PERMISSION_DENIED;
        } else if (event.error === 'no-speech') {
          // If no speech heard, stay in current state or idle gracefully without error banner
          if (voiceStateRef.current === VOICE_STATES.LISTENING) {
            setVoiceState(VOICE_STATES.IDLE);
            voiceStateRef.current = VOICE_STATES.IDLE;
          }
        } else if (event.error !== 'aborted') {
          const errorMsg = getSpeechRecognitionErrorMessage(event.error, activeLanguageRef.current || activeLanguage);
          setErrorMessage(errorMsg);
          setVoiceState(VOICE_STATES.ERROR);
          voiceStateRef.current = VOICE_STATES.ERROR;
        }
      };

      recognition.onend = () => {
        if (silenceTimerRef.current) {
          clearTimeout(silenceTimerRef.current);
        }
        if (!hasProcessedRef.current && pendingTranscriptRef.current.trim()) {
          hasProcessedRef.current = true;
          const textToProcess = pendingTranscriptRef.current.trim();
          setTranscript(textToProcess);
          processUserInput(textToProcess);
        } else if (voiceStateRef.current === VOICE_STATES.LISTENING && !hasProcessedRef.current) {
          setVoiceState(VOICE_STATES.IDLE);
          voiceStateRef.current = VOICE_STATES.IDLE;
        }
      };

      recognitionRef.current = recognition;
      console.log(`[KioskVoiceSection] Starting speech recognition with lang: ${recognition.lang}`);
      recognition.start();
    } catch (err) {
      console.warn('[KioskVoiceSection] SpeechRecognition.start() threw:', err);
      if (err.name === 'InvalidStateError') {
        console.log('[KioskVoiceSection] SpeechRecognition already active or transitioning.');
      } else if (err.name === 'NotAllowedError') {
        setErrorMessage(getSpeechRecognitionErrorMessage('not-allowed', activeLanguage));
        setVoiceState(VOICE_STATES.PERMISSION_DENIED);
      } else {
        setErrorMessage(getSpeechRecognitionErrorMessage(err.message || err.name, activeLanguage));
        setVoiceState(VOICE_STATES.ERROR);
      }
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
  };

  // Explicit Microphone Permission Request Handler
  const requestMicPermission = async () => {
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        console.log('[KioskVoiceSection] Proactively testing getUserMedia audio access...');
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach(track => track.stop());
        console.log('✅ [KioskVoiceSection] getUserMedia audio permission verified.');
      }
      setErrorMessage('');
      setVoiceState(VOICE_STATES.IDLE);
      speakAndAutoListen(currentLangConfig.greeting, activeLanguage, VOICE_STATES.LISTENING);
    } catch (err) {
      console.warn('[KioskVoiceSection] Microphone getUserMedia request failed:', err.name, err.message);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setErrorMessage(getSpeechRecognitionErrorMessage('not-allowed', activeLanguage));
        setVoiceState(VOICE_STATES.PERMISSION_DENIED);
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setErrorMessage(getSpeechRecognitionErrorMessage('audio-capture', activeLanguage));
        setVoiceState(VOICE_STATES.ERROR);
      } else {
        setErrorMessage(`Microphone hardware error: ${err.message || err.name}`);
        setVoiceState(VOICE_STATES.ERROR);
      }
    }
  };

  // Main Intent & Food Processing Pipeline (CONTINUOUS MULTI-ITEM CONVERSATION)
  const processUserInput = async (text) => {
    if (!text || !text.trim() || isSpeakingRef.current || isParsingRef.current) return;

    stopListening();

    const currentVoiceState = voiceStateRef.current;
    const currentConfirmed = confirmedItemsRef.current;
    const currentCandidate = candidateItemsRef.current;
    const currentLang = activeLanguageRef.current || activeLanguage;
    const langConfig = SARVAM_SUPPORTED_LANGUAGES.find(l => l.code === currentLang) || SARVAM_SUPPORTED_LANGUAGES[0];

    // Determine current conversation stage
    const currentStage = currentVoiceState === VOICE_STATES.ASK_MORE
      ? 'ASK_MORE'
      : (currentVoiceState === VOICE_STATES.CONFIRMATION ? 'CONFIRM_ITEM' : 'GENERAL');

    const intent = classifyIntent(text, {
      stage: currentStage,
      hasPendingOrder: currentCandidate.length > 0
    });

    // 1. STAGE: Awaiting response to "Would you like anything else?" (VOICE_STATES.ASK_MORE)
    if (currentVoiceState === VOICE_STATES.ASK_MORE) {
      // 1A. Customer says NO / Finished / That's all -> Finish session and go to cart exactly once
      if (intent.type === INTENT_TYPES.FINISH_ORDER || intent.type === INTENT_TYPES.CANCEL) {
        finalizeSessionAndGoToCart();
        return;
      }

      // 1B. Customer says YES / Add more -> Resume listening for next item without clearing confirmed items
      if (intent.type === INTENT_TYPES.ADD_MORE || intent.type === INTENT_TYPES.CONFIRMATION) {
        requestMoreItems();
        return;
      }

      // 1C. Customer directly speaks a new food item -> fall through to intent service below!
    }

    // 2. STAGE: Confirming a candidate item ("Shall I add it to your order?") (VOICE_STATES.CONFIRMATION)
    if (currentVoiceState === VOICE_STATES.CONFIRMATION) {
      // 2A. Customer confirms item ("Yes") -> Add item to order exactly once, then ask "Would you like anything else?"
      if (intent.type === INTENT_TYPES.CONFIRMATION) {
        confirmCandidateItem();
        return;
      }

      // 2B. Customer rejects item ("No" / "Change it") -> Discard only candidate item, keep confirmed items intact
      if (intent.type === INTENT_TYPES.CANCEL || intent.type === INTENT_TYPES.MODIFY) {
        rejectCandidateItem();
        return;
      }
    }

    // 3. Conversational Intents (Greeting, Help, Gratitude)
    if (intent.type === INTENT_TYPES.GREETING || intent.type === INTENT_TYPES.HELP || intent.type === INTENT_TYPES.GRATITUDE) {
      const reply = getConversationalResponse(intent.type, currentLang);
      const returnState = currentConfirmed.length > 0 && currentVoiceState === VOICE_STATES.ASK_MORE
        ? VOICE_STATES.ASK_MORE
        : VOICE_STATES.LISTENING;
      speakAndAutoListen(reply, currentLang, returnState);
      return;
    }

    // 4. Standalone No/Finish when customer has confirmed items in general listening state
    if ((intent.type === INTENT_TYPES.FINISH_ORDER || intent.type === INTENT_TYPES.CANCEL) && currentConfirmed.length > 0) {
      finalizeSessionAndGoToCart();
      return;
    }

    // 5. Intelligent Conversational Intent Parsing & Menu Grounding via Shared Gemini Service
    setVoiceState(VOICE_STATES.PROCESSING);
    voiceStateRef.current = VOICE_STATES.PROCESSING;
    isParsingRef.current = true;

    // Track user input in conversation history
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
      const responseLang = result.detectedLanguage || currentLang;

      if (result.lastDiscussedDish) {
        setLastDiscussedDish(result.lastDiscussedDish);
        lastDiscussedDishRef.current = result.lastDiscussedDish;
      }

      // Record assistant turn in conversation history
      if (result.response) {
        const assistantTurn = { role: 'assistant', text: result.response };
        const historyWithReply = [...updatedHistory, assistantTurn].slice(-10);
        setConversationHistory(historyWithReply);
        conversationHistoryRef.current = historyWithReply;
      }

      // Handle Ambiguity Clarification
      if (result.intent === 'ASK_CLARIFICATION' || result.requiresClarification) {
        const clarQuestion = result.response || result.clarificationQuestion;
        speakAndAutoListen(clarQuestion, responseLang, VOICE_STATES.LISTENING);
        return;
      }

      // Handle Quantity Modification ("Make that three")
      if (result.intent === 'MODIFY_QUANTITY' || result.action === 'UPDATE_QUANTITY') {
        if (result.updatedOrder && result.updatedOrder.length > 0) {
          // If candidate items were active, update candidate items
          if (currentCandidate.length > 0) {
            setCandidateItems(result.updatedOrder);
            candidateItemsRef.current = result.updatedOrder;
          } else {
            setConfirmedItems(result.updatedOrder);
            confirmedItemsRef.current = result.updatedOrder;
          }
        }
        const confirmMsg = result.response || "Updated! Would you like anything else?";
        speakAndAutoListen(confirmMsg, responseLang, currentCandidate.length > 0 ? VOICE_STATES.CONFIRMATION : VOICE_STATES.ASK_MORE);
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
        const nextState = (confirmedItemsRef.current.length > 0 || candidateItemsRef.current.length > 0) ? VOICE_STATES.ASK_MORE : VOICE_STATES.IDLE;
        speakAndAutoListen(removeMsg, responseLang, nextState);
        return;
      }

      // Handle Ordering or Adding Items
      if (result.intent === 'ORDER' || result.intent === 'ADD_ITEM' || result.action === 'ADD') {
        if (result.items && result.items.length > 0) {
          const itemsToConfirm = result.items.map(item => ({ ...item }));
          setCandidateItems(itemsToConfirm);
          candidateItemsRef.current = itemsToConfirm;
          setIsEditingManually(false);

          const spokenConfirmation = result.response || formatOrderConfirmationPrompt(itemsToConfirm, responseLang);
          speakAndAutoListen(spokenConfirmation, responseLang, VOICE_STATES.CONFIRMATION);
        } else {
          const fallbackState = currentConfirmed.length > 0 ? VOICE_STATES.ASK_MORE : VOICE_STATES.ERROR;
          setVoiceState(fallbackState);
          voiceStateRef.current = fallbackState;

          const spokenMsg = result.response || (result.unrecognizedItems?.length > 0
            ? formatUnknownItemPrompt(result.unrecognizedItems, responseLang)
            : getConversationalResponse(INTENT_TYPES.UNKNOWN, responseLang));
          speakAndAutoListen(spokenMsg, responseLang, fallbackState);
        }
      } else if (result.intent === 'CONFIRM') {
        if (candidateItemsRef.current.length > 0) {
          confirmCandidateItem();
        } else if (currentConfirmed.length > 0) {
          finalizeSessionAndGoToCart();
        } else {
          speakAndAutoListen(result.response || langConfig.greeting, responseLang, VOICE_STATES.LISTENING);
        }
      } else if (result.intent === 'CANCEL' || result.intent === 'MODIFY') {
        if (candidateItemsRef.current.length > 0) {
          rejectCandidateItem();
        } else if (currentConfirmed.length > 0) {
          finalizeSessionAndGoToCart();
        } else {
          speakAndAutoListen(result.response || langConfig.askChange, responseLang, VOICE_STATES.IDLE);
        }
      } else if (result.intent === 'FINISH_ORDER') {
        if (currentConfirmed.length > 0) {
          finalizeSessionAndGoToCart();
        } else {
          speakAndAutoListen(result.response, responseLang, VOICE_STATES.IDLE);
        }
      } else if (result.intent === 'ADD_MORE') {
        requestMoreItems();
      } else {
        // Conversational / Price Query / Ingredient Query / Menu Query / Recommendations / Greeting / Help
        const returnState = currentConfirmed.length > 0 && currentVoiceState === VOICE_STATES.ASK_MORE
          ? VOICE_STATES.ASK_MORE
          : VOICE_STATES.LISTENING;
        speakAndAutoListen(result.response || getConversationalResponse(INTENT_TYPES.UNKNOWN, responseLang), responseLang, returnState);
      }
    } catch (err) {
      console.warn('[KioskVoiceSection] Error during intent parsing:', err);
      const fallbackState = currentConfirmed.length > 0 ? VOICE_STATES.ASK_MORE : VOICE_STATES.ERROR;
      setVoiceState(fallbackState);
      voiceStateRef.current = fallbackState;
      speakAndAutoListen(getConversationalResponse(INTENT_TYPES.UNKNOWN, currentLang), currentLang, fallbackState);
    } finally {
      isParsingRef.current = false;
    }
  };

  // Step 3 & 4: Confirm candidate item and ask "Would you like anything else?"
  const confirmCandidateItem = () => {
    const candidate = candidateItemsRef.current;
    if (!candidate || candidate.length === 0) return;

    // Merge confirmed items into accumulated order list exactly once
    const updatedConfirmed = mergeOrderItems(confirmedItemsRef.current, candidate);
    setConfirmedItems(updatedConfirmed);
    confirmedItemsRef.current = updatedConfirmed;

    // Clear candidate items
    setCandidateItems([]);
    candidateItemsRef.current = [];

    // Advance to ASK_MORE state and ask prompt
    setVoiceState(VOICE_STATES.ASK_MORE);
    voiceStateRef.current = VOICE_STATES.ASK_MORE;

    const currentLang = activeLanguageRef.current || activeLanguage;
    const langConfig = SARVAM_SUPPORTED_LANGUAGES.find(l => l.code === currentLang) || SARVAM_SUPPORTED_LANGUAGES[0];
    const askPrompt = langConfig.addedAskAnythingElse || "Added to your order. Would you like anything else?";

    speakAndAutoListen(askPrompt, currentLang, VOICE_STATES.ASK_MORE);
  };

  // Step 10: Reject candidate item without losing previously confirmed items
  const rejectCandidateItem = () => {
    setCandidateItems([]);
    candidateItemsRef.current = [];

    setVoiceState(VOICE_STATES.LISTENING);
    voiceStateRef.current = VOICE_STATES.LISTENING;

    const currentLang = activeLanguageRef.current || activeLanguage;
    const langConfig = SARVAM_SUPPORTED_LANGUAGES.find(l => l.code === currentLang) || SARVAM_SUPPORTED_LANGUAGES[0];
    const rejectPrompt = langConfig.itemRejected || langConfig.askChange || "Okay. What would you like to order instead?";

    speakAndAutoListen(rejectPrompt, currentLang, VOICE_STATES.LISTENING);
  };

  // Step 5: Resume listening for more food items while preserving existing order
  const requestMoreItems = () => {
    setVoiceState(VOICE_STATES.LISTENING);
    voiceStateRef.current = VOICE_STATES.LISTENING;

    const currentLang = activeLanguageRef.current || activeLanguage;
    const langConfig = SARVAM_SUPPORTED_LANGUAGES.find(l => l.code === currentLang) || SARVAM_SUPPORTED_LANGUAGES[0];
    const askWhatElse = langConfig.askWhatElse || "What else would you like to order?";

    speakAndAutoListen(askWhatElse, currentLang, VOICE_STATES.LISTENING);
  };

  // Step 7 & 8: Finish voice-ordering session, add collected items to cart exactly once, and navigate to /cart
  const finalizeSessionAndGoToCart = () => {
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

    setVoiceState(VOICE_STATES.CONFIRMED);
    voiceStateRef.current = VOICE_STATES.CONFIRMED;

    // 2. Spoken confirmation
    const currentLang = activeLanguageRef.current || activeLanguage;
    const langConfig = SARVAM_SUPPORTED_LANGUAGES.find(l => l.code === currentLang) || SARVAM_SUPPORTED_LANGUAGES[0];
    const successMessage = langConfig.orderFinalized || langConfig.orderConfirmed || "Your order is confirmed. Taking you to the cart to review.";

    const triggerCartNavigation = () => {
      navigate('/cart');
    };

    speakKioskSpeech(successMessage, currentLang, () => {
      triggerCartNavigation();
    });

    // Fallback navigation timeout in case audio callback is blocked by browser
    setTimeout(() => {
      triggerCartNavigation();
    }, 1500);
  };

  // Adjust confirmed item quantity
  const handleUpdateQty = (index, delta, isCandidate = false) => {
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
        setVoiceState(confirmedItems.length > 0 ? VOICE_STATES.ASK_MORE : VOICE_STATES.IDLE);
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
      handleReset();
    }
  };

  const handleRemoveItem = (index, isCandidate = false) => {
    if (isCandidate) {
      const updated = [...candidateItems];
      updated.splice(index, 1);
      setCandidateItems(updated);
      candidateItemsRef.current = updated;
      if (updated.length === 0) {
        setVoiceState(confirmedItems.length > 0 ? VOICE_STATES.ASK_MORE : VOICE_STATES.IDLE);
      }
      return;
    }

    const updated = [...confirmedItems];
    updated.splice(index, 1);
    setConfirmedItems(updated);
    confirmedItemsRef.current = updated;
    if (updated.length === 0) {
      handleReset();
    }
  };

  // Reset to Idle
  const handleReset = () => {
    stopListening();
    setTranscript('');
    setInterimTranscript('');
    setParsedResult(null);
    setConfirmedItems([]);
    confirmedItemsRef.current = [];
    setCandidateItems([]);
    candidateItemsRef.current = [];
    hasCommittedCartRef.current = false;
    navigatedRef.current = false;
    setErrorMessage('');
    setManualInput('');
    setIsEditingManually(false);
    setVoiceState(VOICE_STATES.IDLE);
    voiceStateRef.current = VOICE_STATES.IDLE;
  };

  // Manual Input Submit
  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (!manualInput.trim()) return;
    setTranscript(manualInput);
    processUserInput(manualInput);
  };

  const totalCalculated = confirmedItems.reduce((acc, curr) => acc + (curr.subtotal || 0), 0);
  const candidateTotal = candidateItems.reduce((acc, curr) => acc + (curr.subtotal || 0), 0);

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

        {/* STATE 1: IDLE / READY TO ORDER */}
        {voiceState === VOICE_STATES.IDLE && (
          <div className="kiosk-voice-idle-center">
            <button
              className="kiosk-mic-giant-button"
              onClick={startListening}
              aria-label="Start Voice Ordering"
            >
              <Mic size={56} className="mic-svg-icon" />
              <span className="mic-label-under">TAP TO SPEAK</span>
            </button>

            <div className="kiosk-voice-hint-box">
              <Sparkles size={18} className="hint-sparkle" />
              <p>
                Try saying: <strong>"{currentLangConfig.tryExample}"</strong>
              </p>
            </div>
          </div>
        )}

        {/* STATE 2: ACTIVE LISTENING & LIVE WAVE */}
        {(voiceState === VOICE_STATES.LISTENING || voiceState === VOICE_STATES.PROCESSING || voiceState === VOICE_STATES.SPEAKING) && (
          <div className="kiosk-voice-listening-center">
            <button
              className={`kiosk-mic-giant-button active-pulsing ${voiceState === VOICE_STATES.SPEAKING ? 'speaking' : ''}`}
              onClick={voiceState === VOICE_STATES.LISTENING ? stopListening : startListening}
              aria-label="Stop or Resume Microphone"
            >
              <span className="kiosk-wave-ring ring-1" />
              <span className="kiosk-wave-ring ring-2" />
              <span className="kiosk-wave-ring ring-3" />
              <Mic size={56} className="mic-svg-icon animate-pulse" />
              <span className="mic-label-under">
                {voiceState === VOICE_STATES.SPEAKING ? 'SPEAKING...' : voiceState === VOICE_STATES.PROCESSING ? 'UNDERSTANDING ORDER...' : 'LISTENING...'}
              </span>
            </button>

            <div className="kiosk-live-transcript-card">
              <span className="transcript-state-tag">
                <Volume2 size={16} />
                {voiceState === VOICE_STATES.PROCESSING
                  ? 'Understanding your order...'
                  : voiceState === VOICE_STATES.CONFIRMATION
                  ? currentLangConfig.listeningConfirmHint
                  : voiceState === VOICE_STATES.ASK_MORE
                  ? (currentLangConfig.listeningAskMoreHint || "Say 'Yes' to add more, or 'No' to finish")
                  : currentLangConfig.listeningHint}
              </span>
              <p className="transcript-live-text">
                "{interimTranscript || transcript || 'Speak naturally in ' + currentLangConfig.name + '...'}"
              </p>
            </div>
          </div>
        )}

        {/* STATE 3: CANDIDATE ITEM CONFIRMATION / VOICE READ-BACK */}
        {voiceState === VOICE_STATES.CONFIRMATION && (
          <div className="kiosk-voice-confirmation-center">
            <div className="kiosk-confirmation-header">
              <h2 className="confirm-main-title">
                {formatOrderConfirmationPrompt(candidateItems, activeLanguage)}
              </h2>
              <div className="confirm-voice-hint-pill">
                <Mic size={15} /> <span>Say <strong>"Yes"</strong> to add to order or <strong>"No"</strong> to change</span>
              </div>
            </div>

            {/* Candidate Items Card */}
            <div className="kiosk-confirm-card">
              <div className="kiosk-items-list">
                {candidateItems.map((item, idx) => (
                  <div key={idx} className="kiosk-item-entry">
                    <div className="item-info-col">
                      <span className="item-dish-icon">
                        {item.dish?.categorySlug === 'beverages' ? '☕' : '🍽️'}
                      </span>
                      <div>
                        <strong className="item-dish-name">{item.dish?.name}</strong>
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
                      <span className="item-qty-badge">× {item.quantity}</span>
                      <span className="item-price-val">₹{item.subtotal}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Total Calculation */}
              <div className="kiosk-total-row">
                <span className="total-label">Item Total:</span>
                <span className="total-amount">₹{candidateTotal}</span>
              </div>
            </div>

            {/* If there are previously confirmed items, display order progress */}
            {confirmedItems.length > 0 && (
              <div className="kiosk-confirmed-summary-box" style={{ marginTop: '0.75rem', padding: '0.6rem 1rem', background: 'rgba(255,255,255,0.06)', borderRadius: '10px', fontSize: '0.9rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Already in order: <strong>{confirmedItems.length} {confirmedItems.length === 1 ? 'dish' : 'dishes'}</strong></span>
                <span>Current Total: <strong>₹{totalCalculated}</strong></span>
              </div>
            )}

            {/* Action Buttons */}
            <div className="kiosk-confirmation-actions-bar">
              <button
                className="btn btn-primary btn-lg kiosk-confirm-action-btn"
                onClick={confirmCandidateItem}
              >
                <CheckCircle2 size={22} />
                <span>CONFIRM ITEM (Say "Yes")</span>
              </button>

              <button
                className="btn btn-outline btn-md"
                onClick={rejectCandidateItem}
              >
                🔄 Change / Reject (Say "No")
              </button>

              <button
                className="btn btn-ghost btn-md text-danger"
                onClick={handleReset}
              >
                ❌ Cancel All
              </button>
            </div>
          </div>
        )}

        {/* STATE 3B: MULTI-ITEM ORDER LIST & ASK ANYTHING ELSE */}
        {voiceState === VOICE_STATES.ASK_MORE && (
          <div className="kiosk-voice-confirmation-center">
            <div className="kiosk-confirmation-header">
              <h2 className="confirm-main-title">
                {currentLangConfig.addedAskAnythingElse || "Added to your order! Would you like anything else?"}
              </h2>
              <div className="confirm-voice-hint-pill">
                <Mic size={15} /> <span>Say <strong>"Yes"</strong> to order more, or <strong>"No"</strong> to finish and review cart</span>
              </div>
            </div>

            {/* Confirmed Order Items Card */}
            <div className="kiosk-confirm-card">
              <div className="kiosk-items-list">
                {confirmedItems.map((item, idx) => (
                  <div key={idx} className="kiosk-item-entry">
                    <div className="item-info-col">
                      <span className="item-dish-icon">
                        {item.dish?.categorySlug === 'beverages' ? '☕' : '🍽️'}
                      </span>
                      <div>
                        <strong className="item-dish-name">{item.dish?.name}</strong>
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
                <span className="total-label">Total ({confirmedItems.length} {confirmedItems.length === 1 ? 'item' : 'items'}):</span>
                <span className="total-amount">₹{totalCalculated}</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="kiosk-confirmation-actions-bar">
              <button
                className="btn btn-primary btn-lg kiosk-confirm-action-btn"
                onClick={finalizeSessionAndGoToCart}
              >
                <ShoppingBag size={20} />
                <span>FINISH ORDER & VIEW CART (Say "No")</span>
              </button>

              <button
                className="btn btn-outline btn-md"
                onClick={requestMoreItems}
              >
                ➕ ORDER MORE (Say "Yes")
              </button>

              <button
                className={`btn btn-ghost btn-sm ${isEditingManually ? 'active' : ''}`}
                onClick={() => setIsEditingManually(!isEditingManually)}
              >
                ✏️ {isEditingManually ? 'Done Editing' : 'Edit Items'}
              </button>

              <button
                className="btn btn-ghost btn-sm text-danger"
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
              Your dishes have been added to your cart for Table #{tableNumber}. Taking you to checkout...
            </p>

            <div className="confirmed-actions-row">
              <button
                className="btn btn-primary btn-lg"
                onClick={() => navigate('/cart')}
              >
                <ShoppingBag size={18} /> View Cart & Pay
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
              {errorMessage || currentLangConfig.unknownItem}
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

      {/* 2B. CUSTOMER GUIDANCE ACCORDION PANEL */}
      <div className="kiosk-guidance-container" style={{ maxWidth: '900px', width: '100%', margin: '0 auto 1.5rem auto', padding: '0 1rem' }}>
        <VoiceGuidancePanel 
          language={activeLanguage}
          onSelectPrompt={(promptText) => {
            setManualInput(promptText);
            setTranscript(promptText);
            processUserInput(promptText);
          }}
        />
      </div>

      {/* 3. SUBTLE BOTTOM FALLBACK TEXT INPUT */}
      <div className="kiosk-hero-footer">
        <form className="kiosk-fallback-type-bar" onSubmit={handleManualSubmit}>
          <input
            type="text"
            className="kiosk-type-input"
            placeholder={`Or type here in ${currentLangConfig.name} (e.g. 1 Masala Dosa, 1 Mango Lassi)...`}
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
