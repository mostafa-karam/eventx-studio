import React, { useState, useEffect } from 'react';
import { Shield, Search, Filter, Loader2, User, Calendar, Ticket, Building2, Key, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

const resourceIcons = {
    User: <User className="h-4 w-4" />,
    Event: <Calendar className="h-4 w-4" />,
    Ticket: <Ticket className="h-4 w-4" />,
    Hall: <Building2 className="h-4 w-4" />,
    HallBooking: <Building2 className="h-4 w-4" />,
    Auth: <Key className="h-4 w-4" />,
    Analytics: <Shield className="h-4 w-4" />
};

const actionColors = {
    create: 'bg-green-100 text-green-700',
    update: 'bg-blue-100 text-blue-700',
    delete: 'bg-red-100 text-red-700',
    publish: 'bg-indigo-100 text-indigo-700',
    cancel: 'bg-amber-100 text-amber-700',
    approve: 'bg-emerald-100 text-emerald-700',
    reject: 'bg-red-100 text-red-700',
    login: 'bg-gray-100 text-gray-700',
    logout: 'bg-gray-100 text-gray-700',
    purchase: 'bg-purple-100 text-purple-700',
    refund: 'bg-orange-100 text-orange-700',
};

const getActionColor = (action) => {
    const verb = action.split('.').pop();
    return actionColors[verb] || 'bg-gray-100 text-gray-700';
};

const AuditLogViewer = () => {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [searchQuery, setSearchQuery] = useState('');
    const [resourceFilter, setResourceFilter] = useState('all');
    const [actionFilter] = useState('all');
    const [expandedLog, setExpandedLog] = useState(null);

    const fetchLogs = async () => {
        try {
            setLoading(true);
            let url = `${API_BASE_URL}/audit-log?page=${page}&limit=25`;
            if (resourceFilter !== 'all') url += `&resource=${resourceFilter}`;
            if (actionFilter !== 'all') url += `&action=${actionFilter}`;

            const response = await fetch(url, {
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
            });
            const data = await response.json();
            if (data.success) {
                setLogs(data.data?.logs || []);
                setTotalPages(data.data?.pagination?.pages || 1);
            }
        } catch (error) {
            console.error('Failed to fetch audit logs:', error);
            toast.error('Failed to load audit logs');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [page, resourceFilter, actionFilter]);

  // eslint-disable-next-line no-unused-vars
    const formatDate = (d) => new Date(d).toLocaleString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit',
    });

    const filteredLogs = logs.filter(log => {
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        return (
            log.actorName?.toLowerCase().includes(q) ||
            log.action?.toLowerCase().includes(q) ||
            log.ip?.includes(q)
        );
    });

    const WhiteCard = ({ children, className = '' }) => (
        <div className={`bg-white border border-gray-200 shadow-sm rounded-2xl overflow-hidden ${className}`}>
            {children}
        </div>
    );

    return (
        <div className="p-4 sm:p-6 lg:p-8 space-y-6 w-full">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight flex items-center gap-3">
                        <span className="text-gray-900">Audit Log</span>
                    </h1>
                    <p className="text-gray-500 font-medium mt-1">Track all system actions and changes</p>
                </div>
            </div>

            {/* Filters */}
            <WhiteCard className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 lg:p-5 bg-gray-50/50">
                <div className="relative flex-1 w-full mx-auto max-w-lg md:max-w-none md:w-auto md:mx-0">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 focus-within:text-blue-500 transition-colors" />
                    <input
                        type="text"
                        placeholder="Search by actor name, action, or IP..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 h-12 border border-gray-200 bg-white rounded-xl text-sm md:text-base font-medium text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 shadow-sm transition-all"
                    />
                </div>
                <select
                    value={resourceFilter}
                    onChange={(e) => { setResourceFilter(e.target.value); setPage(1); }}
                    className="px-4 h-12 text-sm md:text-base font-bold text-gray-700 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 shadow-sm sm:w-64"
                >
                    <option value="all">All Resources</option>
                    <option value="User">User</option>
                    <option value="Event">Event</option>
                    <option value="Hall">Hall</option>
                    <option value="HallBooking">Hall Booking</option>
                    <option value="Ticket">Ticket</option>
                    <option value="Auth">Auth</option>
                    <option value="Analytics">Analytics</option>
                </select>
            </WhiteCard>

            {/* Log Table */}
            <WhiteCard>
                {loading ? (
                    <div className="flex items-center justify-center py-32">
                        <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
                    </div>
                ) : filteredLogs.length === 0 ? (
                    <div className="py-24 text-center flex flex-col items-center">
                        <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-4 border border-gray-100">
                            <Shield className="h-10 w-10 text-gray-300" />
                        </div>
                        <h3 className="text-xl font-extrabold text-gray-900 mb-2">No audit logs found</h3>
                        <p className="text-gray-500 font-medium">Clear your search filters to see more results.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="text-xs font-bold text-gray-500 uppercase tracking-widest bg-gray-50/80 border-b border-gray-100">
                                    <th className="text-left px-6 py-4">Timestamp</th>
                                    <th className="text-left px-6 py-4">Actor</th>
                                    <th className="text-left px-6 py-4">Action</th>
                                    <th className="text-left px-6 py-4">Resource</th>
                                    <th className="text-left px-6 py-4">IP</th>
                                    <th className="text-left px-6 py-4">Details</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {filteredLogs.map(log => (
                                    <React.Fragment key={log._id}>
                                        <tr className="hover:bg-blue-50/30 transition-colors cursor-pointer group" onClick={() => setExpandedLog(expandedLog === log._id ? null : log._id)}>
                                            <td className="px-6 py-4 text-xs font-bold text-gray-500 whitespace-nowrap bg-white mx-0 shadow-none border-0 align-middle">
                                                <div className="flex flex-col">
                                                    <span className="text-gray-900 font-semibold">{new Date(log.createdAt).toLocaleDateString()}</span>
                                                    <span className="text-gray-500 mt-0.5">{new Date(log.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 align-middle">
                                                <div>
                                                    <p className="text-sm font-bold text-gray-900 leading-tight">{log.actorName || 'System'}</p>
                                                    <p className="text-xs font-bold text-gray-400 mt-0.5 uppercase tracking-wider">{log.actorRole}</p>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 align-middle">
                                                <span className={`inline-flex items-center px-2.5 py-1 text-[10px] font-black uppercase tracking-widest rounded-md border border-white/20 ${getActionColor(log.action)}`}>
                                                    {log.action}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 align-middle">
                                                <div className="flex items-center gap-2 text-sm font-semibold text-gray-700 bg-gray-50 px-2.5 py-1 rounded-md w-fit border border-gray-100">
                                                    {resourceIcons[log.resource] || <Shield className="h-4 w-4" />}
                                                    {log.resource}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-xs font-mono font-medium text-gray-500 align-middle">{log.ip || '—'}</td>
                                            <td className="px-6 py-4 text-xs text-blue-600 font-bold align-middle">
                                                {log.details && Object.keys(log.details).length > 0 ? (
                                                    <span className="group-hover:underline flex items-center gap-1.5 cursor-pointer">View {expandedLog === log._id ? 'Less' : 'More'} <ChevronRight className={`w-3 h-3 transition-transform ${expandedLog === log._id ? 'rotate-90' : ''}`} /></span>
                                                ) : <span className="text-gray-300">No Details</span>}
                                            </td>
                                        </tr>
                                        {expandedLog === log._id && log.details && Object.keys(log.details).length > 0 && (
                                            <tr>
                                                <td colSpan="6" className="px-6 py-4 bg-gray-900 border-x border-b border-gray-900">
                                                    <pre className="text-xs text-gray-300 overflow-x-auto font-mono p-2 rounded-lg leading-relaxed">
                                                        {JSON.stringify(log.details, null, 2)}
                                                    </pre>
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50/50">
                        <p className="text-sm font-bold text-gray-500 uppercase tracking-widest">Page {page} of {totalPages}</p>
                        <div className="flex gap-2">
                            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                                className="p-2 border border-gray-200 bg-white rounded-xl disabled:opacity-50 hover:bg-gray-50 shadow-sm transition-colors text-gray-700">
                                <ChevronLeft className="h-5 w-5" />
                            </button>
                            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                                className="p-2 border border-gray-200 bg-white rounded-xl disabled:opacity-50 hover:bg-gray-50 shadow-sm transition-colors text-gray-700">
                                <ChevronRight className="h-5 w-5" />
                            </button>
                        </div>
                    </div>
                )}
            </WhiteCard>
        </div>
    );
};

export default AuditLogViewer;
