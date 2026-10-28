from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from app.models import Business, WhatsAppMessage
from app.core.database import get_db
from app.utils.ai_handler import get_ai_response
import time

router = APIRouter(prefix="/api/v1/whatsapp", tags=["whatsapp"])

@router.post("/message")
async def handle_whatsapp_message(request: Request, db: Session = Depends(get_db)):
    data = await request.json()
    from_number = data.get("from")
    message_text = data.get("message_text")
    message_id = data.get("message_id")
    business = db.query(Business).filter(Business.whatsapp_number == from_number).first()
    if not business:
        return {"error": "Business not found"}
    start_time = time.time()
    ai_response = await get_ai_response(message_text, {"business_name": business.business_name, "opening_time": business.opening_time, "closing_time": business.closing_time, "business_location": business.business_location, "pricing_info": business.pricing_info, "faqs": business.faqs, "system_prompt": business.system_prompt})
    response_time = int((time.time() - start_time) * 1000)
    message_record = WhatsAppMessage(id=message_id, business_id=business.id, customer_phone=data.get("from"), message_text=message_text, ai_response=ai_response, response_time_ms=response_time)
    db.add(message_record)
    db.commit()
    return {"reply": ai_response, "response_time_ms": response_time}

@router.post("/connect")
def connect_whatsapp(business_id: str, phone_number: str, db: Session = Depends(get_db)):
    business = db.query(Business).filter(Business.id == business_id).first()
    if not business:
        raise HTTPException(status_code=404, detail="Business not found")
    business.whatsapp_number = phone_number
    business.is_whatsapp_connected = True
    db.commit()
    return {"status": "connected", "phone": phone_number}

@router.get("/messages/{business_id}")
def get_messages(business_id: str, db: Session = Depends(get_db)):
    messages = db.query(WhatsAppMessage).filter(WhatsAppMessage.business_id == business_id).all()
    return messages
