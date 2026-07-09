from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from typing import List, Optional
from ..database import get_db
from .. import schemas, crud

router = APIRouter(prefix="/seats", tags=["seats"])

@router.get("", response_model=List[schemas.Seat])
def read_seats(
    floor: Optional[int] = Query(None, ge=1, le=5, description="Filter seats by floor (1-5)"),
    status: Optional[str] = Query(None, description="Filter seats by status (vacant, occupied)"),
    db: Session = Depends(get_db)
):
    return crud.get_seats(db=db, floor=floor, status=status)

@router.post("/allocate", response_model=schemas.Seat)
def allocate_employee_seat(payload: schemas.SeatAllocateRequest, db: Session = Depends(get_db)):
    success, message = crud.allocate_seat(db=db, employee_id=payload.employee_id, seat_id=payload.seat_id)
    if not success:
        raise HTTPException(status_code=400, detail=message)
        
    seat = crud.get_seat(db, payload.seat_id)
    # Enrich response
    return schemas.Seat(
        id=seat.id,
        floor=seat.floor,
        seat_number=seat.seat_number,
        status=seat.status,
        employee_id=seat.employee_id,
        employee_name=seat.employee.name if seat.employee else None,
        employee_code=seat.employee.employee_code if seat.employee else None
    )

@router.post("/release", response_model=schemas.Seat)
def release_employee_seat(payload: schemas.SeatReleaseRequest, db: Session = Depends(get_db)):
    seat = crud.get_seat(db, payload.seat_id)
    if not seat:
        raise HTTPException(status_code=404, detail="Seat not found")
        
    success, message = crud.release_seat(db=db, seat_id=payload.seat_id)
    if not success:
        raise HTTPException(status_code=400, detail=message)
        
    # Re-fetch seat
    db.refresh(seat)
    return schemas.Seat(
        id=seat.id,
        floor=seat.floor,
        seat_number=seat.seat_number,
        status=seat.status,
        employee_id=None,
        employee_name=None,
        employee_code=None
    )

@router.post("/change", response_model=schemas.Seat)
def change_employee_seat(payload: schemas.SeatChangeRequest, db: Session = Depends(get_db)):
    # Verify employee exists
    employee = crud.get_employee(db, payload.employee_id)
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
        
    new_seat = crud.get_seat(db, payload.new_seat_id)
    if not new_seat:
        raise HTTPException(status_code=404, detail="New seat not found")
        
    if new_seat.status == "occupied" and new_seat.employee_id != payload.employee_id:
        raise HTTPException(status_code=400, detail="New seat is already occupied")

    # Change is handled by crud.update_employee when seat_id updates
    crud.update_employee(db, payload.employee_id, schemas.EmployeeUpdate(seat_id=payload.new_seat_id))
    
    db.refresh(new_seat)
    return schemas.Seat(
        id=new_seat.id,
        floor=new_seat.floor,
        seat_number=new_seat.seat_number,
        status=new_seat.status,
        employee_id=new_seat.employee_id,
        employee_name=new_seat.employee.name if new_seat.employee else None,
        employee_code=new_seat.employee.employee_code if new_seat.employee else None
    )

@router.post("/auto-allocate")
def auto_allocate(payload: schemas.AutoAllocateRequest, db: Session = Depends(get_db)):
    success, message, seat = crud.auto_allocate_seat(db=db, employee_id=payload.employee_id)
    if not success:
        raise HTTPException(status_code=400, detail=message)
        
    return {
        "success": True,
        "message": message,
        "seat": {
            "id": seat.id,
            "floor": seat.floor,
            "seat_number": seat.seat_number,
            "status": seat.status
        } if seat else None
    }

@router.get("/history", response_model=List[schemas.AllocationHistory])
def read_allocation_history(
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db)
):
    return crud.get_allocation_history(db=db, limit=limit)
