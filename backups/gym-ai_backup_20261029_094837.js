const fs = require('fs');
const path = require('path');

function normalizeText(text) {
    if (!text) return '';
    return text.toString().toLowerCase()
        .replace(/[^\w\s\u0900-\u097F]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function phraseFuzzyMatch(text, phrase) {
    const tNorm = normalizeText(text);
    const pNorm = normalizeText(phrase);
    if (tNorm.includes(pNorm)) return true;
    
    const tWords = tNorm.split(' ');
    const pWords = pNorm.split(' ');
    let matchedCount = 0;
    
    for (let pWord of pWords) {
        if (pWord.length <= 2) {
            if (tWords.includes(pWord)) matchedCount++;
        } else {
            let found = tWords.some(tWord => {
                if (tWord === pWord) return true;
                if (Math.abs(tWord.length - pWord.length) > 2) return false;
                let diff = 0;
                for (let i = 0; i < Math.max(tWord.length, pWord.length); i++) {
                    if (tWord[i] !== pWord[i]) diff++;
                }
                return diff <= 1;
            });
            if (found) matchedCount++;
        }
    }
    return (matchedCount / pWords.length) >= 0.75;
}

function validValue(val) {
    if (!val || typeof val !== 'string') return false;
    const clean = val.trim();
    if (clean.length < 2) return false;
    const testPlaceholders = ['ff', 'wfffww', 'dzh', 'eetet', 'b', 'ddb', 'bddb', 'bdb', 'dbbd', 'bbd', 'bds', 'sssssss', 'sssss'];
    if (testPlaceholders.includes(clean.toLowerCase())) return false;
    return true;
}

const INTENTS = [
    {
        field: 'q1',
        name: 'Gym Name',
        phrases: ['gym name', 'name of gym', 'gym ka naam', 'naam kya hai', 'company name', 'fitness name', 'gym nme']
    },
    {
        field: 'q2',
        name: 'Address and Location',
        phrases: ['address', 'location', 'kahan par hai', 'kaha hai', 'pata', 'where is gym', 'adderss', 'loctn', 'lucknow']
    },
    {
        field: 'q3',
        name: 'Opening and Closing Times',
        phrases: ['gym time', 'gym tym', 'timing', 'timing kya hai', 'timing kya h', 'time kya hai', 'ke time', 'kab khulta', 'kab band hota', 'opening time', 'closing time', 'gym hours', 'hours']
    },
    {
        field: 'q4',
        name: 'Facilities',
        phrases: ['facilities', 'facility', 'equipment', 'machines', 'kya kya hai', 'facility kya hai']
    },
    {
        field: 'q5',
        name: 'Fees and Membership Plans',
        phrases: ['monthly fees', 'monthy fees', 'monthyly fees', 'monthly fee', 'fees kitni hai', 'mahine ki fees', '1 month ka', 'gym fees', 'membership charges', 'charge kitna', 'fee', 'fees', 'pricing', 'price']
    },
    {
        field: 'q6',
        name: 'Ladies Timings',
        phrases: ['ladies timing', 'womens time', 'ladies ke liye', 'girls timing', 'ladies batch']
    },
    {
        field: 'q7',
        name: 'Personal Trainers',
        phrases: ['personal trainer', 'trainer', 'pt', 'coach', 'personal training']
    },
    {
        field: 'q8',
        name: 'Diet Plans',
        phrases: ['diet plan', 'diet', 'khane ka chart', 'nutrition']
    },
    {
        field: 'q9',
        name: 'Weight Loss Programmes',
        phrases: ['weight loss', 'fat loss', 'wazan kam', 'motapa kam']
    },
    {
        field: 'q10',
        name: 'Muscle Gain Programmes',
        phrases: ['muscle gain', 'body building', 'weight gain', 'muscle banana']
    },
    {
        field: 'q11', name: 'FAQ 11', phrases: ['q11', 'question 11', 'other info 11']
    },
    {
        field: 'q12', name: 'FAQ 12', phrases: ['q12', 'question 12', 'other info 12']
    },
    {
        field: 'q13', name: 'FAQ 13', phrases: ['q13', 'question 13', 'other info 13']
    },
    {
        field: 'q14', name: 'FAQ 14', phrases: ['q14', 'question 14', 'other info 14']
    },
    {
        field: 'q15', name: 'FAQ 15', phrases: ['q15', 'question 15', 'other info 15']
    },
    {
        field: 'q16', name: 'FAQ 16', phrases: ['q16', 'question 16', 'other info 16']
    },
    {
        field: 'q17', name: 'FAQ 17', phrases: ['q17', 'question 17', 'other info 17']
    },
    {
        field: 'q18', name: 'FAQ 18', phrases: ['q18', 'question 18', 'other info 18']
    },
    {
        field: 'q19', name: 'FAQ 19', phrases: ['q19', 'question 19', 'other info 19']
    },
    {
        field: 'q20', name: 'FAQ 20', phrases: ['q20', 'question 20', 'other info 20']
    }
];

function createGymAIReply(message, profile, fallbackReply) {
    const text = normalizeText(message);
    if (!text) return fallbackReply || "Hello! How can I help you with our gym today?";

    // Greetings check
    if (/^(hi|hello|hey|hlo|hii|namaste|good morning|good evening)/.test(text)) {
        if (profile && profile.greeting) {
            return profile.greeting;
        }
        return "Welcome to our gym! How can I assist you?";
    }

    // Sort intents by phrase length descending to match specific intents first
    let sortedIntents = [...INTENTS].sort((a, b) => {
        let maxA = Math.max(...a.phrases.map(p => p.length));
        let maxB = Math.max(...b.phrases.map(p => p.length));
        return maxB - maxA;
    });

    for (let intent of sortedIntents) {
        for (let phrase of intent.phrases) {
            if (phraseFuzzyMatch(text, phrase)) {
                if (profile && profile[intent.field]) {
                    const val = profile[intent.field];
                    if (validValue(val)) {
                        return ${intent.name}: ;
                    } else {
                        return Maaf kijiye,  ki information dashboard mein saved nahi hai ya clear nahi hai. Kripya gym se directly confirm kar lein.;
                    }
                } else {
                    return Maaf kijiye,  ki information available nahi hai.;
                }
            }
        }
    }

    return fallbackReply || "Maaf kijiye, main aapke is sawal ko samajh nahi paaya. Kripya gym timings, fees, ya address ke baare mein poochein.";
}

module.exports = {
    createGymAIReply,
    validValue,
    normalizeText
};
