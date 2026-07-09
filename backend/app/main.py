from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from .database import engine, Base, get_db
from .routes import employee, project, seat, dashboard, ai, admin

app = FastAPI(
    title="Ethara Seat Allocation & Project Mapping System API",
    description="SaaS Backend for office floor plan layout, employee project mapping, seat allocations, and AI chats.",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Configure CORS for Frontend connectivity
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://ethara-seating-saas-1.onrender.com",
        "http://localhost:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Auto-create database tables on application start
@app.on_event("startup")
def startup_event():
    Base.metadata.create_all(bind=engine)
    print("Database tables initialized.")

@app.get("/")
def read_root():
    return {
        "status": "online",
        "system": "Ethara Office Mapping System API",
        "version": "1.0.0",
        "documentation": "/docs"
    }

# Register Routers
app.include_router(employee.router, prefix="/api")
app.include_router(project.router, prefix="/api")
app.include_router(seat.router, prefix="/api")
app.include_router(dashboard.router, prefix="/api")
app.include_router(ai.router, prefix="/api")
app.include_router(admin.router, prefix="/api")
