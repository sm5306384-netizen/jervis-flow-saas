from fastapi import APIRouter, HTTPException, Body
from pydantic import BaseModel
from app.utils.ai_handler import get_ai_response

router = APIRouter(prefix="/api/webhook", tags=["Webhook"])

class MessageRequest(BaseModel):
    phone: str
    message: str
    business_name: str = "Iron Fitness Gym"
    category: str = "Gym"
    location: str = "Indore"
    faqs: dict = {}

@router.post("/")
def handle_whatsapp_message(data: MessageRequest):
    try:
        # Construct business data dictionary from request
        b_data = {
            "business_name": data.business_name,
            "category": data.category,
            "location": data.location,
            "faqs": data.faqs
        }
        
        # Get AI response using the owner's configured knowledge base
        reply = get_ai_response(data.message, b_data)
        return {"status": "success", "reply": reply}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
