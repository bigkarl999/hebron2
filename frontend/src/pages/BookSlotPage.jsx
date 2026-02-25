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
} from "lucide-react";
import { format, addDays, startOfMonth, endOfMonth, isMonday, isTuesday, isWednesday, isThursday } from "date-fns";

const steps = [
  { id: 1, title: "Your Name", icon: User },
  { id: 2, title: "Select Role", icon: HandHeart },
  { id: 3, title: "Select Date", icon: CalendarIcon },
  { id: 4, title: "Additional Details", icon: FileText },
];

const BookSlotPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [availability, setAvailability] = useState([]);
  const [formData, setFormData] = useState({
    full_name: "",
    role: searchParams.get("role") || "",
    date: searchParams.get("date") || "",
    notes: "",
    email: "",
  });

  // Fetch availability when component mounts or date changes
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

  // Check if a date has available slots for the selected role
  const isDateAvailable = (date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    const dayAvailability = availability.find((a) => a.date === dateStr);
    if (!dayAvailability) return false;
    
    if (formData.role === "Prayer") {
      return dayAvailability.prayer_available;
    } else if (formData.role === "Worship") {
      return dayAvailability.worship_available;
    }
    return dayAvailability.prayer_available || dayAvailability.worship_available;
  };

  // Disabled dates: not Mon-Thu, past dates, > 1 month, or unavailable
  const disabledDays = (date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const oneMonthLater = addDays(today, 31);

    // Disable past dates
    if (date < today) return true;
    // Disable dates > 1 month
    if (date > oneMonthLater) return true;
    // Disable Fri, Sat, Sun
    const day = date.getDay();
    if (day === 0 || day === 5 || day === 6) return true;
    // Disable if slot not available for selected role
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

  const handleBack = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const handleSubmit = async () => {
    if (!formData.full_name.trim() || !formData.role || !formData.date) {
      toast.error("Please fill in all required fields");
      return;
    }

    setIsSubmitting(true);
    try {
      await createBooking({
        full_name: formData.full_name.trim(),
        role: formData.role,
        date: formData.date,
        notes: formData.notes.trim() || null,
        email: formData.email.trim() || null,
      });
      toast.success("Thank you. Your slot has been confirmed!", {
        description: `You're scheduled to Lead ${formData.role} on ${format(new Date(formData.date), "EEEE, MMMM d, yyyy")}`,
      });
      navigate("/calendar");
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
          <motion.div
            key="step1"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div className="space-y-2">
              <Label htmlFor="full_name" className="text-base font-medium">
                Full Name *
              </Label>
              <Input
                id="full_name"
                placeholder="Enter your full name"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                className="input-soft h-12 text-base"
                data-testid="input-full-name"
              />
            </div>
          </motion.div>
        );

      case 2:
        return (
          <motion.div
            key="step2"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <Label className="text-base font-medium">Select Your Role *</Label>
            <RadioGroup
              value={formData.role}
              onValueChange={(value) => setFormData({ ...formData, role: value, date: "" })}
              className="grid gap-4 md:grid-cols-2"
            >
              <Label
                htmlFor="prayer"
                className={`cursor-pointer rounded-xl border-2 p-6 transition-all ${
                  formData.role === "Prayer"
                    ? "border-blue-500 bg-blue-50"
                    : "border-orange-100 hover:border-orange-200 hover:bg-orange-50/50"
                }`}
              >
                <RadioGroupItem value="Prayer" id="prayer" className="sr-only" />
                <div className="flex flex-col items-center text-center">
                  <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100">
                    <HandHeart className="h-8 w-8 text-blue-600" />
                  </div>
                  <span className="font-['Playfair_Display'] text-xl font-semibold">
                    Lead Prayer
                  </span>
                  <span className="mt-1 text-sm text-muted-foreground">
                    Guide the congregation in prayer
                  </span>
                </div>
              </Label>

              <Label
                htmlFor="worship"
                className={`cursor-pointer rounded-xl border-2 p-6 transition-all ${
                  formData.role === "Worship"
                    ? "border-purple-500 bg-purple-50"
                    : "border-orange-100 hover:border-orange-200 hover:bg-orange-50/50"
                }`}
              >
                <RadioGroupItem value="Worship" id="worship" className="sr-only" />
                <div className="flex flex-col items-center text-center">
                  <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-purple-100">
                    <Music className="h-8 w-8 text-purple-600" />
                  </div>
                  <span className="font-['Playfair_Display'] text-xl font-semibold">
                    Lead Worship
                  </span>
                  <span className="mt-1 text-sm text-muted-foreground">
                    Lead the congregation in praise
                  </span>
                </div>
              </Label>
            </RadioGroup>
          </motion.div>
        );

      case 3:
        return (
          <motion.div
            key="step3"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div className="rounded-xl bg-gradient-to-r from-orange-50 to-amber-50 p-4">
              <div className="flex items-center gap-3">
                <Clock className="h-5 w-5 text-orange-600" />
                <p className="text-sm font-medium text-foreground">
                  All online meetings are from 8:00 PM to 9:00 PM UK time.
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-base font-medium">Select Date *</Label>
              <p className="text-sm text-muted-foreground">
                Available days: Monday - Thursday (within next month)
              </p>
            </div>

            <div className="flex justify-center">
              <Calendar
                mode="single"
                selected={formData.date ? new Date(formData.date) : undefined}
                onSelect={(date) => {
                  if (date) {
                    setFormData({ ...formData, date: format(date, "yyyy-MM-dd") });
                  }
                }}
                disabled={disabledDays}
                className="rounded-xl border border-orange-100 p-3"
                data-testid="booking-calendar"
              />
            </div>

            {formData.date && (
              <div className="rounded-xl bg-green-50 p-4 text-center">
                <p className="font-medium text-green-700">
                  Selected: {format(new Date(formData.date), "EEEE, MMMM d, yyyy")}
                </p>
              </div>
            )}
          </motion.div>
        );

      case 4:
        return (
          <motion.div
            key="step4"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div className="space-y-2">
              <Label htmlFor="email" className="text-base font-medium">
                Email Address (Optional)
              </Label>
              <p className="text-sm text-muted-foreground">
                Enter your email to receive a confirmation
              </p>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="your@email.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="input-soft h-12 pl-10 text-base"
                  data-testid="input-email"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes" className="text-base font-medium">
                Notes (Optional)
              </Label>
              <Textarea
                id="notes"
                placeholder="Any special requests or comments..."
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="input-soft min-h-[100px]"
                data-testid="input-notes"
              />
            </div>

            {/* Summary */}
            <div className="rounded-xl border border-orange-200 bg-orange-50/50 p-6">
              <h4 className="mb-4 font-['Playfair_Display'] text-lg font-semibold">
                Booking Summary
              </h4>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Name:</span>
                  <span className="font-medium">{formData.full_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Role:</span>
                  <span className="font-medium">Lead {formData.role}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Date:</span>
                  <span className="font-medium">
                    {formData.date && format(new Date(formData.date), "EEEE, MMMM d, yyyy")}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Time:</span>
                  <span className="font-medium">8:00 PM - 9:00 PM UK</span>
                </div>
              </div>
            </div>
          </motion.div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <div className="container mx-auto px-4 py-8 md:py-12">
        <div className="mx-auto max-w-2xl">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 text-center"
          >
            <h1 className="font-['Playfair_Display'] text-3xl font-bold text-foreground md:text-4xl">
              Book Your Slot
            </h1>
            <p className="mt-2 text-muted-foreground">
              Sign up to serve in our online meetings
            </p>
          </motion.div>

          {/* Progress Steps */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              {steps.map((step, index) => (
                <div key={step.id} className="flex flex-1 items-center">
                  <div className="flex flex-col items-center">
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-full transition-all ${
                        currentStep >= step.id
                          ? "bg-gradient-to-r from-orange-500 to-red-600 text-white"
                          : "bg-orange-100 text-muted-foreground"
                      }`}
                    >
                      {currentStep > step.id ? (
                        <Check className="h-5 w-5" />
                      ) : (
                        <step.icon className="h-5 w-5" />
                      )}
                    </div>
                    <span
                      className={`mt-2 hidden text-xs sm:block ${
                        currentStep >= step.id ? "text-foreground" : "text-muted-foreground"
                      }`}
                    >
                      {step.title}
                    </span>
                  </div>
                  {index < steps.length - 1 && (
                    <div
                      className={`mx-2 h-1 flex-1 rounded-full transition-all ${
                        currentStep > step.id ? "bg-orange-500" : "bg-orange-100"
                      }`}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Form Card */}
          <Card className="card-warm" data-testid="booking-form-card">
            <CardHeader>
              <CardTitle className="font-['Playfair_Display'] text-xl">
                Step {currentStep}: {steps[currentStep - 1].title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <AnimatePresence mode="wait">{renderStepContent()}</AnimatePresence>

              {/* Navigation Buttons */}
              <div className="mt-8 flex justify-between gap-4">
                <Button
                  variant="outline"
                  onClick={handleBack}
                  disabled={currentStep === 1}
                  className="gap-2"
                  data-testid="btn-back"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </Button>

                {currentStep < 4 ? (
                  <Button
                    onClick={handleNext}
                    className="btn-primary gap-2"
                    data-testid="btn-next"
                  >
                    Next
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                ) : (
                  <Button
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                    className="btn-primary gap-2"
                    data-testid="btn-submit"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Booking...
                      </>
                    ) : (
                      <>
                        <Check className="h-4 w-4" />
                        Confirm Booking
                      </>
                    )}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default BookSlotPage;
