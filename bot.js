const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const axios = require('axios');

const emailArg = process.argv[2] || 'default_user';
const sanitizedEmail = emailArg.replace(/[^a-zA-Z0-9_-]/g, '_');

console.log(`Starting WhatsApp client for: ${emailArg} (Session: ${sanitizedEmail})`);

const client = new Client({
    authStrategy: new LocalAuth({ clientId: sanitizedEmail }),
    puppeteer: {
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--disable-gpu'
        ]
    }
});

client.on('qr', async (qr) => {
    console.log('QR Code received, converting to data URL...');
    try {
        const qrImage = await qrcode.toDataURL(qr);
        // Send QR to FastAPI backend
        await axios.post('http://127.0.0.1:8000/api/set-qr', {
            email: emailArg,
            qr_image: qrImage
        });
        console.log('QR Code sent to backend successfully!');
    } catch (err) {
        console.error('Failed to send QR to backend:', err.message);
    }
});

client.on('ready', () => {
    console.log(`WhatsApp client is ready for ${emailArg}!`);
});

client.on('message', async (msg) => {
    if (msg.fromMe) return;
    console.log(`Received message: ${msg.body}`);
    try {
        const res = await axios.post('http://127.0.0.1:8000/api/whatsapp-webhook', {
            owner_email: emailArg,
            sender_phone: msg.from,
            message_text: msg.body
        });
        if (res.data && res.data.ai_auto_reply) {
            await msg.reply(res.data.ai_auto_reply);
        }
    } catch (err) {
        console.error('Webhook error:', err.message);
    }
});

client.initialize();
