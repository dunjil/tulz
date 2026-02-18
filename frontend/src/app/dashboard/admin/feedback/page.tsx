"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiHelpers } from "@/lib/api";
import toast from "react-hot-toast";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
} from "@/components/ui/dialog";
import {
  MessageSquare,
  Star,
  Bug,
  Lightbulb,
  Sparkles,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  Eye,
  Trash2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

interface FeedbackStats {
  total: number;
  pending: number;
  reviewed: number;
  in_progress: number;
  completed: number;
  dismissed: number;
  by_type: Record<string, number>;
  average_rating: number | null;
}

interface FeedbackItem {
  id: string;
  type: string;
  subject: string;
  message: string;
  rating: number | null;
  tool_name: string | null;
  status: string;
  admin_notes: string | null;
  user_id: string | null;
  guest_email: string | null;
  guest_name: string | null;
  created_at: string;
}

interface FeedbackListResponse {
  items: FeedbackItem[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  reviewed: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  in_progress: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
  completed: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400", // Will be shown as "Addressed"
  dismissed: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400",
};

const typeIcons: Record<string, React.ReactNode> = {
  review: <Star className="h-4 w-4" />,
  suggestion: <Lightbulb className="h-4 w-4" />,
  bug_report: <Bug className="h-4 w-4" />,
  feature_request: <Sparkles className="h-4 w-4" />,
};

const statusIcons: Record<string, React.ReactNode> = {
  pending: <Clock className="h-4 w-4" />,
  reviewed: <Eye className="h-4 w-4" />,
  in_progress: <AlertCircle className="h-4 w-4" />,
  completed: <CheckCircle2 className="h-4 w-4" />,
  dismissed: <XCircle className="h-4 w-4" />,
};

export default function AdminFeedbackPage() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [selectedFeedback, setSelectedFeedback] = useState<FeedbackItem | null>(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [newStatus, setNewStatus] = useState<string>("");

  const { data: stats, isLoading: statsLoading } = useQuery<FeedbackStats>({
    queryKey: ["admin", "feedback", "stats"],
    queryFn: async () => {
      const res = await apiHelpers.getAdminFeedbackStats();
      return res.data;
    },
  });

  const { data: feedbackList, isLoading: listLoading } = useQuery<FeedbackListResponse>({
    queryKey: ["admin", "feedback", "list", statusFilter, typeFilter, page],
    queryFn: async () => {
      const params: Record<string, any> = { page, limit: 10 };
      if (statusFilter !== "all") params.status = statusFilter;
      if (typeFilter !== "all") params.type = typeFilter;
      const res = await apiHelpers.getAdminFeedbackList(params);
      return res.data;
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: { status?: string; admin_notes?: string } }) => {
      return apiHelpers.updateAdminFeedback(id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "feedback"] });
      toast.success("Feedback updated successfully");
      setSelectedFeedback(null);
    },
    onError: () => {
      toast.error("Failed to update feedback");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiHelpers.deleteAdminFeedback(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "feedback"] });
      toast.success("Feedback deleted");
      setSelectedFeedback(null);
    },
    onError: () => {
      toast.error("Failed to delete feedback");
    },
  });

  const openFeedbackDetail = (feedback: FeedbackItem) => {
    setSelectedFeedback(feedback);
    setAdminNotes(feedback.admin_notes || "");
    setNewStatus(feedback.status);
  };

  const handleUpdate = () => {
    if (!selectedFeedback) return;
    const data: { status?: string; admin_notes?: string } = {};
    if (newStatus !== selectedFeedback.status) data.status = newStatus;
    if (adminNotes !== (selectedFeedback.admin_notes || "")) data.admin_notes = adminNotes;
    if (Object.keys(data).length > 0) {
      updateMutation.mutate({ id: selectedFeedback.id, data });
    }
  };

  const handleDelete = () => {
    if (!selectedFeedback) return;
    if (confirm("Are you sure you want to delete this feedback?")) {
      deleteMutation.mutate(selectedFeedback.id);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Total</span>
            </div>
            <p className="text-2xl font-bold mt-1">{stats?.total || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-yellow-500" />
              <span className="text-sm text-muted-foreground">Pending</span>
            </div>
            <p className="text-2xl font-bold mt-1">{stats?.pending || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Eye className="h-4 w-4 text-blue-500" />
              <span className="text-sm text-muted-foreground">Reviewed</span>
            </div>
            <p className="text-2xl font-bold mt-1">{stats?.reviewed || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-purple-500" />
              <span className="text-sm text-muted-foreground">In Progress</span>
            </div>
            <p className="text-2xl font-bold mt-1">{stats?.in_progress || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <span className="text-sm text-muted-foreground">Addressed</span>
            </div>
            <p className="text-2xl font-bold mt-1">{stats?.completed || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Star className="h-4 w-4 text-yellow-400" />
              <span className="text-sm text-muted-foreground">Avg Rating</span>
            </div>
            <p className="text-2xl font-bold mt-1">
              {stats?.average_rating ? stats.average_rating.toFixed(1) : "N/A"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Type Breakdown */}
      {stats?.by_type && Object.keys(stats.by_type).length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Feedback by Type</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3 flex-wrap">
              {Object.entries(stats.by_type).map(([type, count]) => (
                <div
                  key={type}
                  className="flex items-center gap-2 px-3 py-2 bg-muted rounded-lg"
                >
                  {typeIcons[type]}
                  <span className="capitalize font-medium">{type.replace("_", " ")}</span>
                  <span className="text-muted-foreground">({count})</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Feedback List</CardTitle>
          <CardDescription>View and manage user feedback</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-4">
            <div className="w-40">
              <Label className="text-xs">Status</Label>
              <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="reviewed">Reviewed</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Addressed</SelectItem>
                  <SelectItem value="dismissed">Dismissed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="w-40">
              <Label className="text-xs">Type</Label>
              <Select value={typeFilter} onValueChange={(v) => { setTypeFilter(v); setPage(1); }}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="review">Reviews</SelectItem>
                  <SelectItem value="suggestion">Suggestions</SelectItem>
                  <SelectItem value="bug_report">Bug Reports</SelectItem>
                  <SelectItem value="feature_request">Feature Requests</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {listLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : feedbackList?.items && feedbackList.items.length > 0 ? (
            <>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-24">Type</TableHead>
                      <TableHead>Subject</TableHead>
                      <TableHead className="w-24">Rating</TableHead>
                      <TableHead className="w-28">Status</TableHead>
                      <TableHead className="w-32">From</TableHead>
                      <TableHead className="w-36">Date</TableHead>
                      <TableHead className="w-32">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {feedbackList.items.map((item) => (
                      <TableRow key={item.id} className="cursor-pointer hover:bg-muted/50" onClick={() => openFeedbackDetail(item)}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {typeIcons[item.type]}
                            <span className="capitalize text-sm">{item.type.replace("_", " ")}</span>
                          </div>
                        </TableCell>
                        <TableCell className="font-medium max-w-[200px] truncate">
                          {item.subject}
                        </TableCell>
                        <TableCell>
                          {item.rating ? (
                            <div className="flex items-center gap-1">
                              <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />
                              <span>{item.rating}</span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${statusColors[item.status]}`}>
                            {statusIcons[item.status]}
                            {item.status === "completed" ? "Addressed" : item.status.replace("_", " ")}
                          </span>
                        </TableCell>
                        <TableCell className="text-sm">
                          {item.user_id ? (
                            <span className="text-blue-600">Registered User</span>
                          ) : item.guest_name || item.guest_email ? (
                            <span>{item.guest_name || item.guest_email}</span>
                          ) : (
                            <span className="text-muted-foreground">Anonymous</span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDate(item.created_at)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                            <Button
                              variant="ghost"
                              size="sm"
                              title="View Details"
                              onClick={() => openFeedbackDetail(item)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {item.status !== "in_progress" && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-purple-600 hover:text-purple-700 hover:bg-purple-50"
                                title="Set In Progress"
                                onClick={() => updateMutation.mutate({ id: item.id, data: { status: "in_progress" } })}
                              >
                                <AlertCircle className="h-4 w-4" />
                              </Button>
                            )}
                            {item.status !== "completed" && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-green-600 hover:text-green-700 hover:bg-green-50"
                                title="Mark Addressed"
                                onClick={() => updateMutation.mutate({ id: item.id, data: { status: "completed" } })}
                              >
                                <CheckCircle2 className="h-4 w-4" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              title="Delete Feedback"
                              onClick={() => {
                                if (confirm("Delete this feedback?")) {
                                  deleteMutation.mutate(item.id);
                                }
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {feedbackList.pages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <p className="text-sm text-muted-foreground">
                    Page {feedbackList.page} of {feedbackList.pages} ({feedbackList.total} items)
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(p => Math.min(feedbackList.pages, p + 1))}
                      disabled={page === feedbackList.pages}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No feedback found
            </div>
          )}
        </CardContent>
      </Card>

      {/* Feedback Detail Dialog */}
      <Dialog open={!!selectedFeedback} onOpenChange={() => setSelectedFeedback(null)}>
        <DialogContent className="max-w-2xl">
          {selectedFeedback && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {typeIcons[selectedFeedback.type]}
                  <span className="capitalize">{selectedFeedback.type.replace("_", " ")}</span>
                  {selectedFeedback.rating && (
                    <div className="flex items-center gap-1 ml-2">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`h-4 w-4 ${star <= selectedFeedback.rating!
                            ? "text-yellow-400 fill-yellow-400"
                            : "text-gray-300"
                            }`}
                        />
                      ))}
                    </div>
                  )}
                </DialogTitle>
                <DialogDescription>
                  Submitted on {formatDate(selectedFeedback.created_at)}
                  {selectedFeedback.tool_name && ` | Tool: ${selectedFeedback.tool_name}`}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 mt-4">
                {/* From Info */}
                <div className="p-3 bg-muted rounded-lg text-sm">
                  <span className="font-medium">From: </span>
                  {selectedFeedback.user_id ? (
                    <span className="text-blue-600">Registered User (ID: {selectedFeedback.user_id.slice(0, 8)}...)</span>
                  ) : selectedFeedback.guest_name || selectedFeedback.guest_email ? (
                    <span>
                      {selectedFeedback.guest_name && <span>{selectedFeedback.guest_name}</span>}
                      {selectedFeedback.guest_email && <span className="ml-1">({selectedFeedback.guest_email})</span>}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">Anonymous</span>
                  )}
                </div>

                {/* Subject */}
                <div>
                  <Label className="text-xs text-muted-foreground">Subject</Label>
                  <p className="font-medium">{selectedFeedback.subject}</p>
                </div>

                {/* Message */}
                <div>
                  <Label className="text-xs text-muted-foreground">Message</Label>
                  <div className="p-3 bg-muted/50 rounded-lg mt-1 whitespace-pre-wrap">
                    {selectedFeedback.message}
                  </div>
                </div>

                {/* Status Update */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Status</Label>
                    <Select value={newStatus} onValueChange={setNewStatus}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="reviewed">Reviewed</SelectItem>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="completed">Addressed</SelectItem>
                        <SelectItem value="dismissed">Dismissed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Admin Notes */}
                <div>
                  <Label>Admin Notes</Label>
                  <Textarea
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    placeholder="Add internal notes about this feedback..."
                    className="mt-1"
                  />
                </div>

                {/* Actions */}
                <div className="flex justify-between pt-4 border-t">
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleDelete}
                    disabled={deleteMutation.isPending}
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Delete
                  </Button>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setSelectedFeedback(null)}>
                      Cancel
                    </Button>
                    <Button
                      onClick={handleUpdate}
                      disabled={updateMutation.isPending}
                    >
                      {updateMutation.isPending ? (
                        <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                      ) : (
                        <CheckCircle2 className="h-4 w-4 mr-1" />
                      )}
                      Save Changes
                    </Button>
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
