import { useState, useEffect } from "react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  CalendarDays, Clock, Mail, Phone, MessageSquare,
  CheckCircle, XCircle, Loader2, Inbox, Trash2
} from "lucide-react";
import { toast } from "sonner";

interface Appointment {
  id: string;
  card_id: string;
  visitor_name: string;
  visitor_email: string;
  visitor_phone: string | null;
  visitor_message: string | null;
  meeting_purpose: string | null;
  appointment_date: string;
  appointment_time: string;
  status: string;
  created_at: string;
}

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-500/10 text-yellow-600 border-yellow-500/30",
  confirmed: "bg-green-500/10 text-green-600 border-green-500/30",
  cancelled: "bg-red-500/10 text-red-600 border-red-500/30",
  completed: "bg-blue-500/10 text-blue-600 border-blue-500/30",
};

export default function AppointmentManager() {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [deleteTarget, setDeleteTarget] = useState<Appointment | null>(null);

  useEffect(() => {
    if (user?.id) loadAppointments();
  }, [user?.id]);

  const loadAppointments = async () => {
    setLoading(true);
    // Get user's cards first, then appointments for those cards
    const { data: cards } = await supabase
      .from("cards")
      .select("id")
      .eq("user_id", user!.id);

    if (!cards || cards.length === 0) {
      setAppointments([]);
      setLoading(false);
      return;
    }

    const cardIds = cards.map((c) => c.id);
    const { data, error } = await supabase
      .from("card_appointments")
      .select("*")
      .in("card_id", cardIds)
      .order("appointment_date", { ascending: false });

    if (error) {
      console.error(error);
      toast.error("Failed to load appointments");
    } else {
      setAppointments((data || []) as Appointment[]);
    }
    setLoading(false);
  };

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase
      .from("card_appointments")
      .update({ status })
      .eq("id", id);

    if (error) {
      toast.error("Failed to update status");
    } else {
      toast.success(`Appointment ${status}`);
      setAppointments((prev) =>
        prev.map((a) => (a.id === id ? { ...a, status } : a))
      );
    }
  };

  const deleteAppointment = async () => {
    if (!deleteTarget) return;
    const { error } = await supabase
      .from("card_appointments")
      .delete()
      .eq("id", deleteTarget.id);
    if (error) {
      toast.error("Failed to delete appointment");
    } else {
      toast.success("Appointment deleted");
      setAppointments((prev) => prev.filter((a) => a.id !== deleteTarget.id));
    }
    setDeleteTarget(null);
  };

  const formatTime12h = (time24: string) => {
    const [h, m] = time24.split(":").map(Number);
    const ampm = h >= 12 ? "PM" : "AM";
    const h12 = h % 12 || 12;
    return `${h12}:${m.toString().padStart(2, "0")} ${ampm}`;
  };

  const filtered = filter === "all"
    ? appointments
    : appointments.filter((a) => a.status === filter);

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Inbox className="h-5 w-5 text-primary" />
              Appointments
              {appointments.filter((a) => a.status === "pending").length > 0 && (
                <Badge variant="destructive" className="ml-1">
                  {appointments.filter((a) => a.status === "pending").length} pending
                </Badge>
              )}
            </CardTitle>
            <CardDescription className="mt-1">Manage your booked appointments</CardDescription>
          </div>
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="confirmed">Confirmed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>

      <CardContent>
        {filtered.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <CalendarDays className="h-10 w-10 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No appointments found</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((apt) => (
              <div
                key={apt.id}
                className="rounded-xl border p-4 space-y-3 transition-all hover:shadow-sm"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-semibold text-sm">{apt.visitor_name}</h4>
                      <Badge
                        variant="outline"
                        className={`text-xs ${STATUS_COLORS[apt.status] || ""}`}
                      >
                        {apt.status}
                      </Badge>
                      {apt.meeting_purpose && (
                        <Badge variant="secondary" className="text-xs">
                          {apt.meeting_purpose}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                      <span className="flex items-center gap-1">
                        <CalendarDays className="h-3 w-3" />
                        {format(new Date(apt.appointment_date), "MMM d, yyyy")}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatTime12h(apt.appointment_time)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        {apt.visitor_email}
                      </span>
                      {apt.visitor_phone && (
                        <span className="flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {apt.visitor_phone}
                        </span>
                      )}
                    </div>
                    {apt.visitor_message && (
                      <p className="text-xs text-muted-foreground mt-2 flex items-start gap-1">
                        <MessageSquare className="h-3 w-3 mt-0.5 shrink-0" />
                        {apt.visitor_message}
                      </p>
                    )}
                  </div>

                  {apt.status === "pending" && (
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1 text-primary hover:bg-primary/10"
                        onClick={() => updateStatus(apt.id, "confirmed")}
                      >
                        <CheckCircle className="h-3.5 w-3.5" /> Confirm
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1 text-destructive hover:bg-destructive/10"
                        onClick={() => updateStatus(apt.id, "cancelled")}
                      >
                        <XCircle className="h-3.5 w-3.5" /> Decline
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive hover:bg-destructive/10"
                        onClick={() => setDeleteTarget(apt)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )}

                  {apt.status === "confirmed" && (
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1"
                        onClick={() => updateStatus(apt.id, "completed")}
                      >
                        <CheckCircle className="h-3.5 w-3.5" /> Complete
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive hover:bg-destructive/10"
                        onClick={() => setDeleteTarget(apt)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )}

                  {(apt.status === "cancelled" || apt.status === "completed") && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive hover:bg-destructive/10 shrink-0"
                      onClick={() => setDeleteTarget(apt)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Appointment</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the appointment with "{deleteTarget?.visitor_name}"? This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={deleteAppointment}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
