"use strict";

function normalize(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/[^a-z0-9\u0900-\u097f₹\s]/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function validValue(key, value) {
  const v = String(value || "").trim();

  if (!v || v.length < 3) return false;
  if (/^(.)\1{3,}$/i.test(v)) return false;
  if (/^[bcdfghjklmnpqrstvwxyz]{1,5}$/i.test(v)) return false;
  if (/^(test|dummy|asdf|qwerty|unknown|n\/a|none|null|undefined)$/i.test(v)) return false;

  // Fee fields must contain a real numeric amount.
  if (["q5", "q6", "q7", "q8", "q10"].includes(key)) {
    return /\d/.test(v) && /[0-9]/.test(v);
  }

  // Accept saved timing such as "6 to 11" as entered.
  // Do not invent AM/PM or change the saved hours.
  if (key === "q3") {
    return /\d/.test(v) && /[a-z\u0900-\u097f]/i.test(v) ||
           /\b\d{1,2}\s*(am|pm)\b/i.test(v) ||
           /\b\d{1,2}:\d{2}\b/.test(v) ||
           /\b\d{1,2}\s*(to|-)\s*\d{1,2}\b/i.test(v);
  }

  if (/^[bcdfghjklmnpqrstvwxyz]{1,8}$/i.test(v)) return false;
  if (key === "q4" && v.length < 5) return false;

  return true;
}

const INTENTS = [
  { key: "q12", label: "Ladies facilities and timings", words: [
    "ladies timing", "women timing", "girls timing", "female timing",
    "ladies facility", "women facility", "ladies", "women", "female",
    "mahila", "ladies ke liye", "girls ke liye"
  ]},
  { key: "q8", label: "Annual membership fee", words: [
    "annual fee", "yearly fee", "year fee", "12 month", "12 months",
    "one year fee", "saal ki fee", "saal ka charge", "saalana fees",
    "salana fees", "barah mahine"
  ]},
  { key: "q7", label: "6-month membership fee", words: [
    "6 month", "6 months", "six month", "half year", "6 mahine",
    "chhe mahine", "6 mahine ki fees", "six months fee"
  ]},
  { key: "q6", label: "3-month membership fee", words: [
    "3 month", "3 months", "three month", "quarterly", "3 mahine",
    "teen mahine", "3 mahine ki fees"
  ]},
  { key: "q10", label: "Joining and registration charges", words: [
    "joining fee", "joining fees", "registration", "admission fee",
    "joining charge", "admission charges", "admission fees", "entry fee"
  ]},
  { key: "q5", label: "Monthly membership fee", words: [
    "monthly fee", "monthly fees", "month fee", "month fees",
    "per month", "mahine ki fees", "mahina fees", "monthly membership",
    "one month fee", "1 month fee"
  ]},
  { key: "q1", label: "Gym name", words: [
    "gym name", "name of gym", "gym ka naam", "gym ka nam",
    "gym ka nme", "naam kya hai", "what is the gym name", "gym konsa hai"
  ]},
  { key: "q3", label: "Gym timings", words: [
    "gym time", "gym ka time", "gym ke time", "gym ki timing",
    "gym ka timing", "gym timings", "time kya hai", "time kya h",
    "timing kya hai", "timing kya h", "time batao", "timing batao",
    "gym kab", "gym kab khulta", "gym kab khulte", "gym kab band",
    "kitne baje khulta", "kitne baje khulte", "kitne baje band",
    "opening time", "closing time", "working hours", "gym hours",
    "gym samay", "gym ka samay", "समय", "कितने बजे"
  ]},
  { key: "q4", label: "Weekly schedule and holidays", words: [
    "weekly schedule", "weekly off", "week off", "holiday", "holidays",
    "sunday", "monday", "tuesday", "wednesday", "thursday", "friday",
    "saturday", "chhutti", "gym band", "kis din band", "closed"
  ]},
  { key: "q2", label: "Gym address", words: [
    "address", "location", "where is gym", "gym kahan", "gym kaha",
    "gym kha hai", "gym kahan hai", "gym ka address", "gym ki location",
    "pata batao", "लोकेशन", "पता"
  ]},
  { key: "q9", label: "Trial workout", words: [
    "trial", "free workout", "trial workout", "demo", "try gym",
    "trial milega", "free trial", "ek din trial"
  ]},
  { key: "q11", label: "Gym facilities", words: [
    "facilities", "facility", "equipment", "machines", "locker",
    "shower", "cardio", "gym mein kya", "gym me kya", "gym me kya kya",
    "gym mein kya kya", "kya kya hai gym mein", "suvidha"
  ]},
  { key: "q13", label: "Personal training", words: [
    "personal training", "personal trainer", "pt charges", "trainer",
    "one to one training", "individual trainer", "trainer available",
    "personal trainer hai"
  ]},
  { key: "q14", label: "Diet consultation", words: [
    "diet", "nutrition", "dietician", "diet plan", "meal plan",
    "food plan", "khane ka plan", "diet milta"
  ]},
  { key: "q15", label: "Weight-loss programme", words: [
    "weight loss", "lose weight", "fat loss", "wazan kam", "weight kam",
    "patla hona", "weight ghatana"
  ]},
  { key: "q16", label: "Muscle-gain programme", words: [
    "muscle gain", "muscle building", "bulking", "bodybuilding",
    "muscle banana", "body banana", "muscles banane"
  ]},
  { key: "q17", label: "Accepted payment methods", words: [
    "payment", "payment method", "pay", "upi", "cash", "card",
    "online payment", "kaise pay", "payment kaise", "paise kaise dein"
  ]},
  { key: "q18", label: "Cancellation and refund policy", words: [
    "refund", "refund policy", "cancel", "cancellation",
    "paise wapas", "money back", "membership cancel"
  ]},
  { key: "q19", label: "Membership pause policy", words: [
    "freeze", "pause", "hold membership", "membership pause",
    "membership rok", "membership rokna", "break le sakte"
  ]},
  { key: "q20", label: "Contact details and common FAQs", words: [
    "contact", "phone number", "mobile number", "contact details",
    "contact number", "phone", "whatsapp number", "call",
    "number batao", "gym ka number", "helpline"
  ]}
];

function levenshtein(a, b) {
  const row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let prev = row[0];
    row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const old = row[j];
      row[j] = Math.min(
        row[j] + 1,
        row[j - 1] + 1,
        prev + (a[i - 1] === b[j - 1] ? 0 : 1)
      );
      prev = old;
    }
  }
  return row[b.length];
}

function fuzzyWordMatch(text, phrase) {
  const words = text.split(" ");
  const targets = phrase.split(" ");
  if (targets.length > words.length) return false;

  for (let i = 0; i <= words.length - targets.length; i++) {
    let matched = true;
    for (let j = 0; j < targets.length; j++) {
      const a = words[i + j], b = targets[j];
      if (a === b) continue;
      if (b.length < 5 || a.length < 5) {
        matched = false;
        break;
      }
      const maxDistance = b.length >= 8 ? 2 : 1;
      if (levenshtein(a, b) > maxDistance) {
        matched = false;
        break;
      }
    }
    if (matched) return true;
  }
  return false;
}

function createGymAIReply(message, profile, fallbackReply) {
  return Promise.resolve().then(() => {
    const data = profile && typeof profile === "object" ? profile : {};
    const text = normalize(message);
    const original = String(message || "").trim();

    const fallback = () => typeof fallbackReply === "function"
      ? fallbackReply(original, data)
      : "Maaf kijiye, sawaal clear nahi hua. Kripya spelling check karke dobara bhejein.";

    if (!text) return fallback();

    if (/^(hi|hii+|hello|hey|hlo|helo|namaste|namaskar|नमस्ते|हेलो)$/.test(text)) {
      return typeof data.greeting === "string" && data.greeting.trim()
        ? data.greeting.trim().slice(0, 1000)
        : "Namaste! Aapko gym ki kis information ki zaroorat hai?";
    }

    // Specific fee-plan questions are matched before the general fee question.
    let matched = null;
    for (const intent of INTENTS) {
      if (intent.words.some(w => {
        const phrase = normalize(w);
        return text.includes(phrase) || fuzzyWordMatch(text, phrase);
      })) {
        matched = intent;
        break;
      }
    }

    const gymName = validValue("q1", data.q1) ? data.q1.trim() : "gym";
    const missing = label =>
      `Maaf kijiye, ${label} ki information dashboard mein saved nahi hai ya clear nahi hai. Kripya gym se directly confirm kar lein.`;

    if (matched) {
      const value = data[matched.key];
      if (!validValue(matched.key, value)) return missing(matched.label.toLowerCase());
      return `${matched.label}: ${String(value).trim()}`;
    }

    // General fee question: use only real, saved amounts.
    if (/\b(fee|fees|membership|price|pricing|charges|cost|kitna|kitni|rate|amount|फीस|कितना|कितनी)\b/.test(text)) {
      const plans = [
        ["Monthly", "q5"], ["3-month", "q6"],
        ["6-month", "q7"], ["Annual", "q8"]
      ];
      const available = plans
        .filter(([, key]) => validValue(key, data[key]))
        .map(([label, key]) => `${label}: ${String(data[key]).trim()}`);
      return available.length
        ? `${gymName} ki dashboard mein saved membership fees:\n${available.join("\n")}`
        : missing("membership fees");
    }

    // No guessed facts: unknown questions ask for clarification.
    return "Maaf kijiye, aapka sawaal clearly samajh nahi aaya. Kripya spelling check karke dobara bhejein, ya gym se directly confirm kar lein.";
  });
}

module.exports = { createGymAIReply };