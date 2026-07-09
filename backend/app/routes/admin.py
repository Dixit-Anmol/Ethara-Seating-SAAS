from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from ..database import get_db
from ..seed import seed_database

router = APIRouter(prefix="/admin", tags=["admin"])

@router.post("/seed")
def seed(db: Session = Depends(get_db)):
    result = seed_database(db)
    return {"message": result}
