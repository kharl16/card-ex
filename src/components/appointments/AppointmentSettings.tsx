import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarDays, Clock, Plus, X, Loader2, Save } from "lucide-react";
import { toast } from "sonner";

const ALL_DAYS = [
  { value: "monday", label: "Mon" },
  { value: "tuesday", label: "Tue" },
  { value: "wednesday", label: "Wed" },
  { value: "thursday", label: "Thu" },
  { value: "friday", label: "Fri" },
  { value: "saturday", label: "Sat" },
  { value: "sunday", label: "Sun" },
];

const TIME_OPTIONS = Array.from({ length: 24 }, (_, h) =>
  [0, 30].map((m) => `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`)
).flat();

export default function AppointmentSettings() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [bookingEnabled, setBookingEnabled] = useState(false);
  const [workingDays, setWorkingDays] = useState<string[]>(["monday", "tuesday", "wednesday", "thursday", "friday"]);
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("17:00");
  const [duration, setDuration] = useState(30);
  const [buffer, setBuffer] = useState(15);
  const [purposes, setPurposes] = useState<string[]>(["General Meeting", "Product Demo", "Consultation", "Follow-up"]);
  const [newPurpose, setNewPurpose] = useState("");

  useEffect(() => {
    if (user?.id) loadSettings();
  }, [user?.id]);

  const loadSettings = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("availability_settings")
      .select("*")
      .eq("user_id", user!.id)
      .maybeSingle();

    if (data) {
      setBookingEnabled(data.booking_enabled);
      setWorkingDays(Array.isArray(data.working_days) ? data.working_days as string[] : []);
      setStartTime(data.start_time);
      setEndTime(data.end_time);
      setDuration(data.meeting_duration_minutes);
      setBuffer(data.buffer_minutes);
      setPurposes(Array.isArray(data.meeting_purposes) ? data.meeting_purposes as string[] : []);
    }
    setLoading(false);
  };

  const handleSave = async () => {
    if (!user?.id) return;
    setSaving(true);

    const payload = {
      user_id: user.id,
      booking_enabled: bookingEnabled,
      working_days: workingDays,
      start_time: startTime,
      end_time: endTime,
      meeting_duration_minutes: duration,
      buffer_minutes: buffer,
      meeting_purposes: purposes,
    };

    const { error } = await supabase
      .from("availability_settings")
      .upsert(payload, { onConflict: "user_id" });

    if (error) {
      console.error(error);
      toast.error("Failed to save settings");
    } else {
      toast.success("Availability settings saved");
    }
    setSaving(false);
  };

  const toggleDay = (day: string) => {
    setWorkingDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const addPurpose = () => {
    const trimmed = newPurpose.trim();
    if (trimmed && !purposes.includes(trimmed)) {
      setPurposes((prev) => [...prev, trimmed]);
      setNewPurpose("");
    }
  };

  const removePurpose = (p: string) => {
    setPurposes((prev) => prev.filter((x) => x !== p));
  };

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
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-primary" />
              Appointment Booking
            </CardTitle>
            <CardDescription className="mt-1">
              Let visitors book appointments from your public card
            </CardDescription>
          </div>
          <Switch checked={bookingEnabled} onCheckedChange={setBookingEnabled} />
        </div>
      </CardHeader>

      {bookingEnabled && (
        <CardContent className="space-y-6">
          {/* Working Days */}
          <div>
            <label className="text-sm font-medium mb-2 block">Working Days</label>
            <div className="flex flex-wrap gap-2">
              {ALL_DAYS.map((day) => (
                <Button
                  key={day.value}
                  variant={workingDays.includes(day.value) ? "default" : "outline"}
                  size="sm"
                  onClick={() => toggleDay(day.value)}
                >
                  {day.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Time Range */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-1.5 flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" /> Start Time
              </label>
              <Select value={startTime} onValueChange={setStartTime}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TIME_OPTIONS.map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" /> End Time
              </label>
              <Select value={endTime} onValueChange={setEndTime}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TIME_OPTIONS.map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Duration & Buffer */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Meeting Duration (min)</label>
              <Select value={duration.toString()} onValueChange={(v) => setDuration(Number(v))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[15, 30, 45, 60, 90, 120].map((m) => (
                    <SelectItem key={m} value={m.toString()}>{m} min</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Buffer Between (min)</label>
              <Select value={buffer.toString()} onValueChange={(v) => setBuffer(Number(v))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[0, 5, 10, 15, 30].map((m) => (
                    <SelectItem key={m} value={m.toString()}>{m} min</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Meeting Purposes */}
          <div>
            <label className="text-sm font-medium mb-2 block">Meeting Purposes</label>
            <div className="flex flex-wrap gap-2 mb-3">
              {purposes.map((p) => (
                <Badge key={p} variant="secondary" className="gap-1 pr-1">
                  {p}
                  <button
                    onClick={() => removePurpose(p)}
                    className="ml-1 hover:text-destructive transition-colors"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                value={newPurpose}
                onChange={(e) => setNewPurpose(e.target.value)}
                placeholder="Add purpose..."
                maxLength={50}
                onKeyDown={(e) => e.key === "Enter" && addPurpose()}
              />
              <Button type="button" variant="outline" size="icon" onClick={addPurpose}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Save Button */}
          <Button onClick={handleSave} disabled={saving} className="w-full gap-2">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {saving ? "Saving..." : "Save Settings"}
          </Button>
        </CardContent>
      )}

      {!bookingEnabled && (
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Enable booking to let visitors schedule appointments directly from your digital card.
          </p>
        </CardContent>
      )}
    </Card>
  );
}
