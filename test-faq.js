const gym = require('./gym-ai.js');
const profile = {
  "q1": "Shiva test fitness",
  "q2": "lucknow",
  "q3": "6 to 11",
  "q4": "500 rupees",
  "greeting": "welcome mr"
};

const tests = [
    {
        "input":  "hlo",
        "expected":  "greeting"
    },
    {
        "input":  "gym name",
        "expected":  "q1"
    },
    {
        "input":  "gym address",
        "expected":  "q2"
    },
    {
        "input":  "gym timing",
        "expected":  "q3"
    },
    {
        "input":  "gym time",
        "expected":  "q3"
    },
    {
        "input":  "gym tym",
        "expected":  "q3"
    },
    {
        "input":  "gym ka time kya hai",
        "expected":  "q3"
    },
    {
        "input":  "opening time",
        "expected":  "q3"
    },
    {
        "input":  "monthly fees",
        "expected":  "q4"
    },
    {
        "input":  "monthyly fees",
        "expected":  "q4"
    },
    {
        "input":  "fees kitni",
        "expected":  "q4"
    },
    {
        "input":  "ladies timing",
        "expected":  "q9"
    },
    {
        "input":  "trainer",
        "expected":  "q10"
    },
    {
        "input":  "diet plan",
        "expected":  "q11"
    },
    {
        "input":  "weight loss",
        "expected":  "q12"
    },
    {
        "input":  "muscle gain",
        "expected":  "q13"
    },
    {
        "input":  "age limit",
        "expected":  "q15"
    },
    {
        "input":  "hello",
        "expected":  "greeting"
    },
    {
        "input":  "unknown question xyz",
        "expected":  "fallback"
    }
];
let passed = 0, failed = 0;

tests.forEach(test => {
  const reply = gym.createGymAIReply(test.input, profile);
  const isPass = (test.expected === 'greeting' && reply.includes('welcome')) ||
                 (test.expected === 'q1' && reply.includes('Shiva test fitness')) ||
                 (test.expected === 'q2' && reply.includes('lucknow')) ||
                 (test.expected === 'q3' && reply.includes('6 to 11')) ||
                 (test.expected === 'q4' && reply.includes('500')) ||
                 (test.expected === 'fallback' && reply.includes('samajh nahi aaya'));
  
  console.log(\[\] Input: "\" => \...\);
  if (isPass) passed++; else failed++;
});

console.log(\\nResults: \ PASS, \ FAIL\);
process.exit(failed === 0 ? 0 : 1);
