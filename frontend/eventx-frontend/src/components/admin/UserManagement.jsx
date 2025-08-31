import React, { useEffect, useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import {
    Card,
    CardHeader,
    CardTitle,
    CardDescription,
    CardContent,
} from "../ui/card";
import { Alert, AlertDescription } from "../ui/alert";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Input } from "../ui/input";
import { 
    Users, 
    Search, 
    Filter, 
    UserPlus, 
    Mail, 
    Calendar,
    Shield,
    Eye,
    Edit,
    Trash2,
    MoreHorizontal
} from "lucide-react";

const UserManagement = () => {
    const { token } = useAuth();
    const API_BASE_URL =
        import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";

    const [users, setUsers] = useState([]);
    const [page, setPage] = useState(1);
    const [pages, setPages] = useState(1);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [searchTerm, setSearchTerm] = useState("");
    const [filterRole, setFilterRole] = useState("all");

    const fetchUsers = async (targetPage = 1) => {
        setLoading(true);
        setError("");
        try {
            const res = await fetch(
                `${API_BASE_URL}/auth/users?page=${targetPage}&limit=10`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        "Content-Type": "application/json",
                    },
                }
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

    const getRoleBadgeColor = (role) => {
        switch (role) {
            case 'admin':
                return 'bg-red-100 text-red-800 border-red-200';
            case 'organizer':
                return 'bg-blue-100 text-blue-800 border-blue-200';
            case 'user':
                return 'bg-green-100 text-green-800 border-green-200';
            default:
                return 'bg-gray-100 text-gray-800 border-gray-200';
        }
    };

    const filteredUsers = users.filter(user => {
        const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            user.email.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesRole = filterRole === 'all' || user.role === filterRole;
        return matchesSearch && matchesRole;
    });

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                        <div className="p-2 bg-gray-100 rounded-lg">
                            <Users className="h-6 w-6 text-gray-900" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
                            <p className="text-gray-600">Manage users and their permissions</p>
                        </div>
                    </div>
                    <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                        <UserPlus className="h-4 w-4 mr-2" />
                        Add User
                    </Button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <Card className="hover:shadow-lg transition-shadow">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-600 uppercase tracking-wide">Total Users</p>
                                <p className="text-3xl font-bold text-gray-900 mt-2">{total}</p>
                            </div>
                            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                                <Users className="h-6 w-6 text-blue-600" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
                
                <Card className="hover:shadow-lg transition-shadow">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-600 uppercase tracking-wide">Admins</p>
                                <p className="text-3xl font-bold text-gray-900 mt-2">{users.filter(u => u.role === 'admin').length}</p>
                            </div>
                            <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                                <Shield className="h-6 w-6 text-red-600" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
                
                <Card className="hover:shadow-lg transition-shadow">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-600 uppercase tracking-wide">Organizers</p>
                                <p className="text-3xl font-bold text-gray-900 mt-2">{users.filter(u => u.role === 'organizer').length}</p>
                            </div>
                            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                                <Calendar className="h-6 w-6 text-blue-600" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
                
                <Card className="hover:shadow-lg transition-shadow">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-600 uppercase tracking-wide">Regular Users</p>
                                <p className="text-3xl font-bold text-gray-900 mt-2">{users.filter(u => u.role === 'user').length}</p>
                            </div>
                            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                                <Users className="h-6 w-6 text-green-600" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {error && (
                <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}

            <Card className="hover:shadow-lg transition-shadow">
                <CardHeader className="px-6 py-4 border-b border-gray-200 rounded-t-lg bg-white">
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="flex items-center text-gray-900">
                                <Users className="h-5 w-5 mr-2" />
                                Users Directory
                            </CardTitle>
                            <CardDescription className="text-gray-700">{total} total users • {filteredUsers.length} shown</CardDescription>
                        </div>
                        <div className="flex items-center space-x-3">
                            <div className="relative">
                                <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                                <Input
                                    placeholder="Search users..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-10 w-64"
                                />
                            </div>
                            <select 
                                value={filterRole} 
                                onChange={(e) => setFilterRole(e.target.value)}
                                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            >
                                <option value="all">All Roles</option>
                                <option value="admin">Admin</option>
                                <option value="organizer">Organizer</option>
                                <option value="user">User</option>
                            </select>
                            <Button variant="outline" size="sm">
                                <Filter className="h-4 w-4 mr-2" />
                                Filter
                            </Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="py-12 text-center">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                            <p className="text-gray-500">Loading users...</p>
                        </div>
                    ) : filteredUsers.length === 0 ? (
                        <div className="py-12 text-center">
                            <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                            <h3 className="text-lg font-medium text-gray-900 mb-2">No users found</h3>
                            <p className="text-gray-500 mb-4">
                                {searchTerm || filterRole !== 'all' 
                                    ? 'Try adjusting your search or filter criteria.' 
                                    : 'No users have been created yet.'}
                            </p>
                            <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                                <UserPlus className="h-4 w-4 mr-2" />
                                Add First User
                            </Button>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {filteredUsers.map((u) => (
                                <div key={u._id} className="flex items-center justify-between p-6 border border-gray-200 rounded-lg hover:shadow-md transition-shadow bg-white">
                                    <div className="flex items-center space-x-4">
                                        <div className="w-12 h-12 rounded-full flex items-center justify-center border bg-white text-gray-700 font-bold text-lg">
                                            {u.name.charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <h4 className="font-semibold text-gray-900 text-lg">{u.name}</h4>
                                            <div className="flex items-center space-x-4 mt-1">
                                                <div className="flex items-center text-sm text-gray-600">
                                                    <Mail className="w-4 h-4 mr-1" />
                                                    {u.email}
                                                </div>
                                                <div className="flex items-center text-sm text-gray-600">
                                                    <Calendar className="w-4 h-4 mr-1" />
                                                    {new Date(u.createdAt).toLocaleDateString()}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className="flex items-center space-x-4">
                                        <Badge className={`${getRoleBadgeColor(u.role)} border font-medium`}>
                                            {u.role === 'admin' && <Shield className="w-3 h-3 mr-1" />}
                                            {u.role === 'organizer' && <Calendar className="w-3 h-3 mr-1" />}
                                            {u.role === 'user' && <Users className="w-3 h-3 mr-1" />}
                                            {u.role.charAt(0).toUpperCase() + u.role.slice(1)}
                                        </Badge>
                                        
                                        <div className="flex items-center space-x-2">
                                            <Button variant="outline" size="sm">
                                                <Eye className="h-4 w-4 mr-1" />
                                                View
                                            </Button>
                                            <Button variant="outline" size="sm">
                                                <Edit className="h-4 w-4 mr-1" />
                                                Edit
                                            </Button>
                                            <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50">
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {pages > 1 && (
                        <div className="flex items-center justify-between mt-6 pt-6 border-t border-gray-200">
                            <div className="text-sm text-gray-600">
                                Showing {((page - 1) * 10) + 1} to {Math.min(page * 10, total)} of {total} users
                            </div>
                            <div className="flex items-center space-x-2">
                                <Button
                                    variant="outline"
                                    disabled={page <= 1 || loading}
                                    onClick={() => fetchUsers(page - 1)}
                                    className="px-4 py-2"
                                >
                                    Previous
                                </Button>
                                <div className="flex items-center space-x-1">
                                    {Array.from({ length: Math.min(5, pages) }, (_, i) => {
                                        const pageNum = i + 1;
                                        return (
                                            <Button
                                                key={pageNum}
                                                variant={page === pageNum ? "default" : "outline"}
                                                size="sm"
                                                onClick={() => fetchUsers(pageNum)}
                                                className="w-10 h-10"
                                            >
                                                {pageNum}
                                            </Button>
                                        );
                                    })}
                                </div>
                                <Button
                                    variant="outline"
                                    disabled={page >= pages || loading}
                                    onClick={() => fetchUsers(page + 1)}
                                    className="px-4 py-2"
                                >
                                    Next
                                </Button>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

export default UserManagement;
