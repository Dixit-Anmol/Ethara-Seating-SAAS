from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy import func, or_, and_, desc, asc
from . import models, schemas

# --- EMPLOYEE CRUD ---
def get_employee(db: Session, employee_id: int):
    return db.query(models.Employee).filter(models.Employee.id == employee_id).first()

def get_employee_by_code(db: Session, employee_code: str):
    return db.query(models.Employee).filter(models.Employee.employee_code == employee_code).first()

def get_employees(
    db: Session,
    page: int = 1,
    size: int = 10,
    search: str = "",
    department: str = "",
    project_id: int = None,
    status: str = "",
    sort_by: str = "id",
    sort_order: str = "asc"
):
    query = db.query(models.Employee)

    # Join with relationships to enable searching on project name and seat details
    query = query.outerjoin(models.Project, models.Employee.project_id == models.Project.id)\
                 .outerjoin(models.Seat, models.Employee.seat_id == models.Seat.id)

    # Filtering
    filters = []
    if search:
        search_term = f"%{search}%"
        filters.append(or_(
            models.Employee.name.like(search_term),
            models.Employee.employee_code.like(search_term),
            models.Employee.email.like(search_term),
            models.Employee.designation.like(search_term),
            models.Employee.department.like(search_term),
            models.Project.name.like(search_term),
            models.Seat.seat_number.like(search_term)
        ))
    
    if department:
        query = query.filter(models.Employee.department == department)
    if project_id is not None:
        query = query.filter(models.Employee.project_id == project_id)
    if status:
        query = query.filter(models.Employee.status == status)

    if filters:
        query = query.filter(and_(*filters))

    # Sorting
    order_col = None
    if sort_by == "name":
        order_col = models.Employee.name
    elif sort_by == "employee_code":
        order_col = models.Employee.employee_code
    elif sort_by == "department":
        order_col = models.Employee.department
    elif sort_by == "designation":
        order_col = models.Employee.designation
    elif sort_by == "status":
        order_col = models.Employee.status
    elif sort_by == "joining_date":
        order_col = models.Employee.joining_date
    elif sort_by == "project_name":
        order_col = models.Project.name
    elif sort_by == "seat_number":
        order_col = models.Seat.seat_number
    else:
        order_col = models.Employee.id

    if sort_order == "desc":
        query = query.order_by(desc(order_col))
    else:
        query = query.order_by(asc(order_col))

    # Pagination calculation
    total = query.count()
    pages = (total + size - 1) // size if total > 0 else 0
    offset = (page - 1) * size
    
    items = query.offset(offset).limit(size).all()

    # Map details to pydantic compatible schema
    mapped_items = []
    for emp in items:
        # Create a dictionary of values and enrich it
        emp_dict = {c.name: getattr(emp, c.name) for c in emp.__table__.columns}
        emp_dict["project_name"] = emp.project.name if emp.project else None
        emp_dict["seat_number"] = emp.seat.seat_number if emp.seat else None
        emp_dict["seat_floor"] = emp.seat.floor if emp.seat else None
        mapped_items.append(schemas.Employee(**emp_dict))

    return {
        "items": mapped_items,
        "total": total,
        "page": page,
        "size": size,
        "pages": pages
    }

def create_employee(db: Session, employee: schemas.EmployeeCreate):
    db_employee = models.Employee(**employee.model_dump())
    db.add(db_employee)
    db.commit()
    db.refresh(db_employee)
    return db_employee

def update_employee(db: Session, employee_id: int, employee: schemas.EmployeeUpdate):
    db_employee = get_employee(db, employee_id)
    if not db_employee:
        return None
    
    update_data = employee.model_dump(exclude_unset=True)
    
    # Handle seat change explicitly to ensure bidirectional relationship integrity
    if "seat_id" in update_data and update_data["seat_id"] != db_employee.seat_id:
        new_seat_id = update_data["seat_id"]
        
        # 1. Release current seat if employee has one
        if db_employee.seat_id:
            old_seat = db.query(models.Seat).filter(models.Seat.id == db_employee.seat_id).first()
            if old_seat:
                old_seat.employee_id = None
                old_seat.status = "vacant"
                # Mark history as released
                history = db.query(models.AllocationHistory).filter(
                    models.AllocationHistory.employee_id == employee_id,
                    models.AllocationHistory.seat_id == old_seat.id,
                    models.AllocationHistory.released_at == None
                ).first()
                if history:
                    history.released_at = datetime.now()

        # 2. Allocate new seat
        if new_seat_id:
            new_seat = db.query(models.Seat).filter(models.Seat.id == new_seat_id).first()
            if new_seat:
                # Release anyone currently on the new seat
                if new_seat.employee_id and new_seat.employee_id != employee_id:
                    other_emp = db.query(models.Employee).filter(models.Employee.id == new_seat.employee_id).first()
                    if other_emp:
                        other_emp.seat_id = None
                    history = db.query(models.AllocationHistory).filter(
                        models.AllocationHistory.employee_id == new_seat.employee_id,
                        models.AllocationHistory.seat_id == new_seat.id,
                        models.AllocationHistory.released_at == None
                    ).first()
                    if history:
                        history.released_at = datetime.now()

                new_seat.employee_id = employee_id
                new_seat.status = "occupied"
                
                # Add to history
                history_entry = models.AllocationHistory(employee_id=employee_id, seat_id=new_seat_id)
                db.add(history_entry)

    # Apply other fields
    for key, value in update_data.items():
        setattr(db_employee, key, value)
        
    db.commit()
    db.refresh(db_employee)
    return db_employee

def delete_employee(db: Session, employee_id: int):
    db_employee = get_employee(db, employee_id)
    if not db_employee:
        return None
    
    # Release seat if assigned
    if db_employee.seat_id:
        seat = db.query(models.Seat).filter(models.Seat.id == db_employee.seat_id).first()
        if seat:
            seat.employee_id = None
            seat.status = "vacant"
            
        history = db.query(models.AllocationHistory).filter(
            models.AllocationHistory.employee_id == employee_id,
            models.AllocationHistory.seat_id == db_employee.seat_id,
            models.AllocationHistory.released_at == None
        ).first()
        if history:
            history.released_at = datetime.now()
            
    db.delete(db_employee)
    db.commit()
    return db_employee


# --- PROJECT CRUD ---
def get_project(db: Session, project_id: int):
    return db.query(models.Project).filter(models.Project.id == project_id).first()

def get_projects(
    db: Session,
    page: int = 1,
    size: int = 10,
    search: str = "",
    department: str = "",
    sort_by: str = "id",
    sort_order: str = "asc"
):
    query = db.query(models.Project)
    
    if search:
        query = query.filter(or_(
            models.Project.name.like(f"%{search}%"),
            models.Project.manager.like(f"%{search}%"),
            models.Project.department.like(f"%{search}%")
        ))
        
    if department:
        query = query.filter(models.Project.department == department)

    # Sort mapping
    order_col = models.Project.id
    if sort_by == "name":
        order_col = models.Project.name
    elif sort_by == "manager":
        order_col = models.Project.manager
    elif sort_by == "department":
        order_col = models.Project.department
    elif sort_by == "capacity":
        order_col = models.Project.capacity

    if sort_order == "desc":
        query = query.order_by(desc(order_col))
    else:
        query = query.order_by(asc(order_col))

    total = query.count()
    pages = (total + size - 1) // size if total > 0 else 0
    offset = (page - 1) * size
    items = query.offset(offset).limit(size).all()

    # Map projects to return schema with current employee counts
    mapped_items = []
    for proj in items:
        # Count employees on this project
        emp_count = db.query(models.Employee).filter(models.Employee.project_id == proj.id).count()
        proj_schema = schemas.Project(
            id=proj.id,
            name=proj.name,
            manager=proj.manager,
            department=proj.department,
            capacity=proj.capacity,
            current_employees_count=emp_count
        )
        mapped_items.append(proj_schema)

    return {
        "items": mapped_items,
        "total": total,
        "page": page,
        "size": size,
        "pages": pages
    }

def create_project(db: Session, project: schemas.ProjectCreate):
    db_project = models.Project(**project.model_dump())
    db.add(db_project)
    db.commit()
    db.refresh(db_project)
    return db_project

def update_project(db: Session, project_id: int, project: schemas.ProjectUpdate):
    db_project = get_project(db, project_id)
    if not db_project:
        return None
    for key, value in project.model_dump(exclude_unset=True).items():
        setattr(db_project, key, value)
    db.commit()
    db.refresh(db_project)
    return db_project

def delete_project(db: Session, project_id: int):
    db_project = get_project(db, project_id)
    if not db_project:
        return None
    # Set project_id to Null for employees under this project
    db.query(models.Employee).filter(models.Employee.project_id == project_id).update({
        models.Employee.project_id: None
    })
    db.delete(db_project)
    db.commit()
    return db_project


# --- SEAT CRUD & ALLOCATION ENGINE ---
def get_seat(db: Session, seat_id: int):
    return db.query(models.Seat).filter(models.Seat.id == seat_id).first()

def get_seat_by_number(db: Session, seat_number: str):
    return db.query(models.Seat).filter(models.Seat.seat_number == seat_number).first()

def get_seats(db: Session, floor: int = None, status: str = ""):
    query = db.query(models.Seat).outerjoin(models.Employee, models.Seat.employee_id == models.Employee.id)
    if floor:
        query = query.filter(models.Seat.floor == floor)
    if status:
        query = query.filter(models.Seat.status == status)
        
    seats = query.order_by(models.Seat.seat_number).all()
    
    mapped_seats = []
    for s in seats:
        mapped_seats.append(schemas.Seat(
            id=s.id,
            floor=s.floor,
            seat_number=s.seat_number,
            status=s.status,
            employee_id=s.employee_id,
            employee_name=s.employee.name if s.employee else None,
            employee_code=s.employee.employee_code if s.employee else None
        ))
    return mapped_seats

def allocate_seat(db: Session, employee_id: int, seat_id: int):
    employee = db.query(models.Employee).filter(models.Employee.id == employee_id).first()
    seat = db.query(models.Seat).filter(models.Seat.id == seat_id).first()
    
    if not employee or not seat:
        return False, "Employee or Seat not found"
        
    if seat.status == "occupied" and seat.employee_id != employee_id:
        return False, f"Seat {seat.seat_number} is already occupied by another employee"

    # If the employee currently has another seat, release it first
    if employee.seat_id and employee.seat_id != seat_id:
        release_seat(db, employee.seat_id)

    # Establish connection
    employee.seat_id = seat_id
    seat.employee_id = employee_id
    seat.status = "occupied"
    
    # Save allocation history
    history = models.AllocationHistory(employee_id=employee_id, seat_id=seat_id)
    db.add(history)
    
    db.commit()
    db.refresh(employee)
    db.refresh(seat)
    return True, "Seat allocated successfully"

def release_seat(db: Session, seat_id: int):
    seat = db.query(models.Seat).filter(models.Seat.id == seat_id).first()
    if not seat:
        return False, "Seat not found"
        
    employee_id = seat.employee_id
    if not employee_id:
        return True, "Seat is already vacant"

    # Disconnect Employee
    employee = db.query(models.Employee).filter(models.Employee.id == employee_id).first()
    if employee:
        employee.seat_id = None
        
    seat.employee_id = None
    seat.status = "vacant"
    
    # Update allocation history
    history = db.query(models.AllocationHistory).filter(
        models.AllocationHistory.employee_id == employee_id,
        models.AllocationHistory.seat_id == seat_id,
        models.AllocationHistory.released_at == None
    ).first()
    if history:
        history.released_at = datetime.now()
        
    db.commit()
    return True, "Seat released successfully"

def get_allocation_history(db: Session, limit: int = 100):
    histories = db.query(models.AllocationHistory)\
                  .outerjoin(models.Employee, models.AllocationHistory.employee_id == models.Employee.id)\
                  .outerjoin(models.Seat, models.AllocationHistory.seat_id == models.Seat.id)\
                  .order_by(desc(models.AllocationHistory.allocated_at))\
                  .limit(limit).all()
                  
    mapped = []
    for h in histories:
        mapped.append(schemas.AllocationHistory(
            id=h.id,
            employee_id=h.employee_id,
            seat_id=h.seat_id,
            allocated_at=h.allocated_at,
            released_at=h.released_at,
            employee_name=h.employee.name if h.employee else "Unknown",
            employee_code=h.employee.employee_code if h.employee else "Unknown",
            seat_number=h.seat.seat_number if h.seat else "Unknown"
        ))
    return mapped


# --- AUTO ALLOCATION ENGINE ---
def auto_allocate_seat(db: Session, employee_id: int):
    """
    Finds the nearest available seat for an employee.
    Clustering Strategy:
    1. If the employee has a project, find other employees in the same project with seats.
       Identify the floor with the highest count of team members. Try to find a vacant seat on that floor first.
    2. If no project seats exist, find the floor with the highest count of employees from the same department.
       Try to find a vacant seat on that floor.
    3. If there is still no match (or no space on preferred floor), find any vacant seat in the building
       starting from Floor 1 upwards, sorted by seat number.
    """
    employee = db.query(models.Employee).filter(models.Employee.id == employee_id).first()
    if not employee:
        return False, "Employee not found", None
        
    if employee.seat_id:
        seat = db.query(models.Seat).filter(models.Seat.id == employee.seat_id).first()
        return True, f"Employee already allocated to seat {seat.seat_number}", seat

    preferred_floor = None

    # Step 1: Cluster by Project
    if employee.project_id:
        team_seats = db.query(models.Seat.floor, func.count(models.Seat.floor).label('cnt'))\
                       .join(models.Employee, models.Seat.employee_id == models.Employee.id)\
                       .filter(models.Employee.project_id == employee.project_id)\
                       .group_by(models.Seat.floor)\
                       .order_by(desc('cnt'))\
                       .first()
        if team_seats:
            preferred_floor = team_seats[0]

    # Step 2: Cluster by Department (if no project match)
    if preferred_floor is None and employee.department:
        dept_seats = db.query(models.Seat.floor, func.count(models.Seat.floor).label('cnt'))\
                       .join(models.Employee, models.Seat.employee_id == models.Employee.id)\
                       .filter(models.Employee.department == employee.department)\
                       .group_by(models.Seat.floor)\
                       .order_by(desc('cnt'))\
                       .first()
        if dept_seats:
            preferred_floor = dept_seats[0]

    # Try to find a vacant seat on preferred floor
    allocated_seat = None
    if preferred_floor is not None:
        allocated_seat = db.query(models.Seat)\
                           .filter(models.Seat.status == "vacant", models.Seat.floor == preferred_floor)\
                           .order_by(models.Seat.seat_number)\
                           .first()

    # Step 3: Global fallback if no preferred floor seat is vacant
    if not allocated_seat:
        allocated_seat = db.query(models.Seat)\
                           .filter(models.Seat.status == "vacant")\
                           .order_by(models.Seat.floor, models.Seat.seat_number)\
                           .first()

    if not allocated_seat:
        return False, "No available seats in the office", None

    # Perform allocation
    success, msg = allocate_seat(db, employee.id, allocated_seat.id)
    if success:
        return True, f"Seat {allocated_seat.seat_number} on Floor {allocated_seat.floor} allocated automatically.", allocated_seat
    else:
        return False, msg, None
