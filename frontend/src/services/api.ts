import axios from 'axios';
import type {
  Employee, EmployeeCreate, EmployeeUpdate,
  Project, ProjectCreate, ProjectUpdate,
  Seat, AllocationHistory,
  PaginatedResponse, DashboardData, AIChatResponse
} from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL 
  ? `${import.meta.env.VITE_API_URL}/api` 
  : 'http://localhost:8000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const dashboardService = {
  getDashboardData: async (): Promise<DashboardData> => {
    const response = await api.get<DashboardData>('/dashboard');
    return response.data;
  },
};

export const employeeService = {
  getEmployees: async (
    page = 1,
    size = 10,
    search = '',
    department = '',
    projectId: number | null = null,
    status = '',
    sortBy = 'id',
    sortOrder = 'asc'
  ): Promise<PaginatedResponse<Employee>> => {
    const params: Record<string, any> = { page, size, search, department, status, sort_by: sortBy, sort_order: sortOrder };
    if (projectId !== null) {
      params.project_id = projectId;
    }
    const response = await api.get<PaginatedResponse<Employee>>('/employees', { params });
    return response.data;
  },

  getEmployee: async (id: number): Promise<Employee> => {
    const response = await api.get<Employee>(`/employees/${id}`);
    return response.data;
  },

  createEmployee: async (employee: EmployeeCreate): Promise<Employee> => {
    const response = await api.post<Employee>('/employees', employee);
    return response.data;
  },

  updateEmployee: async (id: number, employee: EmployeeUpdate): Promise<Employee> => {
    const response = await api.put<Employee>(`/employees/${id}`, employee);
    return response.data;
  },

  deleteEmployee: async (id: number): Promise<Employee> => {
    const response = await api.delete<Employee>(`/employees/${id}`);
    return response.data;
  },
};

export const projectService = {
  getProjects: async (
    page = 1,
    size = 10,
    search = '',
    department = '',
    sortBy = 'id',
    sortOrder = 'asc'
  ): Promise<PaginatedResponse<Project>> => {
    const params = { page, size, search, department, sort_by: sortBy, sort_order: sortOrder };
    const response = await api.get<PaginatedResponse<Project>>('/projects', { params });
    return response.data;
  },

  getProject: async (id: number): Promise<Project> => {
    const response = await api.get<Project>(`/projects/${id}`);
    return response.data;
  },

  createProject: async (project: ProjectCreate): Promise<Project> => {
    const response = await api.post<Project>('/projects', project);
    return response.data;
  },

  updateProject: async (id: number, project: ProjectUpdate): Promise<Project> => {
    const response = await api.put<Project>(`/projects/${id}`, project);
    return response.data;
  },

  deleteProject: async (id: number): Promise<Project> => {
    const response = await api.delete<Project>(`/projects/${id}`);
    return response.data;
  },
};

export const seatService = {
  getSeats: async (floor?: number, status?: string): Promise<Seat[]> => {
    const params: Record<string, any> = {};
    if (floor !== undefined) params.floor = floor;
    if (status !== undefined) params.status = status;
    const response = await api.get<Seat[]>('/seats', { params });
    return response.data;
  },

  allocateSeat: async (employeeId: number, seatId: number): Promise<Seat> => {
    const response = await api.post<Seat>('/seats/allocate', { employee_id: employeeId, seat_id: seatId });
    return response.data;
  },

  releaseSeat: async (seatId: number): Promise<Seat> => {
    const response = await api.post<Seat>('/seats/release', { seat_id: seatId });
    return response.data;
  },

  changeSeat: async (employeeId: number, newSeatId: number): Promise<Seat> => {
    const response = await api.post<Seat>('/seats/change', { employee_id: employeeId, new_seat_id: newSeatId });
    return response.data;
  },

  autoAllocateSeat: async (employeeId: number): Promise<{ success: boolean; message: string; seat: any }> => {
    const response = await api.post('/seats/auto-allocate', { employee_id: employeeId });
    return response.data;
  },

  getAllocationHistory: async (limit = 100): Promise<AllocationHistory[]> => {
    const response = await api.get<AllocationHistory[]>('/seats/history', { params: { limit } });
    return response.data;
  },
};

export const aiService = {
  sendChatMessage: async (message: string, history: { role: string, content: string }[] = []): Promise<AIChatResponse> => {
    const response = await api.post<AIChatResponse>('/ai/chat', { message, history });
    return response.data;
  },
};
