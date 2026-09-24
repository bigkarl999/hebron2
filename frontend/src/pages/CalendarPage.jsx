import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import Navigation from "@/components/Navigation";
import { motion } from "framer-motion";
import { getAvailability } from "@/lib/api";
import {
  Calendar,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  HandHeart,
  Loader2,
  Music,
  Sparkles,
  List,
  Grid3X3,
} from "lucide-react";
import {
  addDays,
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  format,
  getDay,
  isToday,
  startOfMonth,
  subMonths,
} from "date-fns";

const CalendarPage = () => {
  const navigate = useNavigate();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [availability, setAvailability] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [mobileView, setMobileView] = useState("list");

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
        setAvailability(response.data || []);
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
  const startDay = getDay(monthStart);
  const adjustedStartDay = startDay === 0 ? 6 : startDay - 1;
  const weekDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  const todayStart = useMemo(() => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    return date;
  }, []);
  const bookingEnd = addDays(todayStart, 31);

  const infoFor = (date) =>
    availability.find((item) => item.date === format(date, "yyyy-MM-dd"));

  const validMeetingDay = (date) => {
    const day = getDay(date);
    return day >= 1 && day <= 4;
  };

  const canBookDate = (date) =>
    validMeetingDay(date) && date >= todayStart && date <= bookingEnd;

  const book = (date, role) =>
    navigate(`/book?date=${format(date, "yyyy-MM-dd")}&role=${role}`);

  const availableDates = daysInMonth
    .filter((date) => canBookDate(date))
    .map((date) => ({ date, info: infoFor(date) }))
    .filter(({ info }) => info && (info.prayer_available || info.worship_available));

  const availableSlotCount = availableDates.reduce(
    (count, { info }) =>
      count + (info.prayer_available ? 1 : 0) + (info.worship_available ? 1 : 0),
    0
  );

  const SlotButton = ({ date, role, available, bookedBy, compact = false }) => {
    const Icon = role === "Prayer" ? HandHeart : Music;
    const enabled = available && canBookDate(date);
    return (
      <button
        type="button"
        disabled={!enabled}
        onClick={() => enabled && book(date, role)}
        className={`w-full rounded-xl border text-left transition-all ${
          compact ? "p-2" : "p-3"
        } ${
          enabled
            ? "border-green-200 bg-green-50 hover:border-green-300 hover:bg-green-100 hover:shadow-sm"
            : bookedBy
            ? "border-orange-200 bg-orange-50"
            : "border-slate-200 bg-slate-50 text-slate-400"
        }`}
      >
        <div className="flex items-center gap-2">
          <Icon className={`h-4 w-4 ${role === "Prayer" ? "text-blue-600" : "text-purple-600"}`} />
          <span className="font-medium">{role}</span>
        </div>
        <div className="mt-1 truncate text-xs">
          {available ? (
            <span className={enabled ? "font-medium text-green-700" : "text-slate-400"}>
              {enabled ? "Available — tap to book" : "Outside booking window"}
            </span>
          ) : (
            <span className="text-orange-700">{bookedBy || "Booked"}</span>
          )}
        </div>
      </button>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <div className="container mx-auto px-4 py-8 md:py-12">
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          className="mx-auto mb-8 max-w-3xl text-center"
        >
          <div className="mx-auto mb-3 inline-flex items-center gap-2 rounded-full border border-orange-200 bg-orange-50 px-3 py-1.5 text-sm font-medium text-orange-700">
            <Sparkles className="h-4 w-4" />
            Upper Room rota
          </div>
          <h1 className="font-['Playfair_Display'] text-3xl font-bold md:text-4xl">
            Availability Calendar
          </h1>
          <p className="mt-2 text-muted-foreground">
            Pick an available Prayer or Worship slot. Available slots can be opened directly from the calendar.
          </p>
        </motion.div>

        <div className="mb-6 grid gap-3 sm:grid-cols-3">
          <div className="flex items-center gap-3 rounded-2xl border border-orange-100 bg-white p-4">
            <Clock className="h-5 w-5 text-orange-600" />
            <div>
              <div className="text-xs text-muted-foreground">Meeting time</div>
              <div className="font-semibold">8:00 PM - 9:00 PM UK</div>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-2xl border border-orange-100 bg-white p-4">
            <Calendar className="h-5 w-5 text-orange-600" />
            <div>
              <div className="text-xs text-muted-foreground">Meeting days</div>
              <div className="font-semibold">Monday - Thursday</div>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-2xl border border-orange-100 bg-white p-4">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            <div>
              <div className="text-xs text-muted-foreground">Open this month</div>
              <div className="font-semibold">{isLoading ? "…" : `${availableSlotCount} slot${availableSlotCount === 1 ? "" : "s"}`}</div>
            </div>
          </div>
        </div>

        <div className="mb-4 md:hidden">
          <div className="mx-auto grid max-w-sm grid-cols-2 rounded-2xl border border-orange-100 bg-white p-1 shadow-sm">
            <button
              type="button"
              onClick={() => setMobileView("list")}
              className={`flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
                mobileView === "list"
                  ? "bg-gradient-to-r from-orange-500 to-red-600 text-white shadow-sm"
                  : "text-muted-foreground hover:bg-orange-50"
              }`}
            >
              <List className="h-4 w-4" />
              Easy View
            </button>
            <button
              type="button"
              onClick={() => setMobileView("calendar")}
              className={`flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
                mobileView === "calendar"
                  ? "bg-gradient-to-r from-orange-500 to-red-600 text-white shadow-sm"
                  : "text-muted-foreground hover:bg-orange-50"
              }`}
            >
              <Grid3X3 className="h-4 w-4" />
              Calendar View
            </button>
          </div>
          <p className="mt-2 text-center text-xs text-muted-foreground">
            Calendar View also lets you browse previous bookings and earlier months.
          </p>
        </div>

        <Card className="card-warm mb-5">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <div className="text-center">
                <h2 className="font-['Playfair_Display'] text-xl font-semibold md:text-2xl">
                  {format(currentMonth, "MMMM yyyy")}
                </h2>
                <button
                  type="button"
                  className="mt-1 text-xs font-medium text-orange-600 hover:underline"
                  onClick={() => setCurrentMonth(new Date())}
                >
                  Jump to this month
                </button>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
                <ChevronRight className="h-5 w-5" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {isLoading ? (
          <Card className="card-warm">
            <CardContent className="flex h-80 items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
            </CardContent>
          </Card>
        ) : (
          <>
            <div className={`${mobileView === "list" ? "space-y-3" : "hidden"} md:hidden`}>
              {daysInMonth
                .filter((date) => validMeetingDay(date) && date >= todayStart)
                .map((date) => {
                  const info = infoFor(date);
                  const withinWindow = canBookDate(date);
                  return (
                    <Card key={date.toISOString()} className={isToday(date) ? "border-orange-300 shadow-sm" : "border-orange-100"}>
                      <CardContent className="p-4">
                        <div className="mb-3 flex items-center justify-between">
                          <div>
                            <div className="font-semibold">{format(date, "EEEE d MMMM")}</div>
                            {isToday(date) && <div className="text-xs font-medium text-orange-600">Today</div>}
                          </div>
                          {!withinWindow && <span className="text-xs text-muted-foreground">Not bookable yet</span>}
                        </div>
                        {info ? (
                          <div className="grid gap-2">
                            <SlotButton date={date} role="Prayer" available={info.prayer_available} bookedBy={info.prayer_booked_by} />
                            <SlotButton date={date} role="Worship" available={info.worship_available} bookedBy={info.worship_booked_by} />
                          </div>
                        ) : (
                          <div className="rounded-xl bg-slate-50 p-3 text-sm text-muted-foreground">No slot data available.</div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
            </div>

            <Card className={`card-warm overflow-hidden md:hidden ${mobileView === "calendar" ? "block" : "hidden"}`}>
              <CardContent className="p-0">
                <div className="border-b border-orange-100 bg-orange-50 px-4 py-3">
                  <div className="text-sm font-medium">Full calendar</div>
                  <div className="mt-0.5 text-xs text-muted-foreground">
                    Swipe sideways to see the whole week. Past bookings remain visible.
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <div className="min-w-[760px]">
                    <div className="grid grid-cols-7 border-b border-orange-100 bg-orange-50">
                      {weekDays.map((day) => (
                        <div
                          key={day}
                          className={`p-3 text-center text-sm font-medium ${
                            ["Fri", "Sat", "Sun"].includes(day)
                              ? "text-muted-foreground/50"
                              : "text-foreground"
                          }`}
                        >
                          {day}
                        </div>
                      ))}
                    </div>

                    <div className="grid grid-cols-7">
                      {Array.from({ length: adjustedStartDay }).map((_, index) => (
                        <div
                          key={`mobile-empty-${index}`}
                          className="min-h-[135px] border-b border-r border-orange-50 bg-gray-50/50"
                        />
                      ))}

                      {daysInMonth.map((day) => {
                        const info = infoFor(day);
                        const valid = validMeetingDay(day);
                        const past = day < todayStart;
                        return (
                          <div
                            key={`mobile-calendar-${day.toISOString()}`}
                            className={`min-h-[135px] border-b border-r border-orange-50 p-2 ${
                              isToday(day) ? "ring-2 ring-inset ring-orange-400" : ""
                            } ${!valid || past ? "bg-gray-50/60" : "bg-white"}`}
                          >
                            <div
                              className={`mb-2 flex items-center justify-between text-sm font-semibold ${
                                isToday(day)
                                  ? "text-orange-600"
                                  : !valid || past
                                  ? "text-muted-foreground/50"
                                  : ""
                              }`}
                            >
                              <span>{format(day, "d")}</span>
                              {isToday(day) && (
                                <span className="rounded-full bg-orange-100 px-1.5 py-0.5 text-[10px] font-medium text-orange-700">
                                  Today
                                </span>
                              )}
                            </div>

                            {valid && info && (
                              <div className="space-y-2">
                                <SlotButton
                                  compact
                                  date={day}
                                  role="Prayer"
                                  available={info.prayer_available}
                                  bookedBy={info.prayer_booked_by}
                                />
                                <SlotButton
                                  compact
                                  date={day}
                                  role="Worship"
                                  available={info.worship_available}
                                  bookedBy={info.worship_booked_by}
                                />
                              </div>
                            )}
                          </div>
                        );
                      })}

                      {Array.from({
                        length: (7 - ((adjustedStartDay + daysInMonth.length) % 7)) % 7,
                      }).map((_, index) => (
                        <div
                          key={`mobile-empty-end-${index}`}
                          className="min-h-[135px] border-b border-r border-orange-50 bg-gray-50/50"
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="card-warm hidden overflow-hidden md:block">
              <CardContent className="p-0 lg:p-4">
                <div className="grid grid-cols-7 border-b border-orange-100 bg-orange-50">
                  {weekDays.map((day) => (
                    <div key={day} className={`p-3 text-center text-sm font-medium ${["Fri","Sat","Sun"].includes(day) ? "text-muted-foreground/50" : ""}`}>
                      {day}
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-7">
                  {Array.from({ length: adjustedStartDay }).map((_, index) => (
                    <div key={`empty-${index}`} className="min-h-[145px] border-b border-r border-orange-50 bg-gray-50/50" />
                  ))}

                  {daysInMonth.map((day) => {
                    const info = infoFor(day);
                    const valid = validMeetingDay(day);
                    const past = day < todayStart;
                    return (
                      <div
                        key={day.toISOString()}
                        className={`min-h-[145px] border-b border-r border-orange-50 p-2 ${
                          isToday(day) ? "ring-2 ring-inset ring-orange-400" : ""
                        } ${!valid || past ? "bg-gray-50/60" : "bg-white"}`}
                      >
                        <div className={`mb-2 text-sm font-semibold ${isToday(day) ? "text-orange-600" : !valid || past ? "text-muted-foreground/40" : ""}`}>
                          {format(day, "d")}
                        </div>
                        {valid && info && (
                          <div className="space-y-2">
                            <SlotButton compact date={day} role="Prayer" available={info.prayer_available} bookedBy={info.prayer_booked_by} />
                            <SlotButton compact date={day} role="Worship" available={info.worship_available} bookedBy={info.worship_booked_by} />
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {Array.from({
                    length: (7 - ((adjustedStartDay + daysInMonth.length) % 7)) % 7,
                  }).map((_, index) => (
                    <div key={`empty-end-${index}`} className="min-h-[145px] border-b border-r border-orange-50 bg-gray-50/50" />
                  ))}
                </div>
              </CardContent>
            </Card>
          </>
        )}

        <div className="mt-8 text-center">
          <Button onClick={() => navigate("/book")} className="btn-primary px-8 py-6 text-lg">
            Book a Slot
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CalendarPage;
