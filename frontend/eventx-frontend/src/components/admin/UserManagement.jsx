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

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-3xl font-bold text-gray-900">User Management</h2>
                <p className="text-gray-600 mt-2">View users and basic details.</p>
            </div>

            {error && (
                <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}

            <Card>
                <CardHeader>
                    <CardTitle>Users</CardTitle>
                    <CardDescription>{total} total</CardDescription>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="py-8 text-center text-gray-500">
                            Loading users...
                        </div>
                    ) : users.length === 0 ? (
                        <div className="py-8 text-center text-gray-500">
                            No users found.
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Name
                                        </th>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Email
                                        </th>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Role
                                        </th>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Created
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {users.map((u) => (
                                        <tr key={u._id}>
                                            <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                                                {u.name}
                                            </td>
                                            <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-600">
                                                {u.email}
                                            </td>
                                            <td className="px-4 py-2 whitespace-nowrap text-sm">
                                                <span className="px-2 py-1 rounded bg-gray-100 text-gray-700">
                                                    {u.role}
                                                </span>
                                            </td>
                                            <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-600">
                                                {new Date(u.createdAt).toLocaleDateString()}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    <div className="flex items-center justify-end space-x-2 mt-4">
                        <Button
                            variant="outline"
                            disabled={page <= 1 || loading}
                            onClick={() => fetchUsers(page - 1)}
                        >
                            Prev
                        </Button>
                        <span className="text-sm text-gray-600">
                            Page {page} of {pages}
                        </span>
                        <Button
                            variant="outline"
                            disabled={page >= pages || loading}
                            onClick={() => fetchUsers(page + 1)}
                        >
                            Next
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default UserManagement;
