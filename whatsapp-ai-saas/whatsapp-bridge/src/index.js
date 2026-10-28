const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const axios = require('axios');

const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: { args: ['--no-sandbox', '--disable-setuid-sandbox'] }
});

client.on('qr', (qr) => {
    console.log('\n=========================================================');
    console.log('SCAN THIS QR CODE IN GYM OWNER WHATSAPP APP TO CONNECT:');
    console.log('=========================================================\n');
    qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
    console.log('✅ Jervis Flow AI WhatsApp Bridge successfully connected!');
});

client.on('message', async (msg) => {
    if (msg.from.endsWith('@g.us')) return;
    try {
        console.log(`📩 Customer Query: ${msg.body}`);
        const res = await axios.get('http://localhost:8000/api/kb');
        const kb = res.data;
        let responseText = "Dhanyawad humse sampark karne ke liye! Gym ki details:\n\n";
        responseText += `🏋️ Fees: ${kb.fees}\n⏰ Timings: ${kb.timings}\n🎁 Trial: ${kb.trial}\n💳 Subscription: ${kb.subscription}`;
        await msg.reply(responseText);
        console.log('🤖 Instant AI Auto-Reply Sent!');
    } catch (err) {
        console.error('Error replying:', err.message);
    }
});

client.initialize();
