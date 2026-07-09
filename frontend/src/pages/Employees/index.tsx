import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { employeeService, projectService, seatService } from '../../services/api';
import type { Employee, EmployeeCreate } from '../../types';
import { 
  Search, 
  Plus, 
  Edit2, 
  Trash2, 
  ChevronLeft, 
  ChevronRight, 
  Download,
  Filter,
  User,
  ArrowUpDown,
  Sparkles
} from 'lucide-react';
import { showToastGlobal } from '../../App';

export default function Employees() {
  const queryClient = useQueryClient();

  // State variables for pagination, search, filter and sort
  const [page, setPage] = useState(1);
  const [size] = useState(10);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedDept, setSelectedDept] = useState('');
  const [selectedProj, setSelectedProj] = useState<number | null>(null);
  const [selectedStatus, setSelectedStatus] = useState('');
  const [sortBy, setSortBy] = useState('id');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Modal Dialog states
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  
  // Active employee for Edit/Delete
  const [currentEmployee, setCurrentEmployee] = useState<Employee | null>(null);

  // Form states for Create/Edit
  const [formData, setFormData] = useState<Partial<Employee>>({
    employee_code: '',
    name: '',
    email: '',
    department: 'Engineering',
    designation: '',
    project_id: null,
    seat_id: null,
    joining_date: new Date().toISOString().split('T')[0],
    status: 'active'
  });

  // Debouncing search query (Nice Extra)
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1); // Reset to page 1 on search
    }, 500);
    return () => clearTimeout(handler);
  }, [search]);

  // Fetch employees list
  const { data, isLoading } = useQuery({
    queryKey: ['employees', page, debouncedSearch, selectedDept, selectedProj, selectedStatus, sortBy, sortOrder],
    queryFn: () => employeeService.getEmployees(
      page,
      size,
      debouncedSearch,
      selectedDept,
      selectedProj,
      selectedStatus,
      sortBy,
      sortOrder
    ),
  });

  // Fetch projects (for project assignment options)
  const { data: projectsData } = useQuery({
    queryKey: ['projectsDropdown'],
    queryFn: () => projectService.getProjects(1, 100),
  });

  // Fetch vacant seats (for seat assignment dropdown)
  const { data: seatsData } = useQuery({
    queryKey: ['vacantSeatsDropdown'],
    queryFn: () => seatService.getSeats(undefined, 'vacant'),
  });

  // Create Employee Mutation
  const createMutation = useMutation({
    mutationFn: employeeService.createEmployee,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardData'] });
      showToastGlobal(`Employee ${data.name} created successfully`, 'success');
      setIsCreateOpen(false);
    },
    onError: (err: any) => {
      showToastGlobal(err.response?.data?.detail || 'Error creating employee', 'error');
    }
  });

  // Update Employee Mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, emp }: { id: number, emp: any }) => employeeService.updateEmployee(id, emp),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardData'] });
      showToastGlobal(`Employee ${data.name} updated successfully`, 'success');
      setIsEditOpen(false);
    },
    onError: (err: any) => {
      showToastGlobal(err.response?.data?.detail || 'Error updating employee', 'error');
    }
  });

  // Delete Employee Mutation
  const deleteMutation = useMutation({
    mutationFn: employeeService.deleteEmployee,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardData'] });
      showToastGlobal('Employee deleted successfully', 'success');
      setIsDeleteOpen(false);
    },
    onError: (err: any) => {
      showToastGlobal(err.response?.data?.detail || 'Error deleting employee', 'error');
    }
  });

  // Trigger Automatic seat allocation
  const autoAllocateMutation = useMutation({
    mutationFn: seatService.autoAllocateSeat,
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardData'] });
      showToastGlobal(res.message, 'success');
    },
    onError: (err: any) => {
      showToastGlobal(err.response?.data?.detail || 'Failed to auto allocate seat', 'error');
    }
  });

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
    setPage(1);
  };

  const handleOpenCreate = () => {
    // Generate a default code
    const randomCode = 'EMP' + Math.floor(1000 + Math.random() * 9000).toString();
    setFormData({
      employee_code: randomCode,
      name: '',
      email: '',
      department: 'Engineering',
      designation: '',
      project_id: null,
      seat_id: null,
      joining_date: new Date().toISOString().split('T')[0],
      status: 'active'
    });
    setIsCreateOpen(true);
  };

  const handleOpenEdit = (emp: Employee) => {
    setCurrentEmployee(emp);
    setFormData({
      employee_code: emp.employee_code,
      name: emp.name,
      email: emp.email,
      department: emp.department,
      designation: emp.designation,
      project_id: emp.project_id,
      seat_id: emp.seat_id,
      joining_date: emp.joining_date,
      status: emp.status
    });
    setIsEditOpen(true);
  };

  const handleOpenDelete = (emp: Employee) => {
    setCurrentEmployee(emp);
    setIsDeleteOpen(true);
  };

  const handleSaveCreate = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(formData as EmployeeCreate);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentEmployee) return;
    updateMutation.mutate({ id: currentEmployee.id, emp: formData });
  };

  const handleConfirmDelete = () => {
    if (!currentEmployee) return;
    deleteMutation.mutate(currentEmployee.id);
  };

  const handleExportCSV = async () => {
    try {
      // Fetch currently filtered list without page bounds (e.g. fetch first 1000 items)
      const res = await employeeService.getEmployees(
        1,
        1000,
        debouncedSearch,
        selectedDept,
        selectedProj,
        selectedStatus,
        sortBy,
        sortOrder
      );
      
      const headers = ['Code', 'Name', 'Email', 'Department', 'Designation', 'Project', 'Seat', 'Status', 'Joining Date'];
      const csvContent = "data:text/csv;charset=utf-8," 
        + [
            headers.join(','),
            ...res.items.map(e => [
              `"${e.employee_code}"`,
              `"${e.name}"`,
              `"${e.email}"`,
              `"${e.department}"`,
              `"${e.designation}"`,
              `"${e.project_name || 'N/A'}"`,
              `"${e.seat_number || 'N/A'}"`,
              `"${e.status}"`,
              e.joining_date
            ].join(','))
          ].join('\n');
          
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `employees_export_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showToastGlobal('Employee records exported to CSV', 'success');
    } catch (err) {
      showToastGlobal('Failed to export employee data', 'error');
    }
  };

  const DEPARTMENTS = [
    "Engineering", "Product", "Design", "Marketing", "Sales",
    "Customer Success", "Human Resources", "Finance", "Legal", "Operations",
    "QA", "DevOps", "Data Science", "Security", "IT Support",
    "Research & Development", "Facilities", "Procurement", "Executive", "Training"
  ];

  return (
    <div className="space-y-6">
      
      {/* Control panel */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        {/* Search */}
        <div className="relative max-w-sm w-full">
          <Search size={18} className="absolute left-3.5 top-3.5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by name, ID, desk, project..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-card border border-border rounded-xl pl-11 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary transition-all duration-200"
          />
        </div>

        {/* Filters and Actions */}
        <div className="flex flex-wrap items-center gap-3">
          
          {/* Department Filter */}
          <div className="flex items-center gap-2">
            <Filter size={14} className="text-muted-foreground" />
            <select
              value={selectedDept}
              onChange={(e) => { setSelectedDept(e.target.value); setPage(1); }}
              className="bg-card border border-border rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="">All Departments</option>
              {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>

          {/* Project Filter */}
          <select
            value={selectedProj === null ? '' : selectedProj}
            onChange={(e) => { setSelectedProj(e.target.value ? Number(e.target.value) : null); setPage(1); }}
            className="bg-card border border-border rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="">All Projects</option>
            {projectsData?.items.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => { setSelectedStatus(e.target.value); setPage(1); }}
            className="bg-card border border-border rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="">All Statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="on_leave">On Leave</option>
          </select>

          {/* CSV Export */}
          <button
            onClick={handleExportCSV}
            className="p-2.5 rounded-xl border border-border bg-card hover:bg-muted text-muted-foreground hover:text-foreground transition-all duration-200"
            title="Export CSV"
          >
            <Download size={16} />
          </button>

          {/* Add Employee */}
          <button
            onClick={handleOpenCreate}
            className="flex items-center gap-2 bg-primary text-primary-foreground font-semibold px-4 py-2.5 rounded-xl text-sm transition-transform duration-200 hover:scale-[1.02] active:scale-[0.98] shadow-md shadow-primary/25"
          >
            <Plus size={16} />
            <span>Add Employee</span>
          </button>
        </div>
      </div>

      {/* Employees Table */}
      <div className="glass-panel rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border bg-muted/30 text-muted-foreground text-xs uppercase font-bold tracking-wider">
                <th className="px-6 py-4 cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => handleSort('employee_code')}>
                  <div className="flex items-center gap-1.5">
                    <span>ID Code</span>
                    <ArrowUpDown size={12} />
                  </div>
                </th>
                <th className="px-6 py-4 cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => handleSort('name')}>
                  <div className="flex items-center gap-1.5">
                    <span>Name</span>
                    <ArrowUpDown size={12} />
                  </div>
                </th>
                <th className="px-6 py-4 cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => handleSort('department')}>
                  <div className="flex items-center gap-1.5">
                    <span>Department</span>
                    <ArrowUpDown size={12} />
                  </div>
                </th>
                <th className="px-6 py-4 cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => handleSort('designation')}>
                  <div className="flex items-center gap-1.5">
                    <span>Designation</span>
                    <ArrowUpDown size={12} />
                  </div>
                </th>
                <th className="px-6 py-4 cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => handleSort('project_name')}>
                  <div className="flex items-center gap-1.5">
                    <span>Project Mapping</span>
                    <ArrowUpDown size={12} />
                  </div>
                </th>
                <th className="px-6 py-4 cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => handleSort('seat_number')}>
                  <div className="flex items-center gap-1.5">
                    <span>Seat Desk</span>
                    <ArrowUpDown size={12} />
                  </div>
                </th>
                <th className="px-6 py-4 cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => handleSort('status')}>
                  <div className="flex items-center gap-1.5">
                    <span>Status</span>
                    <ArrowUpDown size={12} />
                  </div>
                </th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border text-sm">
              {isLoading ? (
                // Table skeleton
                [1, 2, 3, 4, 5].map(i => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-6 py-4"><div className="h-4 w-12 bg-muted rounded"></div></td>
                    <td className="px-6 py-4"><div className="h-4 w-24 bg-muted rounded"></div></td>
                    <td className="px-6 py-4"><div className="h-4 w-20 bg-muted rounded"></div></td>
                    <td className="px-6 py-4"><div className="h-4 w-24 bg-muted rounded"></div></td>
                    <td className="px-6 py-4"><div className="h-4 w-20 bg-muted rounded"></div></td>
                    <td className="px-6 py-4"><div className="h-4 w-12 bg-muted rounded"></div></td>
                    <td className="px-6 py-4"><div className="h-5 w-16 bg-muted rounded-full"></div></td>
                    <td className="px-6 py-4 text-right"><div className="h-8 w-16 bg-muted rounded ml-auto"></div></td>
                  </tr>
                ))
              ) : data && data.items.length > 0 ? (
                data.items.map((emp) => (
                  <tr key={emp.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-6 py-4 font-mono text-xs font-semibold text-primary">{emp.employee_code}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                          <User size={14} />
                        </div>
                        <div>
                          <span className="block font-semibold">{emp.name}</span>
                          <span className="block text-xs text-muted-foreground">{emp.email}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">{emp.department}</td>
                    <td className="px-6 py-4 text-muted-foreground">{emp.designation}</td>
                    <td className="px-6 py-4">
                      {emp.project_name ? (
                        <span className="inline-flex px-2 py-1 rounded bg-blue-500/10 border border-blue-500/20 text-xs font-medium text-blue-400">
                          {emp.project_name}
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {emp.seat_number ? (
                        <div className="flex flex-col">
                          <span className="font-mono text-xs font-semibold text-emerald-400">{emp.seat_number}</span>
                          <span className="text-[10px] text-muted-foreground">Floor {emp.seat_floor}</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <span className="text-muted-foreground text-xs">Unallocated</span>
                          <button
                            onClick={() => autoAllocateMutation.mutate(emp.id)}
                            className="p-1 rounded bg-violet-500/20 hover:bg-violet-500/30 text-violet-400 border border-violet-500/20 text-[10px] flex items-center gap-1"
                            title="Auto Allocate Seat"
                            disabled={autoAllocateMutation.isPending}
                          >
                            <Sparkles size={10} />
                            <span>Auto</span>
                          </button>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2 py-1 rounded-full text-xs font-semibold
                        ${emp.status === 'active' ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400' : ''}
                        ${emp.status === 'inactive' ? 'bg-slate-500/10 border border-slate-500/20 text-slate-400' : ''}
                        ${emp.status === 'on_leave' ? 'bg-amber-500/10 border border-amber-500/20 text-amber-400' : ''}
                      `}>
                        {emp.status === 'on_leave' ? 'On Leave' : emp.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleOpenEdit(emp)}
                          className="p-1.5 rounded-lg border border-border bg-card text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                          title="Edit Employee"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={() => handleOpenDelete(emp)}
                          className="p-1.5 rounded-lg border border-border bg-card text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors"
                          title="Delete Employee"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-muted-foreground">
                    No employees found matching the filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        {data && data.pages > 1 && (
          <div className="px-6 py-4 border-t border-border flex items-center justify-between bg-muted/10">
            <span className="text-xs text-muted-foreground">
              Showing Page <span className="font-semibold text-foreground">{page}</span> of <span className="font-semibold text-foreground">{data.pages}</span> ({data.total} total employees)
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(p - 1, 1))}
                disabled={page === 1}
                className="p-1.5 rounded-lg border border-border bg-card hover:bg-muted disabled:opacity-50 disabled:pointer-events-none transition-colors"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={() => setPage(p => Math.min(p + 1, data.pages))}
                disabled={page === data.pages}
                className="p-1.5 rounded-lg border border-border bg-card hover:bg-muted disabled:opacity-50 disabled:pointer-events-none transition-colors"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* CREATE MODAL */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-card border border-border rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between">
              <h3 className="text-lg font-bold">Add New Employee</h3>
              <button className="text-muted-foreground hover:text-foreground" onClick={() => setIsCreateOpen(false)}>✕</button>
            </div>
            <form onSubmit={handleSaveCreate} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-muted-foreground mb-1.5 font-bold uppercase">Employee Code</label>
                  <input
                    type="text"
                    required
                    value={formData.employee_code || ''}
                    onChange={(e) => setFormData({ ...formData, employee_code: e.target.value })}
                    className="w-full bg-muted/30 border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1.5 font-bold uppercase">Name</label>
                  <input
                    type="text"
                    required
                    value={formData.name || ''}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full bg-muted/30 border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-muted-foreground mb-1.5 font-bold uppercase">Email Address</label>
                <input
                  type="email"
                  required
                  value={formData.email || ''}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full bg-muted/30 border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-muted-foreground mb-1.5 font-bold uppercase">Department</label>
                  <select
                    value={formData.department || ''}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    className="w-full bg-muted/30 border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1.5 font-bold uppercase">Designation</label>
                  <input
                    type="text"
                    required
                    value={formData.designation || ''}
                    onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                    className="w-full bg-muted/30 border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-muted-foreground mb-1.5 font-bold uppercase">Project Mapping</label>
                  <select
                    value={formData.project_id || ''}
                    onChange={(e) => setFormData({ ...formData, project_id: e.target.value ? Number(e.target.value) : null })}
                    className="w-full bg-muted/30 border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="">No Project Assigned</option>
                    {projectsData?.items.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1.5 font-bold uppercase">Seat Assignment</label>
                  <select
                    value={formData.seat_id || ''}
                    onChange={(e) => setFormData({ ...formData, seat_id: e.target.value ? Number(e.target.value) : null })}
                    className="w-full bg-muted/30 border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="">No Seat Assigned</option>
                    {seatsData?.map(s => <option key={s.id} value={s.id}>{s.seat_number} (Floor {s.floor})</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-muted-foreground mb-1.5 font-bold uppercase">Joining Date</label>
                  <input
                    type="date"
                    required
                    value={formData.joining_date || ''}
                    onChange={(e) => setFormData({ ...formData, joining_date: e.target.value })}
                    className="w-full bg-muted/30 border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1.5 font-bold uppercase">Status</label>
                  <select
                    value={formData.status || ''}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                    className="w-full bg-muted/30 border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="on_leave">On Leave</option>
                  </select>
                </div>
              </div>

              <div className="pt-4 border-t border-border flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 border border-border rounded-xl text-sm font-semibold hover:bg-muted transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="px-4 py-2 bg-primary text-primary-foreground font-semibold rounded-xl text-sm transition-colors shadow-md shadow-primary/10 hover:bg-primary/95"
                >
                  {createMutation.isPending ? 'Saving...' : 'Add Employee'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {isEditOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-card border border-border rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between">
              <h3 className="text-lg font-bold">Edit Employee</h3>
              <button className="text-muted-foreground hover:text-foreground" onClick={() => setIsEditOpen(false)}>✕</button>
            </div>
            <form onSubmit={handleSaveEdit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-muted-foreground mb-1.5 font-bold uppercase">Employee Code</label>
                  <input
                    type="text"
                    required
                    value={formData.employee_code || ''}
                    onChange={(e) => setFormData({ ...formData, employee_code: e.target.value })}
                    className="w-full bg-muted/30 border border-border rounded-xl px-3 py-2 text-sm focus:outline-none"
                    disabled
                  />
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1.5 font-bold uppercase">Name</label>
                  <input
                    type="text"
                    required
                    value={formData.name || ''}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full bg-muted/30 border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-muted-foreground mb-1.5 font-bold uppercase">Email Address</label>
                <input
                  type="email"
                  required
                  value={formData.email || ''}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full bg-muted/30 border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-muted-foreground mb-1.5 font-bold uppercase">Department</label>
                  <select
                    value={formData.department || ''}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    className="w-full bg-muted/30 border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1.5 font-bold uppercase">Designation</label>
                  <input
                    type="text"
                    required
                    value={formData.designation || ''}
                    onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                    className="w-full bg-muted/30 border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-muted-foreground mb-1.5 font-bold uppercase">Project Mapping</label>
                  <select
                    value={formData.project_id || ''}
                    onChange={(e) => setFormData({ ...formData, project_id: e.target.value ? Number(e.target.value) : null })}
                    className="w-full bg-muted/30 border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="">No Project Assigned</option>
                    {projectsData?.items.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1.5 font-bold uppercase">Seat Assignment</label>
                  <select
                    value={formData.seat_id || ''}
                    onChange={(e) => setFormData({ ...formData, seat_id: e.target.value ? Number(e.target.value) : null })}
                    className="w-full bg-muted/30 border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="">No Seat Assigned</option>
                    {currentEmployee?.seat_id && (
                      <option value={currentEmployee.seat_id}>
                        {currentEmployee.seat_number} (Current)
                      </option>
                    )}
                    {seatsData?.map(s => <option key={s.id} value={s.id}>{s.seat_number} (Floor {s.floor})</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-muted-foreground mb-1.5 font-bold uppercase">Joining Date</label>
                  <input
                    type="date"
                    required
                    value={formData.joining_date || ''}
                    onChange={(e) => setFormData({ ...formData, joining_date: e.target.value })}
                    className="w-full bg-muted/30 border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1.5 font-bold uppercase">Status</label>
                  <select
                    value={formData.status || ''}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                    className="w-full bg-muted/30 border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="on_leave">On Leave</option>
                  </select>
                </div>
              </div>

              <div className="pt-4 border-t border-border flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsEditOpen(false)}
                  className="px-4 py-2 border border-border rounded-xl text-sm font-semibold hover:bg-muted transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updateMutation.isPending}
                  className="px-4 py-2 bg-primary text-primary-foreground font-semibold rounded-xl text-sm transition-colors shadow-md shadow-primary/10 hover:bg-primary/95"
                >
                  {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {isDeleteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-card border border-border rounded-2xl max-w-sm w-full overflow-hidden shadow-2xl p-6 space-y-4">
            <h3 className="text-lg font-bold">Confirm Deletion</h3>
            <p className="text-sm text-muted-foreground">
              Are you sure you want to delete employee <strong>{currentEmployee?.name}</strong> ({currentEmployee?.employee_code})? This action is permanent and will release their seat.
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setIsDeleteOpen(false)}
                className="px-4 py-2 border border-border rounded-xl text-sm font-semibold hover:bg-muted transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={deleteMutation.isPending}
                className="px-4 py-2 bg-red-600 text-white font-semibold rounded-xl text-sm hover:bg-red-700 transition-colors"
              >
                {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
