from pydantic import BaseModel, EmailStr, Field
from datetime import date, datetime
from typing import List, Optional

# --- PROJECT SCHEMAS ---
class ProjectBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    manager: str = Field(..., min_length=1, max_length=100)
    department: str = Field(..., min_length=1, max_length=100)
    capacity: int = Field(..., ge=1)

class ProjectCreate(ProjectBase):
    pass

class ProjectUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    manager: Optional[str] = Field(None, min_length=1, max_length=100)
    department: Optional[str] = Field(None, min_length=1, max_length=100)
    capacity: Optional[int] = Field(None, ge=1)

class Project(ProjectBase):
    id: int
    current_employees_count: int = 0

    class Config:
        from_attributes = True


# --- SEAT SCHEMAS ---
class SeatBase(BaseModel):
    floor: int = Field(..., ge=1)
    seat_number: str = Field(..., min_length=1, max_length=20)
    status: str = Field("vacant", pattern="^(vacant|occupied)$")
    employee_id: Optional[int] = None

class SeatCreate(SeatBase):
    pass

class Seat(SeatBase):
    id: int
    employee_name: Optional[str] = None
    employee_code: Optional[str] = None

    class Config:
        from_attributes = True


# --- EMPLOYEE SCHEMAS ---
class EmployeeBase(BaseModel):
    employee_code: str = Field(..., min_length=1, max_length=20)
    name: str = Field(..., min_length=1, max_length=100)
    email: EmailStr
    department: str = Field(..., min_length=1, max_length=100)
    designation: str = Field(..., min_length=1, max_length=100)
    project_id: Optional[int] = None
    seat_id: Optional[int] = None
    joining_date: date
    status: str = Field("active", pattern="^(active|inactive|on_leave)$")

class EmployeeCreate(EmployeeBase):
    pass

class EmployeeUpdate(BaseModel):
    employee_code: Optional[str] = Field(None, min_length=1, max_length=20)
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    email: Optional[EmailStr] = None
    department: Optional[str] = Field(None, min_length=1, max_length=100)
    designation: Optional[str] = Field(None, min_length=1, max_length=100)
    project_id: Optional[int] = None
    seat_id: Optional[int] = None
    joining_date: Optional[date] = None
    status: Optional[str] = Field(None, pattern="^(active|inactive|on_leave)$")

class Employee(EmployeeBase):
    id: int
    project_name: Optional[str] = None
    seat_number: Optional[str] = None
    seat_floor: Optional[int] = None

    class Config:
        from_attributes = True


# --- ALLOCATION HISTORY SCHEMAS ---
class AllocationHistoryBase(BaseModel):
    employee_id: int
    seat_id: int
    allocated_at: datetime
    released_at: Optional[datetime] = None

class AllocationHistory(AllocationHistoryBase):
    id: int
    employee_name: Optional[str] = None
    employee_code: Optional[str] = None
    seat_number: Optional[str] = None

    class Config:
        from_attributes = True


# --- REQUEST & RESPONSE SCHEMAS ---
class SeatAllocateRequest(BaseModel):
    employee_id: int
    seat_id: int

class SeatReleaseRequest(BaseModel):
    seat_id: int

class SeatChangeRequest(BaseModel):
    employee_id: int
    new_seat_id: int

class AutoAllocateRequest(BaseModel):
    employee_id: int

class PaginatedEmployees(BaseModel):
    items: List[Employee]
    total: int
    page: int
    size: int
    pages: int

class PaginatedProjects(BaseModel):
    items: List[Project]
    total: int
    page: int
    size: int
    pages: int


# --- DASHBOARD SCHEMAS ---
class DashboardMetrics(BaseModel):
    total_employees: int
    total_projects: int
    occupied_seats: int
    vacant_seats: int
    utilization_rate: float
    new_joiners_count: int

class DistributionItem(BaseModel):
    name: str
    value: int

class SeatOccupancyStats(BaseModel):
    floor: int
    occupied: int
    vacant: int
    total: int

class DashboardData(BaseModel):
    metrics: DashboardMetrics
    department_distribution: List[DistributionItem]
    project_distribution: List[DistributionItem]
    seat_occupancy: List[SeatOccupancyStats]


# --- AI CHAT SCHEMAS ---
class AIChatMessage(BaseModel):
    role: str  # "user" or "assistant"
    content: str

class AIChatRequest(BaseModel):
    message: str
    history: Optional[List[AIChatMessage]] = []

class AIChatResponse(BaseModel):
    response: str
    action_taken: Optional[str] = None
    action_details: Optional[dict] = None
