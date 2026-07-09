from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from typing import Optional
from ..database import get_db
from .. import schemas, crud

router = APIRouter(prefix="/employees", tags=["employees"])

@router.get("", response_model=schemas.PaginatedEmployees)
def read_employees(
    page: int = Query(1, ge=1),
    size: int = Query(10, ge=1, le=100),
    search: str = Query("", description="Search by Name, Code, Email, Department, Project, Seat, etc."),
    department: str = Query("", description="Filter by department"),
    project_id: Optional[int] = Query(None, description="Filter by project ID"),
    status: str = Query("", description="Filter by status (active, inactive, on_leave)"),
    sort_by: str = Query("id", description="Field to sort by (name, employee_code, department, designation, status, joining_date, project_name, seat_number)"),
    sort_order: str = Query("asc", pattern="^(asc|desc)$"),
    db: Session = Depends(get_db)
):
    return crud.get_employees(
        db=db,
        page=page,
        size=size,
        search=search,
        department=department,
        project_id=project_id,
        status=status,
        sort_by=sort_by,
        sort_order=sort_order
    )

@router.get("/{employee_id}", response_model=schemas.Employee)
def read_employee(employee_id: int, db: Session = Depends(get_db)):
    db_employee = crud.get_employee(db, employee_id=employee_id)
    if db_employee is None:
        raise HTTPException(status_code=404, detail="Employee not found")
        
    # Enrich the model for serialization
    emp_dict = {c.name: getattr(db_employee, c.name) for c in db_employee.__table__.columns}
    emp_dict["project_name"] = db_employee.project.name if db_employee.project else None
    emp_dict["seat_number"] = db_employee.seat.seat_number if db_employee.seat else None
    emp_dict["seat_floor"] = db_employee.seat.floor if db_employee.seat else None
    return schemas.Employee(**emp_dict)

@router.post("", response_model=schemas.Employee, status_code=status.HTTP_201_CREATED)
def create_employee(employee: schemas.EmployeeCreate, db: Session = Depends(get_db)):
    # Check if code already exists
    existing = crud.get_employee_by_code(db, employee_code=employee.employee_code)
    if existing:
        raise HTTPException(status_code=400, detail="Employee code already registered")
    
    db_employee = crud.create_employee(db=db, employee=employee)
    
    # Enrich response
    emp_dict = {c.name: getattr(db_employee, c.name) for c in db_employee.__table__.columns}
    emp_dict["project_name"] = db_employee.project.name if db_employee.project else None
    emp_dict["seat_number"] = db_employee.seat.seat_number if db_employee.seat else None
    emp_dict["seat_floor"] = db_employee.seat.floor if db_employee.seat else None
    return schemas.Employee(**emp_dict)

@router.put("/{employee_id}", response_model=schemas.Employee)
def update_employee(employee_id: int, employee: schemas.EmployeeUpdate, db: Session = Depends(get_db)):
    db_employee = crud.get_employee(db, employee_id)
    if db_employee is None:
        raise HTTPException(status_code=404, detail="Employee not found")
        
    updated = crud.update_employee(db=db, employee_id=employee_id, employee=employee)
    
    # Enrich response
    emp_dict = {c.name: getattr(updated, c.name) for c in updated.__table__.columns}
    emp_dict["project_name"] = updated.project.name if updated.project else None
    emp_dict["seat_number"] = updated.seat.seat_number if updated.seat else None
    emp_dict["seat_floor"] = updated.seat.floor if updated.seat else None
    return schemas.Employee(**emp_dict)

@router.delete("/{employee_id}", response_model=schemas.Employee)
def delete_employee(employee_id: int, db: Session = Depends(get_db)):
    db_employee = crud.get_employee(db, employee_id)
    if db_employee is None:
        raise HTTPException(status_code=404, detail="Employee not found")
        
    deleted = crud.delete_employee(db=db, employee_id=employee_id)
    
    # Enrich response
    emp_dict = {c.name: getattr(deleted, c.name) for c in deleted.__table__.columns}
    emp_dict["project_name"] = deleted.project.name if deleted.project else None
    emp_dict["seat_number"] = deleted.seat.seat_number if deleted.seat else None
    emp_dict["seat_floor"] = deleted.seat.floor if deleted.seat else None
    return schemas.Employee(**emp_dict)
