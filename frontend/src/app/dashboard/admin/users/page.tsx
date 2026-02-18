"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Search,
  Crown,
  UserCheck,
  UserX,
  ChevronLeft,
  ChevronRight,
  Shield,
  Eye,
  UserPlus,
  Trash2,
} from "lucide-react";
import toast from "react-hot-toast";

interface UserData {
  id: string;
  email: string;
  full_name: string;
  is_verified: boolean;
  is_active: boolean;
  is_superuser: boolean;
  created_at: string;
  last_login_at: string | null;
  subscription: {
    tier: string;
    status: string;
  };
  total_uses: number;
}

interface UsersResponse {
  users: UserData[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

interface UserDetail {
  user: {
    id: string;
    email: string;
    full_name: string;
    avatar_url: string | null;
    is_verified: boolean;
    is_active: boolean;
    is_superuser: boolean;
    oauth_provider: string | null;
    created_at: string;
    last_login_at: string | null;
    last_login_ip: string | null;
  };
  subscription: {
    id: string | null;
    tier: string;
    status: string;
    uses_today: number;
    current_period_end: string | null;
  };
  recent_usage: {
    id: string;
    tool: string;
    operation: string;
    success: boolean;
    processing_time_ms: number;
    created_at: string;
  }[];
  payments: {
    id: string;
    amount: number;
    currency: string;
    status: string;
    provider: string;
    created_at: string;
  }[];
}

export default function AdminUsersPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);

  // Create admin dialog state
  const [showCreateAdmin, setShowCreateAdmin] = useState(false);
  const [newAdminName, setNewAdminName] = useState("");
  const [newAdminEmail, setNewAdminEmail] = useState("");
  const [newAdminPassword, setNewAdminPassword] = useState("");

  // Delete admin confirmation state
  const [adminToDelete, setAdminToDelete] = useState<UserData | null>(null);

  // Delete regular user confirmation state
  const [userToDelete, setUserToDelete] = useState<UserData | null>(null);

  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery<UsersResponse>({
    queryKey: ["admin", "users", page, search],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        per_page: "15",
      });
      if (search) params.append("search", search);
      const res = await api.get(`/admin/users?${params}`);
      return res.data;
    },
  });

  const { data: userDetail, isLoading: detailLoading } = useQuery<UserDetail>({
    queryKey: ["admin", "user", selectedUser],
    queryFn: async () => {
      const res = await api.get(`/admin/users/${selectedUser}`);
      return res.data;
    },
    enabled: !!selectedUser,
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async (userId: string) => {
      const res = await api.post(`/admin/users/${userId}/toggle-active`);
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(`User ${data.is_active ? "activated" : "deactivated"}`);
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "user", selectedUser] });
    },
    onError: () => {
      toast.error("Failed to update user status");
    },
  });

  const setProMutation = useMutation({
    mutationFn: async (userId: string) => {
      const res = await api.post(`/admin/users/${userId}/set-pro`);
      return res.data;
    },
    onSuccess: () => {
      toast.success("User upgraded to Pro!");
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "user", selectedUser] });
    },
    onError: () => {
      toast.error("Failed to upgrade user");
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      const res = await api.delete(`/admin/users/${userId}`);
      return res.data;
    },
    onSuccess: () => {
      toast.success("User deleted successfully");
      setUserToDelete(null);
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to delete user");
      setUserToDelete(null);
    },
  });

  const createAdminMutation = useMutation({
    mutationFn: async (payload: { email: string; full_name: string; password: string }) => {
      const res = await api.post("/admin/admins", payload);
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(`Admin "${data.full_name}" created successfully`);
      setShowCreateAdmin(false);
      setNewAdminName("");
      setNewAdminEmail("");
      setNewAdminPassword("");
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to create admin");
    },
  });

  const deleteAdminMutation = useMutation({
    mutationFn: async (userId: string) => {
      const res = await api.delete(`/admin/admins/${userId}`);
      return res.data;
    },
    onSuccess: () => {
      toast.success("Admin deleted successfully");
      setAdminToDelete(null);
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to delete admin");
      setAdminToDelete(null);
    },
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
  };

  const handleCreateAdmin = (e: React.FormEvent) => {
    e.preventDefault();
    createAdminMutation.mutate({
      email: newAdminEmail,
      full_name: newAdminName,
      password: newAdminPassword,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div />
        <Button onClick={() => setShowCreateAdmin(true)} className="flex items-center gap-2">
          <UserPlus className="h-4 w-4" />
          Create Admin
        </Button>
      </div>

      {/* Search */}
      <Card>
        <CardHeader>
          <CardTitle>User Management</CardTitle>
          <CardDescription>View and manage all users</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by email or name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button type="submit">Search</Button>
          </form>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data?.users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium flex items-center gap-1">
                            {user.full_name}
                            {user.is_superuser && (
                              <Shield className="h-3 w-3 text-primary" />
                            )}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {user.email}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {user.is_active ? (
                            <span className="flex items-center gap-1 text-green-600 text-sm">
                              <UserCheck className="h-3 w-3" />
                              Active
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-red-600 text-sm">
                              <UserX className="h-3 w-3" />
                              Inactive
                            </span>
                          )}
                          {user.is_verified && (
                            <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">
                              Verified
                            </span>
                          )}
                          {user.is_superuser && (
                            <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded font-medium">
                              Admin
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {new Date(user.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedUser(user.id)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleActiveMutation.mutate(user.id)}
                            disabled={toggleActiveMutation.isPending}
                          >
                            {user.is_active ? (
                              <UserX className="h-4 w-4 text-red-500" />
                            ) : (
                              <UserCheck className="h-4 w-4 text-green-500" />
                            )}
                          </Button>
                          {/* Delete — superusers use admin-delete flow, regular users use user-delete flow */}
                          {user.is_superuser ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setAdminToDelete(user)}
                              disabled={deleteAdminMutation.isPending}
                              title="Delete admin"
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setUserToDelete(user)}
                              disabled={deleteUserMutation.isPending}
                              title="Delete user"
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              {data && data.total_pages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t">
                  <p className="text-sm text-muted-foreground">
                    Showing {(page - 1) * 15 + 1} to{" "}
                    {Math.min(page * 15, data.total)} of {data.total} users
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm">
                      Page {page} of {data.total_pages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.min(data.total_pages, p + 1))}
                      disabled={page === data.total_pages}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* User Detail Dialog */}
      <Dialog open={!!selectedUser} onOpenChange={() => setSelectedUser(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>User Details</DialogTitle>
            <DialogDescription>
              View complete user information
            </DialogDescription>
          </DialogHeader>

          {detailLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : userDetail ? (
            <div className="space-y-6">
              {/* User Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Name</p>
                  <p className="font-medium">{userDetail.user.full_name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="font-medium">{userDetail.user.email}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Joined</p>
                  <p className="font-medium">
                    {new Date(userDetail.user.created_at).toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Last Login</p>
                  <p className="font-medium">
                    {userDetail.user.last_login_at
                      ? new Date(userDetail.user.last_login_at).toLocaleString()
                      : "Never"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Last IP</p>
                  <p className="font-medium font-mono text-sm">
                    {userDetail.user.last_login_ip || "N/A"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Auth Method</p>
                  <p className="font-medium capitalize">
                    {userDetail.user.oauth_provider || "Email/Password"}
                  </p>
                </div>
              </div>

              {/* Subscription */}
              <div className="p-4 bg-muted/50 rounded-lg">
                <p className="text-sm font-medium mb-2">Subscription</p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${userDetail.subscription.tier === "pro"
                        ? "bg-yellow-100 text-yellow-700"
                        : "bg-gray-100 text-gray-700"
                        }`}
                    >
                      {userDetail.subscription.tier === "pro" && (
                        <Crown className="h-3 w-3" />
                      )}
                      {userDetail.subscription.tier.toUpperCase()}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      ({userDetail.subscription.status})
                    </span>
                  </div>
                  <div className="text-sm">
                    Uses today: {userDetail.subscription.uses_today}
                  </div>
                </div>
                {userDetail.subscription.current_period_end && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Expires:{" "}
                    {new Date(userDetail.subscription.current_period_end).toLocaleDateString()}
                  </p>
                )}
              </div>

              {/* Recent Usage */}
              <div>
                <p className="text-sm font-medium mb-2">Recent Activity</p>
                {userDetail.recent_usage.length > 0 ? (
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {userDetail.recent_usage.map((usage) => (
                      <div
                        key={usage.id}
                        className="flex items-center justify-between text-sm py-1 border-b last:border-0"
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className={`w-2 h-2 rounded-full ${usage.success ? "bg-green-500" : "bg-red-500"
                              }`}
                          />
                          <span className="capitalize">{usage.tool}</span>
                          <span className="text-muted-foreground">
                            {usage.operation}
                          </span>
                        </div>
                        <span className="text-muted-foreground">
                          {new Date(usage.created_at).toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No recent activity</p>
                )}
              </div>

              {/* Payments */}
              {userDetail.payments.length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-2">Payment History</p>
                  <div className="space-y-2">
                    {userDetail.payments.map((payment) => (
                      <div
                        key={payment.id}
                        className="flex items-center justify-between text-sm py-1 border-b last:border-0"
                      >
                        <div>
                          <span className="font-medium">
                            ${payment.amount} {payment.currency}
                          </span>
                          <span className="text-muted-foreground ml-2">
                            via {payment.provider}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-0.5 rounded text-xs ${payment.status === "completed"
                              ? "bg-green-100 text-green-700"
                              : "bg-gray-100 text-gray-700"
                              }`}
                          >
                            {payment.status}
                          </span>
                          <span className="text-muted-foreground">
                            {new Date(payment.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-2 pt-4 border-t">
                <Button
                  variant={userDetail.user.is_active ? "destructive" : "default"}
                  onClick={() => toggleActiveMutation.mutate(userDetail.user.id)}
                  disabled={toggleActiveMutation.isPending}
                >
                  {userDetail.user.is_active ? (
                    <>
                      <UserX className="h-4 w-4 mr-2" />
                      Deactivate
                    </>
                  ) : (
                    <>
                      <UserCheck className="h-4 w-4 mr-2" />
                      Activate
                    </>
                  )}
                </Button>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* Create Admin Dialog */}
      <Dialog open={showCreateAdmin} onOpenChange={setShowCreateAdmin}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              Create Admin Account
            </DialogTitle>
            <DialogDescription>
              The new admin will have full superuser access to the dashboard.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateAdmin} className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="admin-name">Full Name</Label>
              <Input
                id="admin-name"
                placeholder="Jane Doe"
                value={newAdminName}
                onChange={(e) => setNewAdminName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="admin-email">Email</Label>
              <Input
                id="admin-email"
                type="email"
                placeholder="admin@example.com"
                value={newAdminEmail}
                onChange={(e) => setNewAdminEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="admin-password">Password</Label>
              <PasswordInput
                id="admin-password"
                placeholder="Strong password"
                value={newAdminPassword}
                onChange={(e) => setNewAdminPassword(e.target.value)}
                required
              />
            </div>
            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowCreateAdmin(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                isLoading={createAdminMutation.isPending}
                className="flex items-center gap-2"
              >
                <UserPlus className="h-4 w-4" />
                Create Admin
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Regular User Confirmation Dialog */}
      <Dialog open={!!userToDelete} onOpenChange={() => setUserToDelete(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="h-5 w-5" />
              Delete User
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to permanently delete{" "}
              <span className="font-semibold text-foreground">
                {userToDelete?.full_name}
              </span>{" "}
              ({userToDelete?.email})? All their data will be removed. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="pt-2">
            <Button variant="outline" onClick={() => setUserToDelete(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              isLoading={deleteUserMutation.isPending}
              onClick={() => userToDelete && deleteUserMutation.mutate(userToDelete.id)}
            >
              Delete User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Admin Confirmation Dialog */}
      <Dialog open={!!adminToDelete} onOpenChange={() => setAdminToDelete(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="h-5 w-5" />
              Delete Admin
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to permanently delete{" "}
              <span className="font-semibold text-foreground">
                {adminToDelete?.full_name}
              </span>{" "}
              ({adminToDelete?.email})? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="pt-2">
            <Button variant="outline" onClick={() => setAdminToDelete(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              isLoading={deleteAdminMutation.isPending}
              onClick={() => adminToDelete && deleteAdminMutation.mutate(adminToDelete.id)}
            >
              Delete Admin
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
