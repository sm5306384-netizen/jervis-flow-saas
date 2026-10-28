from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean, JSON, Float
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime
import uuid

Base = declarative_base()

class User(Base):
    __tablename__ = "users"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    phone = Column(String(20), nullable=False, unique=True, index=True)
    password = Column(String(255), nullable=False)
    email = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class Business(Base):
    __tablename__ = "businesses"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, nullable=False, index=True)
    business_name = Column(String(255), nullable=False)
    owner_phone = Column(String(20), nullable=False, unique=True)
    owner_email = Column(String(255), nullable=False)
    business_category = Column(String(100), nullable=False)
    business_location = Column(String(255), nullable=False)
    opening_time = Column(String(10), nullable=True)
    closing_time = Column(String(10), nullable=True)
    business_description = Column(Text, nullable=True)
    pricing_info = Column(JSON, nullable=True)
    faqs = Column(JSON, nullable=True)
    gym_faqs = Column(JSON, nullable=True)
    whatsapp_number = Column(String(20), nullable=True, unique=True)
    is_whatsapp_connected = Column(Boolean, default=False)
    system_prompt = Column(Text, nullable=True)
    api_key = Column(String(255), nullable=False, unique=True)
    subscription_status = Column(String(50), default="trial")
    trial_start_date = Column(DateTime, nullable=True)
    trial_end_date = Column(DateTime, nullable=True)
    subscription_start_date = Column(DateTime, nullable=True)
    subscription_end_date = Column(DateTime, nullable=True)
    payment_status = Column(String(50), default="pending")
    razorpay_customer_id = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class Subscription(Base):
    __tablename__ = "subscriptions"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    business_id = Column(String, nullable=False, unique=True, index=True)
    plan_type = Column(String(50), default="trial")
    price = Column(Float, default=999.0)
    start_date = Column(DateTime, default=datetime.utcnow)
    end_date = Column(DateTime, nullable=False)
    auto_renewal = Column(Boolean, default=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class Payment(Base):
    __tablename__ = "payments"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    business_id = Column(String, nullable=False, index=True)
    amount = Column(Float, nullable=False)
    razorpay_payment_id = Column(String(255), unique=True)
    razorpay_order_id = Column(String(255), unique=True)
    status = Column(String(50), default="pending")
    currency = Column(String(10), default="INR")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class WhatsAppMessage(Base):
    __tablename__ = "whatsapp_messages"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    business_id = Column(String, nullable=False, index=True)
    customer_phone = Column(String(20), nullable=False)
    customer_name = Column(String(255), nullable=True)
    message_text = Column(Text, nullable=False)
    ai_response = Column(Text, nullable=True)
    response_time_ms = Column(Integer, nullable=True)
    is_replied = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
