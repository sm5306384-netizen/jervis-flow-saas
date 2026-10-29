const express = require("express");
const { Client, RemoteAuth } = require("whatsapp-web.js");
const { MongoStore } = require("wwebjs-mongo");
const mongoose = require("mongoose");
const qrcode = require("qrcode");

let qrCodeData = null;
let clientStatus = "DISCONNECTED";
let whatsappClient = null;

function initializeWhatsApp() {
    const mongoUri = process.env.MONGO_URI;

    if (!mongoUri) {
        console.error("[CRITICAL] MONGO_URI is not defined in environment variables!");
        return;
    }

    mongoose.connect(mongoUri).then(() => {
        console.log("[OK] Connected to MongoDB Atlas for WhatsApp RemoteAuth session.");

        const store = new MongoStore({ mongoose: mongoose });

        const puppeteerConfig = {
            headless: true,
            args: [
                "--no-sandbox",
                "--disable-setuid-sandbox",
                "--disable-dev-shm-usage",
                "--disable-accelerated-2d-canvas",
                "--no-first-run",
                "--no-zygote",
                "--single-process",
                "--disable-gpu"
            ]
        };

        // Use custom executablePath only if running on Render/Linux or specified
        if (process.env.RENDER || process.env.PUPPETEER_EXECUTABLE_PATH) {
            puppeteerConfig.executablePath = process.env.PUPPETEER_EXECUTABLE_PATH || "/usr/bin/chromium";
        }

        whatsappClient = new Client({
            authStrategy: new RemoteAuth({
                store: store,
                backupSyncIntervalMs: 300000
            }),
            puppeteer: puppeteerConfig
        });

        whatsappClient.on("qr", async (qr) => {
            console.log("QR Code received, generating data URL...");
            try {
                qrCodeData = await qrcode.toDataURL(qr);
                clientStatus = "QR_READY";
            } catch (err) {
                console.error("Failed to generate QR data URL:", err);
            }
        });

        whatsappClient.on("ready", () => {
            console.log("WhatsApp client is ready!");
            clientStatus = "CONNECTED";
            qrCodeData = null;
        });

        whatsappClient.on("authenticated", () => {
            console.log("WhatsApp client authenticated successfully.");
            clientStatus = "AUTHENTICATED";
        });

        whatsappClient.on("remote_session_saved", () => {
            console.log("WhatsApp session saved to MongoDB Atlas successfully!");
        });

        whatsappClient.on("auth_failure", (msg) => {
            console.error("WhatsApp authentication failure:", msg);
            clientStatus = "AUTH_FAILURE";
        });

        whatsappClient.on("disconnected", (reason) => {
            console.warn("WhatsApp client disconnected:", reason);
            clientStatus = "DISCONNECTED";
            qrCodeData = null;
            setTimeout(() => {
                try {
                    whatsappClient.initialize();
                } catch (e) {
                    console.error("Re-initialization error:", e);
                }
            }, 5000);
        });

        whatsappClient.initialize().catch(err => {
            console.error("Error initializing WhatsApp client:", err);
        });

    }).catch(err => {
        console.error("[CRITICAL] Failed to connect to MongoDB for session store:", err);
    });
}

module.exports = function () {
    const router = express.Router();

    if (!whatsappClient) {
        initializeWhatsApp();
    }

    router.get("/qr-status", (req, res) => {
        res.json({
            status: clientStatus,
            qr: qrCodeData
        });
    });

    return router;
};
