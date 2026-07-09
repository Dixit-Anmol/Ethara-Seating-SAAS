import os
import json
import re
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from ..database import get_db
from .. import schemas, models

router = APIRouter(prefix="/ai", tags=["ai"])

# ─── Configuration ───────────────────────────────────────────────
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
GROQ_MODEL = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")

DEPARTMENTS = [
    "Engineering", "Product", "Design", "Marketing", "Sales",
    "Customer Success", "Human Resources", "Finance", "Legal", "Operations",
    "QA", "DevOps", "Data Science", "Security", "IT Support",
    "Research & Development", "Facilities", "Procurement", "Executive", "Training"
]

# ─── LLM System Prompt ──────────────────────────────────────────
INTENT_SYSTEM_PROMPT = """You are an intent extraction engine for an Office Seat Allocation & Project Mapping System.

The database has these tables:
- employees: id, employee_code, name, email, department, designation, project_id, seat_id, joining_date, status
- projects: id, name, manager, department, capacity
- seats: id, floor (1-5), seat_number (e.g. F1-S0001), status (vacant/occupied), employee_id
- allocation_history: id, employee_id, seat_id, allocated_at, released_at

Departments: """ + ", ".join(DEPARTMENTS) + """

Given a user message, extract a JSON object with "intent" and "params".

SUPPORTED INTENTS:
- search_employee: User wants to find/search an employee. Params: {"name": "...", "employee_code": "..."}
- employee_details: User wants full details of a specific employee. Params: {"name": "...", "employee_id": N}
- employee_seat: User asks where an employee sits. Params: {"name": "...", "employee_id": N}
- employee_project: User asks which project an employee works on. Params: {"name": "...", "employee_id": N}
- search_department: User wants employees in a department. Params: {"department": "..."}
- search_designation: User wants employees by role/title. Params: {"designation": "..."}
- search_floor: User wants employees on a specific floor. Params: {"floor": N}
- search_seat: User asks who sits on a specific seat. Params: {"seat_number": "..."}
- search_project: User wants employees on a project. Params: {"project_name": "..."}
- available_seats: User asks about vacant/free/empty seats. Params: {"floor": N} (floor is optional)
- seat_utilization: User asks about seat utilization statistics. Params: {}
- project_stats: User asks about project statistics overview. Params: {}
- highest_utilization_project: User asks which project has the highest utilization. Params: {}
- allocate_seat: User wants to allocate/assign a seat. Params: {"employee_name": "...", "employee_id": N, "seat_number": "..."}
- release_seat: User wants to release/free/unassign a seat. Params: {"employee_name": "...", "employee_id": N}
- transfer_seat: User wants to move/transfer an employee to a different seat. Params: {"employee_name": "...", "employee_id": N, "seat_number": "..."}
- dashboard_summary: User asks for an overall office summary. Params: {}
- recent_joiners: User asks about employees who joined recently. Params: {}
- unknown: Cannot determine intent. Params: {"original_query": "..."}

RULES:
1. Return ONLY valid JSON. No markdown, no explanation, no backticks.
2. Use conversation history to resolve pronouns like "he", "she", "they", "that employee", "this project".
3. For partial names like "anml" or "rahu", pass them as-is in the name field — the system handles fuzzy matching.
4. If the user says a department name (even partially), map it to the closest department from the list.
5. For designations like "software engineers", "designers", "managers", extract the role keyword.
6. If the user mentions an employee ID number like "employee 1024" or "emp 1024", put the number in employee_id.
7. For seat numbers like "F2-S025" or "F2-S0025", normalize to the format provided.
8. Always pick the most specific intent. For example "where does anmol sit" is employee_seat not search_employee.

EXAMPLES:
User: "search about anmol dixit" → {"intent": "search_employee", "params": {"name": "anmol dixit"}}
User: "employees on floor 3" → {"intent": "search_floor", "params": {"floor": 3}}
User: "show HR employees" → {"intent": "search_department", "params": {"department": "Human Resources"}}
User: "vacant seats on floor 2" → {"intent": "available_seats", "params": {"floor": 2}}
User: "allocate seat to employee 1024" → {"intent": "allocate_seat", "params": {"employee_id": 1024}}
User: "which project has highest utilization" → {"intent": "highest_utilization_project", "params": {}}
User: "dashboard summary" → {"intent": "dashboard_summary", "params": {}}
User: "list software engineers" → {"intent": "search_designation", "params": {"designation": "software engineer"}}
User: "where does anmol sit" → {"intent": "employee_seat", "params": {"name": "anmol"}}
User: "who sits on seat F2-S025" → {"intent": "search_seat", "params": {"seat_number": "F2-S025"}}
User: "release seat of employee 205" → {"intent": "release_seat", "params": {"employee_id": 205}}
"""


def _create_openai_client(api_key: str, base_url: str = None):
    """Create an OpenAI-compatible client with proxy workaround."""
    proxy_keys = ["http_proxy", "https_proxy", "all_proxy", "HTTP_PROXY", "HTTPS_PROXY", "ALL_PROXY"]
    saved = {}
    for k in proxy_keys:
        if k in os.environ:
            saved[k] = os.environ.pop(k)
    try:
        import openai
        kwargs = {"api_key": api_key}
        if base_url:
            kwargs["base_url"] = base_url
        return openai.OpenAI(**kwargs)
    finally:
        for k, v in saved.items():
            os.environ[k] = v


def _call_llm(system_prompt: str, user_message: str, history: list = None) -> str:
    """
    Call LLM with the given system prompt and user message.
    Tries Groq → OpenAI → Gemini in order.
    Returns the raw string response from the LLM.
    """
    messages = [{"role": "system", "content": system_prompt}]

    # Add conversation history for context
    if history:
        for msg in history[-10:]:  # Last 10 messages max
            messages.append({"role": msg.get("role", "user"), "content": msg.get("content", "")})

    messages.append({"role": "user", "content": user_message})

    # Try Groq first (fastest)
    if GROQ_API_KEY:
        try:
            client = _create_openai_client(GROQ_API_KEY, "https://api.groq.com/openai/v1")
            response = client.chat.completions.create(
                model=GROQ_MODEL,
                messages=messages,
                temperature=0.1,
                max_tokens=1024
            )
            return response.choices[0].message.content.strip()
        except Exception as e:
            print(f"[AI] Groq error: {e}")

    # Try OpenAI
    if OPENAI_API_KEY:
        try:
            client = _create_openai_client(OPENAI_API_KEY)
            response = client.chat.completions.create(
                model="gpt-4o-mini",
                messages=messages,
                temperature=0.1,
                max_tokens=1024
            )
            return response.choices[0].message.content.strip()
        except Exception as e:
            print(f"[AI] OpenAI error: {e}")

    # Try Gemini
    if GEMINI_API_KEY:
        try:
            import google.generativeai as genai
            genai.configure(api_key=GEMINI_API_KEY)
            model = genai.GenerativeModel("gemini-1.5-flash")
            full_prompt = f"{system_prompt}\n\nConversation history:\n"
            if history:
                for msg in history[-10:]:
                    full_prompt += f"{msg.get('role', 'user')}: {msg.get('content', '')}\n"
            full_prompt += f"\nUser: {user_message}"
            response = model.generate_content(full_prompt)
            return response.text.strip()
        except Exception as e:
            print(f"[AI] Gemini error: {e}")

    return ""


def extract_intent(message: str, history: list = None) -> dict:
    """
    Use LLM to extract structured intent from a user message.
    Returns a dict like: {"intent": "search_employee", "params": {"name": "anmol"}}
    """
    raw = _call_llm(INTENT_SYSTEM_PROMPT, message, history)

    if not raw:
        return {"intent": "unknown", "params": {"original_query": message}}

    # Clean LLM response — strip markdown code fences if present
    cleaned = raw.strip()
    if cleaned.startswith("```"):
        cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned)
        cleaned = re.sub(r"\s*```$", "", cleaned)

    try:
        result = json.loads(cleaned)
        if "intent" not in result:
            result["intent"] = "unknown"
        if "params" not in result:
            result["params"] = {}
        return result
    except json.JSONDecodeError:
        print(f"[AI] Failed to parse LLM response as JSON: {raw}")
        return {"intent": "unknown", "params": {"original_query": message}}


# ═══════════════════════════════════════════════════════════════════
#  INTENT HANDLER FUNCTIONS — Pure SQLAlchemy ORM, zero raw SQL
# ═══════════════════════════════════════════════════════════════════

def _fuzzy_find_employees(db: Session, name: str, limit: int = 20):
    """Find employees by fuzzy/partial name match using LIKE."""
    if not name:
        return []
    search_term = f"%{name.strip()}%"
    return db.query(models.Employee).filter(
        models.Employee.name.ilike(search_term)
    ).limit(limit).all()


def _find_employee_by_id_or_name(db: Session, params: dict):
    """Resolve an employee from params containing employee_id or name."""
    if params.get("employee_id"):
        emp = db.query(models.Employee).filter(
            models.Employee.id == int(params["employee_id"])
        ).first()
        if emp:
            return emp

    if params.get("employee_name"):
        matches = _fuzzy_find_employees(db, params["employee_name"], limit=1)
        if matches:
            return matches[0]

    if params.get("name"):
        matches = _fuzzy_find_employees(db, params["name"], limit=1)
        if matches:
            return matches[0]

    return None


def _format_employee_card(emp, db: Session) -> str:
    """Format a single employee's details as a readable card."""
    project = db.query(models.Project).filter(models.Project.id == emp.project_id).first() if emp.project_id else None
    seat = db.query(models.Seat).filter(models.Seat.id == emp.seat_id).first() if emp.seat_id else None

    lines = [
        f"**Name:** {emp.name}",
        f"**Employee ID:** {emp.employee_code}",
        f"**Department:** {emp.department}",
        f"**Designation:** {emp.designation}",
        f"**Project:** {project.name if project else 'Not assigned'}",
        f"**Seat:** {seat.seat_number if seat else 'Not assigned'}",
        f"**Floor:** {seat.floor if seat else 'N/A'}",
        f"**Status:** {emp.status.title()}",
        f"**Joined:** {emp.joining_date}",
        f"**Email:** {emp.email}",
    ]
    return "\n".join(lines)


# ── Individual Intent Handlers ───────────────────────────────────

def _handle_search_employee(db: Session, params: dict) -> tuple:
    name = params.get("name", "")
    code = params.get("employee_code", "")

    if code:
        emp = db.query(models.Employee).filter(
            models.Employee.employee_code.ilike(f"%{code}%")
        ).first()
        if emp:
            card = _format_employee_card(emp, db)
            return f"I found the employee:\n\n{card}", "search_employee", {"employee_id": emp.id}
        return f"I couldn't find any employee with code \"{code}\".", "search_employee", {}

    if not name:
        return "Please provide a name or employee code to search.", "search_employee", {}

    employees = _fuzzy_find_employees(db, name, limit=15)

    if not employees:
        return f"I couldn't find any employee matching \"{name}\". Please check the spelling and try again.", "search_employee", {}

    if len(employees) == 1:
        card = _format_employee_card(employees[0], db)
        return f"I found one employee:\n\n{card}", "search_employee", {"employee_id": employees[0].id, "employee_name": employees[0].name}

    result = f"I found {len(employees)} employees matching \"{name}\":\n\n"
    for emp in employees:
        project = db.query(models.Project).filter(models.Project.id == emp.project_id).first() if emp.project_id else None
        seat = db.query(models.Seat).filter(models.Seat.id == emp.seat_id).first() if emp.seat_id else None
        result += f"• **{emp.name}** ({emp.employee_code}) — {emp.department}"
        if project:
            result += f", Project: {project.name}"
        if seat:
            result += f", Seat: {seat.seat_number}"
        result += "\n"

    return result.strip(), "search_employee", {"count": len(employees)}


def _handle_employee_details(db: Session, params: dict) -> tuple:
    emp = _find_employee_by_id_or_name(db, params)
    if not emp:
        name = params.get("name", params.get("employee_id", "unknown"))
        return f"I couldn't find any employee matching \"{name}\". Please check the name or ID.", "employee_details", {}

    card = _format_employee_card(emp, db)
    return f"Here are the details:\n\n{card}", "employee_details", {"employee_id": emp.id, "employee_name": emp.name}


def _handle_employee_seat(db: Session, params: dict) -> tuple:
    emp = _find_employee_by_id_or_name(db, params)
    if not emp:
        name = params.get("name", params.get("employee_id", "unknown"))
        return f"I couldn't find any employee matching \"{name}\".", "employee_seat", {}

    if emp.seat_id:
        seat = db.query(models.Seat).filter(models.Seat.id == emp.seat_id).first()
        if seat:
            return (
                f"**{emp.name}** is assigned to **Seat {seat.seat_number}** on **Floor {seat.floor}**.",
                "employee_seat",
                {"employee_id": emp.id, "employee_name": emp.name, "seat_number": seat.seat_number, "floor": seat.floor}
            )

    return f"**{emp.name}** does not currently have a seat assigned.", "employee_seat", {"employee_id": emp.id, "employee_name": emp.name}


def _handle_employee_project(db: Session, params: dict) -> tuple:
    emp = _find_employee_by_id_or_name(db, params)
    if not emp:
        name = params.get("name", params.get("employee_id", "unknown"))
        return f"I couldn't find any employee matching \"{name}\".", "employee_project", {}

    if emp.project_id:
        project = db.query(models.Project).filter(models.Project.id == emp.project_id).first()
        if project:
            emp_count = db.query(models.Employee).filter(models.Employee.project_id == project.id).count()
            return (
                f"**{emp.name}** is working on **{project.name}**.\n\n"
                f"**Project Details:**\n"
                f"• Manager: {project.manager}\n"
                f"• Department: {project.department}\n"
                f"• Team Size: {emp_count}/{project.capacity}",
                "employee_project",
                {"employee_id": emp.id, "employee_name": emp.name, "project_name": project.name}
            )

    return f"**{emp.name}** is not currently assigned to any project.", "employee_project", {"employee_id": emp.id, "employee_name": emp.name}


def _handle_search_department(db: Session, params: dict) -> tuple:
    dept = params.get("department", "")
    if not dept:
        return "Please specify a department name.", "search_department", {}

    # Fuzzy match the department name
    employees = db.query(models.Employee).filter(
        models.Employee.department.ilike(f"%{dept}%")
    ).all()

    if not employees:
        return f"I couldn't find any employees in the \"{dept}\" department.", "search_department", {}

    actual_dept = employees[0].department
    total = len(employees)
    display = employees[:20]

    result = f"There are **{total} employees** in the **{actual_dept}** department.\n\n"
    for emp in display:
        result += f"• **{emp.name}** ({emp.employee_code}) — {emp.designation}\n"

    if total > 20:
        result += f"\n...and {total - 20} more."

    return result.strip(), "search_department", {"department": actual_dept, "count": total}


def _handle_search_designation(db: Session, params: dict) -> tuple:
    designation = params.get("designation", "")
    if not designation:
        return "Please specify a role or designation.", "search_designation", {}

    employees = db.query(models.Employee).filter(
        models.Employee.designation.ilike(f"%{designation}%")
    ).all()

    if not employees:
        return f"I couldn't find any employees with the designation \"{designation}\".", "search_designation", {}

    total = len(employees)
    display = employees[:20]

    result = f"I found **{total} employees** with designation matching \"{designation}\":\n\n"
    for emp in display:
        result += f"• **{emp.name}** ({emp.employee_code}) — {emp.department}\n"

    if total > 20:
        result += f"\n...and {total - 20} more."

    return result.strip(), "search_designation", {"designation": designation, "count": total}


def _handle_search_floor(db: Session, params: dict) -> tuple:
    floor = params.get("floor")
    if not floor:
        return "Please specify a floor number (1–5).", "search_floor", {}

    floor = int(floor)
    employees = db.query(models.Employee).join(
        models.Seat, models.Employee.seat_id == models.Seat.id
    ).filter(models.Seat.floor == floor).all()

    total = len(employees)
    if total == 0:
        return f"No employees are currently sitting on Floor {floor}.", "search_floor", {"floor": floor, "count": 0}

    display = employees[:20]
    result = f"There are **{total} employees** on **Floor {floor}**:\n\n"
    for emp in display:
        seat = db.query(models.Seat).filter(models.Seat.id == emp.seat_id).first()
        result += f"• **{emp.name}** ({emp.employee_code}) — Seat: {seat.seat_number if seat else 'N/A'}\n"

    if total > 20:
        result += f"\n...and {total - 20} more."

    return result.strip(), "search_floor", {"floor": floor, "count": total}


def _handle_search_seat(db: Session, params: dict) -> tuple:
    seat_number = params.get("seat_number", "")
    if not seat_number:
        return "Please provide a seat number (e.g., F2-S0025).", "search_seat", {}

    # Try exact match first, then fuzzy
    seat = db.query(models.Seat).filter(
        models.Seat.seat_number.ilike(f"%{seat_number}%")
    ).first()

    if not seat:
        return f"I couldn't find a seat matching \"{seat_number}\".", "search_seat", {}

    if seat.status == "occupied" and seat.employee_id:
        emp = db.query(models.Employee).filter(models.Employee.id == seat.employee_id).first()
        if emp:
            return (
                f"**Seat {seat.seat_number}** on **Floor {seat.floor}** is occupied by:\n\n"
                f"• **{emp.name}** ({emp.employee_code})\n"
                f"• Department: {emp.department}\n"
                f"• Designation: {emp.designation}",
                "search_seat",
                {"seat_number": seat.seat_number, "floor": seat.floor, "employee_name": emp.name}
            )

    return f"**Seat {seat.seat_number}** on **Floor {seat.floor}** is currently **vacant**.", "search_seat", {"seat_number": seat.seat_number, "floor": seat.floor}


def _handle_available_seats(db: Session, params: dict) -> tuple:
    query = db.query(models.Seat).filter(models.Seat.status == "vacant")
    floor = params.get("floor")

    if floor:
        floor = int(floor)
        query = query.filter(models.Seat.floor == floor)

    vacant_seats = query.order_by(models.Seat.floor, models.Seat.seat_number).all()
    total = len(vacant_seats)

    if total == 0:
        loc = f" on Floor {floor}" if floor else ""
        return f"There are no vacant seats available{loc}.", "available_seats", {"count": 0}

    display = vacant_seats[:15]
    loc = f" on **Floor {floor}**" if floor else " across all floors"
    result = f"There are **{total} vacant seats**{loc}.\n\n"

    # Group by floor for display
    if not floor:
        floor_counts = {}
        for s in vacant_seats:
            floor_counts[s.floor] = floor_counts.get(s.floor, 0) + 1
        result += "**Per-floor breakdown:**\n"
        for f_num in sorted(floor_counts.keys()):
            result += f"• Floor {f_num}: {floor_counts[f_num]} vacant seats\n"
        result += "\n"

    result += "**Some available seats:**\n"
    for s in display:
        result += f"• {s.seat_number} (Floor {s.floor})\n"

    if total > 15:
        result += f"\n...and {total - 15} more."

    return result.strip(), "available_seats", {"count": total}


def _handle_seat_utilization(db: Session, params: dict) -> tuple:
    total_seats = db.query(models.Seat).count()
    occupied = db.query(models.Seat).filter(models.Seat.status == "occupied").count()
    vacant = total_seats - occupied
    rate = (occupied / total_seats * 100) if total_seats > 0 else 0

    result = f"**Office Seat Utilization**\n\n"
    result += f"• Total Seats: **{total_seats}**\n"
    result += f"• Occupied: **{occupied}**\n"
    result += f"• Vacant: **{vacant}**\n"
    result += f"• Utilization Rate: **{rate:.1f}%**\n\n"

    # Per-floor breakdown
    floors = db.query(
        models.Seat.floor,
        func.count(models.Seat.id).label("total"),
        func.sum(func.cast(models.Seat.status == "occupied", models.Seat.id.type)).label("occ")
    ).group_by(models.Seat.floor).order_by(models.Seat.floor).all()

    if floors:
        result += "**Per-Floor Breakdown:**\n"
        for f in floors:
            f_total = f[1]
            # Count occupied seats per floor using a separate query for SQLite compatibility
            f_occ = db.query(models.Seat).filter(
                models.Seat.floor == f[0], models.Seat.status == "occupied"
            ).count()
            f_rate = (f_occ / f_total * 100) if f_total > 0 else 0
            result += f"• Floor {f[0]}: {f_occ}/{f_total} ({f_rate:.1f}%)\n"

    return result.strip(), "seat_utilization", {"total": total_seats, "occupied": occupied, "rate": round(rate, 1)}


def _handle_search_project(db: Session, params: dict) -> tuple:
    project_name = params.get("project_name", "")
    if not project_name:
        return "Please specify a project name.", "search_project", {}

    project = db.query(models.Project).filter(
        models.Project.name.ilike(f"%{project_name}%")
    ).first()

    if not project:
        return f"I couldn't find a project matching \"{project_name}\".", "search_project", {}

    employees = db.query(models.Employee).filter(
        models.Employee.project_id == project.id
    ).all()

    total = len(employees)
    display = employees[:25]

    result = f"**{project.name}** currently has **{total} employees** (capacity: {project.capacity}).\n\n"
    result += f"• Manager: {project.manager}\n"
    result += f"• Department: {project.department}\n\n"

    if total > 0:
        result += "**Team Members:**\n"
        for emp in display:
            result += f"• {emp.name} ({emp.employee_code}) — {emp.designation}\n"
        if total > 25:
            result += f"\n...and {total - 25} more."

    return result.strip(), "search_project", {"project_name": project.name, "count": total}


def _handle_project_stats(db: Session, params: dict) -> tuple:
    projects = db.query(models.Project).all()
    total_projects = len(projects)

    result = f"**Project Statistics Overview**\n\n"
    result += f"Total Projects: **{total_projects}**\n\n"

    stats = []
    for p in projects:
        emp_count = db.query(models.Employee).filter(models.Employee.project_id == p.id).count()
        utilization = (emp_count / p.capacity * 100) if p.capacity > 0 else 0
        stats.append((p, emp_count, utilization))

    # Sort by utilization descending
    stats.sort(key=lambda x: x[2], reverse=True)

    result += "**Top 15 Projects by Utilization:**\n"
    for p, count, util in stats[:15]:
        bar = "█" * int(util / 10) + "░" * (10 - int(util / 10))
        result += f"• **{p.name}**: {count}/{p.capacity} ({util:.0f}%) {bar}\n"

    if total_projects > 15:
        result += f"\n...and {total_projects - 15} more projects."

    return result.strip(), "project_stats", {"total_projects": total_projects}


def _handle_highest_utilization(db: Session, params: dict) -> tuple:
    projects = db.query(models.Project).all()
    if not projects:
        return "No projects found in the system.", "highest_utilization_project", {}

    best = None
    best_util = -1
    best_count = 0

    for p in projects:
        emp_count = db.query(models.Employee).filter(models.Employee.project_id == p.id).count()
        util = (emp_count / p.capacity * 100) if p.capacity > 0 else 0
        if util > best_util:
            best = p
            best_util = util
            best_count = emp_count

    return (
        f"The project with the highest utilization is **{best.name}**.\n\n"
        f"• Manager: {best.manager}\n"
        f"• Department: {best.department}\n"
        f"• Team Size: {best_count}/{best.capacity}\n"
        f"• Utilization: **{best_util:.1f}%**",
        "highest_utilization_project",
        {"project_name": best.name, "utilization": round(best_util, 1)}
    )


def _handle_allocate_seat(db: Session, params: dict) -> tuple:
    from ..crud import allocate_seat, auto_allocate_seat

    emp = _find_employee_by_id_or_name(db, params)
    if not emp:
        identifier = params.get("employee_name", params.get("employee_id", params.get("name", "unknown")))
        return f"I couldn't find an employee matching \"{identifier}\". Please verify the name or ID.", "allocate_seat", {}

    # If a specific seat is requested
    seat_number = params.get("seat_number")
    if seat_number:
        seat = db.query(models.Seat).filter(
            models.Seat.seat_number.ilike(f"%{seat_number}%")
        ).first()
        if not seat:
            return f"I couldn't find a seat matching \"{seat_number}\".", "allocate_seat", {}
        if seat.status == "occupied":
            occ_emp = db.query(models.Employee).filter(models.Employee.id == seat.employee_id).first()
            occ_name = occ_emp.name if occ_emp else "another employee"
            return f"Seat {seat.seat_number} is already occupied by {occ_name}.", "allocate_seat", {}

        success, msg = allocate_seat(db, emp.id, seat.id)
        if success:
            return (
                f"✅ Successfully allocated **Seat {seat.seat_number}** (Floor {seat.floor}) to **{emp.name}** ({emp.employee_code}).",
                "allocate_seat",
                {"employee_id": emp.id, "employee_name": emp.name, "seat_number": seat.seat_number}
            )
        return f"Failed to allocate seat: {msg}", "allocate_seat", {}

    # Auto-allocate
    if emp.seat_id:
        existing_seat = db.query(models.Seat).filter(models.Seat.id == emp.seat_id).first()
        seat_info = existing_seat.seat_number if existing_seat else "unknown"
        return f"**{emp.name}** is already assigned to **Seat {seat_info}**. Release the current seat first if you want to reassign.", "allocate_seat", {"employee_name": emp.name}

    success, msg, seat = auto_allocate_seat(db, emp.id)
    if success and seat:
        return (
            f"✅ Successfully auto-allocated **Seat {seat.seat_number}** (Floor {seat.floor}) to **{emp.name}** ({emp.employee_code}).\n\n{msg}",
            "allocate_seat",
            {"employee_id": emp.id, "employee_name": emp.name, "seat_number": seat.seat_number}
        )
    return f"Could not allocate a seat for {emp.name}: {msg}", "allocate_seat", {}


def _handle_release_seat(db: Session, params: dict) -> tuple:
    from ..crud import release_seat

    emp = _find_employee_by_id_or_name(db, params)
    if not emp:
        identifier = params.get("employee_name", params.get("employee_id", params.get("name", "unknown")))
        return f"I couldn't find an employee matching \"{identifier}\".", "release_seat", {}

    if not emp.seat_id:
        return f"**{emp.name}** does not have a seat assigned.", "release_seat", {"employee_name": emp.name}

    seat = db.query(models.Seat).filter(models.Seat.id == emp.seat_id).first()
    seat_info = seat.seat_number if seat else "unknown"

    success, msg = release_seat(db, emp.seat_id)
    if success:
        return (
            f"✅ Successfully released **Seat {seat_info}** from **{emp.name}** ({emp.employee_code}). The seat is now vacant.",
            "release_seat",
            {"employee_id": emp.id, "employee_name": emp.name, "seat_number": seat_info}
        )
    return f"Failed to release seat: {msg}", "release_seat", {}


def _handle_transfer_seat(db: Session, params: dict) -> tuple:
    from ..crud import release_seat, allocate_seat

    emp = _find_employee_by_id_or_name(db, params)
    if not emp:
        identifier = params.get("employee_name", params.get("employee_id", params.get("name", "unknown")))
        return f"I couldn't find an employee matching \"{identifier}\".", "transfer_seat", {}

    seat_number = params.get("seat_number")
    if not seat_number:
        return f"Please specify the new seat number to transfer **{emp.name}** to.", "transfer_seat", {}

    new_seat = db.query(models.Seat).filter(
        models.Seat.seat_number.ilike(f"%{seat_number}%")
    ).first()

    if not new_seat:
        return f"I couldn't find a seat matching \"{seat_number}\".", "transfer_seat", {}

    if new_seat.status == "occupied":
        occ = db.query(models.Employee).filter(models.Employee.id == new_seat.employee_id).first()
        occ_name = occ.name if occ else "another employee"
        return f"Seat {new_seat.seat_number} is already occupied by {occ_name}.", "transfer_seat", {}

    # Release old seat if exists
    old_seat_info = "none"
    if emp.seat_id:
        old_seat = db.query(models.Seat).filter(models.Seat.id == emp.seat_id).first()
        old_seat_info = old_seat.seat_number if old_seat else "unknown"
        release_seat(db, emp.seat_id)

    # Allocate new seat
    success, msg = allocate_seat(db, emp.id, new_seat.id)
    if success:
        return (
            f"✅ Successfully transferred **{emp.name}** from Seat {old_seat_info} to **Seat {new_seat.seat_number}** (Floor {new_seat.floor}).",
            "transfer_seat",
            {"employee_name": emp.name, "old_seat": old_seat_info, "new_seat": new_seat.seat_number}
        )
    return f"Failed to transfer seat: {msg}", "transfer_seat", {}


def _handle_dashboard_summary(db: Session, params: dict) -> tuple:
    total_employees = db.query(models.Employee).count()
    total_projects = db.query(models.Project).count()
    total_seats = db.query(models.Seat).count()
    occupied = db.query(models.Seat).filter(models.Seat.status == "occupied").count()
    vacant = total_seats - occupied
    rate = (occupied / total_seats * 100) if total_seats > 0 else 0

    # Count active employees
    active = db.query(models.Employee).filter(models.Employee.status == "active").count()

    # Department with most employees
    top_dept = db.query(
        models.Employee.department,
        func.count(models.Employee.id).label("cnt")
    ).group_by(models.Employee.department).order_by(func.count(models.Employee.id).desc()).first()

    result = f"**🏢 Office Dashboard Summary**\n\n"
    result += f"**Employees:** {total_employees} total ({active} active)\n"
    result += f"**Projects:** {total_projects}\n"
    result += f"**Total Seats:** {total_seats}\n"
    result += f"**Occupied Seats:** {occupied}\n"
    result += f"**Available Seats:** {vacant}\n"
    result += f"**Seat Utilization:** {rate:.1f}%\n"

    if top_dept:
        result += f"\n**Largest Department:** {top_dept[0]} ({top_dept[1]} employees)"

    return result, "dashboard_summary", {
        "total_employees": total_employees,
        "total_projects": total_projects,
        "occupied_seats": occupied,
        "vacant_seats": vacant,
        "utilization_rate": round(rate, 1)
    }


def _handle_recent_joiners(db: Session, params: dict) -> tuple:
    from datetime import datetime, timedelta
    cutoff = datetime.now().date() - timedelta(days=30)

    recent = db.query(models.Employee).filter(
        models.Employee.joining_date >= cutoff
    ).order_by(models.Employee.joining_date.desc()).all()

    if not recent:
        # If no recent joiners in last 30 days, show last 10 by joining_date
        recent = db.query(models.Employee).order_by(
            models.Employee.joining_date.desc()
        ).limit(10).all()

        if not recent:
            return "No employee records found.", "recent_joiners", {}

        result = "No employees joined in the last 30 days. Here are the most recent joiners:\n\n"
    else:
        result = f"**{len(recent)} employees** joined in the last 30 days:\n\n"

    for emp in recent[:20]:
        result += f"• **{emp.name}** ({emp.employee_code}) — {emp.department}, Joined: {emp.joining_date}\n"

    if len(recent) > 20:
        result += f"\n...and {len(recent) - 20} more."

    return result.strip(), "recent_joiners", {"count": len(recent)}


def _handle_unknown(db: Session, params: dict) -> tuple:
    query = params.get("original_query", "your question")
    return (
        f"I'm not sure how to interpret \"{query}\". I can help you with:\n\n"
        "• **Searching employees** by name, department, or designation\n"
        "• **Finding seat information** — who sits where, vacant seats, utilization\n"
        "• **Project details** — team members, utilization, statistics\n"
        "• **Allocating or releasing seats** for employees\n"
        "• **Dashboard summaries** of the entire office\n\n"
        "Try asking something like \"find employee Anmol\" or \"show vacant seats on floor 2\".",
        "unknown", {}
    )


# ═══════════════════════════════════════════════════════════════════
#  INTENT DISPATCHER
# ═══════════════════════════════════════════════════════════════════

INTENT_HANDLERS = {
    "search_employee": _handle_search_employee,
    "employee_details": _handle_employee_details,
    "employee_seat": _handle_employee_seat,
    "employee_project": _handle_employee_project,
    "search_department": _handle_search_department,
    "search_designation": _handle_search_designation,
    "search_floor": _handle_search_floor,
    "search_seat": _handle_search_seat,
    "search_project": _handle_search_project,
    "available_seats": _handle_available_seats,
    "seat_utilization": _handle_seat_utilization,
    "project_stats": _handle_project_stats,
    "highest_utilization_project": _handle_highest_utilization,
    "allocate_seat": _handle_allocate_seat,
    "release_seat": _handle_release_seat,
    "transfer_seat": _handle_transfer_seat,
    "dashboard_summary": _handle_dashboard_summary,
    "recent_joiners": _handle_recent_joiners,
    "unknown": _handle_unknown,
}


def handle_intent(db: Session, intent_data: dict) -> tuple:
    """Dispatch to the correct handler based on extracted intent."""
    intent = intent_data.get("intent", "unknown")
    params = intent_data.get("params", {})

    handler = INTENT_HANDLERS.get(intent, _handle_unknown)
    try:
        return handler(db, params)
    except Exception as e:
        print(f"[AI] Handler error for intent '{intent}': {e}")
        return (
            f"I understood your request but encountered an error processing it. Please try again.",
            intent, {"error": str(e)}
        )


# ═══════════════════════════════════════════════════════════════════
#  API ENDPOINT
# ═══════════════════════════════════════════════════════════════════

@router.post("/chat", response_model=schemas.AIChatResponse)
def handle_chat_query(payload: schemas.AIChatRequest, db: Session = Depends(get_db)):
    """
    LLM-driven natural language office assistant.
    
    Flow: User Query → LLM Intent Extraction → ORM Handler → Conversational Response
    """
    message = payload.message.strip()
    if not message:
        return schemas.AIChatResponse(
            response="Please type a message to get started!",
            action_taken=None,
            action_details=None
        )

    # Convert history to plain dicts for the LLM
    history = []
    if payload.history:
        history = [{"role": m.role, "content": m.content} for m in payload.history]

    # Step 1: Extract intent using LLM
    print(f"[AI] User query: {message}")
    intent_data = extract_intent(message, history)
    print(f"[AI] Extracted intent: {intent_data}")

    # Step 2: Execute the corresponding handler
    response, action, details = handle_intent(db, intent_data)

    return schemas.AIChatResponse(
        response=response,
        action_taken=action,
        action_details=details
    )
