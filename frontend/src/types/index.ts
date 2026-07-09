export interface Employee {
  id: number;
  employee_code: string;
  name: string;
  email: string;
  department: string;
  designation: string;
  project_id: number | null;
  seat_id: number | null;
  joining_date: string;
  status: 'active' | 'inactive' | 'on_leave';
  project_name: string | null;
  seat_number: string | null;
  seat_floor: number | null;
}

export interface EmployeeCreate {
  employee_code: string;
  name: string;
  email: string;
  department: string;
  designation: string;
  project_id?: number | null;
  seat_id?: number | null;
  joining_date: string;
  status: 'active' | 'inactive' | 'on_leave';
}

export interface EmployeeUpdate {
  employee_code?: string;
  name?: string;
  email?: string;
  department?: string;
  designation?: string;
  project_id?: number | null;
  seat_id?: number | null;
  joining_date?: string;
  status?: 'active' | 'inactive' | 'on_leave';
}

export interface Project {
  id: number;
  name: string;
  manager: string;
  department: string;
  capacity: number;
  current_employees_count: number;
}

export interface ProjectCreate {
  name: string;
  manager: string;
  department: string;
  capacity: number;
}

export interface ProjectUpdate {
  name?: string;
  manager?: string;
  department?: string;
  capacity?: number;
}

export interface Seat {
  id: number;
  floor: number;
  seat_number: string;
  status: 'vacant' | 'occupied';
  employee_id: number | null;
  employee_name: string | null;
  employee_code: string | null;
}

export interface AllocationHistory {
  id: number;
  employee_id: number;
  seat_id: number;
  allocated_at: string;
  released_at: string | null;
  employee_name: string;
  employee_code: string;
  seat_number: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  size: number;
  pages: number;
}

export interface DashboardMetrics {
  total_employees: number;
  total_projects: number;
  occupied_seats: number;
  vacant_seats: number;
  utilization_rate: number;
  new_joiners_count: number;
}

export interface DistributionItem {
  name: string;
  value: number;
}

export interface SeatOccupancyStats {
  floor: number;
  occupied: number;
  vacant: number;
  total: number;
}

export interface DashboardData {
  metrics: DashboardMetrics;
  department_distribution: DistributionItem[];
  project_distribution: DistributionItem[];
  seat_occupancy: SeatOccupancyStats[];
}

export interface AIChatResponse {
  response: string;
  action_taken: string | null;
  action_details: Record<string, any> | null;
}
