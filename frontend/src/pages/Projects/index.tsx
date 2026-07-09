import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { projectService } from '../../services/api';
import type { Project, ProjectCreate } from '../../types';
import { 
  Search, 
  Plus, 
  Edit2, 
  Trash2, 
  ChevronLeft, 
  ChevronRight, 
  FolderGit, 
  User, 
  Layers
} from 'lucide-react';
import { showToastGlobal } from '../../App';

export default function Projects() {
  const queryClient = useQueryClient();

  // State variables for search, filter and page
  const [page, setPage] = useState(1);
  const [size] = useState(8); // Grid layout, 8 is clean
  const [search, setSearch] = useState('');
  const [selectedDept, setSelectedDept] = useState('');
  const [sortBy] = useState('id');
  const [sortOrder] = useState<'asc' | 'desc'>('asc');

  // Modal Dialog states
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [currentProject, setCurrentProject] = useState<Project | null>(null);

  // Form state
  const [formData, setFormData] = useState<Partial<Project>>({
    name: '',
    manager: '',
    department: 'Engineering',
    capacity: 50
  });

  // Fetch projects list
  const { data, isLoading } = useQuery({
    queryKey: ['projects', page, search, selectedDept, sortBy, sortOrder],
    queryFn: () => projectService.getProjects(
      page,
      size,
      search,
      selectedDept,
      sortBy,
      sortOrder
    ),
  });

  // Create Project Mutation
  const createMutation = useMutation({
    mutationFn: projectService.createProject,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardData'] });
      showToastGlobal(`Project "${data.name}" created successfully`, 'success');
      setIsCreateOpen(false);
    },
    onError: (err: any) => {
      showToastGlobal(err.response?.data?.detail || 'Error creating project', 'error');
    }
  });

  // Update Project Mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, proj }: { id: number, proj: any }) => projectService.updateProject(id, proj),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardData'] });
      showToastGlobal(`Project "${data.name}" updated successfully`, 'success');
      setIsEditOpen(false);
    },
    onError: (err: any) => {
      showToastGlobal(err.response?.data?.detail || 'Error updating project', 'error');
    }
  });

  // Delete Project Mutation
  const deleteMutation = useMutation({
    mutationFn: projectService.deleteProject,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardData'] });
      showToastGlobal('Project deleted successfully. Team members released.', 'success');
      setIsDeleteOpen(false);
    },
    onError: (err: any) => {
      showToastGlobal(err.response?.data?.detail || 'Error deleting project', 'error');
    }
  });



  const handleOpenCreate = () => {
    setFormData({
      name: '',
      manager: '',
      department: 'Engineering',
      capacity: 50
    });
    setIsCreateOpen(true);
  };

  const handleOpenEdit = (proj: Project) => {
    setCurrentProject(proj);
    setFormData({
      name: proj.name,
      manager: proj.manager,
      department: proj.department,
      capacity: proj.capacity
    });
    setIsEditOpen(true);
  };

  const handleOpenDelete = (proj: Project) => {
    setCurrentProject(proj);
    setIsDeleteOpen(true);
  };

  const handleSaveCreate = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(formData as ProjectCreate);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentProject) return;
    updateMutation.mutate({ id: currentProject.id, proj: formData });
  };

  const handleConfirmDelete = () => {
    if (!currentProject) return;
    deleteMutation.mutate(currentProject.id);
  };

  const DEPARTMENTS = [
    "Engineering", "Product", "Design", "Marketing", "Sales",
    "Customer Success", "Human Resources", "Finance", "Legal", "Operations",
    "QA", "DevOps", "Data Science", "Security", "IT Support",
    "Research & Development", "Facilities", "Procurement", "Executive", "Training"
  ];

  return (
    <div className="space-y-6">
      
      {/* Search & Actions Control */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          {/* Search box */}
          <div className="relative max-w-xs w-full">
            <Search size={16} className="absolute left-3 top-3 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search project or manager..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="w-full bg-card border border-border rounded-xl pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          {/* Department Filter */}
          <select
            value={selectedDept}
            onChange={(e) => { setSelectedDept(e.target.value); setPage(1); }}
            className="bg-card border border-border rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="">All Departments</option>
            {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>

        {/* Add Project Button */}
        <button
          onClick={handleOpenCreate}
          className="flex items-center gap-2 bg-primary text-primary-foreground font-semibold px-4 py-2 rounded-xl text-sm transition-transform hover:scale-[1.02] shadow-md shadow-primary/20"
        >
          <Plus size={16} />
          <span>New Project</span>
        </button>
      </div>

      {/* Projects Grid Display */}
      {isLoading ? (
        // Grid Loading Skeleton
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-pulse">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-56 bg-muted rounded-2xl"></div>
          ))}
        </div>
      ) : data && data.items.length > 0 ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {data.items.map((proj) => {
              const utilRate = proj.capacity > 0 ? Math.round((proj.current_employees_count / proj.capacity) * 100) : 0;
              let barColor = 'bg-primary';
              if (utilRate > 90) barColor = 'bg-red-500';
              else if (utilRate > 75) barColor = 'bg-amber-400';
              else if (utilRate > 0) barColor = 'bg-emerald-400';

              return (
                <div key={proj.id} className="glass-panel rounded-2xl p-5 flex flex-col justify-between hover:shadow-premium transition-shadow duration-300 relative group">
                  
                  {/* Top segment */}
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="p-2 bg-primary/10 rounded-lg text-primary">
                        <FolderGit size={18} />
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleOpenEdit(proj)}
                          className="p-1 rounded bg-card hover:bg-muted text-muted-foreground hover:text-foreground border border-border"
                          title="Edit Project"
                        >
                          <Edit2 size={12} />
                        </button>
                        <button
                          onClick={() => handleOpenDelete(proj)}
                          className="p-1 rounded bg-card hover:bg-red-500/10 text-red-400 hover:text-red-300 border border-border"
                          title="Delete Project"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-bold text-sm tracking-tight truncate" title={proj.name}>
                        {proj.name}
                      </h4>
                      <span className="inline-block px-1.5 py-0.5 mt-1 rounded bg-muted text-[10px] text-muted-foreground">
                        {proj.department}
                      </span>
                    </div>
                  </div>

                  {/* Middle / Info segment */}
                  <div className="my-4 py-3 border-y border-border/50 space-y-2 text-xs">
                    <div className="flex items-center justify-between text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <User size={12} />
                        <span>Manager</span>
                      </div>
                      <span className="font-semibold text-foreground truncate max-w-[120px]">{proj.manager}</span>
                    </div>
                    <div className="flex items-center justify-between text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <Layers size={12} />
                        <span>Headcount</span>
                      </div>
                      <span className="font-semibold text-foreground">{proj.current_employees_count} / {proj.capacity}</span>
                    </div>
                  </div>

                  {/* Bottom / Utilization Progress Bar */}
                  <div className="space-y-1">
                    <div className="flex justify-between items-center text-xs font-semibold">
                      <span className="text-muted-foreground">Utilization</span>
                      <span className="text-foreground">{utilRate}%</span>
                    </div>
                    <div className="w-full bg-border rounded-full h-1.5 overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ${barColor}`} 
                        style={{ width: `${Math.min(utilRate, 100)}%` }}
                      ></div>
                    </div>
                  </div>

                </div>
              );
            })}
          </div>

          {/* Pagination bar */}
          {data.pages > 1 && (
            <div className="flex justify-between items-center py-4 border-t border-border mt-6">
              <span className="text-xs text-muted-foreground">
                Showing Page <span className="font-semibold text-foreground">{page}</span> of <span className="font-semibold text-foreground">{data.pages}</span> ({data.total} total projects)
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage(p => Math.max(p - 1, 1))}
                  disabled={page === 1}
                  className="p-1.5 rounded-lg border border-border bg-card hover:bg-muted disabled:opacity-50 transition-colors"
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  onClick={() => setPage(p => Math.min(p + 1, data.pages))}
                  disabled={page === data.pages}
                  className="p-1.5 rounded-lg border border-border bg-card hover:bg-muted disabled:opacity-50 transition-colors"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-12 text-muted-foreground">
          No projects found matching the criteria.
        </div>
      )}

      {/* CREATE MODAL */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-card border border-border rounded-2xl max-w-sm w-full overflow-hidden shadow-2xl">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between">
              <h3 className="text-lg font-bold">Create New Project</h3>
              <button className="text-muted-foreground hover:text-foreground" onClick={() => setIsCreateOpen(false)}>✕</button>
            </div>
            <form onSubmit={handleSaveCreate} className="p-6 space-y-4">
              <div>
                <label className="block text-xs text-muted-foreground mb-1.5 font-bold uppercase">Project Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Project Alpha"
                  value={formData.name || ''}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-muted/30 border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-xs text-muted-foreground mb-1.5 font-bold uppercase">Project Manager</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sarah Connor"
                  value={formData.manager || ''}
                  onChange={(e) => setFormData({ ...formData, manager: e.target.value })}
                  className="w-full bg-muted/30 border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

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
                <label className="block text-xs text-muted-foreground mb-1.5 font-bold uppercase">Capacity Limits</label>
                <input
                  type="number"
                  required
                  min={1}
                  value={formData.capacity || 50}
                  onChange={(e) => setFormData({ ...formData, capacity: Number(e.target.value) })}
                  className="w-full bg-muted/30 border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                />
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
                  {createMutation.isPending ? 'Creating...' : 'Create Project'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {isEditOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-card border border-border rounded-2xl max-w-sm w-full overflow-hidden shadow-2xl">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between">
              <h3 className="text-lg font-bold">Edit Project Details</h3>
              <button className="text-muted-foreground hover:text-foreground" onClick={() => setIsEditOpen(false)}>✕</button>
            </div>
            <form onSubmit={handleSaveEdit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs text-muted-foreground mb-1.5 font-bold uppercase">Project Name</label>
                <input
                  type="text"
                  required
                  value={formData.name || ''}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-muted/30 border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-xs text-muted-foreground mb-1.5 font-bold uppercase">Project Manager</label>
                <input
                  type="text"
                  required
                  value={formData.manager || ''}
                  onChange={(e) => setFormData({ ...formData, manager: e.target.value })}
                  className="w-full bg-muted/30 border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-xs text-muted-foreground mb-1.5 font-bold uppercase">Department</label>
                <select
                  value={formData.department || ''}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  className="w-full bg-muted/30 border border-border rounded-xl px-3 py-2 text-sm focus:outline-none"
                  disabled
                />
              </div>

              <div>
                <label className="block text-xs text-muted-foreground mb-1.5 font-bold uppercase">Capacity Limits</label>
                <input
                  type="number"
                  required
                  min={1}
                  value={formData.capacity || 50}
                  onChange={(e) => setFormData({ ...formData, capacity: Number(e.target.value) })}
                  className="w-full bg-muted/30 border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                />
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
              Are you sure you want to delete the project <strong>{currentProject?.name}</strong>? All mapped employees will have their project set to N/A. Their seat allocations will not be released.
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
