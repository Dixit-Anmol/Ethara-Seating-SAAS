from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from ..database import get_db
from .. import schemas, crud

router = APIRouter(prefix="/projects", tags=["projects"])

@router.get("", response_model=schemas.PaginatedProjects)
def read_projects(
    page: int = Query(1, ge=1),
    size: int = Query(10, ge=1, le=100),
    search: str = Query("", description="Search by Project Name, Manager, or Department"),
    department: str = Query("", description="Filter by department"),
    sort_by: str = Query("id", description="Sort by (name, manager, department, capacity)"),
    sort_order: str = Query("asc", pattern="^(asc|desc)$"),
    db: Session = Depends(get_db)
):
    return crud.get_projects(
        db=db,
        page=page,
        size=size,
        search=search,
        department=department,
        sort_by=sort_by,
        sort_order=sort_order
    )

@router.get("/{project_id}", response_model=schemas.Project)
def read_project(project_id: int, db: Session = Depends(get_db)):
    db_project = crud.get_project(db, project_id=project_id)
    if db_project is None:
        raise HTTPException(status_code=404, detail="Project not found")
        
    emp_count = crud.db.query(crud.models.Employee).filter(crud.models.Employee.project_id == project_id).count()
    return schemas.Project(
        id=db_project.id,
        name=db_project.name,
        manager=db_project.manager,
        department=db_project.department,
        capacity=db_project.capacity,
        current_employees_count=emp_count
    )

@router.post("", response_model=schemas.Project, status_code=status.HTTP_201_CREATED)
def create_project(project: schemas.ProjectCreate, db: Session = Depends(get_db)):
    # Check if project name exists
    existing = db.query(crud.models.Project).filter(crud.models.Project.name == project.name).first()
    if existing:
        raise HTTPException(status_code=400, detail="Project name already exists")
    db_project = crud.create_project(db=db, project=project)
    return schemas.Project(
        id=db_project.id,
        name=db_project.name,
        manager=db_project.manager,
        department=db_project.department,
        capacity=db_project.capacity,
        current_employees_count=0
    )

@router.put("/{project_id}", response_model=schemas.Project)
def update_project(project_id: int, project: schemas.ProjectUpdate, db: Session = Depends(get_db)):
    db_project = crud.get_project(db, project_id)
    if db_project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    updated = crud.update_project(db=db, project_id=project_id, project=project)
    emp_count = db.query(crud.models.Employee).filter(crud.models.Employee.project_id == project_id).count()
    return schemas.Project(
        id=updated.id,
        name=updated.name,
        manager=updated.manager,
        department=updated.department,
        capacity=updated.capacity,
        current_employees_count=emp_count
    )

@router.delete("/{project_id}", response_model=schemas.Project)
def delete_project(project_id: int, db: Session = Depends(get_db)):
    db_project = crud.get_project(db, project_id)
    if db_project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    emp_count = db.query(crud.models.Employee).filter(crud.models.Employee.project_id == project_id).count()
    deleted = crud.delete_project(db=db, project_id=project_id)
    return schemas.Project(
        id=deleted.id,
        name=deleted.name,
        manager=deleted.manager,
        department=deleted.department,
        capacity=deleted.capacity,
        current_employees_count=emp_count
    )
