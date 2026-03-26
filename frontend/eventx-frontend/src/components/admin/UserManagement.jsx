import React, { useEffect, useState, useMemo } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { Alert, AlertDescription } from "../ui/alert";
import { Button } from "../ui/button";
import {
    Users, Search, Filter, UserPlus, Mail, Calendar, Shield,
    Eye, Edit, Trash2, MoreHorizontal, ChevronLeft, ChevronRight,
    ArrowUpDown, ChevronDown, CheckCircle2
} from "lucide-react";

const UserManagement = () => {
    const { } = useAuth();
    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";

    const [users, setUsers] = useState([]);
    const [page, setPage] = useState(1);
    const [pages, setPages] = useState(1);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    
    // UI state
    const [searchTerm, setSearchTerm] = useState("");
    const [filterRole, setFilterRole] = useState("all");
    const [sortConfig, setSortConfig] = useState({ key: 'createdAt', direction: 'desc' });
    const [activeDropdown, setActiveDropdown] = useState(null);

    const fetchUsers = async (targetPage = 1) => {
        setLoading(true);
        setError("");
        try {
            // Using a larger limit since we'll handle some local sorting/filtering 
            // of the current page for better UX, though true search should hit the API.
            // For now, sticking to limit=10 from original logic
            const res = await fetch(
                `${API_BASE_URL}/auth/users?page=${targetPage}&limit=10`,
                { headers: { "Content-Type": "application/json" } }
            );
            if (!res.ok) {
                throw new Error("Failed to fetch users");
            }
            const data = await res.json();
            setUsers(data?.data?.users ?? []);
            setPages(data?.data?.pagination?.pages ?? 1);
            setTotal(data?.data?.pagination?.total ?? 0);
            setPage(data?.data?.pagination?.current ?? targetPage);
        } catch (e) {
            console.error("UserManagement fetch error:", e);
            setError("Could not load users.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers(1);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Local filter and sort for the current page
    const processedUsers = useMemo(() => {
        let result = [...users];
        
        // Apply local search
        if (searchTerm) {
            const lowerSearch = searchTerm.toLowerCase();
            result = result.filter(u => 
                u.name?.toLowerCase().includes(lowerSearch) || 
                u.email?.toLowerCase().includes(lowerSearch)
            );
        }

        // Apply local role filter
        if (filterRole !== 'all') {
            result = result.filter(u => u.role === filterRole);
        }

        // Apply sorting
        if (sortConfig.key) {
            result.sort((a, b) => {
                let aVal = a[sortConfig.key];
                let bVal = b[sortConfig.key];
                
                if (sortConfig.key === 'createdAt') {
                    aVal = new Date(a.createdAt || 0).getTime();
                    bVal = new Date(b.createdAt || 0).getTime();
                }

                if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
                if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }

        return result;
    }, [users, searchTerm, filterRole, sortConfig]);

    const requestSort = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
        setSortConfig({ key, direction });
    };

    // Close dropdown on outside click
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (!e.target.closest('.action-dropdown-container')) {
                setActiveDropdown(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const getRoleStyles = (role) => {
        switch (role) {
            case 'admin':
                return { color: 'bg-red-50 text-red-700 border-red-200', icon: Shield, gradient: 'from-red-500 to-rose-600' };
            case 'organizer':
                return { color: 'bg-blue-50 text-blue-700 border-blue-200', icon: Calendar, gradient: 'from-blue-500 to-indigo-600' };
            case 'user':
                return { color: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: Users, gradient: 'from-emerald-500 to-teal-600' };
            default:
                return { color: 'bg-gray-100 text-gray-700 border-gray-200', icon: Users, gradient: 'from-gray-500 to-slate-600' };
        }
    };

    const GlassCard = ({ children, className = '' }) => (
        <div className={`bg-white rounded-3xl border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-300 relative overflow-hidden ${className}`}>
            {children}
        </div>
    );

    return (
        <div className="p-4 sm:p-6 lg:p-8 space-y-6 w-full">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight flex items-center gap-3">
                        <span className="text-gray-900">User Directory</span>
                    </h1>
                    <p className="text-gray-500 font-medium mt-1">Manage users, roles, and system permissions</p>
                </div>
                <div className="flex items-center gap-3">
                    <Button className="bg-gray-900 hover:bg-black text-white shadow-md rounded-xl">
                        <UserPlus className="w-4 h-4 mr-2" />
                        Add New User
                    </Button>
                </div>
            </div>

            {/* KPI Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
                {[
                    { label: 'Total Users', val: total, icon: Users, gradient: 'from-blue-500 to-indigo-600', lightBg: 'bg-blue-50 text-blue-600' },
                    { label: 'System Admins', val: users.filter(u => u.role === 'admin').length || (total > 0 ? 1 : 0), icon: Shield, gradient: 'from-red-500 to-rose-600', lightBg: 'bg-red-50 text-red-600' },
                    { label: 'Organizers', val: users.filter(u => u.role === 'organizer').length, icon: Calendar, gradient: 'from-violet-500 to-purple-600', lightBg: 'bg-violet-50 text-violet-600' },
                    { label: 'Regular Users', val: users.filter(u => u.role === 'user').length, icon: CheckCircle2, gradient: 'from-emerald-500 to-teal-500', lightBg: 'bg-emerald-50 text-emerald-600' }
                ].map((stat, i) => (
                    <div key={i} className={`group bg-white rounded-3xl p-6 flex flex-col justify-center h-[120px] border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1 relative overflow-hidden`}>
                        <div className={`absolute -top-10 -right-10 w-32 h-32 bg-gradient-to-br ${stat.gradient} opacity-[0.06] blur-2xl rounded-full group-hover:scale-150 group-hover:opacity-15 transition-all duration-700 ease-out z-0`}></div>
                        
                        <div className="relative z-10 flex justify-between items-center">
                            <div className="flex-1 pr-3">
                                <p className="text-gray-400 font-bold text-[11px] uppercase tracking-widest leading-tight mb-1.5">{stat.label}</p>
                                <h3 className={`text-[28px] font-black tracking-tight leading-none truncate capitalize text-gray-900`}>{stat.val}</h3>
                            </div>
                            <div className={`shrink-0 w-12 h-12 rounded-2xl flex items-center justify-center ${stat.lightBg} shadow-inner ring-1 ring-white/50 group-hover:scale-110 transition-transform duration-500 ease-out`}>
                                <stat.icon className="w-5 h-5" />
                            </div>
                        </div>
                        
                        <div className={`absolute bottom-0 left-0 w-full h-[4px] bg-gradient-to-r ${stat.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300`}></div>
                    </div>
                ))}
            </div>

            {error && (
                <Alert variant="destructive" className="bg-red-50 text-red-900 border-red-200 rounded-xl">
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}

            {/* Main Table Container */}
            <GlassCard className="flex flex-col">
                {/* Toolbar */}
                <div className="p-4 sm:p-5 border-b border-gray-100 bg-gray-50/50 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="relative flex-1 lg:max-w-md group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 group-focus-within:text-blue-500 transition-colors" />
                        <input
                            placeholder="Search by name or email..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 shadow-sm transition-all text-gray-700"
                        />
                    </div>
                    <div className="flex items-center gap-3 w-full lg:w-auto">
                        <Button variant="outline" className="bg-white border-gray-200 shadow-sm rounded-xl text-gray-700 hidden sm:flex">
                            <Filter className="w-4 h-4 mr-2 text-gray-500" /> Filters
                        </Button>
                        <div className="relative flex-1 sm:flex-none">
                            <select
                                value={filterRole}
                                onChange={(e) => setFilterRole(e.target.value)}
                                className="w-full appearance-none pl-4 pr-10 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 shadow-sm transition-all text-gray-700 font-medium cursor-pointer"
                            >
                                <option value="all">All Roles</option>
                                <option value="admin">Administrators</option>
                                <option value="organizer">Organizers</option>
                                <option value="user">Regular Users</option>
                            </select>
                            <ChevronDown className="w-4 h-4 text-gray-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                        </div>
                    </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto min-h-[400px]">
                    {loading ? (
                        <div className="p-8 space-y-4">
                            {[...Array(5)].map((_, i) => (
                                <div key={i} className="animate-pulse flex items-center gap-4">
                                    <div className="h-10 w-10 bg-gray-200 rounded-full"></div>
                                    <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                                    <div className="h-4 bg-gray-200 rounded w-1/5 ml-auto"></div>
                                    <div className="h-8 bg-gray-200 rounded w-16"></div>
                                </div>
                            ))}
                        </div>
                    ) : processedUsers.length === 0 ? (
                        <div className="flex flex-col items-center justify-center p-12 text-center h-[400px]">
                            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                                <Users className="w-8 h-8 text-gray-300" />
                            </div>
                            <h3 className="text-lg font-bold text-gray-900 mb-1">No users found</h3>
                            <p className="text-sm text-gray-500 max-w-sm mb-6">
                                {searchTerm || filterRole !== 'all'
                                    ? 'Try adjusting your search or filter criteria.'
                                    : 'No users have been created yet.'}
                            </p>
                            {(searchTerm || filterRole !== 'all') && (
                                <Button variant="outline" className="border-gray-200 rounded-xl" onClick={() => { setFilterRole('all'); setSearchTerm(''); }}>
                                    Clear Filters
                                </Button>
                            )}
                        </div>
                    ) : (
                        <table className="w-full text-sm text-left">
                            <thead className="text-[11px] text-gray-400 font-bold uppercase tracking-wider bg-gray-50/50 border-b border-gray-100 sticky top-0 z-10">
                                <tr>
                                    <th scope="col" className="px-6 py-4 font-bold tracking-wider cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => requestSort('name')}>
                                        <div className="flex items-center gap-2">User details <ArrowUpDown className="w-3 h-3 opacity-50" /></div>
                                    </th>
                                    <th scope="col" className="px-6 py-4 font-bold tracking-wider cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => requestSort('role')}>
                                        <div className="flex items-center gap-2">Role & Permissions <ArrowUpDown className="w-3 h-3 opacity-50" /></div>
                                    </th>
                                    <th scope="col" className="px-6 py-4 font-bold tracking-wider cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => requestSort('createdAt')}>
                                        <div className="flex items-center gap-2">Joined Date <ArrowUpDown className="w-3 h-3 opacity-50" /></div>
                                    </th>
                                    <th scope="col" className="px-6 py-4 font-bold tracking-wider text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {processedUsers.map((u) => {
                                    const roleStyle = getRoleStyles(u.role);
                                    const RoleIcon = roleStyle.icon;
                                    
                                    return (
                                        <tr key={u._id} className="bg-white hover:bg-blue-50/30 transition-all duration-200 group border-b border-gray-50 last:border-0 relative">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center gap-4">
                                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-sm bg-gradient-to-br ${roleStyle.gradient}`}>
                                                        {u.name.charAt(0).toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <div className="font-bold text-gray-900 group-hover:text-blue-600 transition-colors">{u.name}</div>
                                                        <div className="text-xs text-gray-500 mt-0.5 flex items-center gap-1.5">
                                                            <Mail className="w-3 h-3" /> {u.email}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-bold border ${roleStyle.color}`}>
                                                    <RoleIcon className="w-3.5 h-3.5 mr-1.5 opacity-70" />
                                                    {u.role.toUpperCase()}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-gray-900 font-medium flex items-center gap-1.5">
                                                    <Calendar className="w-4 h-4 text-gray-400" />
                                                    {new Date(u.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right whitespace-nowrap">
                                                <div className="relative inline-block text-left action-dropdown-container">
                                                    <button 
                                                        onClick={() => setActiveDropdown(activeDropdown === u._id ? null : u._id)}
                                                        className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-100"
                                                    >
                                                        <MoreHorizontal className="w-5 h-5" />
                                                    </button>
                                                    
                                                    {activeDropdown === u._id && (
                                                        <div className="absolute right-0 mt-1 w-48 bg-white rounded-xl shadow-xl border border-gray-100 py-1 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                                                            <button className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center font-medium">
                                                                <Eye className="w-4 h-4 mr-2" /> View Profile
                                                            </button>
                                                            <button className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center font-medium">
                                                                <Edit className="w-4 h-4 mr-2" /> Edit User
                                                            </button>
                                                            <div className="h-px bg-gray-100 my-1"></div>
                                                            <button className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center font-medium">
                                                                <Trash2 className="w-4 h-4 mr-2" /> Suspend User
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* Pagination (API-driven) */}
                {!loading && total > 0 && (
                    <div className="p-4 border-t border-gray-100 bg-gray-50/50 flex flex-col sm:flex-row items-center justify-between gap-4">
                        <span className="text-sm text-gray-500 font-medium">
                            Showing <span className="font-bold text-gray-900">{((page - 1) * 10) + 1}</span> to <span className="font-bold text-gray-900">{Math.min(page * 10, total)}</span> of <span className="font-bold text-gray-900">{total}</span> users
                        </span>
                        <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-gray-200 shadow-sm">
                            <button
                                disabled={page <= 1}
                                onClick={() => fetchUsers(Math.max(1, page - 1))}
                                className="px-3 py-1.5 rounded-md text-sm font-semibold text-gray-600 hover:bg-gray-100 disabled:opacity-50 disabled:hover:bg-transparent transition-colors flex items-center"
                            >
                                <ChevronLeft className="w-4 h-4 mr-1" /> Prev
                            </button>
                            
                            {Array.from({ length: Math.min(5, pages) }, (_, i) => {
                                let pageNum = i + 1;
                                if (pages > 5 && page > 3) {
                                    pageNum = page - 2 + i;
                                    if (pageNum > pages) pageNum = pages - (4 - i);
                                }
                                
                                return (
                                    <button
                                        key={pageNum}
                                        onClick={() => fetchUsers(pageNum)}
                                        className={`w-8 h-8 flex items-center justify-center rounded-md text-sm font-semibold transition-colors ${
                                            page === pageNum 
                                                ? 'bg-blue-600 text-white shadow-sm' 
                                                : 'text-gray-600 hover:bg-gray-100'
                                        }`}
                                    >
                                        {pageNum}
                                    </button>
                                );
                            })}

                            <button
                                disabled={page >= pages}
                                onClick={() => fetchUsers(Math.min(pages, page + 1))}
                                className="px-3 py-1.5 rounded-md text-sm font-semibold text-gray-600 hover:bg-gray-100 disabled:opacity-50 disabled:hover:bg-transparent transition-colors flex items-center"
                            >
                                Next <ChevronRight className="w-4 h-4 ml-1" />
                            </button>
                        </div>
                    </div>
                )}
            </GlassCard>
        </div>
    );
};

export default UserManagement;
