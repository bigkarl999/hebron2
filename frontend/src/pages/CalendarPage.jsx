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
  const [selectedDay, setSelectedDay] = useState(null);

  useEffect(() => {
    setSelectedDay(null);
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
              Month View
            </button>
          </div>
          <p className="mt-2 text-center text-xs text-muted-foreground">
            Month View shows the whole rota. Tap any meeting day to see Prayer and Worship details.
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

            <div className={`md:hidden ${mobileView === "calendar" ? "block" : "hidden"}`}>
              <Card className="card-warm overflow-hidden">
                <CardContent className="p-0">
                  <div className="border-b border-orange-100 bg-orange-50/80 px-4 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold">Month overview</div>
                        <div className="mt-0.5 text-xs text-muted-foreground">
                          Tap a meeting day to see who led Prayer and Worship.
                        </div>
                      </div>
                      <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                        <span className="inline-flex items-center gap-1">
                          <span className="h-2.5 w-2.5 rounded-full bg-orange-400" />
                          Booked
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <span className="h-2.5 w-2.5 rounded-full bg-green-400" />
                          Available
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-7 border-b border-orange-100 bg-white">
                    {weekDays.map((day) => (
                      <div
                        key={day}
                        className={`py-2 text-center text-[11px] font-semibold uppercase tracking-wide ${
                          ["Fri", "Sat", "Sun"].includes(day)
                            ? "text-muted-foreground/40"
                            : "text-muted-foreground"
                        }`}
                      >
                        {day.slice(0, 1)}
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-7">
                    {Array.from({ length: adjustedStartDay }).map((_, index) => (
                      <div
                        key={`compact-empty-${index}`}
                        className="aspect-square border-b border-r border-orange-50 bg-gray-50/40"
                      />
                    ))}

                    {daysInMonth.map((day) => {
                      const info = infoFor(day);
                      const valid = validMeetingDay(day);
                      const past = day < todayStart;
                      const selected =
                        selectedDay &&
                        format(selectedDay, "yyyy-MM-dd") === format(day, "yyyy-MM-dd");
                      const prayerState = info
                        ? info.prayer_available
                          ? "available"
                          : "booked"
                        : "none";
                      const worshipState = info
                        ? info.worship_available
                          ? "available"
                          : "booked"
                        : "none";
                      const dotClass = (state) =>
                        state === "booked"
                          ? "bg-orange-400"
                          : state === "available"
                          ? "bg-green-400"
                          : "bg-slate-200";

                      return (
                        <button
                          type="button"
                          key={`compact-${day.toISOString()}`}
                          disabled={!valid}
                          onClick={() => valid && setSelectedDay(day)}
                          className={`relative aspect-square border-b border-r border-orange-50 p-1.5 text-left transition-all ${
                            !valid
                              ? "cursor-default bg-gray-50/50 text-muted-foreground/30"
                              : past
                              ? "bg-slate-50/70 text-muted-foreground"
                              : "bg-white hover:bg-orange-50"
                          } ${selected ? "z-10 ring-2 ring-inset ring-orange-400" : ""}`}
                        >
                          <div className="flex items-center justify-between">
                            <span
                              className={`text-sm font-semibold ${
                                isToday(day)
                                  ? "flex h-6 w-6 items-center justify-center rounded-full bg-orange-600 text-white"
                                  : ""
                              }`}
                            >
                              {format(day, "d")}
                            </span>
                          </div>

                          {valid && (
                            <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 items-center gap-1">
                              <span
                                className={`h-2.5 w-2.5 rounded-full ring-1 ring-white ${dotClass(prayerState)}`}
                                aria-label={`Prayer ${prayerState}`}
                              />
                              <span
                                className={`h-2.5 w-2.5 rounded-full ring-1 ring-white ${dotClass(worshipState)}`}
                                aria-label={`Worship ${worshipState}`}
                              />
                            </div>
                          )}
                        </button>
                      );
                    })}

                    {Array.from({
                      length: (7 - ((adjustedStartDay + daysInMonth.length) % 7)) % 7,
                    }).map((_, index) => (
                      <div
                        key={`compact-empty-end-${index}`}
                        className="aspect-square border-b border-r border-orange-50 bg-gray-50/40"
                      />
                    ))}
                  </div>
                </CardContent>
              </Card>

              {selectedDay && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-4"
                >
                  {(() => {
                    const info = infoFor(selectedDay);
                    const past = selectedDay < todayStart;
                    const bookable = canBookDate(selectedDay);

                    const DetailRow = ({ role, available, bookedBy }) => {
                      const Icon = role === "Prayer" ? HandHeart : Music;
                      return (
                        <div className="rounded-2xl border border-orange-100 bg-white p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-3">
                              <div
                                className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                                  role === "Prayer" ? "bg-blue-50" : "bg-purple-50"
                                }`}
                              >
                                <Icon
                                  className={`h-5 w-5 ${
                                    role === "Prayer" ? "text-blue-600" : "text-purple-600"
                                  }`}
                                />
                              </div>
                              <div>
                                <div className="font-semibold">{role}</div>
                                <div className="mt-0.5 text-sm text-muted-foreground">
                                  {available
                                    ? past
                                      ? "No booking recorded"
                                      : "Available"
                                    : bookedBy || "Booked"}
                                </div>
                              </div>
                            </div>

                            {!past && bookable && available && (
                              <Button
                                size="sm"
                                onClick={() => book(selectedDay, role)}
                                className="btn-primary px-4"
                              >
                                Book
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    };

                    return (
                      <Card className="card-warm border-orange-200">
                        <CardContent className="p-4">
                          <div className="mb-4 flex items-start justify-between gap-3">
                            <div>
                              <div className="text-xs font-semibold uppercase tracking-wide text-orange-600">
                                {past ? "Previous rota" : isToday(selectedDay) ? "Today" : "Selected day"}
                              </div>
                              <h3 className="mt-1 font-['Playfair_Display'] text-xl font-semibold">
                                {format(selectedDay, "EEEE, d MMMM yyyy")}
                              </h3>
                              <p className="mt-1 text-sm text-muted-foreground">
                                8:00 PM - 9:00 PM UK
                              </p>
                            </div>
                          </div>

                          {info ? (
                            <div className="space-y-3">
                              <DetailRow
                                role="Prayer"
                                available={info.prayer_available}
                                bookedBy={info.prayer_booked_by}
                              />
                              <DetailRow
                                role="Worship"
                                available={info.worship_available}
                                bookedBy={info.worship_booked_by}
                              />
                            </div>
                          ) : (
                            <div className="rounded-xl bg-slate-50 p-4 text-sm text-muted-foreground">
                              No rota information is available for this date.
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })()}
                </motion.div>
              )}
            </div>

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
