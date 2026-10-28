from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from ..models.models import Business
from ..core.database import get_db
import json

router = APIRouter(prefix="/api/v1/faq", tags=["faq"])

@router.post("/setup")
async def setup_gym_faqs(business_id: str, faqs: dict, db: Session = Depends(get_db)):
    """Owner fills in gym-related FAQs"""
    business = db.query(Business).filter(Business.id == business_id).first()
    if not business:
        raise HTTPException(status_code=404, detail="Business not found")
    
    if business.subscription_status not in ["trial", "active"]:
        raise HTTPException(status_code=403, detail="Subscription required")
    
    # Sample gym FAQs structure
    required_fields = [
        "opening_hours",
        "closing_hours",
        "membership_types",
        "pricing",
        "location",
        "contact_number",
        "classes_offered",
        "trainers_available",
        "facilities",
        "parking",
        "dress_code",
        "cancellation_policy"
    ]
    
    gym_faqs = {}
    for field in required_fields:
        if field in faqs:
            gym_faqs[field] = faqs[field]
    
    business.gym_faqs = gym_faqs
    db.commit()
    
    return {
        "status": "success",
        "message": "Gym FAQs saved successfully",
        "faqs_saved": list(gym_faqs.keys())
    }

@router.get("/get")
async def get_gym_faqs(business_id: str, db: Session = Depends(get_db)):
    """Get saved gym FAQs"""
    business = db.query(Business).filter(Business.id == business_id).first()
    if not business:
        raise HTTPException(status_code=404, detail="Business not found")
    
    return {
        "business_id": business_id,
        "gym_faqs": business.gym_faqs or {}
    }

@router.put("/update")
async def update_gym_faqs(business_id: str, faqs: dict, db: Session = Depends(get_db)):
    """Update gym FAQs"""
    business = db.query(Business).filter(Business.id == business_id).first()
    if not business:
        raise HTTPException(status_code=404, detail="Business not found")
    
    existing_faqs = business.gym_faqs or {}
    existing_faqs.update(faqs)
    business.gym_faqs = existing_faqs
    db.commit()
    
    return {
        "status": "success",
        "message": "Gym FAQs updated",
        "gym_faqs": business.gym_faqs
    }
