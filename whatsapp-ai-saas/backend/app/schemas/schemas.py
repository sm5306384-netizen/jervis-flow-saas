from pydantic import BaseModel, EmailStr
from typing import Optional, List, Dict
from datetime import datetime

class UserCreate(BaseModel):
    phone: str
    password: str
    email: Optional[str] = None

class UserLogin(BaseModel):
    phone: str
    password: str

class UserResponse(BaseModel):
    id: str
    phone: str
    email: Optional[str]
    created_at: datetime
    class Config:
        from_attributes = True

class BusinessCreate(BaseModel):
    business_name: str
    owner_phone: str
    owner_email: str
    business_category: str
    business_location: str
    opening_time: Optional[str] = None
    closing_time: Optional[str] = None
    business_description: Optional[str] = None
    pricing_info: Optional[Dict] = None
    faqs: Optional[List[Dict]] = None

class BusinessResponse(BusinessCreate):
    id: str
    whatsapp_number: Optional[str]
    is_whatsapp_connected: bool
    api_key: str
    created_at: datetime
    class Config:
        from_attributes = True

class WhatsAppMessageResponse(BaseModel):
    customer_phone: str
    message_text: str
    ai_response: str
    response_time_ms: Optional[int]
    created_at: datetime
    class Config:
        from_attributes = True
