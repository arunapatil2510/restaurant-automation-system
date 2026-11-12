import React, { useState } from 'react';
import { 
  HelpCircle, 
  ChevronDown, 
  ChevronUp, 
  Sparkles, 
  Utensils, 
  Tag, 
  Flame, 
  Leaf, 
  Edit3, 
  Clock 
} from 'lucide-react';

const GUIDANCE_DATA = {
  'en-IN': {
    heading: 'What can I ask?',
    subheading: 'Speak naturally to your waiter. Tap any example to try:',
    categories: [
      {
        id: 'recommendations',
        name: 'Recommendations',
        icon: Sparkles,
        examples: [
          'What do you recommend?',
          'What should I eat?',
          'Suggest something nice.',
          "I'm confused. What is good here?",
          'What is special today?'
        ]
      },
      {
        id: 'menu',
        name: 'Menu & Options',
        icon: Utensils,
        examples: [
          'What food do you have?',
          'Show me breakfast options',
          'What starters are available?',
          'Do you have any cold drinks?'
        ]
      },
      {
        id: 'dietary',
        name: 'Dietary & Vegetarian',
        icon: Leaf,
        examples: [
          'Show me something vegetarian.',
          'Is Masala Dosa pure veg?',
          'Do you have Jain food options?'
        ]
      },
      {
        id: 'spice',
        name: 'Spice Level',
        icon: Flame,
        examples: [
          'Is Masala Dosa spicy?',
          'Do you have anything without much spice?',
          'Give me something less spicy.',
          'What dishes are mild?'
        ]
      },
      {
        id: 'price',
        name: 'Price & Cost',
        icon: Tag,
        examples: [
          'How much is the Masala Dosa?',
          'What is the price of Filter Coffee?',
          'How much does South Indian Meals cost?'
        ]
      },
      {
        id: 'ordering',
        name: 'Ordering & Modifying',
        icon: Edit3,
        examples: [
          'I want two Masala Dosas.',
          'Two Masala Dosa and one Coffee',
          'Give me one more.',
          'Actually, make that three.',
          'Remove the coffee.',
          'I changed my mind.'
        ]
      },
      {
        id: 'general',
        name: 'Restaurant Info',
        icon: Clock,
        examples: [
          'How do I order here?',
          'What are your timings?',
          'Do you offer takeaway?'
        ]
      }
    ]
  },
  'kn-IN': {
    heading: 'ನಾನು ಏನನ್ನು ಕೇಳಬಹುದು?',
    subheading: 'ನಿಮ್ಮ ವೇಟರ್ ಜೊತೆ ಸಹಜವಾಗಿ ಮಾತನಾಡಿ. ಪ್ರಯತ್ನಿಸಲು ಯಾವುದೇ ಉದಾಹರಣೆಯನ್ನು ಒತ್ತಿ:',
    categories: [
      {
        id: 'recommendations',
        name: 'ಶಿಫಾರಸುಗಳು',
        icon: Sparkles,
        examples: [
          'ಏನಾದರೂ ಒಳ್ಳೆಯದನ್ನು ಸೂಚಿಸಿ.',
          'ನನಗೇನು ತಿನ್ನಲು ಕೊಡುತ್ತೀರಿ?',
          'ಇಲ್ಲಿ ಏನು ಚೆನ್ನಾಗಿದೆ?',
          'ಇಂದಿನ ಸ್ಪೆಷಲ್ ಏನು?',
          'ಯಾವ ತಿಂಡಿ ಶಿಫಾರಸು ಮಾಡುತ್ತೀರಿ?'
        ]
      },
      {
        id: 'menu',
        name: 'ಮೆನು ಮಾಹಿತಿ',
        icon: Utensils,
        examples: [
          'ತಿಂಡಿಗೆ ಏನೆಲ್ಲಾ ಇದೆ?',
          'ನಿಮ್ಮ ಮೆನು ತೋರಿಸಿ',
          'ಕುಡಿಯಲು ಏನು ಸಿಗುತ್ತೆ?',
          'ಯಾವ ಸ್ಟಾರ್ಟರ್ಸ್ ಲಭ್ಯವಿದೆ?'
        ]
      },
      {
        id: 'dietary',
        name: 'ಸಸ್ಯಾಹಾರಿ & ಡಯಟ್',
        icon: Leaf,
        examples: [
          'ಶಾಕಾಹಾರಿ ಊಟ ಇದೆಯಾ?',
          'ಮಸಾಲ ದೋಸೆ ಸಸ್ಯಾಹಾರಿಯೇ?',
          'ಜೈನ್ ಫುಡ್ ಲಭ್ಯವಿದೆಯೇ?'
        ]
      },
      {
        id: 'spice',
        name: 'ಖಾರದ ಮಟ್ಟ',
        icon: Flame,
        examples: [
          'ಮಸಾಲೆ ದೋಸೆ ಖಾರವೇ?',
          'ಏನಾದರೂ ಖಾರ ಕಡಿಮೆ ಇರುವುದು ಇದೆಯೇ?',
          'ಖಾರ ಕಡಿಮೆ ಇರುವ ತಿಂಡಿ ಕೊಡಿ.',
          'ಖಾರ ಇಲ್ಲದ ತಿಂಡಿ ಯಾವುದು?'
        ]
      },
      {
        id: 'price',
        name: 'ಬೆಲೆ ಮಾಹಿತಿ',
        icon: Tag,
        examples: [
          'ಮಸಾಲೆ ದೋಸೆ ಬೆಲೆ ಎಷ್ಟು?',
          'ಫಿಲ್ಟರ್ ಕಾಫಿ ಬೆಲೆ ಎಷ್ಟು?',
          'ಊಟದ ದರ ಎಷ್ಟು?'
        ]
      },
      {
        id: 'ordering',
        name: 'ಆರ್ಡರ್ ಮತ್ತು ಬದಲಾವಣೆ',
        icon: Edit3,
        examples: [
          'ನನಗೆ ಎರಡು ಮಸಾಲೆ ದೋಸೆ ಬೇಕು.',
          'ಎರಡು ಮಸಾಲ ದೋಸೆ ಮತ್ತು ಒಂದು ಕಾಫಿ',
          'ಇನ್ನೊಂದು ಕೊಡಿ.',
          'ಅದನ್ನು ಮೂರು ಮಾಡಿ.',
          'ಕಾಫಿ ತೆಗೆದುಹಾಕಿ.',
          'ನನ್ನ ಮನಸ್ಸು ಬದಲಾಗಿದೆ.'
        ]
      },
      {
        id: 'general',
        name: 'ಸಾಮಾನ್ಯ ಪ್ರಶ್ನೆಗಳು',
        icon: Clock,
        examples: [
          'ಆರ್ಡರ್ ಮಾಡುವುದು ಹೇಗೆ?',
          'ರೆಸ್ಟೋರೆಂಟ್ ಸಮಯ ತಿಳಿಸಿ',
          'ಪಾರ್ಸಲ್ ಸೌಲಭ್ಯ ಇದೆಯಾ?'
        ]
      }
    ]
  },
  'hi-IN': {
    heading: 'मैं क्या पूछ सकता हूँ?',
    subheading: 'अपने वेटर से स्वाभाविक रूप से बात करें। आज़माने के लिए किसी भी उदाहरण पर टैप करें:',
    categories: [
      {
        id: 'recommendations',
        name: 'सलाह व स्पेशल',
        icon: Sparkles,
        examples: [
          'कुछ अच्छा बताओ।',
          'मुझे क्या खाना चाहिए?',
          'यहाँ क्या बढ़िया है?',
          'आज का स्पेशल क्या है?',
          'आप क्या सलाह देंगे?'
        ]
      },
      {
        id: 'menu',
        name: 'मेनू की जानकारी',
        icon: Utensils,
        examples: [
          'मेनू में क्या क्या है?',
          'नाश्ते में क्या मिलेगा?',
          'पीने के लिए क्या है?',
          'स्टार्टर्स में क्या उपलब्ध है?'
        ]
      },
      {
        id: 'dietary',
        name: 'शाकाहारी विकल्प',
        icon: Leaf,
        examples: [
          'शाकाहारी में क्या है?',
          'क्या मसाला डोसा शुद्ध शाकाहारी है?',
          'क्या जैन खाना उपलब्ध है?'
        ]
      },
      {
        id: 'spice',
        name: 'तीखापन व स्वाद',
        icon: Flame,
        examples: [
          'क्या मसाला डोसा तीखा है?',
          'बिना तीखे का कुछ है?',
          'कुछ कम तीखा दो।',
          'कम मसालेदार क्या मिलेगा?'
        ]
      },
      {
        id: 'price',
        name: 'कीमत व दर',
        icon: Tag,
        examples: [
          'मसाला डोसा कितने का है?',
          'फिल्टर कॉफी की कीमत क्या है?',
          'थाली का दाम क्या है?'
        ]
      },
      {
        id: 'ordering',
        name: 'ऑर्डर व बदलाव',
        icon: Edit3,
        examples: [
          'मुझे दो मसाला डोसा चाहिए।',
          'दो मसाला डोसा और एक कॉफी',
          'एक और दो।',
          'इसे तीन कर दो।',
          'कॉफी हटाओ।',
          'मेरा मन बदल गया।'
        ]
      },
      {
        id: 'general',
        name: 'रेस्टोरेंट नियम',
        icon: Clock,
        examples: [
          'ऑर्डर कैसे करें?',
          'रेस्टोरेंट का समय क्या है?',
          'क्या पार्सल सुविधा है?'
        ]
      }
    ]
  }
};

export const VoiceGuidancePanel = ({
  language = 'en-IN',
  onSelectPrompt,
  initialExpanded = false
}) => {
  const [isExpanded, setIsExpanded] = useState(initialExpanded);
  const [activeCategory, setActiveCategory] = useState('recommendations');

  const langKey = GUIDANCE_DATA[language] ? language : 'en-IN';
  const data = GUIDANCE_DATA[langKey];

  const currentCategoryObj = data.categories.find(c => c.id === activeCategory) || data.categories[0];

  const handleChipClick = (promptText) => {
    if (typeof onSelectPrompt === 'function') {
      onSelectPrompt(promptText);
    }
  };

  return (
    <div className="voice-guidance-container" style={{
      margin: '16px 0',
      borderRadius: '16px',
      background: 'rgba(255, 255, 255, 0.04)',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      overflow: 'hidden',
      transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
    }}>
      {/* Header / Toggle Button */}
      <button
        type="button"
        className="voice-guidance-header-btn"
        onClick={() => setIsExpanded(!isExpanded)}
        aria-expanded={isExpanded}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 18px',
          background: isExpanded ? 'rgba(255, 159, 28, 0.08)' : 'transparent',
          border: 'none',
          color: 'var(--text-primary, #ffffff)',
          cursor: 'pointer',
          fontSize: '0.95rem',
          fontWeight: 600,
          outline: 'none',
          textAlign: 'left'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '28px',
            height: '28px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #ff9f1c 0%, #ff6b35 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            boxShadow: '0 2px 8px rgba(255, 159, 28, 0.4)'
          }}>
            <HelpCircle size={16} />
          </div>
          <div>
            <span style={{ fontWeight: 700, color: '#ffb703', letterSpacing: '0.3px' }}>
              {data.heading}
            </span>
            <span style={{
              display: 'block',
              fontSize: '0.78rem',
              fontWeight: 400,
              color: 'rgba(255, 255, 255, 0.6)',
              marginTop: '1px'
            }}>
              {isExpanded ? data.subheading : 'Tap to see example questions you can ask'}
            </span>
          </div>
        </div>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          fontSize: '0.8rem',
          color: 'rgba(255, 255, 255, 0.6)'
        }}>
          <span>{isExpanded ? 'Hide' : 'Examples'}</span>
          {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </div>
      </button>

      {/* Expandable Content */}
      {isExpanded && (
        <div className="voice-guidance-body" style={{
          padding: '14px 18px 18px 18px',
          borderTop: '1px solid rgba(255, 255, 255, 0.08)',
          background: 'rgba(0, 0, 0, 0.15)'
        }}>
          {/* Category Tabs */}
          <div style={{
            display: 'flex',
            gap: '8px',
            overflowX: 'auto',
            paddingBottom: '10px',
            scrollbarWidth: 'none',
            WebkitOverflowScrolling: 'touch'
          }}>
            {data.categories.map((cat) => {
              const IconComp = cat.icon;
              const isActive = cat.id === activeCategory;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setActiveCategory(cat.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 12px',
                    borderRadius: '20px',
                    border: isActive ? '1px solid #ff9f1c' : '1px solid rgba(255, 255, 255, 0.12)',
                    background: isActive ? 'rgba(255, 159, 28, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                    color: isActive ? '#ffb703' : 'rgba(255, 255, 255, 0.75)',
                    fontSize: '0.82rem',
                    fontWeight: isActive ? 600 : 500,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <IconComp size={13} />
                  <span>{cat.name}</span>
                </button>
              );
            })}
          </div>

          {/* Example Prompt Chips */}
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '8px',
            marginTop: '8px'
          }}>
            {currentCategoryObj.examples.map((example, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleChipClick(example)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '7px 14px',
                  borderRadius: '12px',
                  border: '1px solid rgba(255, 159, 28, 0.25)',
                  background: 'rgba(255, 255, 255, 0.06)',
                  color: '#ffffff',
                  fontSize: '0.85rem',
                  fontWeight: 500,
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.18s ease',
                  boxShadow: '0 2px 5px rgba(0, 0, 0, 0.15)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 159, 28, 0.25)';
                  e.currentTarget.style.borderColor = '#ff9f1c';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)';
                  e.currentTarget.style.borderColor = 'rgba(255, 159, 28, 0.25)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                <span>💬</span>
                <span>"{example}"</span>
              </button>
            ))}
          </div>

          <div style={{
            marginTop: '12px',
            fontSize: '0.74rem',
            color: 'rgba(255, 255, 255, 0.45)',
            fontStyle: 'italic',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            <span>💡</span>
            <span>These are suggestions — you can speak any question or order naturally in English, Kannada, or Hindi.</span>
          </div>
        </div>
      )}
    </div>
  );
};

