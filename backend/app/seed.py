import sys
import os
from datetime import datetime, date, timedelta
import random
from faker import Faker

# Add parent directory to path so app can be imported
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from backend.app.database import engine, Base, SessionLocal
from backend.app import models

fake = Faker()

# Set seed for reproducibility
random.seed(42)
Faker.seed(42)

DEPARTMENTS = [
    "Engineering", "Product", "Design", "Marketing", "Sales",
    "Customer Success", "Human Resources", "Finance", "Legal", "Operations",
    "QA", "DevOps", "Data Science", "Security", "IT Support",
    "Research & Development", "Facilities", "Procurement", "Executive", "Training"
]

DESIGNATIONS = {
    "Engineering": ["Software Engineer", "Senior Software Engineer", "Tech Lead", "Engineering Manager", "Frontend Developer", "Backend Developer"],
    "Product": ["Product Analyst", "Associate Product Manager", "Product Manager", "Senior Product Manager", "Director of Product"],
    "Design": ["UI Designer", "UX Researcher", "Product Designer", "Lead Designer"],
    "Marketing": ["Marketing Associate", "SEO Specialist", "Campaign Manager", "Marketing Director"],
    "Sales": ["Sales Representative", "Account Executive", "Sales Manager", "VP of Sales"],
    "Customer Success": ["Support Agent", "Success Manager", "Support Lead"],
    "Human Resources": ["HR Coordinator", "Recruiter", "HR Manager", "HR Specialist"],
    "Finance": ["Accountant", "Financial Analyst", "Finance Manager"],
    "Legal": ["Legal Assistant", "Corporate Counsel"],
    "Operations": ["Operations Associate", "Operations Coordinator", "Operations Manager"],
    "QA": ["QA Engineer", "Automation Engineer", "QA Lead"],
    "DevOps": ["DevOps Engineer", "Site Reliability Engineer", "Infrastructure Architect"],
    "Data Science": ["Data Analyst", "Data Scientist", "Machine Learning Engineer", "BI Analyst"],
    "Security": ["Security Analyst", "Penetration Tester", "Security Engineer"],
    "IT Support": ["Helpdesk Technician", "System Administrator", "Network Engineer"],
    "Research & Development": ["Research Scientist", "R&D Engineer"],
    "Facilities": ["Facilities Coordinator", "Office Manager"],
    "Procurement": ["Purchasing Agent", "Procurement Specialist"],
    "Executive": ["CEO", "CTO", "CFO", "COO", "VP of HR"],
    "Training": ["Trainer", "Learning Specialist"]
}

def seed_db():
    print("Re-creating tables...")
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        print("Generating 100 Projects...")
        projects_data = []
        for i in range(1, 101):
            dept = random.choice(DEPARTMENTS)
            proj_dict = {
                "id": i,
                "name": f"Project {fake.catch_phrase()[:40]} {i}",
                "manager": fake.name(),
                "department": dept,
                "capacity": random.randint(30, 80)
            }
            projects_data.append(proj_dict)
        db.bulk_insert_mappings(models.Project, projects_data)
        db.commit()
        print("Projects created.")

        print("Generating 5,500 Seats...")
        # 5 floors, 1100 seats per floor
        seats_data = []
        seat_idx = 1
        for floor in range(1, 6):
            for seat_num in range(1, 1101):
                seat_code = f"F{floor}-S{seat_num:04d}"
                seat_dict = {
                    "id": seat_idx,
                    "floor": floor,
                    "seat_number": seat_code,
                    "status": "vacant",
                    "employee_id": None
                }
                seats_data.append(seat_dict)
                seat_idx += 1
        db.bulk_insert_mappings(models.Seat, seats_data)
        db.commit()
        print("Seats created.")

        print("Generating 5,000 Employees...")
        # Map projects by department
        dept_projects = {dept: [] for dept in DEPARTMENTS}
        for proj in projects_data:
            dept_projects[proj["department"]].append(proj["id"])

        employees_data = []
        for i in range(1, 5001):
            dept = random.choice(DEPARTMENTS)
            proj_id = None
            if dept_projects[dept] and random.random() < 0.85: # 85% chance of being in a project
                proj_id = random.choice(dept_projects[dept])

            designations = DESIGNATIONS.get(dept, ["Specialist"])
            designation = random.choice(designations)

            joining_days_ago = random.randint(10, 1000)
            joining_date = date.today() - timedelta(days=joining_days_ago)

            status = "active"
            if random.random() < 0.05:
                status = "on_leave"
            elif random.random() < 0.02:
                status = "inactive"

            emp_code = f"EMP{i:04d}"
            name = fake.name()
            # Clean up name to construct email
            email_name = name.lower().replace(" ", ".").replace("'", "").replace('"', "")
            email = f"{email_name}@ethara.com"
            # Ensure email doesn't have invalid chars
            email = "".join(c for c in email if c.isalnum() or c in ['.', '@', '_', '-'])

            emp_dict = {
                "id": i,
                "employee_code": emp_code,
                "name": name,
                "email": email,
                "department": dept,
                "designation": designation,
                "project_id": proj_id,
                "seat_id": None, # Will update this shortly
                "joining_date": joining_date,
                "status": status
            }
            employees_data.append(emp_dict)

        # Bulk insert employees
        db.bulk_insert_mappings(models.Employee, employees_data)
        db.commit()
        print("Employees created.")

        print("Allocating 4,765 occupied seats...")
        # To match the utilization metric exactly (4765 occupied seats out of 5500 seats),
        # we will assign the first 4765 employees to the first 4765 seats.
        # We will update their records in the database.
        
        employee_updates = []
        seat_updates = []
        allocation_histories = []
        
        occupied_count = 4765
        
        for idx in range(1, occupied_count + 1):
            emp_id = idx
            seat_id = idx # Just map emp 1 to seat 1, etc., for fast loading
            
            # Update employee's seat_id
            employee_updates.append({
                "id": emp_id,
                "seat_id": seat_id
            })
            
            # Update seat's status and employee_id
            seat_updates.append({
                "id": seat_id,
                "status": "occupied",
                "employee_id": emp_id
            })
            
            # Create allocation history
            allocated_at = datetime.now() - timedelta(days=random.randint(1, 100))
            allocation_histories.append({
                "employee_id": emp_id,
                "seat_id": seat_id,
                "allocated_at": allocated_at,
                "released_at": None
            })

        print("Executing bulk updates in database...")
        db.bulk_update_mappings(models.Employee, employee_updates)
        db.bulk_update_mappings(models.Seat, seat_updates)
        db.bulk_insert_mappings(models.AllocationHistory, allocation_histories)
        
        db.commit()
        print(f"Success! Seeding complete. Occupied seats: {occupied_count}. Total seats: 5500. Total employees: 5000.")
        
    except Exception as e:
        db.rollback()
        print(f"Error seeding database: {e}")
        raise e
    finally:
        db.close()

if __name__ == "__main__":
    seed_db()
