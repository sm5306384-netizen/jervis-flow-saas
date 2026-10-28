from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
import requests
from app.utils.ai_handler import get_ai_response

app = FastAPI(title="Jervis Flow AI Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 🔑 Configured UltraMsg Credentials
ULTRAMSG_INSTANCE_ID = "195549"
ULTRAMSG_TOKEN = "hf7deaywox7dqbc2"

saved_business = {
    "business_name": "Iron Fitness Gym",
    "phone": "9580481626",
    "category": "Gym",
    "location": "Indore",
    "faqs": {}
}

@app.get("/")
def home():
    return {"status": "Jervis Flow AI Backend Running Successfully!"}

# 1. Fetch Dynamic QR Code from UltraMsg
@app.get("/api/whatsapp/qr")
def get_whatsapp_qr():
    url = f"https://api.ultramsg.com/{ULTRAMSG_INSTANCE_ID}/instance/qr"
    params = {"token": ULTRAMSG_TOKEN}
    try:
        res = requests.get(url, params=params)
        data = res.json()
        return {"status": "success", "qr_url": data.get("qr", "")}
    except Exception as e:
        return {"status": "error", "message": str(e)}

# 2. Save Business Config & FAQs
@app.post("/api/business/save")
async def save_business(request: Request):
    global saved_business
    data = await request.json()
    saved_business["business_name"] = data.get("business_name", "Iron Fitness Gym")
    saved_business["phone"] = data.get("phone", "9580481626")
    saved_business["category"] = data.get("category", "Gym")
    saved_business["location"] = data.get("location", "Indore")
    saved_business["faqs"] = data.get("faqs", {})
    
    print("✅ Dashboard FAQs updated in backend:", saved_business["faqs"])
    return {"status": "success", "message": "Saved successfully!"}

# 3. KB Endpoint
@app.get("/api/kb/{phone}")
def get_knowledge_base(phone: str):
    return {
        "status": "success",
        "phone": phone,
        "business_name": saved_business["business_name"],
        "faqs": saved_business["faqs"]
    }

# 4. Local Test Chat Endpoint
@app.post("/api/chat/test")
async def test_chat(request: Request):
    data = await request.json()
    msg = data.get("message", "")
    reply = get_ai_response(msg, saved_business["faqs"])
    return {"user_message": msg, "ai_reply": reply}

# 5. Outbound WhatsApp Reply via UltraMsg
def send_ultramsg_reply(to_phone: str, message_text: str):
    url = f"https://api.ultramsg.com/{ULTRAMSG_INSTANCE_ID}/messages/chat"
    payload = {
        "token": ULTRAMSG_TOKEN,
        "to": to_phone,
        "body": message_text
    }
    headers = {'content-type': 'application/x-www-form-urlencoded'}
    try:
        response = requests.post(url, data=payload, headers=headers)
        print("📲 UltraMsg Outbound Response:", response.json())
    except Exception as e:
        print("❌ Failed to send reply:", str(e))

# 6. UltraMsg Real Incoming Message Webhook (Updated & Robust)
@app.post("/api/webhook")
async def receive_ultramsg_webhook(request: Request):
    try:
        try:
            body = await request.json()
        except:
            form = await request.form()
            body = dict(form)
            
        print("📥 Raw Webhook Payload Received:", body)
        
        # Handle UltraMsg nested JSON structure
        msg_data = body.get("data", {})
        if isinstance(msg_data, dict):
            user_msg = msg_data.get("body", "")
            sender_phone = msg_data.get("from", "")
            from_me = msg_data.get("fromMe", False)
        else:
            user_msg = body.get("data[body]") or body.get("body", "")
            sender_phone = body.get("data[from]") or body.get("from", "")
            from_me = False

        # Ignore messages sent by self (fromMe)
        if from_me:
            return {"status": "ignored_self_message"}

        if user_msg and sender_phone:
            sender_phone = sender_phone.replace("@c.us", "").replace("@s.whatsapp.net", "")
            print(f"📩 Real WhatsApp Msg from {sender_phone}: '{user_msg}'")
            
            # AI Reply calculation from saved FAQs
            ai_reply = get_ai_response(user_msg, saved_business["faqs"])
            print(f"🤖 AI Generated Reply: '{ai_reply}'")
            
            # Send message back to WhatsApp
            send_ultramsg_reply(sender_phone, ai_reply)
            
            return {"status": "success", "reply": ai_reply}
        else:
            print("⚠️ Webhook received but message or sender was empty.")
    except Exception as e:
        print("❌ Webhook error:", str(e))
        
    return {"status": "received"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
