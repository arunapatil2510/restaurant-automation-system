/**
 * RESTOSMART Multilingual Voice Ordering & Speech Synthesis Engine
 * Supports English (en-IN), Kannada (kn-IN), and Hindi (hi-IN)
 * Provides numbers, dish translations, intent phrases, and conversational prompts.
 */

export const SUPPORTED_LANGUAGES = [
  {
    code: 'en-IN',
    id: 'en',
    name: 'English',
    nativeName: 'English',
    flag: '🇬🇧',
    subtext: 'Speak in English',
    speechLang: 'en-IN',
    ttsLang: 'en-IN',
    greeting: 'Welcome! What would you like to order today?',
    askChange: 'Okay. What would you like to order instead?',
    addedAskAnythingElse: 'Added to your order. Would you like anything else?',
    orderConfirmed: 'Added to your order. Would you like anything else?',
    orderFinalized: 'Your order is confirmed. Taking you to the cart to review.',
    askWhatElse: 'What else would you like to order?',
    itemRejected: "Okay, I won't add that. What would you like instead?",
    unknownItem: "Sorry, I couldn't find that item on the menu.",
    listeningPrompt: 'Listening... Speak your food order naturally',
    listeningConfirm: 'Listening for confirmation... Say "Yes" or "No"',
    listeningAskMore: 'Would you like anything else? Say "Yes" or "No"',
    tryExample: 'e.g. "Two Masala Dosa and one Mango Lassi"',
    confirmKeywords: ['yes', 'confirm', 'correct', 'proceed', 'okay', 'ok', 'place order', 'done', 'yes confirm', 'yeah', 'yep', 'sure', 'add it', 'add them', 'add to cart', 'haan', 'haudu', 'sari', 'sahi', 'add more', 'one more', 'more', 'want more'],
    cancelKeywords: ['no', 'cancel', 'reset', 'clear', 'wrong', 'restart', 'stop', 'change', 'change it', 'modify', 'edit', 'beda', 'nahi', 'dont add', "don't add", 'nothing', 'nothing else', 'no thanks', 'nope', 'no more', 'thats all', "that's all", 'finish', 'checkout', 'go to cart', 'view cart', 'all done'],
  },
  {
    code: 'kn-IN',
    id: 'kn',
    name: 'Kannada',
    nativeName: 'ಕನ್ನಡ',
    flag: '🇮🇳',
    subtext: 'ಕನ್ನಡದಲ್ಲಿ ಮಾತನಾಡಿ',
    speechLang: 'kn-IN',
    ttsLang: 'kn-IN',
    greeting: 'ಸ್ವಾಗತ! ಇಂದು ನೀವು ಏನನ್ನು ಆರ್ಡರ್ ಮಾಡಲು ಬಯಸುತ್ತೀರಿ?',
    askChange: 'ಸರಿ. ನೀವು ಏನನ್ನು ಆರ್ಡರ್ ಮಾಡಲು ಬಯಸುತ್ತೀರಿ?',
    addedAskAnythingElse: 'ನಿಮ್ಮ ಆರ್ಡರ್‌ಗೆ ಸೇರಿಸಲಾಗಿದೆ. ಬೇರೆ ಏನಾದರೂ ಬೇಕೇ?',
    orderConfirmed: 'ನಿಮ್ಮ ಆರ್ಡರ್‌ಗೆ ಸೇರಿಸಲಾಗಿದೆ. ಬೇರೆ ಏನಾದರೂ ಬೇಕೇ?',
    orderFinalized: 'ನಿಮ್ಮ ಆರ್ಡರ್ ದೃಢೀಕರಿಸಲಾಗಿದೆ. ಕಾರ್ಟ್ ಪರಿಶೀಲಿಸಲು ಕರೆದೊಯ್ಯಲಾಗುತ್ತಿದೆ.',
    askWhatElse: 'ನೀವು ಮತ್ತೇನು ಆರ್ಡರ್ ಮಾಡಲು ಬಯಸುತ್ತೀರಿ?',
    itemRejected: 'ಸರಿ, ಅದನ್ನು ಸೇರಿಸುತ್ತಿಲ್ಲ. ನೀವು ಬದಲಿಗೆ ಏನನ್ನು ಆರ್ಡರ್ ಮಾಡಲು ಬಯಸುತ್ತೀರಿ?',
    unknownItem: 'ಕ್ಷಮಿಸಿ, ಆ ತಿಂಡಿ ನಮ್ಮ ಮೆನುವಿನಲ್ಲಿ ಲಭ್ಯವಿಲ್ಲ.',
    listeningPrompt: 'ಕೇಳಿಸಿಕೊಳ್ಳುತ್ತಿದ್ದೇವೆ... ನಿಮ್ಮ ಆರ್ಡರ್ ಅನ್ನು ಸ್ಪಷ್ಟವಾಗಿ ಹೇಳಿ',
    listeningConfirm: 'ದೃಢೀಕರಣಕ್ಕಾಗಿ ಕೇಳಿಸಿಕೊಳ್ಳುತ್ತಿದ್ದೇವೆ... "ಹೌದು" ಅಥವಾ "ಬೇಡ" ಎಂದು ಹೇಳಿ',
    listeningAskMore: 'ಬೇರೆ ಏನಾದರೂ ಬೇಕೇ? "ಹೌದು" ಅಥವಾ "ಬೇಡ" ಎಂದು ಹೇಳಿ',
    tryExample: 'ಉದಾ: "ಎರಡು ಮಸಾಲ ದೋಸೆ ಮತ್ತು ಒಂದು ಮ್ಯಾಂಗೋ ಲಸ್ಸಿ"',
    confirmKeywords: ['ಹೌದು', 'ಸರಿ', 'ಖಚಿತಪಡಿಸಿ', 'ಆರ್ಡರ್', 'ಖಚಿತ', 'ಸರಿಯಾಗಿದೆ', 'ಆರ್ಡರ್ ಮಾಡಿ', 'ಹಾ', 'ಆಯಿತು', 'ಇನ್ನೊಂದು', 'ಬೇಕು', 'yes', 'confirm', 'haudu', 'sari'],
    cancelKeywords: ['ಬೇಡ', 'ರದ್ದು', 'ತಪ್ಪು', 'ಮತ್ತೆ', 'ಬೇಡವೇ ಬೇಡ', 'ಬದಲಾಯಿಸಿ', 'ಬದಲಿಸಿ', 'ಇನ್ನೇನು ಬೇಡ', 'ಸಾಕು', 'ಅಷ್ಟೇ', 'ಮುಗಿಯಿತು', 'no', 'cancel'],
  },
  {
    code: 'hi-IN',
    id: 'hi',
    name: 'Hindi',
    nativeName: 'हिन्दी',
    flag: '🇮🇳',
    subtext: 'हिन्दी में बोलें',
    speechLang: 'hi-IN',
    ttsLang: 'hi-IN',
    greeting: 'नमस्ते! आज आप क्या ऑर्डर करना चाहेंगे?',
    askChange: 'ठीक है। आप क्या ऑर्डर करना चाहेंगे?',
    addedAskAnythingElse: 'आपके ऑर्डर में जोड़ दिया गया है। क्या आप कुछ और लेना चाहेंगे?',
    orderConfirmed: 'आपके ऑर्डर में जोड़ दिया गया है। क्या आप कुछ और लेना चाहेंगे?',
    orderFinalized: 'आपका ऑर्डर कन्फर्म हो गया है। कार्ट देखने के लिए ले जा रहे हैं।',
    askWhatElse: 'आप और क्या ऑर्डर करना चाहेंगे?',
    itemRejected: 'ठीक है, इसे नहीं जोड़ेंगे। आप इसके बदले क्या लेना चाहेंगे?',
    unknownItem: 'क्षमा करें, यह व्यंजन हमारे मेनू में उपलब्ध नहीं है।',
    listeningPrompt: 'सुन रहे हैं... कृपया अपना खाना का ऑर्डर बोलें',
    listeningConfirm: 'पुष्टि के लिए सुन रहे हैं... "हाँ" या "नहीं" कहें',
    listeningAskMore: 'क्या आप कुछ और लेना चाहेंगे? "हाँ" या "नहीं" कहें',
    tryExample: 'उदा: "दो मसाला डोसा और एक मैंगो लस्सी"',
    confirmKeywords: ['हाँ', 'सही', 'कन्फर्म', 'ऑर्डर', 'करो', 'ठीक है', 'हाँ कन्फर्म', 'हां', 'कन्फर्म करो', 'और', 'और चाहिए', 'एक और', 'yes', 'confirm', 'haan', 'sahi'],
    cancelKeywords: ['नहीं', 'रद्द', 'गलत', 'वापस', 'बदलो', 'बदलना है', 'हटाओ', 'कुछ नहीं', 'और नहीं', 'बस', 'काफी है', 'काफ़ी है', 'हो गया', 'no', 'cancel', 'nahi'],
  }
];

// Multilingual Number Word Dictionary
export const MULTILINGUAL_NUMBERS = {
  // English
  'a': 1,
  'an': 1,
  'one': 1,
  'two': 2,
  'three': 3,
  'four': 4,
  'five': 5,
  'six': 6,
  'seven': 7,
  'eight': 8,
  'nine': 9,
  'ten': 10,
  'couple': 2,
  'dozen': 12,
  'half dozen': 6,

  // Kannada (Words & Numerals)
  '೧': 1,
  '೨': 2,
  '೩': 3,
  '೪': 4,
  '೫': 5,
  '೬': 6,
  '೭': 7,
  '೮': 8,
  '೯': 9,
  '೧೦': 10,
  'ಒಂದು': 1,
  'ಎರಡು': 2,
  'ಮೂರು': 3,
  'ನಾಲ್ಕು': 4,
  'ಐದು': 5,
  'ಆರು': 6,
  'ಏಳು': 7,
  'ಎಂಟು': 8,
  'ಒಂಬತ್ತು': 9,
  'ಹತ್ತು': 10,
  'ondu': 1,
  'eradu': 2,
  'mooru': 3,
  'naalku': 4,
  'aidu': 5,

  // Hindi (Words & Numerals)
  '१': 1,
  '२': 2,
  '३': 3,
  '४': 4,
  '५': 5,
  '६': 6,
  '७': 7,
  '८': 8,
  '९': 9,
  '१०': 10,
  'एक': 1,
  'दो': 2,
  'तीन': 3,
  'चार': 4,
  'पांच': 5,
  'पाँच': 5,
  'छह': 6,
  'सात': 7,
  'आठ': 8,
  'नौ': 9,
  'दस': 10,
  'ek': 1,
  'do': 2,
  'teen': 3,
  'char': 4,
  'paanch': 5
};

// Multilingual Food Translations & Synonyms grounded against Menu
export const FOOD_TRANSLATIONS = {
  // Masala Dosa
  'masala dosa': 'Masala Dosa',
  'masala dosas': 'Masala Dosa',
  'masale dose': 'Masala Dosa',
  'dosa': 'Masala Dosa',
  'dosas': 'Masala Dosa',
  'dose': 'Masala Dosa',
  'ಮಸಾಲ ದೋಸೆ': 'Masala Dosa',
  'ಮಸಾಲೆ ದೋಸೆ': 'Masala Dosa',
  'ದೋಸೆ': 'Masala Dosa',
  'ಮಸಾಲಾ ದೋಸೆ': 'Masala Dosa',
  'मसाला डोसा': 'Masala Dosa',
  'डोसा': 'Masala Dosa',
  'मसाला डोसे': 'Masala Dosa',

  // Crispy Veg Samosa (2 Pcs)
  'crispy veg samosa': 'Crispy Veg Samosa (2 Pcs)',
  'veg samosa': 'Crispy Veg Samosa (2 Pcs)',
  'crispy samosa': 'Crispy Veg Samosa (2 Pcs)',
  'samosa': 'Crispy Veg Samosa (2 Pcs)',
  'samosas': 'Crispy Veg Samosa (2 Pcs)',
  'samose': 'Crispy Veg Samosa (2 Pcs)',
  'ಸಮೋಸಾ': 'Crispy Veg Samosa (2 Pcs)',
  'ಸಮೋಸ': 'Crispy Veg Samosa (2 Pcs)',
  'ಸಮೋಸೆ': 'Crispy Veg Samosa (2 Pcs)',
  'समोसा': 'Crispy Veg Samosa (2 Pcs)',
  'समोसे': 'Crispy Veg Samosa (2 Pcs)',
  'वेज समोसा': 'Crispy Veg Samosa (2 Pcs)',

  // Gobi Manchurian
  'gobi manchurian': 'Gobi Manchurian',
  'gobhi manchurian': 'Gobi Manchurian',
  'gobi': 'Gobi Manchurian',
  'manchurian': 'Gobi Manchurian',
  'ಗೋಬಿ ಮಂಚೂರಿಯನ್': 'Gobi Manchurian',
  'ಗೋಬಿ': 'Gobi Manchurian',
  'ಮಂಚೂರಿಯನ್': 'Gobi Manchurian',
  'गोबी मंचूरियन': 'Gobi Manchurian',
  'गोभी मंचूरियन': 'Gobi Manchurian',
  'गोबी': 'Gobi Manchurian',
  'मंचूरियन': 'Gobi Manchurian',

  // Chicken Kabab
  'chicken kabab': 'Chicken Kabab',
  'chicken kebab': 'Chicken Kabab',
  'kabab': 'Chicken Kabab',
  'kebab': 'Chicken Kabab',
  'kababs': 'Chicken Kabab',
  'kebabs': 'Chicken Kabab',
  'ಚಿಕನ್ ಕಬಾಬ್': 'Chicken Kabab',
  'ಕಬಾಬ್': 'Chicken Kabab',
  'चिकन कबाब': 'Chicken Kabab',
  'कबाब': 'Chicken Kabab',

  // Hot & Sour Veg Soup
  'hot and sour veg soup': 'Hot & Sour Veg Soup',
  'hot and sour soup': 'Hot & Sour Veg Soup',
  'hot & sour veg soup': 'Hot & Sour Veg Soup',
  'veg soup': 'Hot & Sour Veg Soup',
  'soup': 'Hot & Sour Veg Soup',
  'ಹಾಟ್ ಅಂಡ್ ಸೋರ್ ಸೂಪ್': 'Hot & Sour Veg Soup',
  'ವೆಜ್ ಸೂಪ್': 'Hot & Sour Veg Soup',
  'ಸೂಪ್': 'Hot & Sour Veg Soup',
  'हॉट एंड सॉर सूप': 'Hot & Sour Veg Soup',
  'वेज सूप': 'Hot & Sour Veg Soup',
  'सूप': 'Hot & Sour Veg Soup',

  // Peri Peri French Fries
  'peri peri french fries': 'Peri Peri French Fries',
  'peri peri fries': 'Peri Peri French Fries',
  'french fries': 'Peri Peri French Fries',
  'fries': 'Peri Peri French Fries',
  'ಪೆರಿ ಪೆರಿ ಫ್ರೈಸ್': 'Peri Peri French Fries',
  'ಫ್ರೆಂಚ್ ಫ್ರೈಸ್': 'Peri Peri French Fries',
  'ಪೆರಿ ಪೆರಿ': 'Peri Peri French Fries',
  'पेरी पेरी फ्रेंच फ्राइज़': 'Peri Peri French Fries',
  'पेरी पेरी फ्राइज़': 'Peri Peri French Fries',
  'फ्रेंच फ्राइज़': 'Peri Peri French Fries',
  'फ्राइज़': 'Peri Peri French Fries',

  // Paneer Butter Masala
  'paneer butter masala': 'Paneer Butter Masala',
  'paneer butter': 'Paneer Butter Masala',
  'paneer masala': 'Paneer Butter Masala',
  'paneer curry': 'Paneer Butter Masala',
  'ಪನೀರ್ ಬಟರ್ ಮಸಾಲ': 'Paneer Butter Masala',
  'ಪನೀರ್ ಬಟರ್': 'Paneer Butter Masala',
  'ಪನೀರ್ ಮಸಾಲ': 'Paneer Butter Masala',
  'ಪನೀರ್': 'Paneer Butter Masala',
  'पनीर बटर मसाला': 'Paneer Butter Masala',
  'पनीर बटर': 'Paneer Butter Masala',
  'पनीर मसाला': 'Paneer Butter Masala',
  'पनीर': 'Paneer Butter Masala',

  // Butter Naan
  'butter naan': 'Butter Naan',
  'naan': 'Butter Naan',
  'naans': 'Butter Naan',
  'butter naans': 'Butter Naan',
  'ಬಟರ್ ನಾನ್': 'Butter Naan',
  'ನಾನ್': 'Butter Naan',
  'ನಾನ್‌ಗಳು': 'Butter Naan',
  'बटर नान': 'Butter Naan',
  'नान': 'Butter Naan',

  // Dal Tadka
  'dal tadka': 'Dal Tadka',
  'daal tadka': 'Dal Tadka',
  'dal': 'Dal Tadka',
  'daal': 'Dal Tadka',
  'yellow dal': 'Dal Tadka',
  'ದಾಲ್ ತಡ್ಕಾ': 'Dal Tadka',
  'ದಾಲ್': 'Dal Tadka',
  'ಬೇಳೆ ಸಾರು': 'Dal Tadka',
  'दाल तड़का': 'Dal Tadka',
  'दाल': 'Dal Tadka',

  // South Indian Meals
  'south indian meals': 'South Indian Meals',
  'south meals': 'South Indian Meals',
  'meals': 'South Indian Meals',
  'south indian thali': 'South Indian Meals',
  'ಸೌತ್ ಇಂಡಿಯನ್ ಊಟ': 'South Indian Meals',
  'ಊಟ': 'South Indian Meals',
  'ದಕ್ಷಿಣ ಭಾರತದ ಊಟ': 'South Indian Meals',
  'साउथ इंडियन मील्स': 'South Indian Meals',
  'मील्स': 'South Indian Meals',
  'भोजन': 'South Indian Meals',

  // Veg Fried Rice
  'veg fried rice': 'Veg Fried Rice',
  'fried rice': 'Veg Fried Rice',
  'ವೆಜ್ ಫ್ರೈಡ್ ರೈಸ್': 'Veg Fried Rice',
  'ಫ್ರೈಡ್ ರೈಸ್': 'Veg Fried Rice',
  'वेज फ्राइड राइस': 'Veg Fried Rice',
  'फ्राइड राइस': 'Veg Fried Rice',

  // Veg Dum Biryani
  'veg dum biryani': 'Veg Dum Biryani',
  'veg biryani': 'Veg Dum Biryani',
  'ವೆಜ್ ಬಿರಿಯಾನಿ': 'Veg Dum Biryani',
  'ವೆಜ್ ದಮ್ ಬಿರಿಯಾನಿ': 'Veg Dum Biryani',
  'वेज बिरयानी': 'Veg Dum Biryani',
  'वेज दम बिरयानी': 'Veg Dum Biryani',

  // Chicken Dum Biryani
  'chicken dum biryani': 'Chicken Dum Biryani',
  'chicken biryani': 'Chicken Dum Biryani',
  'biryani': 'Chicken Dum Biryani',
  'ಚಿಕನ್ ಬಿರಿಯಾನಿ': 'Chicken Dum Biryani',
  'ಚಿಕನ್ ದಮ್ ಬಿರಿಯಾನಿ': 'Chicken Dum Biryani',
  'ಬಿರಿಯಾನಿ': 'Chicken Dum Biryani',
  'चिकन बिरयानी': 'Chicken Dum Biryani',
  'चिकन दम बिरयानी': 'Chicken Dum Biryani',
  'बिरयानी': 'Chicken Dum Biryani',

  // Jeera Rice
  'jeera rice': 'Jeera Rice',
  'zeera rice': 'Jeera Rice',
  'ಜೀರಾ ರೈಸ್': 'Jeera Rice',
  'ಜೀರಿಗೆ ಅನ್ನ': 'Jeera Rice',
  'जीरा राइस': 'Jeera Rice',
  'जीरा चावल': 'Jeera Rice',

  // South Indian Filter Coffee
  'south indian filter coffee': 'South Indian Filter Coffee',
  'filter coffee': 'South Indian Filter Coffee',
  'filter coffees': 'South Indian Filter Coffee',
  'coffee': 'South Indian Filter Coffee',
  'coffees': 'South Indian Filter Coffee',
  'ಫಿಲ್ಟರ್ ಕಾಫಿ': 'South Indian Filter Coffee',
  'ಕಾಫಿ': 'South Indian Filter Coffee',
  'फ़िल्टर कॉफ़ी': 'South Indian Filter Coffee',
  'फ़िल्टर कॉफी': 'South Indian Filter Coffee',
  'कॉफ़ी': 'South Indian Filter Coffee',
  'कॉफी': 'South Indian Filter Coffee',

  // Masala Chai
  'masala chai': 'Masala Chai',
  'chai': 'Masala Chai',
  'tea': 'Masala Chai',
  'teas': 'Masala Chai',
  'ಮಸಾಲ ಚಹಾ': 'Masala Chai',
  'ಚಹಾ': 'Masala Chai',
  'ಟೀ': 'Masala Chai',
  'मसाला चाय': 'Masala Chai',
  'चाय': 'Masala Chai',
  'टी': 'Masala Chai',

  // Fresh Lime Juice
  'fresh lime juice': 'Fresh Lime Juice',
  'lime juice': 'Fresh Lime Juice',
  'lemon juice': 'Fresh Lime Juice',
  'ನಿಂಬೆಹಣ್ಣಿನ ಜ್ಯೂಸ್': 'Fresh Lime Juice',
  'ಲೈಮ್ ಜ್ಯೂಸ್': 'Fresh Lime Juice',
  'निम्बू पानी': 'Fresh Lime Juice',
  'नींबू पानी': 'Fresh Lime Juice',
  'लाइम जूस': 'Fresh Lime Juice',

  // Cold Coffee with Ice Cream
  'cold coffee with ice cream': 'Cold Coffee with Ice Cream',
  'cold coffees': 'Cold Coffee with Ice Cream',
  'cold coffee': 'Cold Coffee with Ice Cream',
  'ice cream coffee': 'Cold Coffee with Ice Cream',
  'iced coffee': 'Cold Coffee with Ice Cream',
  'ಕೋಲ್ಡ್ ಕಾಫಿ': 'Cold Coffee with Ice Cream',
  'ಕೋಲ್ಡ್ ಕಾಫಿಗಳು': 'Cold Coffee with Ice Cream',
  'ಐಸ್ ಕ್ರೀಮ್ ಕಾಫಿ': 'Cold Coffee with Ice Cream',
  'कोल्ड कॉफी': 'Cold Coffee with Ice Cream',
  'कोल्ड कॉफ़ी': 'Cold Coffee with Ice Cream',

  // Mango Lassi
  'mango lassi': 'Mango Lassi',
  'mango lassis': 'Mango Lassi',
  'lassi': 'Mango Lassi',
  'sweet lassi': 'Mango Lassi',
  'ಮ್ಯಾಂಗೋ ಲಸ್ಸಿ': 'Mango Lassi',
  'ಮಾವಿನ ಹಣ್ಣಿನ ಲಸ್ಸಿ': 'Mango Lassi',
  'ಲಸ್ಸಿ': 'Mango Lassi',
  'मैंगो लस्सी': 'Mango Lassi',
  'आम की लस्सी': 'Mango Lassi',
  'लस्सी': 'Mango Lassi',

  // Gulab Jamun
  'gulab jamun': 'Gulab Jamun (2 Pcs)',
  'jamun': 'Gulab Jamun (2 Pcs)',
  'ಗುಲಾಬ್ ಜಾಮೂನ್': 'Gulab Jamun (2 Pcs)',
  'ಜಾಮೂನ್': 'Gulab Jamun (2 Pcs)',
  'गुलाब जामुन': 'Gulab Jamun (2 Pcs)',
  'जामुन': 'Gulab Jamun (2 Pcs)',

  // Sizzling S'mores Brownie
  'sizzling brownie': "Sizzling S'mores Brownie",
  'brownie': "Sizzling S'mores Brownie",
  'ಬ್ರೌನಿ': "Sizzling S'mores Brownie",
  'ब्राउनी': "Sizzling S'mores Brownie",

  // North Indian Deluxe Thali
  'north indian thali': 'North Indian Deluxe Thali',
  'deluxe thali': 'North Indian Deluxe Thali',
  'thali': 'North Indian Deluxe Thali',
  'ಥಾಲಿ': 'North Indian Deluxe Thali',
  'थाली': 'North Indian Deluxe Thali'
};

// Customization phrase mappings across English, Kannada, Hindi
export const CUSTOMIZATION_RULES = [
  {
    tag: 'Extra Spicy',
    patterns: [
      /extra spicy/i, /more spicy/i, /make it spicy/i, /very spicy/i,
      /ಖಾರ ಜಾಸ್ತಿ/i, /ತುಂಬಾ ಖಾರ/i, /ಹೆಚ್ಚು ಖಾರ/i,
      /ज़्यादा तीखा/i, /ज्यादा तीखा/i, /बहुत तीखा/i, /स्पाइसी/i
    ]
  },
  {
    tag: 'Less Spicy / Mild',
    patterns: [
      /less spicy/i, /mild/i, /not spicy/i, /no spice/i,
      /ಖಾರ ಕಡಿಮೆ/i, /ಸ್ವಲ್ಪ ಖಾರ/i, /ಕಡಿಮೆ ಖಾರ/i,
      /कम तीखा/i, /तीखा कम/i, /हल्का तीखा/i, /मीडियम तीखा/i
    ]
  },
  {
    tag: 'Jain / No Onion Garlic',
    patterns: [
      /jain/i, /no onion/i, /no garlic/i, /without onion/i,
      /ಜೈನ್/i, /ಈರುಳ್ಳಿ ಬೆಳ್ಳುಳ್ಳಿ ಬೇಡ/i,
      /जैन/i, /बिना प्याज लहसुन/i, /बिना प्याज/i
    ]
  },
  {
    tag: 'Extra Butter / Ghee',
    patterns: [
      /extra butter/i, /extra ghee/i, /more butter/i,
      /ಬೆಣ್ಣೆ ಜಾಸ್ತಿ/i, /ತುಪ್ಪ ಜಾಸ್ತಿ/i,
      /ज्यादा मक्खन/i, /मक्खन ज्यादा/i, /एक्स्ट्रा बटर/i
    ]
  },
  {
    tag: 'Less Ice',
    patterns: [
      /less ice/i, /no ice/i, /without ice/i,
      /ಕಡಿಮೆ ಐಸ್/i, /ಐಸ್ ಬೇಡ/i,
      /कम बर्फ/i, /बर्फ नहीं/i, /बिना बर्फ/i
    ]
  }
];

/**
 * Extract Customizations from spoken transcript
 */
export const extractCustomizations = (transcript = '') => {
  const detectedTags = [];
  for (const rule of CUSTOMIZATION_RULES) {
    if (rule.patterns.some(regex => regex.test(transcript))) {
      detectedTags.push(rule.tag);
    }
  }
  return detectedTags;
};

import { speakKioskSpeech } from '../services/sarvamVoiceService.js';

export const getQuantityWord = (qty, langCode = 'en-IN') => {
  const num = parseInt(qty, 10) || 1;
  const englishWords = {
    1: 'one', 2: 'two', 3: 'three', 4: 'four', 5: 'five',
    6: 'six', 7: 'seven', 8: 'eight', 9: 'nine', 10: 'ten',
    11: 'eleven', 12: 'twelve', 15: 'fifteen', 20: 'twenty'
  };
  const kannadaWords = {
    1: 'ಒಂದು', 2: 'ಎರಡು', 3: 'ಮೂರು', 4: 'ನಾಲ್ಕು', 5: 'ಐದು',
    6: 'ಆರು', 7: 'ಏಳು', 8: 'ಎಂಟು', 9: 'ಒಂಬತ್ತು', 10: 'ಹತ್ತು'
  };
  const hindiWords = {
    1: 'एक', 2: 'दो', 3: 'तीन', 4: 'चार', 5: 'पाँच',
    6: 'छह', 7: 'सात', 8: 'आठ', 9: 'नौ', 10: 'दस'
  };

  if (langCode === 'kn-IN') {
    return kannadaWords[num] || num.toString();
  }
  if (langCode === 'hi-IN') {
    return hindiWords[num] || num.toString();
  }
  return englishWords[num] || num.toString();
};

/**
 * Format Phase 2 Voice Order Confirmation Prompt:
 * Single item: "You want one Masala Dosa. Shall I add it to your order?"
 * Multiple items: "You want two Masala Dosa and one Mango Lassi. Shall I add them to your order?"
 */
export const formatOrderConfirmationPrompt = (items = [], langCode = 'en-IN') => {
  if (!items || items.length === 0) return '';

  if (items.length === 1) {
    const item = items[0];
    const name = item.dish?.name || item.name;
    const qtyWord = getQuantityWord(item.quantity, langCode);

    if (langCode === 'kn-IN') {
      return `ನೀವು ${qtyWord} ${name} ಬಯಸಿದ್ದೀರಿ. ಅದನ್ನು ನಿಮ್ಮ ಆರ್ಡರ್‌ಗೆ ಸೇರಿಸಲೇ?`;
    }
    if (langCode === 'hi-IN') {
      return `आप ${qtyWord} ${name} चाहते हैं। क्या मैं इसे आपके ऑर्डर में जोड़ दूँ?`;
    }
    return `You want ${qtyWord} ${name}. Shall I add it to your order?`;
  }

  // Multiple items
  if (langCode === 'kn-IN') {
    const summaryKn = items.map(i => `${getQuantityWord(i.quantity, 'kn-IN')} ${i.dish?.name || i.name}`).join(' ಮತ್ತು ');
    return `ನೀವು ${summaryKn} ಬಯಸಿದ್ದೀರಿ. ಅವುಗಳನ್ನು ನಿಮ್ಮ ಆರ್ಡರ್‌ಗೆ ಸೇರಿಸಲೇ?`;
  }
  if (langCode === 'hi-IN') {
    const summaryHi = items.map(i => `${getQuantityWord(i.quantity, 'hi-IN')} ${i.dish?.name || i.name}`).join(' और ');
    return `आप ${summaryHi} चाहते हैं। क्या मैं इन्हें आपके ऑर्डर में जोड़ दूँ?`;
  }

  const summaryEn = items.map(i => `${getQuantityWord(i.quantity, 'en-IN')} ${i.dish?.name || i.name}`).join(' and ');
  return `You want ${summaryEn}. Shall I add them to your order?`;
};

/**
 * Format Unknown Item Response:
 * "Sorry, I couldn't find that item on the menu."
 */
export const formatUnknownItemPrompt = (unrecognizedItems = [], langCode = 'en-IN') => {
  if (langCode === 'kn-IN') {
    return 'ಕ್ಷಮಿಸಿ, ಆ ತಿಂಡಿ ನಮ್ಮ ಮೆನುವಿನಲ್ಲಿ ಲಭ್ಯವಿಲ್ಲ.';
  }
  if (langCode === 'hi-IN') {
    return 'क्षमा करें, यह व्यंजन हमारे मेनू में उपलब्ध नहीं है।';
  }
  return "Sorry, I couldn't find that item on the menu.";
};

/**
 * Check if the spoken text represents a Voice Confirmation (Yes/Confirm)
 */
export const isConfirmationVoiceCommand = (transcript = '', langCode = 'en-IN') => {
  const clean = transcript.toLowerCase().trim().replace(/[.,?!।]/g, ' ');
  const langConfig = SUPPORTED_LANGUAGES.find(l => l.code === langCode) || SUPPORTED_LANGUAGES[0];

  return langConfig.confirmKeywords.some(keyword => {
    return clean === keyword.toLowerCase() || new RegExp(`\\b${keyword}\\b`, 'i').test(clean) || clean.includes(keyword);
  });
};

/**
 * Check if the spoken text represents a Cancel/Change command (No/Cancel/Change it)
 */
export const isCancelVoiceCommand = (transcript = '', langCode = 'en-IN') => {
  const clean = transcript.toLowerCase().trim().replace(/[.,?!।]/g, ' ');
  const langConfig = SUPPORTED_LANGUAGES.find(l => l.code === langCode) || SUPPORTED_LANGUAGES[0];

  return langConfig.cancelKeywords.some(keyword => {
    return clean === keyword.toLowerCase() || new RegExp(`\\b${keyword}\\b`, 'i').test(clean) || clean.includes(keyword);
  });
};

/**
 * Text-to-Speech (TTS) Voice Prompt Generator
 * Seamlessly routes through Sarvam AI backend proxy and falls back to Web SpeechSynthesis
 */
export const speakKioskPrompt = (text, langCode = 'en-IN', onEndCallback = null) => {
  return speakKioskSpeech(text, langCode, onEndCallback);
};

/**
 * Accurately interpret Web Speech API errors and produce informative user messages
 */
export const getSpeechRecognitionErrorMessage = (errorCode, langCode = 'en-IN') => {
  switch (errorCode) {
    case 'not-allowed':
    case 'permission-denied':
      if (typeof window !== 'undefined' && !window.isSecureContext) {
        return 'Microphone requires a secure connection (HTTPS or localhost). Please open via http://localhost:5173.';
      }
      return 'Microphone access is blocked. Please enable microphone permission in your browser settings or address bar.';
    case 'audio-capture':
      return 'No microphone audio input detected. Please verify your microphone is plugged in, unmuted, and selected as default.';
    case 'network':
      return 'Speech recognition network error. Please check your internet connection and access to speech services.';
    case 'service-not-allowed':
      return 'Speech recognition service is not allowed in this browser or context.';
    case 'language-not-supported':
      return `Speech recognition for language (${langCode}) is not supported by your browser.`;
    case 'no-speech':
      return 'No speech was detected. Please tap the microphone and speak clearly.';
    default:
      return `Voice input notice (${errorCode || 'unknown'}). Please tap to retry or use manual entry.`;
  }
};
