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
    const [actionFilter, setActionFilter] = useState('all');
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
    }, [page, resourceFilter, actionFilter]);

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

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <Shield className="h-6 w-6 text-blue-600" />
                        Audit Log
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">Track all system actions and changes</p>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3 mb-6">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search by actor name, action, or IP..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>
                <select
                    value={resourceFilter}
                    onChange={(e) => { setResourceFilter(e.target.value); setPage(1); }}
                    className="px-3 py-2 text-sm border border-gray-200 rounded-lg"
                >
                    <option value="all">All Resources</option>
                    <option value="User">User</option>
                    <option value="Event">Event</option>
                    <option value="Hall">Hall</option>
                    <option value="HallBooking">Hall Booking</option>
                    <option value="Ticket">Ticket</option>
                    <option value="Auth">Auth</option>
                </select>
            </div>

            {/* Log Table */}
            <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                    </div>
                ) : filteredLogs.length === 0 ? (
                    <div className="p-12 text-center">
                        <Shield className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-600">No audit logs found</h3>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="text-xs text-gray-500 uppercase tracking-wider bg-gray-50">
                                    <th className="text-left px-5 py-3 font-medium">Timestamp</th>
                                    <th className="text-left px-5 py-3 font-medium">Actor</th>
                                    <th className="text-left px-5 py-3 font-medium">Action</th>
                                    <th className="text-left px-5 py-3 font-medium">Resource</th>
                                    <th className="text-left px-5 py-3 font-medium">IP</th>
                                    <th className="text-left px-5 py-3 font-medium">Details</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {filteredLogs.map(log => (
                                    <React.Fragment key={log._id}>
                                        <tr className="hover:bg-gray-50 transition-colors cursor-pointer" onClick={() => setExpandedLog(expandedLog === log._id ? null : log._id)}>
                                            <td className="px-5 py-3 text-xs text-gray-500 whitespace-nowrap">{formatDate(log.createdAt)}</td>
                                            <td className="px-5 py-3">
                                                <div>
                                                    <p className="text-sm font-medium text-gray-900">{log.actorName || 'System'}</p>
                                                    <p className="text-xs text-gray-400">{log.actorRole}</p>
                                                </div>
                                            </td>
                                            <td className="px-5 py-3">
                                                <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${getActionColor(log.action)}`}>
                                                    {log.action}
                                                </span>
                                            </td>
                                            <td className="px-5 py-3">
                                                <div className="flex items-center gap-1.5 text-sm text-gray-600">
                                                    {resourceIcons[log.resource] || null}
                                                    {log.resource}
                                                </div>
                                            </td>
                                            <td className="px-5 py-3 text-xs font-mono text-gray-500">{log.ip || '—'}</td>
                                            <td className="px-5 py-3 text-xs text-blue-600 font-medium">
                                                {log.details && Object.keys(log.details).length > 0 ? 'View →' : '—'}
                                            </td>
                                        </tr>
                                        {expandedLog === log._id && log.details && Object.keys(log.details).length > 0 && (
                                            <tr>
                                                <td colSpan="6" className="px-5 py-3 bg-gray-50">
                                                    <pre className="text-xs text-gray-600 overflow-x-auto">
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
                    <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100">
                        <p className="text-sm text-gray-500">Page {page} of {totalPages}</p>
                        <div className="flex gap-2">
                            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                                className="p-2 border rounded-lg disabled:opacity-50 hover:bg-gray-50">
                                <ChevronLeft className="h-4 w-4" />
                            </button>
                            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                                className="p-2 border rounded-lg disabled:opacity-50 hover:bg-gray-50">
                                <ChevronRight className="h-4 w-4" />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AuditLogViewer;
