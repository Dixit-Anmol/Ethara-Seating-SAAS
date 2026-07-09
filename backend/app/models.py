from sqlalchemy import Column, Integer, String, Date, DateTime, ForeignKey, func
from sqlalchemy.orm import relationship
from .database import Base

class Project(Base):
    __tablename__ = "projects"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True, nullable=False)
    manager = Column(String, nullable=False)
    department = Column(String, nullable=False)
    capacity = Column(Integer, default=50)

    # Relationships
    employees = relationship(
        "Employee", 
        back_populates="project", 
        foreign_keys="Employee.project_id"
    )


class Employee(Base):
    __tablename__ = "employees"

    id = Column(Integer, primary_key=True, index=True)
    employee_code = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=False)
    email = Column(String, nullable=False)
    department = Column(String, nullable=False)
    designation = Column(String, nullable=False)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=True)
    seat_id = Column(Integer, ForeignKey("seats.id"), nullable=True)
    joining_date = Column(Date, nullable=False)
    status = Column(String, default="active")  # "active", "inactive", "on_leave"

    # Relationships
    project = relationship(
        "Project", 
        back_populates="employees", 
        foreign_keys=[project_id]
    )
    # We specify the foreign_keys parameter to resolve the circular dependency with Seat
    seat = relationship(
        "Seat", 
        foreign_keys=[seat_id]
    )


class Seat(Base):
    __tablename__ = "seats"

    id = Column(Integer, primary_key=True, index=True)
    floor = Column(Integer, nullable=False)
    seat_number = Column(String, unique=True, index=True, nullable=False)
    status = Column(String, default="vacant")  # "occupied", "vacant"
    employee_id = Column(Integer, ForeignKey("employees.id"), nullable=True)

    # Relationships
    # Specify the foreign_keys parameter to resolve the circular dependency with Employee
    employee = relationship(
        "Employee", 
        foreign_keys=[employee_id]
    )


class AllocationHistory(Base):
    __tablename__ = "allocation_history"

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("employees.id"), nullable=False)
    seat_id = Column(Integer, ForeignKey("seats.id"), nullable=False)
    allocated_at = Column(DateTime, default=func.now(), nullable=False)
    released_at = Column(DateTime, nullable=True)

    # Relationships
    employee = relationship("Employee", foreign_keys=[employee_id])
    seat = relationship("Seat", foreign_keys=[seat_id])
