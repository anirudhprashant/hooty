// The few words the lesson cards themselves say, in the language of the book being read,
// so a Hindi book does not talk to the child in English.
const WORDS = {
  hi: {
    Listen: 'सुनिए', Back: 'पीछे', Next: 'आगे', 'Got it, continue': 'समझ गए, आगे चलें', 'Remember:': 'याद रखिए:',
    'Did you know?': 'क्या आप जानते हैं?', 'Wow!': 'वाह!', 'Think about it…': 'सोचिए…', "Let's find out": 'चलिए, जानते हैं',
    'No need to answer yet. Read on and you will find out.': 'अभी जवाब देने की ज़रूरत नहीं। आगे पढ़िए, जवाब मिल जाएगा।',
    'Let us solve one together': 'आइए, साथ में हल करें', 'Let us think it through': 'आइए, सोचकर समझें', 'Show me how': 'मुझे दिखाइए', 'Next step': 'अगला कदम', 'Got it, my turn': 'समझ गए, अब मेरी बारी',
    'Write your answer': 'अपना उत्तर लिखिए', 'A good answer': 'एक अच्छा उत्तर', 'Did you say these?': 'क्या आपने ये बातें लिखीं?', 'Show a good answer': 'अच्छा उत्तर दिखाइए', 'Answer in your own words': 'अपने शब्दों में उत्तर दीजिए', 'Read this first': 'पहले यह पढ़िए',
    Read: 'पढ़िए', 'I have read it': 'पढ़ लिया', 'Tap a highlighted word to see what it means.': 'शब्द का अर्थ जानने के लिए उस पर टैप कीजिए।',
  },
};
export const bookWord = (lang, text) => WORDS[lang]?.[text] || text;
