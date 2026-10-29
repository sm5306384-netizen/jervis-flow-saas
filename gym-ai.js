const fs = require('fs');

function normalizeText(text) {
    if (!text) return '';
    return text.toString().toLowerCase()
        .replace(/[^\w\s\u0900-\u097F]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function isHindiMessage(text) {
    const hindiKeywords = ['kya', 'hai', 'h', 'kaise', 'kab', 'kahan', 'kaha', 'pata', 'batao', 'batayein', 'kitna', 'kitni', 'pucho', 'sawal', 'bhai', 'ji', 'chahiye', 'milega', 'khulta', 'band', 'samay', 'timing kya'];
    const norm = normalizeText(text);
    return hindiKeywords.some(kw => norm.includes(kw));
}

function formatFriendlyReply(field, val, isHindi) {
    const v = val.toString().trim();
    const vLower = v.toLowerCase();
    const isYes = ['yes', 'yee', 'available', 'ha', 'haan', 'yeah', 'yep', 'y'].includes(vLower);

    if (isHindi) {
        switch (field) {
            case 'q1': return 'Aapka swagat hai! Hamare gym ka naam ' + v + ' hai. Aaj main aapki kya sahayata kar sakta hoon?';
            case 'q2': return 'Hamara gym yahan sthit hai: ' + v + '. Aap jab chahein visit kar sakte hain!';
            case 'q3': return 'Hamare gym ki timing ' + v + ' hai. Kya aapko kisi specific shift ki detail chahiye?';
            case 'q4': return 'Hamare gym mein ' + v + ' jaisi behtareen facilities available hain.';
            case 'q5': return 'Hamare gym ki monthly membership fee ' + v + ' hai. Kya aapko kisi aur plan ke baare mein poochna hai?';
            case 'q6': return 'Hamara 3-month membership plan ' + v + ' hai.';
            case 'q7': return 'Hamara 6-month membership plan ' + v + ' hai.';
            case 'q8': return 'Hamara annual membership plan ' + v + ' hai. Yeh sabse best value option hai!';
            case 'q9': return isYes ? 'Haan, hamare yahan weight loss training program available hai!' : 'Weight loss program: ' + v + '.';
            case 'q10': return isYes ? 'Haan, hamare yahan muscle gain aur strength training programs available hain!' : 'Muscle gain program: ' + v + '.';
            case 'q11': return 'Equipment aur facilities: ' + v + '.';
            case 'q12': return 'Ladies facilities aur timings: ' + v + '.';
            case 'q13': return isYes ? 'Haan, hamare expert trainers ke sath personal training available hai!' : 'Personal training details: ' + v + '.';
            case 'q14': return 'Diet consultation details: ' + v + '.';
            case 'q15': return 'Weight loss training details: ' + v + '.';
            case 'q16': return 'Muscle gain training details: ' + v + '.';
            case 'q17': return 'Hum ' + v + ' payment methods accept karte hain.';
            case 'q18': return 'Cancellation & refund policy: ' + v + '.';
            default: return v.length > 20 ? v : v + '. Kya aapko koi aur information chahiye?';
        }
    } else {
        switch (field) {
            case 'q1': return 'Welcome! Our gym name is ' + v + '. How can I assist you today?';
            case 'q2': return 'We are located at: ' + v + '. Feel free to visit us anytime!';
            case 'q3': return 'Our gym timings are ' + v + '. Let me know if you need any timing details!';
            case 'q4': return 'We offer great facilities including ' + v + '.';
            case 'q5': return 'Our monthly membership fee is ' + v + '. Do you have any other questions?';
            case 'q6': return 'Our 3-month membership plan is ' + v + '.';
            case 'q7': return 'Our 6-month membership plan fee is ' + v + '.';
            case 'q8': return 'Our annual membership package is ' + v + '.';
            case 'q9': return isYes ? 'Yes, we offer specialized weight loss training programs!' : 'Regarding weight loss: ' + v + '.';
            case 'q10': return isYes ? 'Yes, we provide muscle gain and strength training programs!' : 'Regarding muscle gain: ' + v + '.';
            case 'q11': return 'Equipment & facilities: ' + v + '.';
            case 'q12': return 'Ladies facilities & timings: ' + v + '.';
            case 'q13': return isYes ? 'Yes, personal training is available with our expert trainers!' : 'Personal training details: ' + v + '.';
            case 'q14': return 'Diet consultation details: ' + v + '.';
            case 'q15': return 'Weight loss training details: ' + v + '.';
            case 'q16': return 'Muscle gain training details: ' + v + '.';
            case 'q17': return 'We accept payment methods: ' + v + '.';
            case 'q18': return 'Cancellation & refund policy: ' + v + '.';
            default: return v.length > 20 ? v : v + '. Let me know if you have any other questions!';
        }
    }
}

const FAQ_INTENTS = [
    { field: 'q1', keys: ['gym name', 'name of gym', 'gym ka naam', 'naam kya hai', 'company name', 'fitness name'] },
    { field: 'q2', keys: ['address', 'location', 'kahan par hai', 'kaha hai', 'pata', 'where is gym', 'lucknow', 'pata kya hai', 'adderss'] },
    { field: 'q3', keys: ['gym time', 'gym tym', 'timing', 'timing kya hai', 'timing kya h', 'time kya hai', 'ke time', 'kab khulta', 'kab band', 'opening time', 'closing time', 'gym hours', 'hours', 'time'] },
    { field: 'q4', keys: ['facilities', 'facility', 'equipment', 'machines', 'kya kya hai'] },
    { field: 'q5', keys: ['monthly fees', 'monthly fee', 'monthy fees', 'monthyly fees', 'per month', 'month fee', 'mahine ki fees', '1 month ka', 'gym fees', 'monthly', 'monthy', 'pricing', 'price', 'monthly kina hai'] },
    { field: 'q6', keys: ['3 month', 'three month', 'quarterly', 'teen mahine', '3 mahine'] },
    { field: 'q7', keys: ['6 month', 'six month', 'half year', 'chhe mahine', '6 mahine'] },
    { field: 'q8', keys: ['annual fees', 'annual fee', 'annual', 'yearly', 'annually', '12 month', 'saal ka', 'saal ki', 'saalana', 'salana'] },
    { field: 'q9', keys: ['weight loss', 'fat loss', 'wazan kam', 'motapa kam'] },
    { field: 'q10', keys: ['muscle gain', 'body building', 'weight gain', 'muscle banana'] },
    { field: 'q11', keys: ['equipment', 'equipments', 'facility', 'facilities', 'machines'] },
    { field: 'q12', keys: ['ladies', 'women', 'girls', 'womens timing', 'ladies timing'] },
    { field: 'q13', keys: ['personal training', 'personal trainer', 'trainer', 'pt', 'coach', 'pesronal traing', 'personal traing', 'peronal traing', 'peronal training', 'training', 'aviable', 'yee', 'trainering', 'traing'] },
    { field: 'q14', keys: ['diet', 'diet consultation', 'diet plan', 'nutrition'] },
    { field: 'q15', keys: ['weight loss training', 'fat loss programme'] },
    { field: 'q16', keys: ['muscle gain programme', 'bodybuilding training'] },
    { field: 'q17', keys: ['payment', 'payment methods', 'upi', 'cash', 'card'] },
    { field: 'q18', keys: ['refund', 'cancellation', 'refund policy', 'cancel'] }
];

function createGymAIReply(message, profile, fallbackReply) {
    const text = normalizeText(message);
    const hindiMode = isHindiMessage(message);

    if (!text) {
        return hindiMode 
            ? 'Namaste! Main aapki hamare gym ke baare mein kya sahayata kar sakta hoon?' 
            : 'Hello! How can I assist you with our gym today?';
    }

    if (/^(hi|hello|hey|hlo|hii|namaste|good morning|good evening)/.test(text)) {
        if (profile && profile.greeting && profile.greeting.trim().length > 0) {
            return profile.greeting;
        }
        return hindiMode 
            ? 'Namaste! Hamare gym mein aapka swagat hai. Main aapki kya help kar sakta hoon?' 
            : 'Hello! Welcome to our gym. How can I help you today?';
    }

    // 1. Dynamic Custom FAQs added by Owner
    if (profile && Array.isArray(profile.custom_faqs)) {
        for (let faq of profile.custom_faqs) {
            if (faq.question && faq.answer) {
                let qNorm = normalizeText(faq.question);
                if (text.includes(qNorm) || qNorm.includes(text)) {
                    return faq.answer;
                }
            }
        }
    }

    // 2. Standard Intent Match
    let allMatches = [];
    for (let i = 0; i < FAQ_INTENTS.length; i++) {
        let intent = FAQ_INTENTS[i];
        for (let j = 0; j < intent.keys.length; j++) {
            let key = intent.keys[j];
            if (text.includes(key) || key.includes(text)) {
                allMatches.push({ intent: intent, keyLength: key.length });
            }
        }
    }

    allMatches.sort((a, b) => b.keyLength - a.keyLength);

    if (allMatches.length > 0) {
        let matchedIntent = allMatches[0].intent;
        if (profile && profile[matchedIntent.field] !== undefined) {
            let val = profile[matchedIntent.field].toString().trim();
            if (val.length > 0) {
                return formatFriendlyReply(matchedIntent.field, val, hindiMode);
            }
        }
    }

    return hindiMode 
        ? 'Kshama kijiye, yeh jankari hamare dashboard mein saved nahi hai. Aap gym owner se seedhe sampark kar sakte hain.' 
        : 'Sorry, I don\'t have this specific information saved in my system. You can talk directly to the gym owner for details!';
}

module.exports = {
    createGymAIReply,
    validValue: (v) => v && v.toString().trim().length > 0,
    normalizeText
};
