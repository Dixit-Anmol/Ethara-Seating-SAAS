# Ethara Seat Allocation & Project Mapping System

Ethara is a premium, real-world SaaS-like platform designed to manage office workspace layout configurations, employee team project mappings, seat floor plan allocations, and natural language AI queries.

---

## 🌟 Key Features

1. **Dashboard & Office Analytics**
   - Live KPI cards tracking Total Employees, Active Projects, Desk Occupancy, and Seat Utilization.
   - Interactive visualizations utilizing **Recharts** representing Department Headcounts, Top Project Sizes, and Area trends mapping occupied vs. vacant desks per floor (Floors 1–5).
   - Instant export of summarized metrics to CSV files.

2. **Employee Directory (CRUD)**
   - Complete grid registry displaying employee codes, designations, project mappings, seat codes, and active statuses.
   - Server-side pagination, sorting on all headers, and multi-field debounced searches.
   - Dynamic Modals to add, edit, or delete employee listings.
   - Immediate CSV export of filtered directories.

3. **Project Management (CRUD)**
   - Display project list cards with mapped team counts, managers, departments, and capacity constraints.
   - Colorful progress bars illustrating active utilization.
   - Simple modal dialog forms for creating, editing, and deleting projects.

4. **Interactive Seat Allocation Grid**
   - Custom-engineered floor maps for Floors 1 to 5 displaying seat statuses: **Occupied (Red)** or **Vacant (Green)**.
   - High-performance design optimized to scroll smoothly, displaying live statistics for selected floors.
   - Modal drawer popup allowing users to click a seat to instantly:
     - **De-allocate (Release)** the occupant, moving them to unallocated state.
     - **Allocate** the seat to an active unallocated employee from a searchable selection dropdown.

5. **Clustering-Based Auto-Allocation Engine**
   - A smart routing algorithm to assign new joiners the "nearest available seat":
     - **Cluster by Project:** Scans same-project teammates and clusters the new employee on the floor where the majority of their project team sits.
     - **Cluster by Department:** Fallback scan matching the department concentration floor.
     - **Global Fallback:** Assigns the lowest vacant floor desk starting from Floor 1 upwards.

6. **AI Assistant Copilot (Text-to-SQL)**
   - Sleek natural language textbox dialog supporting direct database queries.
   - Template prompt shortcuts to run complex inquiries instantly.
   - **Text-to-SQL compiler:** When configured with a `GROQ_API_KEY`, `GEMINI_API_KEY`, or `OPENAI_API_KEY` environment variable, it translates natural language queries into valid, read-only SQL queries matching the active database dialect (SQLite/PostgreSQL), runs it, and formats the output into friendly explanations.
   - **Regex-based Fallback:** If no AI key is present, a smart keyword parser handles standard requests locally, including executing allocations (e.g. *"Allocate seat F2-S0025 to employee 10"*).

---

## 🛠️ Technology Stack

### Backend
- **FastAPI:** Core web framework for endpoint declarations.
- **SQLAlchemy (ORM):** Database connectivity. Resolves SQLite locally and PostgreSQL in production.
- **Pydantic (v2):** Strict type validations.
- **Alembic:** Database migration manager.
- **Faker:** Synthetic data generation.
- **Uvicorn:** ASGI server engine.

### Frontend
- **React (v19) + TypeScript:** Client side logic.
- **Vite:** High-speed asset bundler.
- **Tailwind CSS:** Theme constraints and custom utility classes.
- **TanStack Query (React Query):** Server state manager, handling auto-refresh.
- **Recharts:** Responsive analytics graphs.
- **Lucide React:** Icon declarations.
- **Axios:** API connectivity client.

---

## 📂 Folder Structure

```
Ethara Seat Allocation & Project Mapping System/
│
├── backend/
│   ├── alembic.ini             # Alembic migration configuration
│   ├── alembic/                # Database migrations structure
│   ├── app/
│   │   ├── main.py             # FastAPI app loader and startup hooks
│   │   ├── database.py         # SQLAlchemy engine session settings
│   │   ├── models.py           # Table declarations (Employee, Project, Seat, History)
│   │   ├── schemas.py          # Pydantic serialization schemas
│   │   ├── crud.py             # Database query and auto-allocation operations
│   │   ├── seed.py             # synthetic bulk generation script
│   │   └── routes/             # Segmented API routing layers
│   │       ├── employee.py
│   │       ├── project.py
│   │       ├── seat.py
│   │       ├── dashboard.py
│   │       └── ai.py
│   └── requirements.txt        # Backend dependencies
│
└── frontend/
    ├── index.html              # HTML shell template
    ├── package.json            # Frontend dependency manifest
    ├── tailwind.config.js      # Styling adjustments and color variables
    ├── postcss.config.js       # PostCSS config
    ├── vite.config.ts          # Vite bundler parameters
    └── src/
        ├── App.tsx             # Route structure and main layout shells
        ├── main.tsx            # Mounting script
        ├── index.css           # Global HSL palette overrides
        ├── types/              # Type Declarations matching Pydantic schemas
        ├── services/
        │   └── api.ts          # Axios API communication methods
        └── pages/              # Interface pages
            ├── Dashboard/
            ├── Employees/
            ├── Projects/
            ├── Seats/
            └── AIChat/
```

---

## 💾 Database Schema

### 1. `Employee`
- `id` (Integer, Primary Key)
- `employee_code` (String, Unique, Index)
- `name` (String)
- `email` (String)
- `department` (String)
- `designation` (String)
- `project_id` (Integer, ForeignKey pointing to `projects.id`, Nullable)
- `seat_id` (Integer, ForeignKey pointing to `seats.id`, Nullable)
- `joining_date` (Date)
- `status` (String: `"active"`, `"inactive"`, `"on_leave"`)

### 2. `Project`
- `id` (Integer, Primary Key)
- `name` (String, Unique, Index)
- `manager` (String)
- `department` (String)
- `capacity` (Integer)

### 3. `Seat`
- `id` (Integer, Primary Key)
- `floor` (Integer)
- `seat_number` (String, Unique, Index)
- `status` (String: `"occupied"`, `"vacant"`)
- `employee_id` (Integer, ForeignKey pointing to `employees.id`, Nullable)

### 4. `AllocationHistory`
- `id` (Integer, Primary Key)
- `employee_id` (Integer, ForeignKey pointing to `employees.id`)
- `seat_id` (Integer, ForeignKey pointing to `seats.id`)
- `allocated_at` (DateTime)
- `released_at` (DateTime, Nullable)

---

## ⚡ Local Setup Instructions

Follow these steps to run the application on your system:

### 1. Backend Server Setup
1. Open a terminal and navigate to the backend folder:
   ```bash
   cd backend
   ```
2. Create a virtual environment:
   ```bash
   python -m venv venv
   ```
3. Activate the virtual environment:
   - On Windows (PowerShell):
     ```powershell
     .\venv\Scripts\Activate.ps1
     ```
   - On Mac/Linux:
     ```bash
     source venv/bin/activate
     ```
4. Install all python dependencies:
   ```bash
   pip install -r requirements.txt
   ```
5. Seed the database (generates 5,000 Employees, 100 Projects, 5,500 Seats, and 4,765 allocations):
   ```bash
   python app/seed.py
   ```
6. Run the FastAPI development server:
   ```bash
   uvicorn app.main:app --reload
   ```
7. Open [http://localhost:8000/docs](http://localhost:8000/docs) in your browser to verify Swagger docs.

### 2. Frontend Client Setup
1. Open a new terminal and navigate to the frontend folder:
   ```bash
   cd frontend
   ```
2. Install the Node modules:
   ```bash
   npm install
   ```
3. Start the Vite React development server:
   ```bash
   npm run dev
   ```
4. Open the printed local URL (typically [http://localhost:5173](http://localhost:5173)) in your browser.
#   E t h a r a - S e a t i n g - S A A S  
 