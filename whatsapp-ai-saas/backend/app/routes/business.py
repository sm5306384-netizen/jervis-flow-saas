from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.schemas import BusinessCreate, BusinessResponse
from app.models import Business
from app.core.database import get_db
from app.utils.jwt_utils import verify_token
import uuid, secrets

router = APIRouter(prefix="/api/v1/business", tags=["business"])

@router.post("/create", response_model=BusinessResponse)
def create_business(business: BusinessCreate, token: str, db: Session = Depends(get_db)):
    payload = verify_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid token")
    user_id = payload.get("sub")
    new_business = Business(id=str(uuid.uuid4()), user_id=user_id, business_name=business.business_name, owner_phone=business.owner_phone, owner_email=business.owner_email, business_category=business.business_category, business_location=business.business_location, opening_time=business.opening_time, closing_time=business.closing_time, business_description=business.business_description, pricing_info=business.pricing_info, faqs=business.faqs, api_key=secrets.token_urlsafe(32))
    db.add(new_business)
    db.commit()
    db.refresh(new_business)
    return new_business

@router.get("/{business_id}", response_model=BusinessResponse)
def get_business(business_id: str, db: Session = Depends(get_db)):
    business = db.query(Business).filter(Business.id == business_id).first()
    if not business:
        raise HTTPException(status_code=404, detail="Business not found")
    return business

@router.put("/{business_id}", response_model=BusinessResponse)
def update_business(business_id: str, business: BusinessCreate, db: Session = Depends(get_db)):
    db_business = db.query(Business).filter(Business.id == business_id).first()
    if not db_business:
        raise HTTPException(status_code=404, detail="Business not found")
    db_business.business_name = business.business_name
    db_business.pricing_info = business.pricing_info
    db_business.faqs = business.faqs
    db_business.opening_time = business.opening_time
    db_business.closing_time = business.closing_time
    db.commit()
    db.refresh(db_business)
    return db_business
