import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { seatService, employeeService } from '../../services/api';
import type { Seat } from '../../types';
import { 
  Grid3X3, 
  MapPin, 
  User, 
  Search,
  Filter,
  TrendingUp
} from 'lucide-react';
import { showToastGlobal } from '../../App';

export default function Seats() {
  const queryClient = useQueryClient();

  const [activeFloor, setActiveFloor] = useState<number>(1);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [seatSearch, setSeatSearch] = useState<string>('');
  const [selectedSeat, setSelectedSeat] = useState<Seat | null>(null);
  
  // Allocate modal states
  const [allocateEmployeeId, setAllocateEmployeeId] = useState<string>('');
  const [employeeSearchText, setEmployeeSearchText] = useState<string>('');

  // Fetch seats for the current floor
  const { data: seats, isLoading } = useQuery({
    queryKey: ['seats', activeFloor, statusFilter],
    queryFn: () => seatService.getSeats(activeFloor, statusFilter),
    refetchInterval: 15000, // Refresh seats state every 15 seconds
  });

  // Fetch unallocated active employees (to allocate to vacant desks)
  const { data: unallocatedEmployees } = useQuery({
    queryKey: ['unallocatedEmployees', employeeSearchText],
    queryFn: () => employeeService.getEmployees(
      1,
      20,
      employeeSearchText,
      '',
      null,
      'active',
      'name',
      'asc'
    ),
    // We only want employees WITHOUT a seat
    select: (data) => data.items.filter(emp => !emp.seat_id)
  });

  // Allocate Seat Mutation
  const allocateMutation = useMutation({
    mutationFn: ({ empId, seatId }: { empId: number; seatId: number }) => 
      seatService.allocateSeat(empId, seatId),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['seats'] });
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardData'] });
      showToastGlobal(`Seat allocated to ${data.employee_name} successfully`, 'success');
      setSelectedSeat(null);
      setAllocateEmployeeId('');
    },
    onError: (err: any) => {
      showToastGlobal(err.response?.data?.detail || 'Failed to allocate seat', 'error');
    }
  });

  // Release Seat Mutation
  const releaseMutation = useMutation({
    mutationFn: (seatId: number) => seatService.releaseSeat(seatId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seats'] });
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardData'] });
      showToastGlobal('Seat released successfully', 'success');
      setSelectedSeat(null);
    },
    onError: (err: any) => {
      showToastGlobal(err.response?.data?.detail || 'Failed to release seat', 'error');
    }
  });

  // Filter seats locally by search keyword to make searching instant
  const filteredSeats = seats
    ? seats.filter(s => s.seat_number.toLowerCase().includes(seatSearch.toLowerCase()))
    : [];

  // Metrics for current floor
  const occupiedCount = seats ? seats.filter(s => s.status === 'occupied').length : 0;
  const vacantCount = seats ? seats.filter(s => s.status === 'vacant').length : 0;
  const totalCount = occupiedCount + vacantCount;
  const utilizationFloor = totalCount > 0 ? Math.round((occupiedCount / totalCount) * 100) : 0;

  const handleSeatClick = (seat: Seat) => {
    setSelectedSeat(seat);
  };

  const handleAllocateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSeat || !allocateEmployeeId) return;
    allocateMutation.mutate({ empId: Number(allocateEmployeeId), seatId: selectedSeat.id });
  };

  const handleRelease = () => {
    if (!selectedSeat) return;
    releaseMutation.mutate(selectedSeat.id);
  };

  return (
    <div className="space-y-6">
      
      {/* Floor Tab Selector */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-4">
        <div className="flex items-center gap-1 bg-muted/50 p-1.5 rounded-2xl border border-border">
          {[1, 2, 3, 4, 5].map((floor) => (
            <button
              key={floor}
              onClick={() => { setActiveFloor(floor); setSelectedSeat(null); }}
              className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all duration-200
                ${activeFloor === floor
                  ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20 scale-[1.02]'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
            >
              Floor {floor}
            </button>
          ))}
        </div>

        {/* Current Floor Stats */}
        <div className="flex items-center gap-6 text-xs bg-card border border-border px-5 py-2.5 rounded-2xl shadow-sm">
          <div className="flex items-center gap-2">
            <TrendingUp size={16} className="text-primary" />
            <span className="text-muted-foreground">Floor Utilization:</span>
            <span className="font-extrabold text-sm">{utilizationFloor}%</span>
          </div>
          <div className="h-4 w-px bg-border"></div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
            <span className="font-semibold">{vacantCount} Vacant</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span>
            <span className="font-semibold">{occupiedCount} Occupied</span>
          </div>
        </div>
      </div>

      {/* Grid Controls (Search and Filters) */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-card/40 border border-border/60 p-4 rounded-2xl">
        <div className="relative max-w-xs w-full">
          <Search size={16} className="absolute left-3 top-3 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search seat number (e.g. F1-S0055)..."
            value={seatSearch}
            onChange={(e) => setSeatSearch(e.target.value)}
            className="w-full bg-card border border-border rounded-xl pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter size={14} className="text-muted-foreground" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-card border border-border rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="">All Seats</option>
            <option value="vacant">Vacant Desks</option>
            <option value="occupied">Occupied Desks</option>
          </select>
        </div>
      </div>

      {/* Interactive Map Layout Grid */}
      {isLoading ? (
        <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-12 gap-3 animate-pulse">
          {[...Array(60)].map((_, i) => (
            <div key={i} className="aspect-square bg-muted rounded-xl"></div>
          ))}
        </div>
      ) : filteredSeats.length > 0 ? (
        <div className="glass-panel rounded-3xl p-6 border border-border/80 shadow-inner">
          <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 xl:grid-cols-12 gap-3 max-h-[55vh] overflow-y-auto pr-2">
            {filteredSeats.slice(0, 144).map((seat) => { // Render a safe, fast 144 grid list of floor seats
              const isOccupied = seat.status === 'occupied';
              return (
                <button
                  key={seat.id}
                  onClick={() => handleSeatClick(seat)}
                  className={`aspect-square rounded-xl p-2 flex flex-col justify-between items-center transition-all duration-200 hover:scale-105 border text-center
                    ${isOccupied 
                      ? 'bg-red-500/10 border-red-500/30 hover:border-red-500/60 text-red-400' 
                      : 'bg-emerald-500/10 border-emerald-500/30 hover:border-emerald-500/60 text-emerald-400'
                    }`}
                >
                  <span className="text-[10px] font-mono font-bold tracking-tight opacity-75">{seat.seat_number.split('-')[1]}</span>
                  <Grid3X3 size={16} />
                  <span className="text-[8px] font-bold truncate max-w-full">
                    {isOccupied ? seat.employee_name : 'Vacant'}
                  </span>
                </button>
              );
            })}
          </div>
          {filteredSeats.length > 144 && (
            <p className="text-center text-xs text-muted-foreground mt-4">
              Showing first 144 desks. Use the search box above to locate specific seat numbers.
            </p>
          )}
        </div>
      ) : (
        <div className="text-center py-12 text-muted-foreground border border-dashed border-border rounded-2xl">
          No desks match search query.
        </div>
      )}

      {/* SEAT DETAIL DRAWER / POPUP MODAL */}
      {selectedSeat && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-card border border-border rounded-2xl max-w-sm w-full overflow-hidden shadow-2xl">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-muted/20">
              <div className="flex items-center gap-2">
                <MapPin size={18} className="text-primary" />
                <h3 className="text-md font-bold font-mono">{selectedSeat.seat_number}</h3>
              </div>
              <button className="text-muted-foreground hover:text-foreground" onClick={() => setSelectedSeat(null)}>✕</button>
            </div>
            
            <div className="p-6 space-y-6">
              
              {/* Desk Information segment */}
              <div className="flex justify-between items-center p-4 rounded-xl bg-muted/40 border border-border/50 text-sm">
                <div>
                  <span className="text-xs block text-muted-foreground">Floor Plan</span>
                  <span className="font-bold">Floor {selectedSeat.floor}</span>
                </div>
                <div className="text-right">
                  <span className="text-xs block text-muted-foreground">Availability</span>
                  <div className="flex items-center gap-1.5 justify-end">
                    <span className={`w-2 h-2 rounded-full ${selectedSeat.status === 'occupied' ? 'bg-red-500' : 'bg-emerald-500'}`}></span>
                    <span className="font-bold capitalize">{selectedSeat.status}</span>
                  </div>
                </div>
              </div>

              {selectedSeat.status === 'occupied' ? (
                /* Occupied UI */
                <div className="space-y-5">
                  <div className="space-y-3">
                    <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Current Occupant</span>
                    <div className="flex items-center gap-3 p-3 border border-border rounded-xl">
                      <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center font-bold text-primary text-sm">
                        <User size={18} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="block font-bold text-sm truncate">{selectedSeat.employee_name}</span>
                        <span className="block text-xs text-muted-foreground truncate">{selectedSeat.employee_code}</span>
                      </div>
                    </div>
                  </div>
                  
                  <button
                    onClick={handleRelease}
                    disabled={releaseMutation.isPending}
                    className="w-full py-2.5 rounded-xl border border-red-500/30 hover:border-red-500/60 bg-red-500/10 text-red-400 font-semibold text-sm hover:bg-red-500/15 transition-all duration-200"
                  >
                    {releaseMutation.isPending ? 'Releasing...' : 'Release Seat Desk'}
                  </button>
                </div>
              ) : (
                /* Vacant UI */
                <form onSubmit={handleAllocateSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground">Search and Assign Employee</label>
                    <input
                      type="text"
                      placeholder="Type name to search..."
                      value={employeeSearchText}
                      onChange={(e) => setEmployeeSearchText(e.target.value)}
                      className="w-full bg-muted/30 border border-border rounded-xl px-3 py-2 text-sm focus:outline-none"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground">Select Employee</label>
                    <select
                      required
                      value={allocateEmployeeId}
                      onChange={(e) => setAllocateEmployeeId(e.target.value)}
                      className="w-full bg-muted/30 border border-border rounded-xl px-3 py-2 text-sm focus:outline-none"
                    >
                      <option value="">-- Choose Employee --</option>
                      {unallocatedEmployees && unallocatedEmployees.length > 0 ? (
                        unallocatedEmployees.map(emp => (
                          <option key={emp.id} value={emp.id}>{emp.name} ({emp.employee_code}) - {emp.department}</option>
                        ))
                      ) : (
                        <option disabled>No unallocated active employees found</option>
                      )}
                    </select>
                  </div>

                  <button
                    type="submit"
                    disabled={allocateMutation.isPending || !allocateEmployeeId}
                    className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/95 transition-all duration-200 disabled:opacity-50 disabled:pointer-events-none shadow-md shadow-primary/20"
                  >
                    {allocateMutation.isPending ? 'Allocating...' : 'Confirm Assignment'}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
