from fastapi import FastAPI, Request, Response, Form, HTTPException, Cookie
from fastapi.responses import HTMLResponse, RedirectResponse
from pydantic import BaseModel
import sqlite3
import datetime
import uvicorn
import subprocess
import os

app = FastAPI()

DB_FILE = "gym_users.db"
bot_processes = {}
user_qrs = {}

def init_db():
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            created_at TEXT NOT NULL,
            subscription_active INTEGER DEFAULT 0,
            subscription_end TEXT
        )
    """)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS gym_settings (
            email TEXT PRIMARY KEY,
            gym_name TEXT,
            q1_timings TEXT,
            q2_monthly_fee TEXT,
            q3_discounts TEXT,
            q4_joining_fee TEXT,
            q5_payment_modes TEXT,
            q6_couple_offer TEXT,
            q7_pt_available TEXT,
            q8_pt_charges TEXT,
            q9_diet_plan TEXT,
            q10_free_trial TEXT,
            q11_location TEXT,
            q12_equipments TEXT,
            q13_women_safety TEXT,
            q14_lockers_shower TEXT,
            q15_steam_bath TEXT,
            q16_documents TEXT,
            q17_membership_freeze TEXT,
            q18_sunday_open TEXT,
            q19_contact TEXT,
            q20_offers TEXT,
            custom_message TEXT
        )
    """)
    conn.commit()
    conn.close()

init_db()

def get_user_settings(email: str):
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM gym_settings WHERE email = ?", (email,))
    row = cursor.fetchone()
    if not row:
        default_settings = {
            "gym_name": "Jervis Fitness & Gym Hub",
            "q1_timings": "Morning 5:00 AM to 11:00 AM, Evening 4:00 PM to 10:00 PM.",
            "q2_monthly_fee": "Monthly membership fee is ₹1,500.",
            "q3_discounts": "Quarterly: ₹4,000 (Save ₹500), Yearly: ₹12,000 (Save ₹6,000).",
            "q4_joining_fee": "No extra joining or registration fee!",
            "q5_payment_modes": "We accept UPI, Cash, Credit/Debit Cards, and Net Banking.",
            "q6_couple_offer": "Couple Membership available at ₹2,500/month.",
            "q7_pt_available": "Yes, Personal Trainers (PT) are available.",
            "q8_pt_charges": "Personal Training charges are ₹3,000/month extra.",
            "q9_diet_plan": "Yes, custom diet plans (weight loss/muscle gain) are included with PT.",
            "q10_free_trial": "Yes, 1-day free trial session is available!",
            "q11_location": "Main Square, Near Central Mall, Indore.",
            "q12_equipments": "Imported Cardio, Heavy Strength, Functional Training & Dumbbells up to 50kg.",
            "q13_women_safety": "Female trainers available and CCTV monitored safe environment.",
            "q14_lockers_shower": "Yes, clean changing rooms, private lockers, and hot showers are available.",
            "q15_steam_bath": "Yes, Steam Bath facility is available twice a week.",
            "q16_documents": "1 Govt Photo ID Proof (Aadhaar/Driving License) and 1 Passport Photo.",
            "q17_membership_freeze": "Yes, membership freeze is allowed up to 15 days for valid reasons.",
            "q18_sunday_open": "Yes, Sunday open from 7:00 AM to 12:00 PM.",
            "q19_contact": "Official Contact: +91 9876543210 / Support Email: info@jervisgym.com",
            "q20_offers": "Current Offer: Get 1 Month Free on 6-Month Membership!",
            "custom_message": "Welcome to Jervis Fitness & Gym Hub! How can I assist you today? 💪"
        }
        cursor.execute("""
            INSERT INTO gym_settings VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
        """, (email, default_settings["gym_name"], default_settings["q1_timings"], default_settings["q2_monthly_fee"],
              default_settings["q3_discounts"], default_settings["q4_joining_fee"], default_settings["q5_payment_modes"],
              default_settings["q6_couple_offer"], default_settings["q7_pt_available"], default_settings["q8_pt_charges"],
              default_settings["q9_diet_plan"], default_settings["q10_free_trial"], default_settings["q11_location"],
              default_settings["q12_equipments"], default_settings["q13_women_safety"], default_settings["q14_lockers_shower"],
              default_settings["q15_steam_bath"], default_settings["q16_documents"], default_settings["q17_membership_freeze"],
              default_settings["q18_sunday_open"], default_settings["q19_contact"], default_settings["q20_offers"], default_settings["custom_message"]))
        conn.commit()
        conn.close()
        return default_settings
    else:
        columns = [description[0] for description in cursor.description]
        conn.close()
        return dict(zip(columns, row))

@app.get("/signup", response_class=HTMLResponse)
async def signup_page(session_user: str = Cookie(None)):
    if session_user:
        return RedirectResponse(url="/", status_code=303)
    return """
    <html>
        <head><title>Jervis Flow AI - Signup</title></head>
        <body style="font-family: Arial; max-width: 400px; margin: 80px auto; padding: 20px; background: #f4f7f6;">
            <div style="background: white; padding: 25px; border-radius: 8px; box-shadow: 0 4px 8px rgba(0,0,0,0.1);">
                <h2>Create Gym Owner Account (7 Days Free Trial)</h2>
                <form action="/signup" method="POST">
                    <label><b>Email:</b></label><br>
                    <input type="email" name="email" required style="width:100%; padding:8px; margin:6px 0 15px 0;"><br>
                    <label><b>Password:</b></label><br>
                    <input type="password" name="password" required style="width:100%; padding:8px; margin:6px 0 20px 0;"><br>
                    <button type="submit" style="background:#28a745; color:white; border:none; width:100%; padding:10px; font-weight:bold; cursor:pointer; border-radius:4px;">Sign Up & Start Free Trial</button>
                </form>
                <p style="text-align:center; margin-top:15px;">Already have an account? <a href="/login">Login here</a></p>
            </div>
        </body>
    </html>
    """

@app.post("/signup")
async def signup_action(response: Response, email: str = Form(...), password: str = Form(...)):
    now = datetime.datetime.now().isoformat()
    try:
        conn = sqlite3.connect(DB_FILE)
        cursor = conn.cursor()
        cursor.execute("INSERT INTO users (email, password, created_at, subscription_active) VALUES (?, ?, ?, 0)", (email, password, now))
        conn.commit()
        conn.close()
        get_user_settings(email)
    except sqlite3.IntegrityError:
        return HTMLResponse("<h3>Email already registered! <a href='/login'>Login here</a></h3>")
    
    response = RedirectResponse(url="/", status_code=303)
    response.set_cookie(key="session_user", value=email, max_age=31536000)
    return response

@app.get("/login", response_class=HTMLResponse)
async def login_page(session_user: str = Cookie(None)):
    if session_user:
        return RedirectResponse(url="/", status_code=303)
    return """
    <html>
        <head><title>Jervis Flow AI - Login</title></head>
        <body style="font-family: Arial; max-width: 400px; margin: 80px auto; padding: 20px; background: #f4f7f6;">
            <div style="background: white; padding: 25px; border-radius: 8px; box-shadow: 0 4px 8px rgba(0,0,0,0.1);">
                <h2>Owner Login</h2>
                <form action="/login" method="POST">
                    <label><b>Email:</b></label><br>
                    <input type="email" name="email" required style="width:100%; padding:8px; margin:6px 0 15px 0;"><br>
                    <label><b>Password:</b></label><br>
                    <input type="password" name="password" required style="width:100%; padding:8px; margin:6px 0 20px 0;"><br>
                    <button type="submit" style="background:#007bff; color:white; border:none; width:100%; padding:10px; font-weight:bold; cursor:pointer; border-radius:4px;">Login</button>
                </form>
                <p style="text-align:center; margin-top:15px;">Don't have an account? <a href="/signup">Sign up here</a></p>
            </div>
        </body>
    </html>
    """

@app.post("/login")
async def login_action(response: Response, email: str = Form(...), password: str = Form(...)):
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM users WHERE email = ? AND password = ?", (email, password))
    user = cursor.fetchone()
    conn.close()

    if not user:
        return HTMLResponse("<h3>Invalid email or password! <a href='/login'>Try again</a></h3>")
    
    response = RedirectResponse(url="/", status_code=303)
    response.set_cookie(key="session_user", value=email, max_age=31536000)
    return response

@app.get("/logout")
async def logout(response: Response):
    response = RedirectResponse(url="/login", status_code=303)
    response.delete_cookie(key="session_user")
    return response

@app.post("/api/verify-payment")
async def verify_payment(session_user: str = Cookie(None)):
    if not session_user:
        raise HTTPException(status_code=401, detail="Unauthorized")
    
    end_date = (datetime.datetime.now() + datetime.timedelta(days=30)).isoformat()
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute("UPDATE users SET subscription_active = 1, subscription_end = ? WHERE email = ?", (end_date, session_user))
    conn.commit()
    conn.close()
    
    return {"status": "success", "message": "Payment verified and subscription activated!"}

@app.post("/api/start-bot")
async def start_bot(session_user: str = Cookie(None)):
    global bot_processes
    if not session_user:
        raise HTTPException(status_code=401, detail="Unauthorized")
    
    proc = bot_processes.get(session_user)
    if proc is None or proc.poll() is not None:
        try:
            bot_processes[session_user] = subprocess.Popen(["node", "bot.js", session_user], stdout=subprocess.PIPE, stderr=subprocess.PIPE)
            print(f"[✔] Node.js bot process spawned for user: {session_user}")
        except Exception as e:
            return {"status": "error", "message": str(e)}
            
    return {"status": "success", "message": "Bot process triggered!"}

@app.get("/", response_class=HTMLResponse)
async def dashboard(session_user: str = Cookie(None)):
    if not session_user:
        return RedirectResponse(url="/signup", status_code=303)
    
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute("SELECT created_at, subscription_active, subscription_end FROM users WHERE email = ?", (session_user,))
    user_data = cursor.fetchone()
    conn.close()

    if not user_data:
        return RedirectResponse(url="/logout", status_code=303)

    created_at_str, sub_active, sub_end_str = user_data
    created_at = datetime.datetime.fromisoformat(created_at_str)
    now = datetime.datetime.now()
    
    trial_days_passed = (now - created_at).days
    trial_remaining = max(0, 7 - trial_days_passed)
    is_trial_active = trial_remaining > 0

    sub_status_text = "Inactive"
    sub_badge_color = "#dc3545"
    if sub_active == 1 and sub_end_str:
        sub_end = datetime.datetime.fromisoformat(sub_end_str)
        if now < sub_end:
            sub_status_text = f"Active (Expires on {sub_end.strftime('%d %b %Y')})"
            sub_badge_color = "#28a745"

    ai_status_badge = "<span style='color:green; font-weight:bold;'>🟢 AI Bot Active</span>" if (is_trial_active or sub_active == 1) else "<span style='color:red; font-weight:bold;'>🔴 AI Bot Stopped (Trial/Subscription Ended)</span>"

    s = get_user_settings(session_user)
    return f"""
    <html>
        <head>
            <title>Jervis Flow AI - Dashboard</title>
        </head>
        <body style="font-family: Arial; max-width: 800px; margin: 20px auto; padding: 20px; background: #f4f7f6;">
            <div style="background: white; padding: 25px; border-radius: 8px; box-shadow: 0 4px 8px rgba(0,0,0,0.1);">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <h2>Jervis Flow AI - Control Panel</h2>
                    <a href="/logout" style="background: #dc3545; color: white; padding: 8px 15px; text-decoration: none; border-radius: 4px; font-weight: bold;">Logout</a>
                </div>
                <p style="color: #666;">Logged in as: <b>{session_user}</b> | Status: {ai_status_badge}</p>
                <hr>

                <div style="background: #e9ecef; padding: 15px; border-radius: 6px; margin-bottom: 20px;">
                    <h3>Subscription & Trial Details</h3>
                    <p><b>Free Trial Status:</b> {f"Active ({trial_remaining} Days Remaining)" if is_trial_active else "Expired"}</p>
                    <p><b>Subscription Status (₹999/month):</b> <span style="color:{sub_badge_color}; font-weight:bold;">{sub_status_text}</span></p>
                    {"<button onclick='paySubscription()' style='background:#ffc107; color:black; border:none; padding:10px 20px; font-weight:bold; cursor:pointer; border-radius:4px;'>Pay ₹999 & Activate AI</button>" if not sub_active else ""}
                </div>

                <div style="text-align: center; background: #e9ecef; padding: 20px; border-radius: 6px; margin-bottom: 25px;">
                    <h3>WhatsApp Bot Status</h3>
                    <button onclick="loadQRCode()" style="background: #007bff; color: white; border: none; padding: 12px 25px; font-size: 16px; font-weight: bold; cursor: pointer; border-radius: 4px;">Connect WhatsApp (Auto Launch)</button>
                    
                    <div id="qr-section" style="display: none; margin-top: 15px;">
                        <p style="color: #333; font-weight: bold;">Scan this QR code with your WhatsApp:</p>
                        <img id="qr-img" src="" alt="Loading QR Code..." style="width: 220px; height: 220px; border: 2px solid #ccc; background: white; padding: 5px;" />
                        <p id="conn-status" style="color: green; font-weight: bold; margin-top: 5px;"></p>
                    </div>
                </div>
                
                <h3>Owner Response Setup (Fill All 20 Answers Below)</h3>
                <form id="settings-form" onsubmit="saveSettings(event)">
                    <p><b>Gym Name:</b> <input type="text" id="gym_name" value="{s['gym_name']}" style="width:100%; padding:6px; margin:4px 0 10px 0;"></p>
                    
                    <p><b>Q1. Timings (Open/Close):</b> <input type="text" id="q1_timings" value="{s['q1_timings']}" style="width:100%; padding:6px; margin:4px 0 10px 0;"></p>
                    <p><b>Q2. Monthly Membership Fee:</b> <input type="text" id="q2_monthly_fee" value="{s['q2_monthly_fee']}" style="width:100%; padding:6px; margin:4px 0 10px 0;"></p>
                    <p><b>Q3. Long term Discounts (Quarterly/Yearly):</b> <input type="text" id="q3_discounts" value="{s['q3_discounts']}" style="width:100%; padding:6px; margin:4px 0 10px 0;"></p>
                    <p><b>Q4. Joining / Admission Fee:</b> <input type="text" id="q4_joining_fee" value="{s['q4_joining_fee']}" style="width:100%; padding:6px; margin:4px 0 10px 0;"></p>
                    <p><b>Q5. Payment Modes Allowed:</b> <input type="text" id="q5_payment_modes" value="{s['q5_payment_modes']}" style="width:100%; padding:6px; margin:4px 0 10px 0;"></p>
                    <p><b>Q6. Couple / Family Discount:</b> <input type="text" id="q6_couple_offer" value="{s['q6_couple_offer']}" style="width:100%; padding:6px; margin:4px 0 10px 0;"></p>
                    <p><b>Q7. Personal Trainer (PT) Available:</b> <input type="text" id="q7_pt_available" value="{s['q7_pt_available']}" style="width:100%; padding:6px; margin:4px 0 10px 0;"></p>
                    <p><b>Q8. Personal Trainer Charges:</b> <input type="text" id="q8_pt_charges" value="{s['q8_pt_charges']}" style="width:100%; padding:6px; margin:4px 0 10px 0;"></p>
                    <p><b>Q9. Diet Plan Included:</b> <input type="text" id="q9_diet_plan" value="{s['q9_diet_plan']}" style="width:100%; padding:6px; margin:4px 0 10px 0;"></p>
                    <p><b>Q10. Free Trial Class / Demo:</b> <input type="text" id="q10_free_trial" value="{s['q10_free_trial']}" style="width:100%; padding:6px; margin:4px 0 10px 0;"></p>
                    <p><b>Q11. Exact Location / Address:</b> <input type="text" id="q11_location" value="{s['q11_location']}" style="width:100%; padding:6px; margin:4px 0 10px 0;"></p>
                    <p><b>Q12. Available Equipments:</b> <input type="text" id="q12_equipments" value="{s['q12_equipments']}" style="width:100%; padding:6px; margin:4px 0 10px 0;"></p>
                    <p><b>Q13. Women Safety & Female Trainers:</b> <input type="text" id="q13_women_safety" value="{s['q13_women_safety']}" style="width:100%; padding:6px; margin:4px 0 10px 0;"></p>
                    <p><b>Q14. Lockers & Shower Facility:</b> <input type="text" id="q14_lockers_shower" value="{s['q14_lockers_shower']}" style="width:100%; padding:6px; margin:4px 0 10px 0;"></p>
                    <p><b>Q15. Steam Bath / Sauna Facility:</b> <input type="text" id="q15_steam_bath" value="{s['q15_steam_bath']}" style="width:100%; padding:6px; margin:4px 0 10px 0;"></p>
                    <p><b>Q16. Documents Required:</b> <input type="text" id="q16_documents" value="{s['q16_documents']}" style="width:100%; padding:6px; margin:4px 0 10px 0;"></p>
                    <p><b>Q17. Membership Freeze Policy:</b> <input type="text" id="q17_membership_freeze" value="{s['q17_membership_freeze']}" style="width:100%; padding:6px; margin:4px 0 10px 0;"></p>
                    <p><b>Q18. Sunday / Holiday Opening Status:</b> <input type="text" id="q18_sunday_open" value="{s['q18_sunday_open']}" style="width:100%; padding:6px; margin:4px 0 10px 0;"></p>
                    <p><b>Q19. Helpline / Contact Number:</b> <input type="text" id="q19_contact" value="{s['q19_contact']}" style="width:100%; padding:6px; margin:4px 0 10px 0;"></p>
                    <p><b>Q20. Current Running Offers:</b> <input type="text" id="q20_offers" value="{s['q20_offers']}" style="width:100%; padding:6px; margin:4px 0 10px 0;"></p>
                    
                    <p><b>Default Greeting / Custom Welcome:</b><br>
                    <textarea id="custom_message" rows="2" style="width:100%; padding:6px; margin:4px 0 15px 0;">{s['custom_message']}</textarea></p>
                    
                    <button type="submit" style="background:#28a745; color:white; border:none; padding:12px 25px; cursor:pointer; border-radius:4px; font-weight:bold;">Save All 20 Answers</button>
                </form>
                <p id="status-msg" style="color:green; font-weight:bold; margin-top:10px;"></p>
            </div>
            <script>
                async function loadQRCode() {{
                    let qrSec = document.getElementById('qr-section');
                    let statusEl = document.getElementById('conn-status');
                    let imgEl = document.getElementById('qr-img');
                    
                    qrSec.style.display = 'block';
                    statusEl.innerText = 'Triggering Bot & Generating QR...';
                    
                    try {{
                        await fetch('/api/start-bot', {{ method: 'POST' }});
                        
                        setTimeout(async () => {{
                            let res = await fetch('/api/get-qr');
                            let data = await res.json();
                            if (data.qr_image) {{
                                imgEl.src = data.qr_image;
                                statusEl.innerText = 'Scan QR code below with WhatsApp!';
                            }} else {{
                                statusEl.innerText = 'Waiting for QR generation... Keep this open.';
                            }}
                        }}, 4000);
                    }} catch(e) {{
                        statusEl.innerText = 'Error starting bot process.';
                    }}
                }}

                async function paySubscription() {{
                    if(confirm("Proceed with payment simulation & activate AI instantly?")) {{
                        let res = await fetch('/api/verify-payment', {{ method: 'POST' }});
                        let data = await res.json();
                        if(data.status === 'success') {{
                            alert("Payment Successful! AI Bot Activated.");
                            location.reload();
                        }} else {{
                            alert("Payment failed.");
                        }}
                    }}
                }}

                setInterval(async () => {{
                    let qrSec = document.getElementById('qr-section');
                    if(qrSec && qrSec.style.display === 'block') {{
                        try {{
                            let res = await fetch('/api/get-qr');
                            let data = await res.json();
                            if (data.qr_image) {{
                                document.getElementById('qr-img').src = data.qr_image;
                                document.getElementById('conn-status').innerText = 'Scan QR code below with WhatsApp!';
                            }}
                        }} catch(e) {{}}
                    }}
                }}, 3000);

                async function saveSettings(event) {{
                    event.preventDefault();
                    let fields = ['gym_name','q1_timings','q2_monthly_fee','q3_discounts','q4_joining_fee','q5_payment_modes','q6_couple_offer','q7_pt_available','q8_pt_charges','q9_diet_plan','q10_free_trial','q11_location','q12_equipments','q13_women_safety','q14_lockers_shower','q15_steam_bath','q16_documents','q17_membership_freeze','q18_sunday_open','q19_contact','q20_offers','custom_message'];
                    let payload = {{}};
                    fields.forEach(f => payload[f] = document.getElementById(f).value);

                    let res = await fetch('/api/save-settings', {{
                        method: 'POST',
                        headers: {{ 'Content-Type': 'application/json' }},
                        body: JSON.stringify(payload)
                    }});
                    let data = await res.json();
                    if(data.status === 'success') {{
                        document.getElementById('status-msg').innerText = 'All 20 Answers Saved Successfully!';
                        setTimeout(() => document.getElementById('status-msg').innerText = '', 3000);
                    }}
                }}
            </script>
        </body>
    </html>
    """

class QRRequest(BaseModel):
    email: str
    qr_image: str

class SettingsRequest(BaseModel):
    gym_name: str = None
    q1_timings: str = None
    q2_monthly_fee: str = None
    q3_discounts: str = None
    q4_joining_fee: str = None
    q5_payment_modes: str = None
    q6_couple_offer: str = None
    q7_pt_available: str = None
    q8_pt_charges: str = None
    q9_diet_page: str = None
    q9_diet_plan: str = None
    q10_free_trial: str = None
    q11_location: str = None
    q12_equipments: str = None
    q13_women_safety: str = None
    q14_lockers_shower: str = None
    q15_steam_bath: str = None
    q16_documents: str = None
    q17_membership_freeze: str = None
    q18_sunday_open: str = None
    q19_contact: str = None
    q20_offers: str = None
    custom_message: str = None

class WebhookRequest(BaseModel):
    owner_email: str
    sender_phone: str
    message_text: str

@app.post("/api/set-qr")
async def set_qr(data: QRRequest):
    global user_qrs
    user_qrs[data.email] = data.qr_image
    return {"status": "success"}

@app.get("/api/get-qr")
async def get_qr(session_user: str = Cookie(None)):
    global user_qrs
    if not session_user:
        return {"qr_image": None}
    return {"qr_image": user_qrs.get(session_user)}

@app.post("/api/save-settings")
async def save_settings(data: SettingsRequest, session_user: str = Cookie(None)):
    if not session_user:
        raise HTTPException(status_code=401, detail="Unauthorized")
    
    current_settings = get_user_settings(session_user)
    updated_data = data.dict(exclude_unset=True)
    
    for key, val in updated_data.items():
        if val is not None:
            current_settings[key] = val
            
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute("""
        UPDATE gym_settings SET 
            gym_name=?, q1_timings=?, q2_monthly_fee=?, q3_discounts=?, q4_joining_fee=?, 
            q5_payment_modes=?, q6_couple_offer=?, q7_pt_available=?, q8_pt_charges=?, q9_diet_plan=?, 
            q10_free_trial=?, q11_location=?, q12_equipments=?, q13_women_safety=?, q14_lockers_shower=?, 
            q15_steam_bath=?, q16_documents=?, q17_membership_freeze=?, q18_sunday_open=?, q19_contact=?, 
            q20_offers=?, custom_message=?
        WHERE email=?
    """, (
        current_settings["gym_name"], current_settings["q1_timings"], current_settings["q2_monthly_fee"],
        current_settings["q3_discounts"], current_settings["q4_joining_fee"], current_settings["q5_payment_modes"],
        current_settings["q6_couple_offer"], current_settings["q7_pt_available"], current_settings["q8_pt_charges"],
        current_settings["q9_diet_plan"], current_settings["q10_free_trial"], current_settings["q11_location"],
        current_settings["q12_equipments"], current_settings["q13_women_safety"], current_settings["q14_lockers_shower"],
        current_settings["q15_steam_bath"], current_settings["q16_documents"], current_settings["q17_membership_freeze"],
        current_settings["q18_sunday_open"], current_settings["q19_contact"], current_settings["q20_offers"],
        current_settings["custom_message"], session_user
    ))
    conn.commit()
    conn.close()
    return {"status": "success", "saved": current_settings}

@app.get("/api/get-settings")
async def get_settings(session_user: str = Cookie(None)):
    if not session_user:
        raise HTTPException(status_code=401, detail="Unauthorized")
    return get_user_settings(session_user)

@app.post("/api/whatsapp-webhook")
async def whatsapp_webhook(data: WebhookRequest):
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute("SELECT created_at, subscription_active, subscription_end FROM users WHERE email = ?", (data.owner_email,))
    user_data = cursor.fetchone()
    conn.close()

    if not user_data:
        return {"ai_auto_reply": "⚠️ Jervis Flow AI: Owner account not found."}

    created_at_str, sub_active, sub_end_str = user_data
    created_at = datetime.datetime.fromisoformat(created_at_str)
    now = datetime.datetime.now()
    trial_days_passed = (now - created_at).days
    
    bot_allowed = False
    if trial_days_passed < 7:
        bot_allowed = True
    elif sub_active == 1 and sub_end_str:
        sub_end = datetime.datetime.fromisoformat(sub_end_str)
        if now < sub_end:
            bot_allowed = True

    if not bot_allowed:
        return {"ai_auto_reply": "⚠️ Jervis Flow AI: Trial or subscription expired. Please renew on dashboard."}

    s = get_user_settings(data.owner_email)
    t = data.message_text.strip().lower()
    
    if t in ["hlo", "hi", "hello", "hey", "start", "menu"]:
        reply = s['custom_message']
    elif any(k in t for k in ["time", "timing", "open", "close", "samay", "kab"]):
        reply = f"🕒 Gym Timings ({s['gym_name']}):\n{s['q1_timings']}"
    elif any(k in t for k in ["monthly", "per month", "mahina", "fees", "price"]):
        reply = f"💰 Monthly Fee:\n{s['q2_monthly_fee']}"
    elif any(k in t for k in ["discount", "quarterly", "yearly", "annual", "package"]):
        reply = f"🏷️ Long Term Discounts:\n{s['q3_discounts']}"
    elif any(k in t for k in ["joining", "admission", "registration"]):
        reply = f"📋 Joining Fee:\n{s['q4_joining_fee']}"
    elif any(k in t for k in ["pay", "upi", "card", "cash", "payment"]):
        reply = f"💳 Payment Options:\n{s['q5_payment_modes']}"
    elif any(k in t for k in ["couple", "group", "family"]):
        reply = f"👥 Couple/Family Offer:\n{s['q6_couple_offer']}"
    elif any(k in t for k in ["pt", "personal trainer", "trainer"]):
        reply = f"🏋️‍♂️ Trainer Availability:\n{s['q7_pt_available']}\n\n{s['q8_pt_charges']}"
    elif any(k in t for k in ["diet", "food", "weight loss", "fat loss", "muscle"]):
        reply = f"🥗 Diet Plan:\n{s['q9_diet_plan']}"
    elif any(k in t for k in ["trial", "demo", "free session"]):
        reply = f"🎯 Free Trial:\n{s['q10_free_trial']}"
    elif any(k in t for k in ["address", "location", "kahan", "where", "pata", "map"]):
        reply = f"📍 Location:\n{s['q11_location']}"
    elif any(k in t for k in ["equipment", "machine", "dumbbells"]):
        reply = f"🏋️ Equipments:\n{s['q12_equipments']}"
    elif any(k in t for k in ["girl", "women", "female", "lady", "safety"]):
        reply = f"👩 Women Safety & Staff:\n{s['q13_women_safety']}"
    elif any(k in t for k in ["locker", "shower", "changing room"]):
        reply = f"🚿 Lockers & Showers:\n{s['q14_lockers_shower']}"
    elif any(k in t for k in ["steam", "sauna"]):
        reply = f"♨️ Steam Bath:\n{s['q15_steam_bath']}"
    elif any(k in t for k in ["document", "id", "proof", "aadhaar"]):
        reply = f"📄 Required Documents:\n{s['q16_documents']}"
    elif any(k in t for k in ["freeze", "pause", "leave", "transfer"]):
        reply = f"⏸️ Freeze Policy:\n{s['q17_membership_freeze']}"
    elif any(k in t for k in ["sunday", "holiday"]):
        reply = f"🗓️ Sunday Status:\n{s['q18_sunday_open']}"
    elif any(k in t for k in ["contact", "phone", "number", "call", "helpline"]):
        reply = f"📞 Contact Us:\n{s['q19_contact']}"
    elif any(k in t for k in ["offer", "scheme", "deal"]):
        reply = f"🎁 Special Offer:\n{s['q20_offers']}"
    else:
        reply = f"Sorry, yeh baat {s['gym_name']} ke dashboard mein save nahi hai."

    return {"ai_auto_reply": reply}

if __name__ == "__main__":
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
