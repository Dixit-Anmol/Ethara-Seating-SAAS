import { useQuery } from '@tanstack/react-query';
import { dashboardService } from '../../services/api';
import { 
  Users, 
  FolderGit, 
  MapPin, 
  Percent, 
  UserPlus, 
  PieChart as PieIcon,
  BarChart3,
  TrendingUp,
  Download
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Legend, 
  PieChart, 
  Pie, 
  Cell, 
  AreaChart, 
  Area 
} from 'recharts';
import { showToastGlobal } from '../../App';

export default function Dashboard() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['dashboardData'],
    queryFn: dashboardService.getDashboardData,
    refetchInterval: 10000, // auto-refresh every 10 seconds
  });

  const handleExportCSV = () => {
    if (!data) return;
    
    // Create CSV content from summary metrics
    const headers = ['Metric', 'Value'];
    const rows = [
      ['Total Employees', data.metrics.total_employees.toString()],
      ['Total Projects', data.metrics.total_projects.toString()],
      ['Occupied Seats', data.metrics.occupied_seats.toString()],
      ['Vacant Seats', data.metrics.vacant_seats.toString()],
      ['Utilization Rate (%)', data.metrics.utilization_rate.toString()],
      ['New Joiners (60d)', data.metrics.new_joiners_count.toString()]
    ];
    
    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
      
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "office_metrics_report.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToastGlobal('Dashboard metrics exported successfully', 'success');
  };

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        {/* Header skeleton */}
        <div className="flex justify-between items-center">
          <div className="h-8 w-48 bg-muted rounded-lg"></div>
          <div className="h-10 w-32 bg-muted rounded-xl"></div>
        </div>
        
        {/* Metric cards skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-32 bg-muted rounded-2xl"></div>
          ))}
        </div>

        {/* Charts skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-[350px] bg-muted rounded-2xl"></div>
          <div className="h-[350px] bg-muted rounded-2xl"></div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center">
        <div className="text-red-400 text-lg font-semibold mb-2">Failed to Load Dashboard Data</div>
        <p className="text-muted-foreground text-sm max-w-md">
          Please check if the FastAPI backend server is running and the database has been seeded.
        </p>
      </div>
    );
  }

  const { metrics, department_distribution, project_distribution, seat_occupancy } = data;

  // Premium HSL-based chart colors
  const COLORS = ['#8b5cf6', '#6366f1', '#3b82f6', '#06b6d4', '#10b981', '#f59e0b', '#ec4899', '#f43f5e', '#a855f7', '#64748b'];

  const metricCards = [
    { name: 'Total Employees', value: metrics.total_employees, icon: Users, color: 'text-violet-400 bg-violet-400/10' },
    { name: 'Active Projects', value: metrics.total_projects, icon: FolderGit, color: 'text-blue-400 bg-blue-400/10' },
    { name: 'Seats (Occ / Vacant)', value: `${metrics.occupied_seats} / ${metrics.vacant_seats}`, icon: MapPin, color: 'text-emerald-400 bg-emerald-400/10' },
    { name: 'Seat Utilization', value: `${metrics.utilization_rate}%`, icon: Percent, color: 'text-amber-400 bg-amber-400/10' },
  ];

  return (
    <div className="space-y-6">
      
      {/* Upper Control Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">At-a-glance</h2>
          <p className="text-muted-foreground text-sm">Real-time statistics of office floor space and assignments.</p>
        </div>
        <button
          onClick={handleExportCSV}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border bg-card hover:bg-muted font-semibold text-sm transition-all duration-200 shadow-sm"
        >
          <Download size={16} />
          <span>Export CSV Summary</span>
        </button>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {metricCards.map((card, i) => {
          const Icon = card.icon;
          return (
            <div 
              key={i} 
              className="glass-panel rounded-2xl p-6 relative overflow-hidden transition-all duration-300 hover:scale-[1.03] hover:shadow-premium"
            >
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground text-sm font-medium">{card.name}</span>
                <div className={`p-2.5 rounded-xl ${card.color}`}>
                  <Icon size={20} />
                </div>
              </div>
              <div className="mt-4">
                <span className="text-3xl font-extrabold tracking-tight">{card.value}</span>
              </div>
              {card.name === 'Total Employees' && (
                <div className="mt-2 flex items-center gap-1 text-xs text-violet-400">
                  <UserPlus size={12} />
                  <span>+{metrics.new_joiners_count} new joiners (60d)</span>
                </div>
              )}
              {card.name === 'Seat Utilization' && (
                <div className="mt-2 w-full bg-border rounded-full h-1.5 overflow-hidden">
                  <div 
                    className="bg-amber-400 h-full rounded-full transition-all duration-500" 
                    style={{ width: `${Math.min(metrics.utilization_rate, 100)}%` }}
                  ></div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Main Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Seat Occupancy by Floor */}
        <div className="glass-panel rounded-2xl p-6 flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-bold text-lg">Seat Utilization by Floor</h3>
              <p className="text-xs text-muted-foreground">Detailed occupancy layout of floors 1 to 5.</p>
            </div>
            <TrendingUp size={20} className="text-primary" />
          </div>
          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={seat_occupancy} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorOccupied" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorVacant" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="floor" tickFormatter={(v) => `Floor ${v}`} stroke="currentColor" className="text-xs opacity-50" />
                <YAxis stroke="currentColor" className="text-xs opacity-50" />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', borderColor: 'rgba(255, 255, 255, 0.1)', borderRadius: '12px', color: '#fff' }}
                />
                <Legend iconType="circle" />
                <Area type="monotone" name="Occupied Seats" dataKey="occupied" stroke="#8b5cf6" fillOpacity={1} fill="url(#colorOccupied)" strokeWidth={2} />
                <Area type="monotone" name="Vacant Seats" dataKey="vacant" stroke="#10b981" fillOpacity={1} fill="url(#colorVacant)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Department Distribution (Pie) */}
        <div className="glass-panel rounded-2xl p-6 flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-bold text-lg">Department Distribution</h3>
              <p className="text-xs text-muted-foreground">Distribution of employees across operations (top departments).</p>
            </div>
            <PieIcon size={20} className="text-primary" />
          </div>
          <div className="h-[280px] w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={department_distribution.slice(0, 5)}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={5}
                  dataKey="value"
                  label={({ name, percent }) => `${name} (${(((percent as number) || 0) * 100).toFixed(0)}%)`}
                >
                  {department_distribution.slice(0, 5).map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', borderColor: 'rgba(255, 255, 255, 0.1)', borderRadius: '12px', color: '#fff' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* Projects Distribution (Bar) */}
      <div className="glass-panel rounded-2xl p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="font-bold text-lg">Project Headcount (Top 10)</h3>
            <p className="text-xs text-muted-foreground">Comparison of employee volume assigned per active project.</p>
          </div>
          <BarChart3 size={20} className="text-primary" />
        </div>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={project_distribution} margin={{ top: 10, right: 10, left: -20, bottom: 10 }}>
              <XAxis dataKey="name" stroke="currentColor" className="text-[10px] opacity-50" tickLine={false} />
              <YAxis stroke="currentColor" className="text-xs opacity-50" />
              <Tooltip
                contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', borderColor: 'rgba(255, 255, 255, 0.1)', borderRadius: '12px', color: '#fff' }}
              />
              <Bar dataKey="value" name="Assigned Team Members" radius={[8, 8, 0, 0]}>
                {project_distribution.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

    </div>
  );
}
