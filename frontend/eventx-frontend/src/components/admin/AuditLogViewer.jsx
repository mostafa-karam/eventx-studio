import React, { useState, useEffect } from 'react';
import { Shield, Search, Loader2, User, Calendar, Ticket, Building2, Key, ChevronLeft, ChevronRight, ChevronDown, Clock3, Globe, Monitor, Hash } from 'lucide-react';
import { toast } from 'sonner';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

const resourceIcons = {
    User: <User className="h-4 w-4" />,
    Event: <Calendar className="h-4 w-4" />,
    Ticket: <Ticket className="h-4 w-4" />,
    Hall: <Building2 className="h-4 w-4" />,
    HallBooking: <Building2 className="h-4 w-4" />,
    Coupon: <Ticket className="h-4 w-4" />,
    Booking: <Calendar className="h-4 w-4" />,
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

const formatDateTime = (value) => {
    if (!value) return 'Unknown';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Unknown';

    return date.toLocaleString('en-US', {
        month: 'short',
        day: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
    });
};

const formatDateOnly = (value) => {
    if (!value) return 'Unknown';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Unknown';
    return date.toLocaleDateString('en-US');
};

const formatTimeOnly = (value) => {
    if (!value) return 'Unknown';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Unknown';

    return date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
    });
};

const formatIsoTime = (value) => {
    if (!value) return 'Unknown';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Unknown';
    return date.toISOString();
};

const getActorId = (log) => {
    const actor = log?.userId;

    if (!actor) return '';
    if (typeof actor === 'object') return actor._id || actor.id || '';
    return String(actor);
};

const getActorEmail = (log) => {
    const actor = log?.userId;
    return actor && typeof actor === 'object' ? actor.email || '' : '';
};

const getRequestLine = (log) => {
    const method = log?.requestMethod?.toUpperCase();
    const path = log?.requestPath;

    if (!method && !path) return '';
    if (method && (!path || path === 'unknown')) return method;
    if ((!method || method === 'UNKNOWN') && path) return path;
    return `${method} ${path}`;
};

const stringifyValue = (value) => {
    if (value === null || value === undefined || value === '') return 'Not captured';
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
};

const buildAuditPayload = (log) => ({
    userId: getActorId(log) || null,
    actorName: log?.actorName || 'System',
    actorRole: log?.actorRole || 'system',
    action: log?.action || null,
    resource: log?.resource || null,
    resourceId: log?.resourceId ?? null,
    details: log?.details ?? {},
    ipAddress: log?.ipAddress || log?.ip || null,
    requestMethod: log?.requestMethod || null,
    requestPath: log?.requestPath || null,
    userAgent: log?.userAgent || null,
    requestId: log?.requestId || null,
    timestamp: formatIsoTime(log?.timestamp || log?.createdAt),
});

const renderDetailValue = (value) => {
    if (value === null || value === undefined || value === '') {
        return <span className="text-gray-400">Not provided</span>;
    }

    if (Array.isArray(value)) {
        if (value.length === 0) {
            return <span className="text-gray-400">Empty array</span>;
        }

        const isSimpleArray = value.every((item) => item === null || ['string', 'number', 'boolean'].includes(typeof item));

        if (isSimpleArray) {
            return (
                <div className="flex flex-wrap gap-2">
                    {value.map((item, index) => (
                        <span
                            key={`${String(item)}-${index}`}
                            className="rounded-full border border-blue-200 bg-blue-50 px-2 py-1 text-[11px] font-semibold text-blue-700"
                        >
                            {String(item)}
                        </span>
                    ))}
                </div>
            );
        }
    }

    if (typeof value === 'object') {
        return (
            <pre className="overflow-x-auto rounded-xl bg-gray-950 p-3 text-[11px] leading-relaxed text-gray-100">
                {JSON.stringify(value, null, 2)}
            </pre>
        );
    }

    return String(value);
};

const AuditLogViewer = () => {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [searchQuery, setSearchQuery] = useState('');
    const [resourceFilter, setResourceFilter] = useState('all');
    const [expandedLog, setExpandedLog] = useState(null);

    const fetchLogs = async () => {
        try {
            setLoading(true);
            let url = `${API_BASE_URL}/audit-log?page=${page}&limit=25`;
            if (resourceFilter !== 'all') url += `&resource=${resourceFilter}`;

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
    }, [page, resourceFilter]);

    const filteredLogs = logs.filter(log => {
        if (!searchQuery) return true;

        const q = searchQuery.toLowerCase();
        const haystack = [
            log.actorName,
            log.actorRole,
            getActorId(log),
            getActorEmail(log),
            log.action,
            log.resource,
            stringifyValue(log.resourceId),
            log.ip,
            log.ipAddress,
            log.requestId,
            log.requestMethod,
            log.requestPath,
            log.userAgent,
            JSON.stringify(log.details || {}),
        ]
            .filter(Boolean)
            .join(' ')
            .toLowerCase();

        return haystack.includes(q);
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
                    <p className="text-gray-500 font-medium mt-1">Track all system actions, request context, and raw audit payloads</p>
                </div>
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-gray-400">
                    <span>{filteredLogs.length} Visible</span>
                    <span className="h-1 w-1 rounded-full bg-gray-300" />
                    <span>Page {page} of {totalPages}</span>
                </div>
            </div>

            {/* Filters */}
            <WhiteCard className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 lg:p-5 bg-gray-50/50">
                <div className="relative flex-1 w-full mx-auto max-w-lg md:max-w-none md:w-auto md:mx-0">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 focus-within:text-blue-500 transition-colors" />
                    <input
                        type="text"
                        placeholder="Search by actor, action, request ID, path, user agent, or resource ID..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 h-12 border border-gray-200 bg-white rounded-xl text-sm md:text-base font-medium text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 shadow-sm transition-all"
                    />
                </div>
                <select
                    value={resourceFilter}
                    onChange={(e) => { setResourceFilter(e.target.value); setPage(1); setExpandedLog(null); }}
                    className="px-4 h-12 text-sm md:text-base font-bold text-gray-700 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 shadow-sm sm:w-64"
                >
                    <option value="all">All Resources</option>
                    <option value="User">User</option>
                    <option value="Event">Event</option>
                    <option value="Hall">Hall</option>
                    <option value="HallBooking">Hall Booking</option>
                    <option value="Ticket">Ticket</option>
                    <option value="Coupon">Coupon</option>
                    <option value="Booking">Booking</option>
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
                                    <th className="text-left px-6 py-4">Request</th>
                                    <th className="text-left px-6 py-4">Inspect</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {filteredLogs.map(log => {
                                    const isExpanded = expandedLog === log._id;
                                    const requestLine = getRequestLine(log);
                                    const actorId = getActorId(log);
                                    const actorEmail = getActorEmail(log);
                                    const auditPayload = buildAuditPayload(log);
                                    const detailEntries = Object.entries(log.details || {});

                                    return (
                                        <React.Fragment key={log._id}>
                                            <tr className="hover:bg-blue-50/30 transition-colors cursor-pointer group" onClick={() => setExpandedLog(isExpanded ? null : log._id)}>
                                                <td className="px-6 py-4 text-xs font-bold text-gray-500 whitespace-nowrap bg-white mx-0 shadow-none border-0 align-middle">
                                                    <div className="flex flex-col">
                                                        <span className="text-gray-900 font-semibold">{formatDateOnly(log.createdAt || log.timestamp)}</span>
                                                        <span className="text-gray-500 mt-0.5">{formatTimeOnly(log.createdAt || log.timestamp)}</span>
                                                        <span className="mt-1 font-mono text-[10px] text-gray-400">{formatIsoTime(log.createdAt || log.timestamp)}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 align-middle">
                                                    <div>
                                                        <p className="text-sm font-bold text-gray-900 leading-tight">{log.actorName || 'System'}</p>
                                                        <p className="text-xs font-bold text-gray-400 mt-0.5 uppercase tracking-wider">{log.actorRole || 'system'}</p>
                                                        {actorEmail ? <p className="mt-1 text-xs text-gray-500">{actorEmail}</p> : null}
                                                        {actorId ? <p className="mt-1 font-mono text-[11px] text-gray-400 break-all">{actorId}</p> : null}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 align-middle">
                                                    <span className={`inline-flex items-center px-2.5 py-1 text-[10px] font-black uppercase tracking-widest rounded-md border border-white/20 ${getActionColor(log.action)}`}>
                                                        {log.action}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 align-middle">
                                                    <div className="space-y-2">
                                                        <div className="flex items-center gap-2 text-sm font-semibold text-gray-700 bg-gray-50 px-2.5 py-1 rounded-md w-fit border border-gray-100">
                                                            {resourceIcons[log.resource] || <Shield className="h-4 w-4" />}
                                                            {log.resource}
                                                        </div>
                                                        <p className="font-mono text-[11px] text-gray-400 break-all">{stringifyValue(log.resourceId)}</p>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 align-middle">
                                                    <div className="space-y-1">
                                                        <div className="font-mono text-xs font-medium text-gray-600">{log.ip || log.ipAddress || 'Unknown'}</div>
                                                        <div className="font-mono text-[11px] text-blue-600 break-all">{requestLine || 'Request line not captured'}</div>
                                                        <div className="text-[11px] text-gray-400 break-all">{log.requestId || 'No request ID'}</div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-xs text-blue-600 font-bold align-middle">
                                                    <span className="group-hover:underline flex items-center gap-1.5 cursor-pointer">
                                                        {isExpanded ? 'Hide Record' : 'Open Record'}
                                                        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                                                    </span>
                                                </td>
                                            </tr>
                                            {isExpanded && (
                                                <tr>
                                                    <td colSpan="6" className="px-6 py-5 bg-gradient-to-br from-slate-50 to-white border-x border-b border-gray-200">
                                                        <div className="space-y-4">
                                                            <div className="grid gap-4 xl:grid-cols-2">
                                                                <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                                                                    <h4 className="text-xs font-black uppercase tracking-widest text-gray-400">Audit Metadata</h4>
                                                                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                                                                        <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                                                                            <div className="text-[11px] font-bold uppercase tracking-widest text-gray-400">Actor Name</div>
                                                                            <div className="mt-2 text-sm font-semibold text-gray-800">{log.actorName || 'System'}</div>
                                                                        </div>
                                                                        <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                                                                            <div className="text-[11px] font-bold uppercase tracking-widest text-gray-400">Actor Role</div>
                                                                            <div className="mt-2 text-sm font-semibold text-gray-800">{log.actorRole || 'system'}</div>
                                                                        </div>
                                                                        <div className="rounded-xl border border-gray-100 bg-gray-50 p-3 sm:col-span-2">
                                                                            <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-gray-400">
                                                                                <Hash className="h-3.5 w-3.5" />
                                                                                <span>User ID</span>
                                                                            </div>
                                                                            <div className="mt-2 font-mono text-[12px] text-gray-700 break-all">{actorId || 'Not captured'}</div>
                                                                        </div>
                                                                        <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                                                                            <div className="text-[11px] font-bold uppercase tracking-widest text-gray-400">Resource</div>
                                                                            <div className="mt-2 text-sm font-semibold text-gray-800">{log.resource || 'Not captured'}</div>
                                                                        </div>
                                                                        <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                                                                            <div className="text-[11px] font-bold uppercase tracking-widest text-gray-400">Action</div>
                                                                            <div className="mt-2 font-mono text-[12px] text-gray-700 break-all">{log.action || 'Not captured'}</div>
                                                                        </div>
                                                                        <div className="rounded-xl border border-gray-100 bg-gray-50 p-3 sm:col-span-2">
                                                                            <div className="text-[11px] font-bold uppercase tracking-widest text-gray-400">Resource ID</div>
                                                                            <div className="mt-2 font-mono text-[12px] text-gray-700 break-all">{stringifyValue(log.resourceId)}</div>
                                                                        </div>
                                                                        <div className="rounded-xl border border-gray-100 bg-gray-50 p-3 sm:col-span-2">
                                                                            <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-gray-400">
                                                                                <Clock3 className="h-3.5 w-3.5" />
                                                                                <span>Timestamp</span>
                                                                            </div>
                                                                            <div className="mt-2 text-sm font-semibold text-gray-800">{formatDateTime(log.createdAt || log.timestamp)}</div>
                                                                            <div className="mt-1 font-mono text-[11px] text-gray-500 break-all">{formatIsoTime(log.createdAt || log.timestamp)}</div>
                                                                        </div>
                                                                    </div>
                                                                </section>

                                                                <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                                                                    <h4 className="text-xs font-black uppercase tracking-widest text-gray-400">Request Context</h4>
                                                                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                                                                        <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                                                                            <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-gray-400">
                                                                                <Globe className="h-3.5 w-3.5" />
                                                                                <span>IP Address</span>
                                                                            </div>
                                                                            <div className="mt-2 font-mono text-[12px] text-gray-700 break-all">{log.ip || log.ipAddress || 'Unknown'}</div>
                                                                        </div>
                                                                        <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                                                                            <div className="text-[11px] font-bold uppercase tracking-widest text-gray-400">Request Method</div>
                                                                            <div className="mt-2 font-mono text-[12px] text-gray-700">{log.requestMethod || 'Not captured'}</div>
                                                                        </div>
                                                                        <div className="rounded-xl border border-gray-100 bg-gray-50 p-3 sm:col-span-2">
                                                                            <div className="text-[11px] font-bold uppercase tracking-widest text-gray-400">Request Path</div>
                                                                            <div className="mt-2 font-mono text-[12px] text-gray-700 break-all">{log.requestPath || 'Not captured'}</div>
                                                                        </div>
                                                                        <div className="rounded-xl border border-gray-100 bg-gray-50 p-3 sm:col-span-2">
                                                                            <div className="text-[11px] font-bold uppercase tracking-widest text-gray-400">Request Line</div>
                                                                            <div className="mt-2 font-mono text-[12px] text-blue-700 break-all">{requestLine || 'Not captured'}</div>
                                                                        </div>
                                                                        <div className="rounded-xl border border-gray-100 bg-gray-50 p-3 sm:col-span-2">
                                                                            <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-gray-400">
                                                                                <Hash className="h-3.5 w-3.5" />
                                                                                <span>Request ID</span>
                                                                            </div>
                                                                            <div className="mt-2 font-mono text-[12px] text-gray-700 break-all">{log.requestId || 'Not captured'}</div>
                                                                        </div>
                                                                        <div className="rounded-xl border border-gray-100 bg-gray-50 p-3 sm:col-span-2">
                                                                            <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-gray-400">
                                                                                <Monitor className="h-3.5 w-3.5" />
                                                                                <span>User Agent</span>
                                                                            </div>
                                                                            <div className="mt-2 text-sm text-gray-700 break-all">{log.userAgent || 'Not captured'}</div>
                                                                        </div>
                                                                    </div>
                                                                </section>
                                                            </div>

                                                            <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
                                                                <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                                                                    <h4 className="text-xs font-black uppercase tracking-widest text-gray-400">Structured Details</h4>
                                                                    {detailEntries.length > 0 ? (
                                                                        <div className="mt-4 grid gap-3">
                                                                            {detailEntries.map(([key, value]) => (
                                                                                <div key={key} className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                                                                                    <div className="text-[11px] font-bold uppercase tracking-widest text-gray-400">{key}</div>
                                                                                    <div className="mt-2 text-sm font-semibold text-gray-800 break-words">
                                                                                        {renderDetailValue(value)}
                                                                                    </div>
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    ) : (
                                                                        <div className="mt-4 rounded-xl border border-dashed border-gray-200 bg-gray-50 p-4 text-sm font-medium text-gray-400">
                                                                            No structured details were saved for this audit entry.
                                                                        </div>
                                                                    )}
                                                                </section>

                                                                <section className="overflow-hidden rounded-2xl border border-gray-900 bg-gray-950 shadow-sm">
                                                                    <div className="border-b border-gray-800 px-4 py-3 text-xs font-black uppercase tracking-widest text-gray-400">
                                                                        audit.log.created
                                                                    </div>
                                                                    <pre className="overflow-x-auto p-4 text-[11px] leading-relaxed text-gray-100">
                                                                        {JSON.stringify(auditPayload, null, 2)}
                                                                    </pre>
                                                                </section>
                                                            </div>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </React.Fragment>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50/50">
                        <p className="text-sm font-bold text-gray-500 uppercase tracking-widest">Page {page} of {totalPages}</p>
                        <div className="flex gap-2">
                            <button onClick={() => { setExpandedLog(null); setPage(p => Math.max(1, p - 1)); }} disabled={page === 1}
                                className="p-2 border border-gray-200 bg-white rounded-xl disabled:opacity-50 hover:bg-gray-50 shadow-sm transition-colors text-gray-700">
                                <ChevronLeft className="h-5 w-5" />
                            </button>
                            <button onClick={() => { setExpandedLog(null); setPage(p => Math.min(totalPages, p + 1)); }} disabled={page === totalPages}
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
