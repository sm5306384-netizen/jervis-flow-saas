from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.schemas import UserCreate, UserLogin
from app.models import User
from app.core.database import get_db
from app.utils.jwt_utils import create_access_token
import uuid
from bcrypt import hashpw, gensalt, checkpw

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])

@router.post("/signup")
def signup(user: UserCreate, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.phone == user.phone).first()
    if existing:
        raise HTTPException(status_code=400, detail="User already exists")
    
    hashed_pwd = hashpw(user.password.encode(), gensalt())
    new_user = User(id=str(uuid.uuid4()), phone=user.phone, password=hashed_pwd.decode(), email=user.email)
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

@router.post("/login")
def login(user: UserLogin, db: Session = Depends(get_db)):
    db_user = db.query(User).filter(User.phone == user.phone).first()
    if not db_user or not checkpw(user.password.encode(), db_user.password.encode()):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = create_access_token({"sub": db_user.id, "phone": db_user.phone})
    return {"access_token": token, "token_type": "bearer", "user": {"id": db_user.id, "phone": db_user.phone, "email": db_user.email}}
