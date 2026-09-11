import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import Navigation from "@/components/Navigation";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { createBooking, getAvailability } from "@/lib/api";
import { formatPhoneInput, phoneValidation } from "@/lib/phone";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  HandHeart,
  Music,
  Calendar as CalendarIcon,
  Clock,
  User,
  Mail,
  FileText,
  Loader2,
  Phone,
  MessageCircle,
  PartyPopper,
  ExternalLink,
  UserX,
} from "lucide-react";
import { format, addDays } from "date-fns";

const REMEMBERED_PARTICIPANT_KEY = "upperroomRememberedParticipant";
const ZOOM_URL = "https://us02web.zoom.us/j/9033071964";

const steps = [
  { id: 1, title: "Your Name", icon: User },
  { id: 2, title: "Select Role", icon: HandHeart },
  { id: 3, title: "Select Date", icon: CalendarIcon },
  { id: 4, title: "Contact Details", icon: FileText },
];

const escapeICS = (value = "") => String(value).replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");

const BookSlotPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [availability, setAvailability] = useState([]);
  const [showEmail, setShowEmail] = useState(false);
  const [rememberDetails, setRememberDetails] = useState(true);
  const [rememberedParticipant, setRememberedParticipant] = useState(null);
  const [bookingResult, setBookingResult] = useState(null);
  const [formData, setFormData] = useState({
    full_name: "",
    role: searchParams.get("role") || "",
    date: searchParams.get("date") || "",
    notes: "",
    email: "",
    phone_number: "",
  });

  const phoneState = phoneValidation(formData.phone_number);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(REMEMBERED_PARTICIPANT_KEY);
      if (saved) {
        const participant = JSON.parse(saved);
        if (participant?.full_name) {
          setRememberedParticipant(participant);
          setFormData((current) => ({
            ...current,
            full_name: participant.full_name || "",
            phone_number: participant.phone_number || "",
            email: participant.email || "",
          }));
          if (participant.email) setShowEmail(true);
        }
      }
    } catch (error) {
      console.warn("Could not load remembered participant", error);
    }
  }, []);

  useEffect(() => {
    const fetchAvailability = async () => {
      try {
        const today = new Date();
        const oneMonthLater = addDays(today, 31);
        const response = await getAvailability(
          format(today, "yyyy-MM-dd"),
          format(oneMonthLater, "yyyy-MM-dd")
        );
        setAvailability(response.data);
      } catch (error) {
        console.error("Failed to fetch availability:", error);
      }
    };
    fetchAvailability();
  }, []);

  const clearRememberedParticipant = () => {
    localStorage.removeItem(REMEMBERED_PARTICIPANT_KEY);
    setRememberedParticipant(null);
    setFormData((current) => ({ ...current, full_name: "", phone_number: "", email: "" }));
    setShowEmail(false);
    toast.success("Saved details cleared");
  };

  const isDateAvailable = (date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    const dayAvailability = availability.find((a) => a.date === dateStr);
    if (!dayAvailability) return false;
    if (formData.role === "Prayer") return dayAvailability.prayer_available;
    if (formData.role === "Worship") return dayAvailability.worship_available;
    return dayAvailability.prayer_available || dayAvailability.worship_available;
  };

  const disabledDays = (date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const oneMonthLater = addDays(today, 31);
    if (date < today || date > oneMonthLater) return true;
    const day = date.getDay();
    if (day === 0 || day === 5 || day === 6) return true;
    if (formData.role && !isDateAvailable(date)) return true;
    return false;
  };

  const handleNext = () => {
    if (currentStep === 1 && !formData.full_name.trim()) {
      toast.error("Please enter your full name");
      return;
    }
    if (currentStep === 2 && !formData.role) {
      toast.error("Please select a role");
      return;
    }
    if (currentStep === 3 && !formData.date) {
      toast.error("Please select a date");
      return;
    }
    setCurrentStep((prev) => Math.min(prev + 1, 4));
  };

  const handleBack = () => setCurrentStep((prev) => Math.max(prev - 1, 1));

  const handlePhoneChange = (value) => {
    setFormData((current) => ({ ...current, phone_number: formatPhoneInput(value) }));
  };

  const addToCalendar = () => {
    if (!bookingResult) return;
    const compactDate = bookingResult.date.replace(/-/g, "");
    const ics = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Hebron Pentecostal Assembly//Upper Room//EN",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
      "BEGIN:VEVENT",
      `UID:${bookingResult.id || `${Date.now()}@upperroom.hebronpentecostalassembly.org`}`,
      `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "")}`,
      `DTSTART;TZID=Europe/London:${compactDate}T200000`,
      `DTEND;TZID=Europe/London:${compactDate}T210000`,
      `SUMMARY:${escapeICS(`Upper Room - Lead ${bookingResult.role}`)}`,
      `DESCRIPTION:${escapeICS(`You are scheduled to Lead ${bookingResult.role} at Upper Room. Join Zoom: ${ZOOM_URL}`)}`,
      `URL:${ZOOM_URL}`,
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\r\n");

    const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `upper-room-${bookingResult.date}.ics`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleSubmit = async () => {
    if (!formData.full_name.trim() || !formData.role || !formData.date) {
      toast.error("Please fill in all required fields");
      return;
    }
    if (!phoneState.valid) {
      toast.error(phoneState.message);
      return;
    }

    const phoneNumber = formData.phone_number.trim();
    setIsSubmitting(true);
    try {
      const response = await createBooking({
        full_name: formData.full_name.trim(),
        role: formData.role,
        date: formData.date,
        notes: formData.notes.trim() || null,
        email: formData.email.trim() || null,
        phone_number: phoneNumber || null,
        whatsapp_opt_in: Boolean(phoneNumber),
      });

      if (rememberDetails) {
        const participant = {
          full_name: formData.full_name.trim(),
          phone_number: phoneNumber,
          email: formData.email.trim(),
        };
        localStorage.setItem(REMEMBERED_PARTICIPANT_KEY, JSON.stringify(participant));
        setRememberedParticipant(participant);
      }

      setBookingResult({
        id: response.data?.id,
        full_name: formData.full_name.trim(),
        role: formData.role,
        date: formData.date,
        phone_number: phoneNumber,
        email: formData.email.trim(),
      });
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error) {
      const message = error.response?.data?.detail || "Failed to book slot. Please try again.";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
            {rememberedParticipant && (
              <div className="rounded-xl border border-orange-200 bg-orange-50 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-semibold text-foreground">👋 Welcome back, {rememberedParticipant.full_name.split(" ")[0]}</p>
                    <p className="mt-1 text-sm text-muted-foreground">We filled in your saved details. You can edit the name below if you're booking for someone else.</p>
                  </div>
                  <Button type="button" variant="outline" onClick={clearRememberedParticipant} className="shrink-0 gap-2 border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800" data-testid="clear-remembered-participant">
                    <UserX className="h-4 w-4" />
                    Not you? Clear saved details
                  </Button>
                </div>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="full_name" className="text-base font-medium">Full Name *</Label>
              <Input id="full_name" placeholder="Enter the name of the person leading" value={formData.full_name} onChange={(e) => setFormData({ ...formData, full_name: e.target.value })} className="input-soft h-12 text-base" data-testid="input-full-name" />
              <p className="text-xs text-muted-foreground">You can change this anytime, including when booking on behalf of a partner or someone else.</p>
            </div>
          </motion.div>
        );

      case 2:
        return (
          <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
            <Label className="text-base font-medium">Select Your Role *</Label>
            <RadioGroup value={formData.role} onValueChange={(value) => setFormData({ ...formData, role: value, date: "" })} className="grid gap-4 md:grid-cols-2">
              <Label htmlFor="prayer" className={`cursor-pointer rounded-xl border-2 p-6 transition-all ${formData.role === "Prayer" ? "border-blue-500 bg-blue-50" : "border-orange-100 hover:border-orange-200 hover:bg-orange-50/50"}`}>
                <RadioGroupItem value="Prayer" id="prayer" className="sr-only" />
                <div className="flex flex-col items-center text-center"><div className="mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100"><HandHeart className="h-8 w-8 text-blue-600" /></div><span className="font-['Playfair_Display'] text-xl font-semibold">Lead Prayer</span><span className="mt-1 text-sm text-muted-foreground">Guide the congregation in prayer</span></div>
              </Label>
              <Label htmlFor="worship" className={`cursor-pointer rounded-xl border-2 p-6 transition-all ${formData.role === "Worship" ? "border-purple-500 bg-purple-50" : "border-orange-100 hover:border-orange-200 hover:bg-orange-50/50"}`}>
                <RadioGroupItem value="Worship" id="worship" className="sr-only" />
                <div className="flex flex-col items-center text-center"><div className="mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-purple-100"><Music className="h-8 w-8 text-purple-600" /></div><span className="font-['Playfair_Display'] text-xl font-semibold">Lead Worship</span><span className="mt-1 text-sm text-muted-foreground">Lead the congregation in praise</span></div>
              </Label>
            </RadioGroup>
          </motion.div>
        );

      case 3:
        return (
          <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
            <div className="rounded-xl bg-gradient-to-r from-orange-50 to-amber-50 p-4"><div className="flex items-center gap-3"><Clock className="h-5 w-5 text-orange-600" /><p className="text-sm font-medium text-foreground">All online meetings are from 8:00 PM to 9:00 PM UK time.</p></div></div>
            <div className="space-y-2"><Label className="text-base font-medium">Select Date *</Label><p className="text-sm text-muted-foreground">Available days: Monday - Thursday (within next month)</p></div>
            <div className="flex justify-center"><Calendar mode="single" selected={formData.date ? new Date(formData.date) : undefined} onSelect={(date) => date && setFormData({ ...formData, date: format(date, "yyyy-MM-dd") })} disabled={disabledDays} className="rounded-xl border border-orange-100 p-3" data-testid="booking-calendar" /></div>
            {formData.date && <div className="rounded-xl bg-green-50 p-4 text-center"><p className="font-medium text-green-700">Selected: {format(new Date(formData.date), "EEEE, MMMM d, yyyy")}</p></div>}
          </motion.div>
        );

      case 4:
        return (
          <motion.div key="step4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-5">
            <div className="rounded-xl border-2 border-green-200 bg-green-50/70 p-5">
              <div className="mb-3 flex items-start gap-2"><div className="flex h-9 w-9 items-center justify-center rounded-full bg-green-100"><MessageCircle className="h-5 w-5 text-green-700" /></div><div><div className="flex flex-wrap items-center gap-2"><Label htmlFor="phone_number" className="text-base font-semibold">WhatsApp Number</Label><span className="rounded-full bg-green-600 px-2 py-0.5 text-xs font-semibold text-white">Recommended</span></div><p className="text-sm text-green-800/80">Receive your booking confirmation and same-day reminder on WhatsApp.</p></div></div>
              <div className="relative"><Phone className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-green-700" /><Input id="phone_number" type="tel" inputMode="tel" autoComplete="tel" placeholder="07xxx xxxxxx or +44..." value={formData.phone_number} onChange={(e) => handlePhoneChange(e.target.value)} className={`h-12 bg-white pl-10 text-base ${phoneState.valid ? "border-green-200 focus-visible:ring-green-500" : "border-red-300 focus-visible:ring-red-500"}`} data-testid="input-whatsapp-number" /></div>
              {formData.phone_number && <p className={`mt-2 text-xs ${phoneState.valid ? "text-green-700" : "text-red-600"}`}>{phoneState.message}</p>}
              <p className="mt-2 text-xs text-green-800/70">By entering your number, you agree to receive your booking confirmation and reminder on WhatsApp.</p>
            </div>

            <div>
              <Button type="button" variant="outline" onClick={() => setShowEmail((value) => !value)} className="w-full justify-start gap-2" data-testid="toggle-email"><Mail className="h-4 w-4" />{showEmail ? "Hide email option" : "Prefer email? Add email address"}</Button>
              {showEmail && <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="mt-3 rounded-xl border border-border p-4"><Label htmlFor="email" className="text-sm font-medium">Email Address (Optional)</Label><div className="relative mt-2"><Mail className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" /><Input id="email" type="email" placeholder="your@email.com" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="input-soft h-12 pl-10 text-base" data-testid="input-email" /></div><p className="mt-2 text-xs text-muted-foreground">If entered, you will also receive the confirmation and reminder by email.</p></motion.div>}
            </div>

            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-orange-100 bg-orange-50/50 p-4">
              <input type="checkbox" checked={rememberDetails} onChange={(e) => setRememberDetails(e.target.checked)} className="mt-1 h-4 w-4 accent-orange-600" />
              <span><span className="block text-sm font-medium">Remember these details on this device</span><span className="mt-1 block text-xs text-muted-foreground">Makes your next booking quicker. Untick this if you're booking on behalf of someone else and don't want their details saved.</span></span>
            </label>

            <div className="space-y-2"><Label htmlFor="notes" className="text-base font-medium">Notes (Optional)</Label><Textarea id="notes" placeholder="Any special requests or comments..." value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} className="input-soft min-h-[100px]" data-testid="input-notes" /></div>

            <div className="rounded-xl border border-orange-200 bg-orange-50/50 p-6"><h4 className="mb-4 font-['Playfair_Display'] text-lg font-semibold">Booking Summary</h4><div className="space-y-3 text-sm"><div className="flex justify-between gap-4"><span className="text-muted-foreground">Name:</span><span className="text-right font-medium">{formData.full_name}</span></div><div className="flex justify-between gap-4"><span className="text-muted-foreground">Role:</span><span className="text-right font-medium">Lead {formData.role}</span></div><div className="flex justify-between gap-4"><span className="text-muted-foreground">Date:</span><span className="text-right font-medium">{formData.date && format(new Date(formData.date), "EEEE, MMMM d, yyyy")}</span></div><div className="flex justify-between gap-4"><span className="text-muted-foreground">Time:</span><span className="text-right font-medium">8:00 PM - 9:00 PM UK</span></div>{formData.phone_number && <div className="flex justify-between gap-4"><span className="text-muted-foreground">WhatsApp:</span><span className="text-right font-medium">{formData.phone_number} ✓</span></div>}{formData.email && <div className="flex justify-between gap-4"><span className="text-muted-foreground">Email:</span><span className="text-right font-medium">{formData.email}</span></div>}</div></div>
          </motion.div>
        );

      default:
        return null;
    }
  };

  if (bookingResult) {
    const confetti = Array.from({ length: 18 }, (_, index) => ({
      id: index,
      x: ((index * 37) % 220) - 110,
      y: 90 + ((index * 23) % 90),
      rotate: (index * 47) % 360,
      delay: (index % 6) * 0.06,
      symbol: index % 3 === 0 ? "✦" : index % 3 === 1 ? "●" : "◆",
    }));

    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto px-4 py-8 md:py-14">
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} className="relative mx-auto max-w-2xl overflow-hidden rounded-3xl border border-orange-100 bg-white p-6 text-center shadow-xl shadow-orange-100/40 md:p-10">
            <div className="pointer-events-none absolute inset-x-0 top-6 flex justify-center">
              {confetti.map((piece) => (
                <motion.span key={piece.id} initial={{ x: 0, y: 0, opacity: 1, rotate: 0, scale: 0.4 }} animate={{ x: piece.x, y: piece.y, opacity: 0, rotate: piece.rotate, scale: 1 }} transition={{ duration: 1.5, delay: piece.delay, ease: "easeOut" }} className="absolute text-orange-500">{piece.symbol}</motion.span>
              ))}
            </div>

            <motion.div initial={{ scale: 0, rotate: -20 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", stiffness: 180, damping: 12, delay: 0.1 }} className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-green-100 text-green-700">
              <Check className="h-10 w-10" strokeWidth={3} />
            </motion.div>

            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25 }}>
              <div className="mb-2 flex items-center justify-center gap-2 text-orange-600"><PartyPopper className="h-5 w-5" /><span className="text-sm font-semibold uppercase tracking-wide">You're booked!</span></div>
              <h1 className="font-['Playfair_Display'] text-3xl font-bold md:text-4xl">Thank you, {bookingResult.full_name.split(" ")[0]}!</h1>
              <p className="mx-auto mt-3 max-w-md text-muted-foreground">Your Upper Room slot has been confirmed. We look forward to having you lead.</p>
            </motion.div>

            <div className="my-7 rounded-2xl border border-orange-100 bg-gradient-to-br from-orange-50 to-amber-50 p-5 text-left">
              <div className="grid gap-4 sm:grid-cols-2">
                <div><p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Leading</p><p className="mt-1 font-semibold">{bookingResult.role === "Prayer" ? "🙏" : "🎵"} {bookingResult.role}</p></div>
                <div><p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Date</p><p className="mt-1 font-semibold">{format(new Date(bookingResult.date), "EEEE, d MMMM yyyy")}</p></div>
                <div><p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Time</p><p className="mt-1 font-semibold">8:00 PM – 9:00 PM UK</p></div>
                <div><p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Confirmation</p><p className="mt-1 font-semibold text-green-700">{bookingResult.phone_number ? "WhatsApp confirmation being sent ✓" : bookingResult.email ? "Email confirmation being sent ✓" : "Booking saved ✓"}</p></div>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <Button onClick={addToCalendar} className="btn-primary h-12 gap-2"><CalendarIcon className="h-4 w-4" />Add to Calendar</Button>
              <Button variant="outline" onClick={() => navigate("/calendar")} className="h-12 gap-2"><CalendarIcon className="h-4 w-4" />View Calendar</Button>
              <Button variant="outline" onClick={() => window.open(ZOOM_URL, "_blank", "noopener,noreferrer")} className="h-12 gap-2"><ExternalLink className="h-4 w-4" />Join Zoom</Button>
              <Button variant="ghost" onClick={() => { setBookingResult(null); setCurrentStep(1); setFormData((current) => ({ ...current, role: "", date: "", notes: "" })); }} className="h-12">Book another slot</Button>
            </div>

            <p className="mt-6 text-xs text-muted-foreground">Tip: Add this booking to your calendar so the Zoom link and meeting time are ready when you need them.</p>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container mx-auto px-4 py-8 md:py-12">
        <div className="mx-auto max-w-2xl">
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8 text-center"><h1 className="font-['Playfair_Display'] text-3xl font-bold text-foreground md:text-4xl">Book Your Slot</h1><p className="mt-2 text-muted-foreground">Sign up to serve in our online meetings</p></motion.div>

          <div className="mb-8"><div className="flex items-center justify-between">{steps.map((step, index) => (<div key={step.id} className="flex flex-1 items-center"><div className="flex flex-col items-center"><div className={`flex h-10 w-10 items-center justify-center rounded-full transition-all ${currentStep >= step.id ? "bg-gradient-to-r from-orange-500 to-red-600 text-white" : "bg-orange-100 text-muted-foreground"}`}>{currentStep > step.id ? <Check className="h-5 w-5" /> : <step.icon className="h-5 w-5" />}</div><span className={`mt-2 hidden text-xs sm:block ${currentStep >= step.id ? "text-foreground" : "text-muted-foreground"}`}>{step.title}</span></div>{index < steps.length - 1 && <div className={`mx-2 h-1 flex-1 rounded-full transition-all ${currentStep > step.id ? "bg-orange-500" : "bg-orange-100"}`} />}</div>))}</div></div>

          <Card className="card-warm" data-testid="booking-form-card"><CardHeader><CardTitle className="font-['Playfair_Display'] text-xl">Step {currentStep}: {steps[currentStep - 1].title}</CardTitle></CardHeader><CardContent><AnimatePresence mode="wait">{renderStepContent()}</AnimatePresence><div className="mt-8 flex justify-between gap-4"><Button variant="outline" onClick={handleBack} disabled={currentStep === 1} className="gap-2" data-testid="btn-back"><ArrowLeft className="h-4 w-4" />Back</Button>{currentStep < 4 ? <Button onClick={handleNext} className="btn-primary gap-2" data-testid="btn-next">Next<ArrowRight className="h-4 w-4" /></Button> : <Button onClick={handleSubmit} disabled={isSubmitting} className="btn-primary gap-2" data-testid="btn-submit">{isSubmitting ? <><Loader2 className="h-4 w-4 animate-spin" />Booking...</> : <><Check className="h-4 w-4" />Confirm Booking</>}</Button>}</div></CardContent></Card>
        </div>
      </div>
    </div>
  );
};

export default BookSlotPage;
