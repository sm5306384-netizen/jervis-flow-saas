const Fuse = require('fuse.js');

// Q1-Q20 INTENT MAPPING
const INTENTS = [
  {
    field: 'q1',
    label: 'Gym Name',
    phrases: ['gym name', 'gym ka naam', 'konsa gym', 'gym konsa hai', 'gym kaunsa', 'what is gym name', 'aapka gym naam']
  },
  {
    field: 'q2',
    label: 'Address/Location',
    phrases: ['address', 'location', 'gym address', 'kaha hai', 'gym kaha hai', 'gym ka address', 'gym ke paas', 'gym location', 'gym ka lokeshn', 'kaunsi jagah']
  },
  {
    field: 'q3',
    label: 'Gym Timings',
    phrases: ['timing', 'time', 'timing kya hai', 'gym timing', 'gym time', 'gym ka time', 'opening time', 'gym hours', 'kab khulta hai', 'kab band hota', 'gym kab khule', 'operating hours', 'working hours', 'gym ke time', 'gym ka khulne ka samay']
  },
  {
    field: 'q4',
    label: 'Monthly Fees',
    phrases: ['fees', 'fee', 'monthly fee', 'monthly fees', 'membership fee', 'membership cost', 'charge', 'charges', 'kitni fees', 'mahine ki fees', 'ek mahine ka', 'membership charges', 'monthly subscription', 'monthly plan', 'fees kitni', 'monthly kitna']
  },
  {
    field: 'q5',
    label: 'Three-Month Fees',
    phrases: ['3 month', 'three month', 'quarterly', 'teen mahine', '3 months', 'three months fee', 'quarter fee']
  },
  {
    field: 'q6',
    label: 'Six-Month Fees',
    phrases: ['6 month', 'six month', 'half yearly', 'half year', 'six months', '6 months fee', 'chhah mahine']
  },
  {
    field: 'q7',
    label: 'Annual Fees',
    phrases: ['annual', 'yearly', '12 month', 'one year', 'saaal bhar', 'pura saal', 'annual fee', 'yearly fee', '1 year']
  },
  {
    field: 'q8',
    label: 'Facilities',
    phrases: ['facility', 'facilities', 'gym mein kya hai', 'facilities kya hai', 'equipment', 'gym equipment', 'savidhan', 'cheezein']
  },
  {
    field: 'q9',
    label: 'Ladies Timing',
    phrases: ['ladies', 'ladies timing', 'mahila timing', 'women timing', 'ladies time', 'female', 'mahila ka time', 'ladies ke liye', 'women hours']
  },
  {
    field: 'q10',
    label: 'Personal Trainer',
    phrases: ['trainer', 'personal trainer', 'coaching', 'coach', 'pt', 'trainer fee', 'trainer available', 'coach available', 'personal coaching']
  },
  {
    field: 'q11',
    label: 'Diet Plan',
    phrases: ['diet', 'diet plan', 'nutrition', 'nutritionist', 'meal plan', 'khana plan', 'diet guide', 'nutrition plan']
  },
  {
    field: 'q12',
    label: 'Weight Loss Program',
    phrases: ['weight loss', 'weight loss program', 'fat loss', 'slim', 'weight kam', 'mota kam', 'weight down']
  },
  {
    field: 'q13',
    label: 'Muscle Gain Program',
    phrases: ['muscle gain', 'muscle building', 'strength', 'mass', 'bulking', 'muscle banane', 'muscle gain program', 'strength training']
  },
  {
    field: 'q14',
    label: 'Registration Fee',
    phrases: ['registration', 'registration fee', 'joining fee', 'enrollment', 'registation', 'sign up fee']
  },
  {
    field: 'q15',
    label: 'Age Limit',
    phrases: ['age', 'age limit', 'minimum age', 'umar', 'umar ki sima', 'kitni age chahiye']
  },
  {
    field: 'q16',
    label: 'Group Classes',
    phrases: ['class', 'classes', 'group class', 'group classes', 'batch', 'batches', 'yoga class', 'zumba', 'aerobics']
  },
  {
    field: 'q17',
    label: 'Locker Facility',
    phrases: ['locker', 'lockers', 'locker facility', 'storage', 'almirah']
  },
  {
    field: 'q18',
    label: 'Parking',
    phrases: ['parking', 'parking facility', 'bike parking', 'car parking', 'vehicle parking']
  },
  {
    field: 'q19',
    label: 'Contact/Phone',
    phrases: ['contact', 'phone', 'number', 'call', 'whatsapp', 'contact number', 'phone number', 'call kaise kare']
  },
  {
    field: 'q20',
    label: 'Other Information',
    phrases: ['other', 'anything else', 'aur kya', 'aur information']
  }
];

// HELPER FUNCTIONS
function normalizeText(text) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ');
}

function validValue(val) {
  if (!val || typeof val !== 'string') return false;
  const trimmed = val.trim();
  if (trimmed.length === 0) return false;
  if (/^[a-z\s]+$/.test(trimmed) && trimmed.split(' ').every(w => w.length < 3)) return false; // placeholder like "ff" or "b"
  return true;
}

function fuzzyMatch(text, phrase) {
  const words = text.split(' ');
  const phraseWords = phrase.split(' ');
  
  if (phraseWords.length === 1 && phraseWords[0].length < 3) return false;
  
  for (let pWord of phraseWords) {
    let matched = false;
    for (let tWord of words) {
      const distance = levenshteinDistance(pWord, tWord);
      if (distance <= 1 || tWord.includes(pWord)) {
        matched = true;
        break;
      }
    }
    if (!matched) return false;
  }
  return true;
}

function levenshteinDistance(a, b) {
  const matrix = Array(b.length + 1).fill(null).map(() => Array(a.length + 1).fill(0));
  for (let i = 0; i <= a.length; i++) matrix[0][i] = i;
  for (let j = 0; j <= b.length; j++) matrix[j][0] = j;
  
  for (let j = 1; j <= b.length; j++) {
    for (let i = 1; i <= a.length; i++) {
      if (a[i - 1] === b[j - 1]) {
        matrix[j][i] = matrix[j - 1][i - 1];
      } else {
        matrix[j][i] = Math.min(
          matrix[j - 1][i - 1] + 1,
          matrix[j][i - 1] + 1,
          matrix[j - 1][i] + 1
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

function createGymAIReply(message, profile, fallbackReply = null) {
  const normalized = normalizeText(message);
  
  // GREETING - highest priority
  if (normalized.includes('hello') || normalized.includes('hi') || normalized.includes('hlo') || 
      normalized.includes('hey') || normalized.includes('namaste')) {
    return profile.greeting || 'Namaste! Gym mein aapka swagat hai. Kya main aapki madad kar sakta hoon?';
  }
  
  // INTENT MATCHING - specific before broad
  for (const intent of INTENTS) {
    let matched = false;
    
    // Exact include match
    for (const phrase of intent.phrases) {
      if (normalized.includes(normalizeText(phrase))) {
        matched = true;
        break;
      }
    }
    
    // Fuzzy match if not exact
    if (!matched) {
      for (const phrase of intent.phrases) {
        if (fuzzyMatch(normalized, normalizeText(phrase))) {
          matched = true;
          break;
        }
      }
    }
    
    if (matched) {
      const value = profile[intent.field];
      if (validValue(value)) {
        return \\: \\;
      } else {
        return \Maaf kijiye, \ ki information dashboard mein saved nahi hai. Kripya gym se directly confirm kar lein.\;
      }
    }
  }
  
  // FALLBACK
  return fallbackReply || 'Mujhe samajh nahi aaya. Kya aap gym timing, fees, facilities ya kisi aur cheez ke baare mein pooch rahe hain?';
}

module.exports = { createGymAIReply, normalizeText, validValue, INTENTS };
