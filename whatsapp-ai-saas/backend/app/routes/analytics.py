from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timedelta
from ..models.models import WhatsAppMessage, Business
from ..core.database import get_db

router = APIRouter(prefix="/api/v1/analytics", tags=["analytics"])

@router.get("/messages")
async def get_message_analytics(business_id: str, days: int = 30, db: Session = Depends(get_db)):
    """Get message analytics for business"""
    business = db.query(Business).filter(Business.id == business_id).first()
    if not business:
        raise HTTPException(status_code=404, detail="Business not found")
    
    start_date = datetime.utcnow() - timedelta(days=days)
    
    messages = db.query(WhatsAppMessage).filter(
        WhatsAppMessage.business_id == business_id,
        WhatsAppMessage.created_at >= start_date
    ).all()
    
    total_messages = len(messages)
    replied_messages = len([m for m in messages if m.is_replied])
    
    avg_response_time = 0
    response_times = [m.response_time_ms for m in messages if m.response_time_ms]
    if response_times:
        avg_response_time = sum(response_times) / len(response_times)
    
    return {
        "business_id": business_id,
        "period_days": days,
        "total_messages": total_messages,
        "replied_messages": replied_messages,
        "success_rate": (replied_messages / total_messages * 100) if total_messages > 0 else 0,
        "avg_response_time_ms": round(avg_response_time, 2),
        "messages_today": len([m for m in messages if m.created_at.date() == datetime.utcnow().date()]),
        "unique_customers": len(set([m.customer_phone for m in messages]))
    }

@router.get("/message-history")
async def get_message_history(business_id: str, limit: int = 50, db: Session = Depends(get_db)):
    """Get recent message history"""
    business = db.query(Business).filter(Business.id == business_id).first()
    if not business:
        raise HTTPException(status_code=404, detail="Business not found")
    
    messages = db.query(WhatsAppMessage).filter(
        WhatsAppMessage.business_id == business_id
    ).order_by(WhatsAppMessage.created_at.desc()).limit(limit).all()
    
    return {
        "business_id": business_id,
        "total_messages": len(messages),
        "messages": [
            {
                "id": m.id,
                "customer_phone": m.customer_phone,
                "customer_name": m.customer_name,
                "message": m.message_text,
                "response": m.ai_response,
                "is_replied": m.is_replied,
                "created_at": m.created_at.isoformat()
            }
            for m in messages
        ]
    }
