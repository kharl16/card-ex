import { useState, useEffect, useMemo } from "react";
import { format, addDays, isBefore, startOfDay, parse } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarDays, Clock, User, Mail, Phone, MessageSquare, CheckCircle2, ArrowLeft, ArrowRight, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface AvailabilitySettings {
  working_days: string[];
  start_time: string;
  end_time: string;
  meeting_duration_minutes: number;
  buffer_minutes: number;
  meeting_purposes: string[];
}

interface AppointmentBookingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cardId: string;
  cardOwnerUserId: string;
  cardOwnerName: string;
  accentColor?: string;
}

const DAY_NAMES = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

export default function AppointmentBookingDialog({
  open,
  onOpenChange,
  cardId,
  cardOwnerUserId,
  cardOwnerName,
  accentColor = "#D4AF37",
}: AppointmentBookingDialogProps) {
  const [step, setStep] = useState<"date" | "time" | "form" | "success">("date");
  const [settings, setSettings] = useState<AvailabilitySettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [bookedSlots, setBookedSlots] = useState<string[]>([]);

  // Form fields
  const [visitorName, setVisitorName] = useState("");
  const [visitorEmail, setVisitorEmail] = useState("");
  const [visitorPhone, setVisitorPhone] = useState("");
  const [visitorMessage, setVisitorMessage] = useState("");
  const [meetingPurpose, setMeetingPurpose] = useState("");

  useEffect(() => {
    if (open) {
      loadSettings();
      resetForm();
    }
  }, [open, cardOwnerUserId]);

  const resetForm = () => {
    setStep("date");
    setSelectedDate(undefined);
    setSelectedTime("");
    setVisitorName("");
    setVisitorEmail("");
    setVisitorPhone("");
    setVisitorMessage("");
    setMeetingPurpose("");
    setBookedSlots([]);
  };

  const loadSettings = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("availability_settings")
      .select("*")
      .eq("user_id", cardOwnerUserId)
      .maybeSingle();

    if (data) {
      setSettings({
        working_days: Array.isArray(data.working_days) ? data.working_days as string[] : JSON.parse(data.working_days as string),
        start_time: data.start_time,
        end_time: data.end_time,
        meeting_duration_minutes: data.meeting_duration_minutes,
        buffer_minutes: data.buffer_minutes,
        meeting_purposes: Array.isArray(data.meeting_purposes) ? data.meeting_purposes as string[] : JSON.parse(data.meeting_purposes as string),
      });
    } else {
      // Default settings
      setSettings({
        working_days: ["monday", "tuesday", "wednesday", "thursday", "friday"],
        start_time: "09:00",
        end_time: "17:00",
        meeting_duration_minutes: 30,
        buffer_minutes: 15,
        meeting_purposes: ["General Meeting", "Product Demo", "Consultation", "Follow-up"],
      });
    }
    setLoading(false);
  };

  // Load booked slots when date is selected
  useEffect(() => {
    if (selectedDate && cardId) {
      loadBookedSlots(selectedDate);
    }
  }, [selectedDate, cardId]);

  const loadBookedSlots = async (date: Date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    const { data } = await supabase
      .from("card_appointments")
      .select("appointment_time")
      .eq("card_id", cardId)
      .eq("appointment_date", dateStr)
      .in("status", ["pending", "confirmed"]);

    setBookedSlots(data?.map((a) => a.appointment_time) || []);
  };

  // Generate available time slots
  const availableSlots = useMemo(() => {
    if (!settings || !selectedDate) return [];

    const slots: string[] = [];
    const [startH, startM] = settings.start_time.split(":").map(Number);
    const [endH, endM] = settings.end_time.split(":").map(Number);
    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;
    const slotSize = settings.meeting_duration_minutes + settings.buffer_minutes;

    for (let m = startMinutes; m + settings.meeting_duration_minutes <= endMinutes; m += slotSize) {
      const h = Math.floor(m / 60);
      const min = m % 60;
      const timeStr = `${h.toString().padStart(2, "0")}:${min.toString().padStart(2, "0")}`;
      if (!bookedSlots.includes(timeStr)) {
        slots.push(timeStr);
      }
    }
    return slots;
  }, [settings, selectedDate, bookedSlots]);

  const isWorkingDay = (date: Date): boolean => {
    if (!settings) return false;
    const dayName = DAY_NAMES[date.getDay()];
    return settings.working_days.includes(dayName);
  };

  const disabledDays = (date: Date): boolean => {
    return isBefore(date, startOfDay(new Date())) || !isWorkingDay(date);
  };

  const formatTime12h = (time24: string) => {
    const [h, m] = time24.split(":").map(Number);
    const ampm = h >= 12 ? "PM" : "AM";
    const h12 = h % 12 || 12;
    return `${h12}:${m.toString().padStart(2, "0")} ${ampm}`;
  };

  const handleSubmit = async () => {
    if (!selectedDate || !selectedTime || !visitorName.trim() || !visitorEmail.trim()) {
      toast.error("Please fill in all required fields");
      return;
    }

    // Basic email validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(visitorEmail.trim())) {
      toast.error("Please enter a valid email address");
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.from("card_appointments").insert({
        card_id: cardId,
        owner_user_id: cardOwnerUserId,
        appointment_date: format(selectedDate, "yyyy-MM-dd"),
        appointment_time: selectedTime,
        visitor_name: visitorName.trim(),
        visitor_email: visitorEmail.trim(),
        visitor_phone: visitorPhone.trim() || null,
        visitor_message: visitorMessage.trim() || null,
        meeting_purpose: meetingPurpose || null,
        status: "pending",
      });

      if (error) throw error;

      // Auto-create lead from appointment
      await supabase.from("leads").insert({
        owner_user_id: cardOwnerUserId,
        name: visitorName.trim(),
        email: visitorEmail.trim(),
        phone: visitorPhone.trim() || null,
        source: "appointment",
        card_id: cardId,
        notes: meetingPurpose ? `Appointment: ${meetingPurpose}` : "Booked an appointment",
        metadata: {
          meeting_purpose: meetingPurpose || null,
          appointment_date: format(selectedDate, "yyyy-MM-dd"),
          appointment_time: selectedTime,
          message: visitorMessage.trim() || null,
        },
      }).then(({ error: leadErr }) => {
        if (leadErr) console.warn("Lead auto-capture failed:", leadErr);
      });

      setStep("success");
      toast.success("Appointment booked successfully!");
    } catch (err) {
      console.error("Booking error:", err);
      toast.error("Failed to book appointment. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <CalendarDays className="h-5 w-5" style={{ color: accentColor }} />
            {step === "success" ? "Booking Confirmed!" : `Book with ${cardOwnerName}`}
          </DialogTitle>
        </DialogHeader>

        {/* Step indicator */}
        {step !== "success" && (
          <div className="flex items-center gap-2 mb-4">
            {["date", "time", "form"].map((s, i) => (
              <div key={s} className="flex items-center gap-2">
                <div
                  className={cn(
                    "h-8 w-8 rounded-full flex items-center justify-center text-xs font-semibold transition-all",
                    step === s
                      ? "text-white shadow-lg"
                      : ["date", "time", "form"].indexOf(step) > i
                        ? "bg-primary/20 text-primary"
                        : "bg-muted text-muted-foreground"
                  )}
                  style={step === s ? { backgroundColor: accentColor } : undefined}
                >
                  {i + 1}
                </div>
                {i < 2 && <div className="h-[2px] w-8 bg-muted rounded" />}
              </div>
            ))}
          </div>
        )}

        {/* STEP 1: Date Selection */}
        {step === "date" && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Select a date for your appointment</p>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(date) => {
                setSelectedDate(date);
                if (date) setStep("time");
              }}
              disabled={disabledDays}
              fromDate={new Date()}
              toDate={addDays(new Date(), 60)}
              className={cn("p-3 pointer-events-auto rounded-xl border")}
            />
          </div>
        )}

        {/* STEP 2: Time Selection */}
        {step === "time" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Button variant="ghost" size="sm" onClick={() => setStep("date")} className="gap-1">
                <ArrowLeft className="h-4 w-4" /> Back
              </Button>
              <p className="text-sm font-medium">{selectedDate && format(selectedDate, "EEEE, MMM d")}</p>
            </div>
            <p className="text-sm text-muted-foreground">Choose an available time slot</p>
            {availableSlots.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No available slots on this date</p>
                <Button variant="outline" size="sm" className="mt-3" onClick={() => setStep("date")}>
                  Choose another date
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2 max-h-[300px] overflow-y-auto">
                {availableSlots.map((slot) => (
                  <Button
                    key={slot}
                    variant={selectedTime === slot ? "default" : "outline"}
                    size="sm"
                    className={cn("text-sm transition-all", selectedTime === slot && "shadow-md")}
                    style={selectedTime === slot ? { backgroundColor: accentColor } : undefined}
                    onClick={() => {
                      setSelectedTime(slot);
                      setStep("form");
                    }}
                  >
                    <Clock className="h-3 w-3 mr-1" />
                    {formatTime12h(slot)}
                  </Button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* STEP 3: Contact Form */}
        {step === "form" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Button variant="ghost" size="sm" onClick={() => setStep("time")} className="gap-1">
                <ArrowLeft className="h-4 w-4" /> Back
              </Button>
              <div className="text-right text-sm">
                <p className="font-medium">{selectedDate && format(selectedDate, "MMM d, yyyy")}</p>
                <p className="text-muted-foreground">{formatTime12h(selectedTime)}</p>
              </div>
            </div>

            {settings && settings.meeting_purposes.length > 0 && (
              <div>
                <label className="text-sm font-medium mb-1.5 block">Meeting Purpose</label>
                <Select value={meetingPurpose} onValueChange={setMeetingPurpose}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select purpose..." />
                  </SelectTrigger>
                  <SelectContent>
                    {settings.meeting_purposes.map((purpose) => (
                      <SelectItem key={purpose} value={purpose}>
                        {purpose}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div>
              <label className="text-sm font-medium mb-1.5 flex items-center gap-1">
                <User className="h-3.5 w-3.5" /> Name <span className="text-destructive">*</span>
              </label>
              <Input
                value={visitorName}
                onChange={(e) => setVisitorName(e.target.value)}
                placeholder="Your full name"
                maxLength={100}
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-1.5 flex items-center gap-1">
                <Mail className="h-3.5 w-3.5" /> Email <span className="text-destructive">*</span>
              </label>
              <Input
                type="email"
                value={visitorEmail}
                onChange={(e) => setVisitorEmail(e.target.value)}
                placeholder="your@email.com"
                maxLength={255}
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-1.5 flex items-center gap-1">
                <Phone className="h-3.5 w-3.5" /> Phone
              </label>
              <Input
                type="tel"
                value={visitorPhone}
                onChange={(e) => setVisitorPhone(e.target.value)}
                placeholder="+63 XXX XXX XXXX"
                maxLength={30}
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-1.5 flex items-center gap-1">
                <MessageSquare className="h-3.5 w-3.5" /> Message
              </label>
              <Textarea
                value={visitorMessage}
                onChange={(e) => setVisitorMessage(e.target.value)}
                placeholder="Anything you'd like to share beforehand..."
                rows={3}
                maxLength={500}
              />
            </div>

            <Button
              className="w-full h-11 text-base font-semibold gap-2"
              style={{ backgroundColor: accentColor }}
              onClick={handleSubmit}
              disabled={submitting || !visitorName.trim() || !visitorEmail.trim()}
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CalendarDays className="h-4 w-4" />}
              {submitting ? "Booking..." : "Confirm Booking"}
            </Button>
          </div>
        )}

        {/* SUCCESS */}
        {step === "success" && (
          <div className="text-center space-y-4 py-4">
            <div
              className="h-16 w-16 rounded-full flex items-center justify-center mx-auto"
              style={{ backgroundColor: `${accentColor}20` }}
            >
              <CheckCircle2 className="h-8 w-8" style={{ color: accentColor }} />
            </div>
            <div>
              <h3 className="text-lg font-semibold">You're booked!</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Your appointment with {cardOwnerName} is scheduled for
              </p>
              <p className="text-base font-medium mt-2">
                {selectedDate && format(selectedDate, "EEEE, MMMM d, yyyy")}
              </p>
              <p className="text-sm" style={{ color: accentColor }}>
                {formatTime12h(selectedTime)}
              </p>
              {meetingPurpose && (
                <p className="text-sm text-muted-foreground mt-1">Purpose: {meetingPurpose}</p>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {cardOwnerName} will confirm your appointment soon.
            </p>
            <Button variant="outline" onClick={() => onOpenChange(false)} className="w-full">
              Done
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
