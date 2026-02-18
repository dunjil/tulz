"use client";

import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { apiHelpers } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  MessageSquarePlus,
  Star,
  Send,
  Lightbulb,
  Bug,
  Sparkles,
  Heart,
  CheckCircle2,
  Clock,
  AlertCircle,
  XCircle,
  MessageSquare,
} from "lucide-react";
import { useAuth } from "@/providers/auth-provider";

export default function FeedbackPage() {
  const { user } = useAuth();
  const [type, setType] = useState("review");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [rating, setRating] = useState(5);
  const [toolName, setToolName] = useState("");
  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const { data: feedbackTypes } = useQuery({
    queryKey: ["feedback-types"],
    queryFn: async () => {
      const response = await apiHelpers.getFeedbackTypes();
      return response.data.types as { id: string; name: string; description: string }[];
    },
  });

  const { data: tools } = useQuery({
    queryKey: ["feedback-tools"],
    queryFn: async () => {
      const response = await apiHelpers.getFeedbackTools();
      return response.data.tools as { id: string; name: string }[];
    },
  });

  const { data: publicFeedback, refetch: refetchPublic } = useQuery({
    queryKey: ["public-feedback"],
    queryFn: async () => {
      const response = await apiHelpers.getPublicFeedbackList({ limit: 10 });
      return response.data.items as any[];
    },
  });

  const submitMutation = useMutation({
    mutationFn: async () => {
      const response = await apiHelpers.submitFeedback({
        type,
        subject,
        message,
        rating: type === "review" ? rating : undefined,
        tool_name: toolName || undefined,
        guest_name: !user ? guestName || undefined : undefined,
        guest_email: !user ? guestEmail || undefined : undefined,
      });
      return response.data;
    },
    onSuccess: () => {
      setSubmitted(true);
      refetchPublic();
      toast.success("Thank you for your feedback!");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to submit feedback");
    },
  });

  const resetForm = () => {
    setType("review");
    setSubject("");
    setMessage("");
    setRating(5);
    setToolName("");
    setGuestName("");
    setGuestEmail("");
    setSubmitted(false);
  };

  const getTypeIcon = (typeId: string) => {
    switch (typeId) {
      case "review":
        return <Star className="h-4 w-4" />;
      case "suggestion":
        return <Lightbulb className="h-4 w-4" />;
      case "bug_report":
        return <Bug className="h-4 w-4" />;
      case "feature_request":
        return <Sparkles className="h-4 w-4" />;
      default:
        return <MessageSquarePlus className="h-4 w-4" />;
    }
  };

  if (submitted) {
    return (
      <div className="max-w-2xl mx-auto">
        <Card className="text-center">
          <CardContent className="py-12">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 mb-6">
              <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Thank You!</h2>
            <p className="text-muted-foreground mb-6">
              Your feedback has been submitted successfully. We appreciate you taking the time to help us improve Tulz.
            </p>
            <div className="flex gap-3 justify-center">
              <Button onClick={resetForm} variant="outline">
                Submit Another
              </Button>
              <Button onClick={() => window.location.href = "/dashboard"}>
                Back to Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-3">
          <MessageSquarePlus className="h-7 w-7 sm:h-8 sm:w-8 text-primary" />
          Feedback & Suggestions
        </h1>
        <p className="text-muted-foreground mt-2">
          Help us improve Tulz by sharing your thoughts, reporting issues, or suggesting new features.
        </p>
      </div>

      {/* Quick Action Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {feedbackTypes?.map((ft) => (
          <button
            key={ft.id}
            onClick={() => setType(ft.id)}
            className={`p-3 rounded-lg border text-left transition-all ${type === ft.id
              ? "border-primary bg-primary/5 ring-2 ring-primary"
              : "hover:bg-muted"
              }`}
          >
            <div className={`flex items-center gap-2 mb-1 ${type === ft.id ? "text-primary" : "text-muted-foreground"
              }`}>
              {getTypeIcon(ft.id)}
              <span className="font-medium text-sm">{ft.name}</span>
            </div>
          </button>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {getTypeIcon(type)}
            {feedbackTypes?.find((t) => t.id === type)?.name || "Feedback"}
          </CardTitle>
          <CardDescription>
            {feedbackTypes?.find((t) => t.id === type)?.description}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Rating (only for reviews) */}
          {type === "review" && (
            <div className="space-y-2">
              <Label>Rating</Label>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    className="p-1 transition-transform hover:scale-110"
                  >
                    <Star
                      className={`h-8 w-8 ${star <= rating
                        ? "text-yellow-400 fill-yellow-400"
                        : "text-gray-300"
                        }`}
                    />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Tool Selection */}
          <div className="space-y-2">
            <Label>Related Tool (optional)</Label>
            <Select value={toolName || "none"} onValueChange={(val) => setToolName(val === "none" ? "" : val)}>
              <SelectTrigger>
                <SelectValue placeholder="Select a tool..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None / General</SelectItem>
                {tools?.map((tool) => (
                  <SelectItem key={tool.id} value={tool.id}>
                    {tool.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Subject */}
          <div className="space-y-2">
            <Label htmlFor="subject">Subject</Label>
            <Input
              id="subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder={
                type === "review"
                  ? "Brief summary of your experience"
                  : type === "bug_report"
                    ? "What went wrong?"
                    : type === "feature_request"
                      ? "What feature would you like?"
                      : "Your suggestion title"
              }
              maxLength={200}
            />
          </div>

          {/* Message */}
          <div className="space-y-2">
            <Label htmlFor="message">
              {type === "review" ? "Your Review" : "Details"}
            </Label>
            <Textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={
                type === "review"
                  ? "Tell us about your experience with Tulz..."
                  : type === "bug_report"
                    ? "Please describe the issue in detail. Include steps to reproduce if possible..."
                    : type === "feature_request"
                      ? "Describe the feature you'd like to see and how it would help you..."
                      : "Share your suggestion or idea..."
              }
              className="min-h-[150px]"
            />
          </div>

          {/* Guest Info (only for non-logged-in users) */}
          {!user && (
            <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground">
                Optional: Leave your contact info if you'd like us to follow up.
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="guestName">Name</Label>
                  <Input
                    id="guestName"
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                    placeholder="Your name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="guestEmail">Email</Label>
                  <Input
                    id="guestEmail"
                    type="email"
                    value={guestEmail}
                    onChange={(e) => setGuestEmail(e.target.value)}
                    placeholder="your@email.com"
                  />
                </div>
              </div>
            </div>
          )}

          <Button
            className="w-full"
            onClick={() => submitMutation.mutate()}
            disabled={!subject.trim() || !message.trim() || submitMutation.isPending}
          >
            <Send className="mr-2 h-4 w-4" />
            {submitMutation.isPending ? "Submitting..." : "Submit Feedback"}
          </Button>
        </CardContent>
      </Card>

      {/* Public Feedback List */}
      <div className="mt-12 space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            Recent Public Feedback
          </h2>
        </div>

        <div className="space-y-4">
          {publicFeedback && publicFeedback.length > 0 ? (
            publicFeedback.map((fb) => (
              <Card key={fb.id} className="overflow-hidden">
                <CardHeader className="py-4 bg-muted/30">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <CardTitle className="text-base font-semibold leading-tight">
                        {fb.subject}
                      </CardTitle>
                      <CardDescription className="text-xs flex items-center gap-2">
                        {getTypeIcon(fb.type)}
                        <span className="capitalize">{fb.type.replace("_", " ")}</span>
                        {fb.tool_name && (
                          <>
                            <span className="text-muted-foreground">•</span>
                            <span>{fb.tool_name}</span>
                          </>
                        )}
                        <span className="text-muted-foreground">•</span>
                        <span>{new Date(fb.created_at).toLocaleDateString()}</span>
                      </CardDescription>
                    </div>
                    {/* Status Badge */}
                    <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${fb.status === "pending" ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400" :
                      fb.status === "in_progress" ? "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400" :
                        fb.status === "completed" ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" :
                          "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400"
                      }`}>
                      {fb.status === "pending" && <Clock className="h-3 w-3" />}
                      {fb.status === "in_progress" && <AlertCircle className="h-3 w-3" />}
                      {fb.status === "completed" && <CheckCircle2 className="h-3 w-3" />}
                      {fb.status === "dismissed" && <XCircle className="h-3 w-3" />}
                      <span className="capitalize">
                        {fb.status === "completed" ? "Addressed" : fb.status.replace("_", " ")}
                      </span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="py-4 text-sm whitespace-pre-wrap text-muted-foreground">
                  {fb.message}
                </CardContent>
              </Card>
            ))
          ) : (
            <div className="text-center py-12 border-2 border-dashed rounded-xl">
              <MessageSquare className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
              <p className="text-muted-foreground">No public feedback yet. Be the first!</p>
            </div>
          )}
        </div>
      </div>

      {/* Support Message */}
      <Card className="mt-12 bg-gradient-to-r from-primary/5 to-purple-500/5 border-0">
        <CardContent className="py-6 text-center">
          <Heart className="h-8 w-8 text-pink-500 mx-auto mb-3" />
          <h3 className="font-semibold mb-1">We Value Your Feedback</h3>
          <p className="text-sm text-muted-foreground">
            Every piece of feedback helps us make Tulz better for everyone. Thank you for being part of our community!
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
