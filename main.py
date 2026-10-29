from fastapi import FastAPI, HTTPException
from fastapi.responses import HTMLResponse
from pydantic import BaseModel
import os
import re
import uvicorn

app = FastAPI()

# In-memory mock database for multi-tenant gym owners
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
            <title>Jervis Flow AI - Login / Signup</title>
            <style>
                body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #0f172a; color: #f8fafc; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; }
                .card { background: #1e293b; padding: 40px; border-radius: 12px; box-shadow: 0 10px 25px rgba(0,0,0,0.3); width: 100%%; max-width: 450px; }
                h2 { margin-bottom: 10px; color: #38bdf8; text-align: center; }
                p { text-align: center; color: #94a3b8; margin-bottom: 30px; font-size: 14px; }
                label { display: block; margin-bottom: 8px; font-weight: 600; font-size: 14px; }
                input, textarea { width: 100%%; padding: 12px; margin-bottom: 20px; background: #0f172a; border: 1px solid #334155; border-radius: 8px; color: white; font-size: 14px; box-sizing: border-box; }
                input:focus, textarea:focus { border-color: #38bdf8; outline: none; }
                button { width: 100%%; background: #38bdf8; color: #0f172a; border: none; padding: 12px; border-radius: 8px; cursor: pointer; font-size: 16px; font-weight: bold; transition: background 0.2s; }
                button:hover { background: #7dd3fc; }
            </style>
        </head>
        <body>
            <div class="card">
                <h2>🏋️‍♂️ Jervis Flow AI</h2>
                <p>Gym Owner Portal - Signup & Login</p>
                <form id="authForm">
                    <label>Email Address</label>
                    <input type="email" id="email" required placeholder="owner@gym.com">
                    
                    <label>Gym Name</label>
                    <input type="text" id="gym_name" required placeholder="PowerFit Gym">
                    
                    <label>AI Training Answers (Comma separated)</label>
                    <textarea id="answers" rows="3" required placeholder="Open 6am-10pm, Monthly fee 1500..."></textarea>
                    
                    <button type="submit">Access Dashboard</button>
                </form>
            </div>

            <script>
                document.getElementById('authForm').addEventListener('submit', async (e) => {
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
                    
                    if(data.status === 'success') {
                        // Redirect to professional dashboard with email param
                        window.location.href = `/dashboard?email=${encodeURIComponent(email)}`;
                    } else {
                        alert(data.message);
                    }
                });
            </script>
        </body>
    </html>
    """

@app.get("/dashboard", response_class=HTMLResponse)
def dashboard(email: str):
    return f"""
    <html>
        <head>
            <title>Jervis Flow AI - Dashboard</title>
            <style>
                body {{ font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #0f172a; color: #f8fafc; margin: 0; padding: 40px; }}
                .header {{ display: flex; justify-content: space-between; align-items: center; background: #1e293b; padding: 20px 30px; border-radius: 12px; margin-bottom: 30px; box-shadow: 0 4px 6px rgba(0,0,0,0.2); }}
                .main-grid {{ display: grid; grid-template-columns: 1fr 1fr; gap: 30px; }}
                .card {{ background: #1e293b; padding: 30px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.2); text-align: center; }}
                h2, h3 {{ color: #38bdf8; }}
                button {{ background: #22c55e; color: white; border: none; padding: 12px 24px; border-radius: 8px; cursor: pointer; font-size: 16px; font-weight: bold; margin-top: 15px; }}
                button:hover {{ background: #16a34a; }}
                .logout {{ background: #ef4444; }}
                .logout:hover {{ background: #dc2626; }}
                #qr-box {{ margin-top: 20px; }}
                img {{ border-radius: 8px; background: white; padding: 10px; }}
            </style>
        </head>
        <body>
            <div class="header">
                <h2>🚀 Jervis Flow AI Dashboard</h2>
                <div>
                    <span id="user-email" style="margin-right: 20px; color: #94a3b8;">Logged in as: <b>{email}</b></span>
                    <button class="logout" onclick="window.location.href='/'">Logout</button>
                </div>
            </div>

            <div class="main-grid">
                <div class="card">
                    <h3>📱 Connect WhatsApp</h3>
                    <p>Scan the QR code below using WhatsApp on your phone to activate 24/7 autonomous AI replies.</p>
                    <div id="qr-box">
                        <h3>Initializing session...</h3>
                    </div>
                </div>

                <div class="card" style="text-align: left;">
                    <h3>🤖 AI Training & Settings</h3>
                    <p>Your gym auto-reply configuration is active.</p>
                    <hr style="border-color: #334155; margin: 20px 0;">
                    <p><b>Status:</b> <span style="color: #22c55e;">Online & Ready</span></p>
                    <p><b>Auto-reply Engine:</b> Enabled (FastAPI + Puppeteer)</p>
                </div>
            </div>

            <script>
                const userEmail = "{email}";
                
                async function fetchQR() {{
                    try {{
                        const res = await fetch(`/api/get-qr?email=${{userEmail}}`);
                        const data = await res.json();
                        const box = document.getElementById('qr-box');
                        if (data.qr_image) {{
                            box.innerHTML = `<h4>Scan with WhatsApp:</h4><img src="${{data.qr_image}}" width="220">`;
                        }} else {{
                            box.innerHTML = `<h3>Generating QR Code... Please wait.</h3><p style="color:#94a3b8;">Make sure bot process is running.</p>`;
                        }}
                    }} catch(e) {{
                        console.error(e);
                    }}
                }}

                // Poll every 3 seconds for QR
                setInterval(fetchQR, 3000);
                fetchQR();
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
    sanitized_email = re.sub(r'[^a-zA-Z0-9_-]', '_', data.email)
    # Trigger Node.js bot in background
    os.system(f"node bot.js {data.email} &")
    return {"status": "success", "message": f"Gym {data.gym_name} registered successfully!"}

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
    
    answers_text = "\n".join(owner["answers"])
    auto_reply = f"Thank you for contacting {owner['gym_name']}! Here is the info:\n{answers_text[:200]}"
    return {"ai_auto_reply": auto_reply}

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port)
