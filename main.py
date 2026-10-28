from fastapi import FastAPI, HTTPException
from fastapi.responses import HTMLResponse
from pydantic import BaseModel
import os
import uvicorn

app = FastAPI()

# In-memory mock database for multi-tenant gym owners & Q&A
gym_database = {}

class GymSignup(BaseModel):
    email: str
    gym_name: str
    answers: list[str]

class QRRequest(BaseModel):
    email: str
    qr_image: str

class WebhookRequest(BaseModel):
    owner_email: str
    sender_phone: str
    message_text: str

@app.get("/", response_class=HTMLResponse)
def home():
    return """
    <html>
        <head>
            <title>Jervis Flow AI - Multi-Tenant Dashboard</title>
            <style>
                body { font-family: Arial, sans-serif; background: #f4f7f6; padding: 50px; }
                .container { max-width: 600px; margin: auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0px 4px 10px rgba(0,0,0,0.1); }
                h2 { color: #333; }
                input, textarea { width: 100%%; padding: 10px; margin: 10px 0; border: 1px solid #ccc; border-radius: 5px; }
                button { background: #28a745; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer; font-size: 16px; }
                button:hover { background: #218838; }
                #qr-container { margin-top: 20px; text-align: center; }
            </style>
        </head>
        <body>
            <div class="container">
                <h2>🏋️‍♂️ Jervis Flow AI - Gym Owner Portal</h2>
                <p>Register your gym and connect your WhatsApp AI 24/7 autonomously.</p>
                <form id="signupForm">
                    <label>Email Address:</label>
                    <input type="email" id="email" required placeholder="owner@gym.com">
                    
                    <label>Gym Name:</label>
                    <input type="text" id="gym_name" required placeholder="PowerFit Gym">
                    
                    <label>Enter 20 AI Answers (comma separated):</label>
                    <textarea id="answers" rows="5" required placeholder="We open at 6 AM, Monthly fee is 1500, Located at Main Road..."></textarea>
                    
                    <button type="submit">Register & Connect WhatsApp</button>
                </form>
                
                <div id="qr-container"></div>
            </div>

            <script>
                document.getElementById('signupForm').addEventListener('submit', async (e) => {
                    e.preventDefault();
                    const email = document.getElementById('email').value;
                    const gym_name = document.getElementById('gym_name').value;
                    const answers = document.getElementById('answers').value.split(',');

                    const res = await fetch('/api/signup', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ email, gym_name, answers })
                    });
                    const data = await res.json();
                    alert(data.message);

                    // Trigger bot or fetch QR
                    pollQR(email);
                });

                async function pollQR(email) {
                    const container = document.getElementById('qr-container');
                    container.innerHTML = "<h3>Generating WhatsApp QR Code... Please wait.</h3>";
                    
                    // In real production, frontend polls /api/get-qr?email=...
                    let interval = setInterval(async () => {
                        const res = await fetch(`/api/get-qr?email=${email}`);
                        const data = await res.json();
                        if (data.qr_image) {
                            container.innerHTML = `<h3>Scan QR Code with WhatsApp:</h3><img src="${data.qr_image}" width="250">`;
                            clearInterval(interval);
                        }
                    }, 3000);
                }
            </script>
        </body>
    </html>
    """

@app.post("/api/signup")
def register_gym(data: GymSignup):
    gym_database[data.email] = {
        "gym_name": data.gym_name,
        "answers": data.answers,
        "qr_image": None
    }
    # Automatically trigger Node.js bot for this specific gym owner in background
    sanitized_email = data.email.replace(/[^a-zA-Z0-9_-]/g, '_')
    os.system(f"node bot.js {data.email} &")
    return {"status": "success", "message": f"Gym {data.gym_name} registered successfully! Generating WhatsApp session..."}

@app.post("/api/set-qr")
def set_qr(data: QRRequest):
    if data.email in gym_database:
        gym_database[data.email]["qr_image"] = data.qr_image
        return {"status": "success"}
    return {"status": "error", "message": "Owner not found"}

@app.get("/api/get-qr")
def get_qr(email: str):
    if email in gym_database:
        return {"qr_image": gym_database[email].get("qr_image")}
    return {"qr_image": None}

@app.post("/api/whatsapp-webhook")
def whatsapp_webhook(data: WebhookRequest):
    owner = gym_database.get(data.owner_email)
    if not owner:
        return {"ai_auto_reply": "Hello! Welcome to our gym. How can we help you today?"}
    
    # Simple AI match from owner's answers
    answers_text = "\n".join(owner["answers"])
    auto_reply = f"Thank you for contacting {owner['gym_name']}! Here is the info you requested:\n{answers_text[:200]}..."
    return {"ai_auto_reply": auto_reply}

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port)
