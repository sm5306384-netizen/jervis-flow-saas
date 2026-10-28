from fastapi import APIRouter, HTTPException, Depends, Query
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
import os
import json
from ..models.models import Business, Subscription, Payment
from ..core.database import get_db
import razorpay

router = APIRouter(prefix="/api/v1/subscription", tags=["subscription"])

RAZORPAY_KEY = os.getenv("RAZORPAY_KEY_ID", "test_key")
RAZORPAY_SECRET = os.getenv("RAZORPAY_KEY_SECRET", "test_secret")
client = razorpay.Client(auth=(RAZORPAY_KEY, RAZORPAY_SECRET))

@router.post("/start-trial")
async def start_trial(business_id: str, db: Session = Depends(get_db)):
    """Start 7-day free trial"""
    business = db.query(Business).filter(Business.id == business_id).first()
    if not business:
        raise HTTPException(status_code=404, detail="Business not found")
    
    if business.subscription_status != "trial":
        raise HTTPException(status_code=400, detail="Trial already used")
    
    trial_end = datetime.utcnow() + timedelta(days=7)
    business.trial_start_date = datetime.utcnow()
    business.trial_end_date = trial_end
    business.subscription_status = "trial"
    
    subscription = Subscription(
        business_id=business_id,
        plan_type="trial",
        price=0.0,
        end_date=trial_end,
        is_active=True
    )
    
    db.add(subscription)
    db.commit()
    
    return {
        "status": "success",
        "trial_end_date": trial_end,
        "days_remaining": 7,
        "message": "7-day free trial started!"
    }

@router.post("/create-order")
async def create_order(business_id: str, plan: str = "basic", db: Session = Depends(get_db)):
    """Create Razorpay order for ₹999/month"""
    business = db.query(Business).filter(Business.id == business_id).first()
    if not business:
        raise HTTPException(status_code=404, detail="Business not found")
    
    amount = 99900  # ₹999 in paise
    
    order_data = {
        'amount': amount,
        'currency': 'INR',
        'receipt': f'order_{business_id}_{int(datetime.utcnow().timestamp())}',
        'payment_capture': 1
    }
    
    try:
        razorpay_order = client.order.create(data=order_data)
        
        payment = Payment(
            business_id=business_id,
            amount=999.0,
            razorpay_order_id=razorpay_order['id'],
            status="pending"
        )
        db.add(payment)
        db.commit()
        
        return {
            "order_id": razorpay_order['id'],
            "amount": 999,
            "currency": "INR",
            "key": RAZORPAY_KEY
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Payment order creation failed: {str(e)}")

@router.post("/verify-payment")
async def verify_payment(
    business_id: str,
    razorpay_order_id: str,
    razorpay_payment_id: str,
    razorpay_signature: str,
    db: Session = Depends(get_db)
):
    """Verify Razorpay payment signature"""
    try:
        # Verify signature
        verify_data = {
            'razorpay_order_id': razorpay_order_id,
            'razorpay_payment_id': razorpay_payment_id,
            'razorpay_signature': razorpay_signature
        }
        
        client.utility.verify_payment_signature(verify_data)
        
        # Update payment status
        payment = db.query(Payment).filter(Payment.razorpay_order_id == razorpay_order_id).first()
        if payment:
            payment.razorpay_payment_id = razorpay_payment_id
            payment.status = "success"
        
        # Update business subscription
        business = db.query(Business).filter(Business.id == business_id).first()
        if business:
            business.subscription_status = "active"
            business.payment_status = "success"
            business.subscription_start_date = datetime.utcnow()
            business.subscription_end_date = datetime.utcnow() + timedelta(days=30)
            
            subscription = db.query(Subscription).filter(Subscription.business_id == business_id).first()
            if subscription:
                subscription.plan_type = "basic"
                subscription.start_date = datetime.utcnow()
                subscription.end_date = datetime.utcnow() + timedelta(days=30)
                subscription.is_active = True
        
        db.commit()
        
        return {
            "status": "success",
            "message": "Payment verified! Subscription activated for 30 days",
            "subscription_end_date": business.subscription_end_date
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Payment verification failed: {str(e)}")

@router.get("/status")
async def get_subscription_status(business_id: str, db: Session = Depends(get_db)):
    """Get current subscription status"""
    business = db.query(Business).filter(Business.id == business_id).first()
    if not business:
        raise HTTPException(status_code=404, detail="Business not found")
    
    if business.subscription_status == "trial":
        days_left = (business.trial_end_date - datetime.utcnow()).days if business.trial_end_date else 0
    else:
        days_left = (business.subscription_end_date - datetime.utcnow()).days if business.subscription_end_date else 0
    
    return {
        "subscription_status": business.subscription_status,
        "payment_status": business.payment_status,
        "start_date": business.subscription_start_date or business.trial_start_date,
        "end_date": business.subscription_end_date or business.trial_end_date,
        "days_remaining": max(0, days_left),
        "plan": "trial" if business.subscription_status == "trial" else "basic"
    }
