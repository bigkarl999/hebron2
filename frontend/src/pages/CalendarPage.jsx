import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import Navigation from "@/components/Navigation";
import { motion } from "framer-motion";
import { getAvailability } from "@/lib/api";
import {
  ChevronLeft,
  ChevronRight,
  HandHeart,
  Music,
  Calendar,
  Clock,
  Loader2,
} from "lucide-react";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  addMonths,
  subMonths,
  isSameMonth,
  isToday,
  getDay,
  addDays,
} from "date-fns";

const CalendarPage = () => {
  const navigate = useNavigate();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [availability, setAvailability] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchAvailability = async () => {
      setIsLoading(true);
      try {
        const start = startOfMonth(currentMonth);
        const end = endOfMonth(currentMonth);
        const response = await getAvailability(
          format(start, "yyyy-MM-dd"),
          format(end, "yyyy-MM-dd")
        );
        setAvailability(response.data);
      } catch (error) {
        console.error("Failed to fetch availability:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchAvailability();
  }, [currentMonth]);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Get day of week for first day (0 = Sunday)
  const startDay = getDay(monthStart);
  // Adjust for Monday start (convert Sunday=0 to 7)
  const adjustedStartDay = startDay === 0 ? 6 : startDay - 1;

  const getSlotInfo = (date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    return availability.find((a) => a.date === dateStr);
  };

  const handleBookSlot = (date, role) => {
    navigate(`/book?date=${format(date, "yyyy-MM-dd")}&role=${role}`);
  };

  const isValidDay = (date) => {
    const day = getDay(date);
    // Monday=1, Tuesday=2, Wednesday=3, Thursday=4
    return day >= 1 && day <= 4;
  };

  const isPastDate = (date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date < today;
  };

  const isWithinBookingWindow = (date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const oneMonthLater = addDays(today, 31);
    return date >= today && date <= oneMonthLater;
  };

  const weekDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <div className="container mx-auto px-4 py-8 md:py-12">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 text-center"
        >
          <h1 className="font-['Playfair_Display'] text-3xl font-bold text-foreground md:text-4xl">
            Availability Calendar
          </h1>
          <p className="mt-2 text-muted-foreground">
            View available slots and book your participation
          </p>
        </motion.div>

        {/* Meeting Info */}
        <div className="mb-6 flex flex-wrap items-center justify-center gap-4">
          <div className="flex items-center gap-2 rounded-full bg-orange-50 px-4 py-2">
            <Clock className="h-4 w-4 text-orange-600" />
            <span className="text-sm font-medium">8:00 PM - 9:00 PM UK</span>
          </div>
          <div className="flex items-center gap-2 rounded-full bg-orange-50 px-4 py-2">
            <Calendar className="h-4 w-4 text-orange-600" />
            <span className="text-sm font-medium">Mon - Thu Only</span>
          </div>
        </div>

        {/* Legend */}
        <div className="mb-6 flex flex-wrap items-center justify-center gap-4">
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 rounded bg-green-100 border border-green-300" />
            <span className="text-sm text-muted-foreground">Available</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 rounded bg-orange-100 border border-orange-300" />
            <span className="text-sm text-muted-foreground">Booked</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 rounded bg-gray-100 border border-gray-200" />
            <span className="text-sm text-muted-foreground">Unavailable</span>
          </div>
        </div>

        {/* Calendar Navigation */}
        <Card className="card-warm mb-6">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <Button
                variant="ghost"
                onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                className="hover:bg-orange-50"
                data-testid="btn-prev-month"
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <h2 className="font-['Playfair_Display'] text-xl font-semibold md:text-2xl">
                {format(currentMonth, "MMMM yyyy")}
              </h2>
              <Button
                variant="ghost"
                onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                className="hover:bg-orange-50"
                data-testid="btn-next-month"
              >
                <ChevronRight className="h-5 w-5" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Calendar Grid */}
        <Card className="card-warm overflow-hidden" data-testid="calendar-grid">
          <CardContent className="p-0 md:p-4">
            {isLoading ? (
              <div className="flex h-96 items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
              </div>
            ) : (
              <>
                {/* Week Headers */}
                <div className="grid grid-cols-7 border-b border-orange-100 bg-orange-50">
                  {weekDays.map((day) => (
                    <div
                      key={day}
                      className={`p-2 text-center text-sm font-medium md:p-3 ${
                        ["Fri", "Sat", "Sun"].includes(day)
                          ? "text-muted-foreground/50"
                          : "text-foreground"
                      }`}
                    >
                      {day}
                    </div>
                  ))}
                </div>

                {/* Days Grid */}
                <div className="grid grid-cols-7">
                  {/* Empty cells for days before month starts */}
                  {Array.from({ length: adjustedStartDay }).map((_, index) => (
                    <div
                      key={`empty-${index}`}
                      className="min-h-[100px] border-b border-r border-orange-50 bg-gray-50/50 p-1 md:min-h-[120px] md:p-2"
                    />
                  ))}

                  {/* Days of the month */}
                  {daysInMonth.map((day) => {
                    const slotInfo = getSlotInfo(day);
                    const validDay = isValidDay(day);
                    const pastDate = isPastDate(day);
                    const withinWindow = isWithinBookingWindow(day);
                    const canBook = validDay && !pastDate && withinWindow;

                    return (
                      <div
                        key={day.toISOString()}
                        className={`min-h-[100px] border-b border-r border-orange-50 p-1 md:min-h-[120px] md:p-2 ${
                          isToday(day) ? "ring-2 ring-inset ring-orange-400" : ""
                        } ${!validDay || pastDate ? "bg-gray-50/50" : "bg-white"}`}
                      >
                        <div
                          className={`mb-1 text-sm font-medium md:mb-2 ${
                            isToday(day)
                              ? "text-orange-600"
                              : !validDay || pastDate
                              ? "text-muted-foreground/50"
                              : "text-foreground"
                          }`}
                        >
                          {format(day, "d")}
                        </div>

                        {validDay && slotInfo && (
                          <div className="space-y-1">
                            {/* Prayer Slot */}
                            <div
                              className={`rounded p-1 text-xs transition-all md:p-2 ${
                                slotInfo.prayer_available && canBook
                                  ? "cursor-pointer bg-green-50 border border-green-200 hover:bg-green-100"
                                  : "bg-orange-50 border border-orange-200"
                              }`}
                              onClick={() =>
                                slotInfo.prayer_available && canBook && handleBookSlot(day, "Prayer")
                              }
                              data-testid={`slot-prayer-${format(day, "yyyy-MM-dd")}`}
                            >
                              <div className="flex items-center gap-1">
                                <HandHeart className="h-3 w-3 text-blue-600" />
                                <span className="hidden font-medium md:inline">Prayer</span>
                              </div>
                              <div className="mt-0.5 truncate text-[10px] md:text-xs">
                                {slotInfo.prayer_available ? (
                                  <span className="text-green-600">Available</span>
                                ) : (
                                  <span className="text-orange-600">{slotInfo.prayer_booked_by}</span>
                                )}
                              </div>
                            </div>

                            {/* Worship Slot */}
                            <div
                              className={`rounded p-1 text-xs transition-all md:p-2 ${
                                slotInfo.worship_available && canBook
                                  ? "cursor-pointer bg-green-50 border border-green-200 hover:bg-green-100"
                                  : "bg-orange-50 border border-orange-200"
                              }`}
                              onClick={() =>
                                slotInfo.worship_available && canBook && handleBookSlot(day, "Worship")
                              }
                              data-testid={`slot-worship-${format(day, "yyyy-MM-dd")}`}
                            >
                              <div className="flex items-center gap-1">
                                <Music className="h-3 w-3 text-purple-600" />
                                <span className="hidden font-medium md:inline">Worship</span>
                              </div>
                              <div className="mt-0.5 truncate text-[10px] md:text-xs">
                                {slotInfo.worship_available ? (
                                  <span className="text-green-600">Available</span>
                                ) : (
                                  <span className="text-orange-600">{slotInfo.worship_booked_by}</span>
                                )}
                              </div>
                            </div>
                          </div>
                        )}

                        {validDay && !slotInfo && !pastDate && (
                          <div className="text-xs text-muted-foreground">No data</div>
                        )}
                      </div>
                    );
                  })}

                  {/* Empty cells for days after month ends */}
                  {Array.from({
                    length: (7 - ((adjustedStartDay + daysInMonth.length) % 7)) % 7,
                  }).map((_, index) => (
                    <div
                      key={`empty-end-${index}`}
                      className="min-h-[100px] border-b border-r border-orange-50 bg-gray-50/50 p-1 md:min-h-[120px] md:p-2"
                    />
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Book Now CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-8 text-center"
        >
          <Button
            onClick={() => navigate("/book")}
            className="btn-primary px-8 py-6 text-lg"
            data-testid="calendar-book-now-btn"
          >
            Book a Slot Now
          </Button>
        </motion.div>
      </div>
    </div>
  );
};

export default CalendarPage;
