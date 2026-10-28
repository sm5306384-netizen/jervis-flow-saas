const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const axios = require('axios');
const fs = require('fs');

const ownerEmail = process.argv[2];

if (!ownerEmail) {
    console.error('[X] Error: Owner email not provided to bot.js!');
    process.exit(1);
}

// Sanitize email to create a valid clientId (replace @ and . with underscores)
const sanitizedClientId = ownerEmail.replace(/[^a-zA-Z0-9_-]/g, '_');

console.log(`[Bot] Initializing WhatsApp Client for owner: ${ownerEmail} (ClientID: ${sanitizedClientId})`);

const possiblePaths = [
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    process.env.LOCALAPPDATA + "\\Google\\Chrome\\Application\\chrome.exe"
];

let chromePath = possiblePaths.find(p => fs.existsSync(p));

const puppeteerConfig = {
    headless: true,
    args: [
        '--no-sandbox', 
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu'
    ]
};

if (chromePath) {
    puppeteerConfig.executablePath = chromePath;
}

const client = new Client({
    authStrategy: new LocalAuth({ clientId: sanitizedClientId }),
    puppeteer: puppeteerConfig
});

client.on('qr', async (qr) => {
    console.log(`[✔] QR Code received for ${ownerEmail}!`);
    try {
        const qrImage = await qrcode.toDataURL(qr);
        await axios.post('http://127.0.0.1:8000/api/set-qr', { 
            email: ownerEmail, 
            qr_image: qrImage 
        });
        console.log(`[✔] QR Code sent to dashboard for ${ownerEmail}!`);
    } catch (err) {
        console.error('[X] Failed to send QR to backend:', err.message);
    }
});

client.on('ready', () => {
    console.log(`[✔] WhatsApp Client ready and connected for ${ownerEmail}!`);
});

client.on('message', async (msg) => {
    console.log(`[Webhook] Message received for ${ownerEmail} from ${msg.from}: ${msg.body}`);
    try {
        const response = await axios.post('http://127.0.0.1:8000/api/whatsapp-webhook', {
            owner_email: ownerEmail,
            sender_phone: msg.from,
            message_text: msg.body
        });
        if (response.data && response.data.ai_auto_reply) {
            await msg.reply(response.data.ai_auto_reply);
        }
    } catch (err) {
        console.error('[X] Webhook communication error:', err.message);
    }
});

client.initialize().catch(err => {
    console.error(`[X] Failed to initialize client for ${ownerEmail}:`, err);
});
