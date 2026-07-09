from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import date, timedelta
from ..database import get_db
from .. import models, schemas

router = APIRouter(prefix="/dashboard", tags=["dashboard"])

@router.get("", response_model=schemas.DashboardData)
def get_dashboard_data(db: Session = Depends(get_db)):
    # 1. Base Metrics
    total_employees = db.query(models.Employee).count()
    total_projects = db.query(models.Project).count()
    occupied_seats = db.query(models.Seat).filter(models.Seat.status == "occupied").count()
    vacant_seats = db.query(models.Seat).filter(models.Seat.status == "vacant").count()
    total_seats = occupied_seats + vacant_seats
    utilization_rate = round((occupied_seats / total_seats * 100), 2) if total_seats > 0 else 0.0

    # New joiners (e.g. joined in the last 60 days to show realistic values from faker seed)
    cutoff_date = date.today() - timedelta(days=60)
    new_joiners_count = db.query(models.Employee).filter(models.Employee.joining_date >= cutoff_date).count()

    # 2. Department Distribution (Top 10 by employee count)
    dept_stats = db.query(
        models.Employee.department,
        func.count(models.Employee.id).label("count")
    ).group_by(models.Employee.department).order_by(func.count(models.Employee.id).desc()).all()
    
    department_distribution = [
        schemas.DistributionItem(name=stat[0], value=stat[1])
        for stat in dept_stats if stat[0]
    ]

    # 3. Project Distribution (Top 10 by employee count)
    proj_stats = db.query(
        models.Project.name,
        func.count(models.Employee.id).label("count")
    ).join(models.Employee, models.Employee.project_id == models.Project.id)\
     .group_by(models.Project.name).order_by(func.count(models.Employee.id).desc()).limit(10).all()
     
    project_distribution = [
        schemas.DistributionItem(name=stat[0], value=stat[1])
        for stat in proj_stats if stat[0]
    ]

    # 4. Seat Occupancy by Floor (Floors 1-5)
    seat_occupancy = []
    for floor in range(1, 6):
        occ = db.query(models.Seat).filter(models.Seat.floor == floor, models.Seat.status == "occupied").count()
        vac = db.query(models.Seat).filter(models.Seat.floor == floor, models.Seat.status == "vacant").count()
        tot = occ + vac
        seat_occupancy.append(
            schemas.SeatOccupancyStats(
                floor=floor,
                occupied=occ,
                vacant=vac,
                total=tot
            )
        )

    return schemas.DashboardData(
        metrics=schemas.DashboardMetrics(
            total_employees=total_employees,
            total_projects=total_projects,
            occupied_seats=occupied_seats,
            vacant_seats=vacant_seats,
            utilization_rate=utilization_rate,
            new_joiners_count=new_joiners_count
        ),
        department_distribution=department_distribution,
        project_distribution=project_distribution,
        seat_occupancy=seat_occupancy
    )
