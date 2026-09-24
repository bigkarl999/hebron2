import { Link } from "react-router-dom";
import Navigation from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  ArrowRight, BellRing, BookOpen, Calendar, CalendarCheck2, Check,
  CheckCircle2, ChevronRight, CircleHelp, Download, Grid3X3, HandHeart,
  HeartPulse, List, Lock, Mail, MessageCircle, Monitor, Music, RefreshCw,
  ShieldCheck, Smartphone, UserRound, Video
} from "lucide-react";

const StepNumber = ({ children }) => (
  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-orange-500 to-red-600 text-sm font-bold text-white shadow-sm">
    {children}
  </span>
);

const MockBrowser = ({ title, children }) => (
  <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_18px_50px_-28px_rgba(15,23,42,0.35)]">
    <div className="flex items-center gap-2 border-b border-slate-200 bg-slate-50 px-3 py-2">
      <span className="h-2.5 w-2.5 rounded-full bg-red-300" />
      <span className="h-2.5 w-2.5 rounded-full bg-amber-300" />
      <span className="h-2.5 w-2.5 rounded-full bg-green-300" />
      <div className="ml-2 min-w-0 flex-1 truncate rounded-md bg-white px-3 py-1 text-center text-[10px] text-slate-400">{title}</div>
    </div>
    <div className="bg-[#fffaf5] p-4">{children}</div>
  </div>
);

const MockPhone = ({ children }) => (
  <div className="mx-auto w-full max-w-[270px] rounded-[2rem] border-[7px] border-slate-900 bg-slate-900 shadow-xl">
    <div className="mx-auto h-5 w-24 rounded-b-xl bg-slate-900" />
    <div className="min-h-[430px] overflow-hidden rounded-[1.45rem] bg-[#fffaf5]">{children}</div>
  </div>
);

const MiniSlot = ({ icon: Icon, label, available = true, bookedBy }) => (
  <div className={"rounded-xl border p-2.5 " + (available ? "border-green-200 bg-green-50" : "border-orange-200 bg-orange-50")}>
    <div className="flex items-center gap-2 text-xs font-semibold">
      <Icon className={"h-3.5 w-3.5 " + (label === "Prayer" ? "text-blue-600" : "text-purple-600")} />
      {label}
    </div>
    <div className={"mt-1 text-[10px] " + (available ? "text-green-700" : "text-orange-700")}>
      {available ? "Available — tap to book" : bookedBy || "Booked"}
    </div>
  </div>
);

const GuidePage = () => {
  const sections = [
    ["start", "Start here"], ["booking", "Book a slot"], ["calendar", "Use the calendar"],
    ["confirmation", "After booking"], ["messages", "WhatsApp & email"],
    ["remember", "Remembered details"], ["install", "Install the app"],
    ["admin", "Admin features"], ["help", "Troubleshooting"]
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <header className="relative overflow-hidden border-b border-orange-100">
        <div className="absolute inset-0 bg-gradient-to-br from-orange-50 via-amber-50/60 to-background" />
        <div className="container relative mx-auto px-4 py-14 md:py-20">
          <div className="mx-auto max-w-4xl text-center">
            <div className="mx-auto mb-5 inline-flex items-center gap-2 rounded-full border border-orange-200 bg-white/80 px-3 py-1.5 text-sm font-medium text-orange-700 shadow-sm">
              <CircleHelp className="h-4 w-4" /> Complete user guide
            </div>
            <h1 className="font-['Playfair_Display'] text-4xl font-bold tracking-tight sm:text-5xl">How to use Upper Room</h1>
            <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
              A visual walkthrough for booking Prayer or Worship, checking the rota, receiving reminders, installing the app and using the admin tools.
            </p>
            <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
              <Link to="/book"><Button className="btn-primary gap-2 px-6">Book a Slot <ArrowRight className="h-4 w-4" /></Button></Link>
              <Link to="/calendar"><Button variant="outline" className="gap-2 border-orange-200 bg-white hover:bg-orange-50"><Calendar className="h-4 w-4" /> View Calendar</Button></Link>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-10 md:py-14">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[250px_minmax(0,1fr)]">
          <aside className="hidden lg:block">
            <div className="sticky top-24 rounded-2xl border border-orange-100 bg-white p-4 shadow-sm">
              <div className="mb-3 px-2 text-xs font-semibold uppercase tracking-[0.14em] text-orange-600">Guide contents</div>
              <nav className="space-y-1">
                {sections.map(([id, label]) => (
                  <a key={id} href={"#" + id} className="block rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-orange-50 hover:text-orange-700">{label}</a>
                ))}
              </nav>
            </div>
          </aside>

          <div className="min-w-0 space-y-12">
            <section id="start" className="scroll-mt-24">
              <div className="mb-5">
                <div className="text-sm font-semibold uppercase tracking-[0.12em] text-orange-600">01 · Start here</div>
                <h2 className="mt-1 font-['Playfair_Display'] text-3xl font-bold">What Upper Room lets you do</h2>
                <p className="mt-3 max-w-3xl leading-7 text-muted-foreground">See who is serving, choose an available Prayer or Worship slot, receive confirmations/reminders and join the online meeting.</p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {[
                  [BookOpen, "Book", "Choose Prayer or Worship and reserve an available date."],
                  [Calendar, "Check the rota", "See available and already-booked slots."],
                  [MessageCircle, "Get reminders", "Receive WhatsApp confirmation and same-day reminder."],
                  [Video, "Join Zoom", "Open the meeting link directly from the site or confirmation."]
                ].map(([Icon, title, copy]) => (
                  <Card key={title} className="border-orange-100"><CardContent className="p-5">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-100 text-orange-600"><Icon className="h-5 w-5" /></div>
                    <div className="mt-3 font-semibold">{title}</div><p className="mt-1 text-sm leading-6 text-muted-foreground">{copy}</p>
                  </CardContent></Card>
                ))}
              </div>
            </section>

            <section id="booking" className="scroll-mt-24">
              <div className="mb-5"><div className="text-sm font-semibold uppercase tracking-[0.12em] text-orange-600">02 · Booking</div><h2 className="mt-1 font-['Playfair_Display'] text-3xl font-bold">How to book a slot</h2></div>
              <div className="grid gap-7 xl:grid-cols-[1fr_0.9fr] xl:items-center">
                <div className="space-y-5">
                  {[
                    ["Open Book a Slot", "Tap “Book a Slot” from the homepage or choose an available slot directly from the calendar."],
                    ["Choose your role", "Select Prayer or Worship. If you came from the calendar, the date and role may already be filled in."],
                    ["Enter your details", "Add your name and, if you want WhatsApp updates, your WhatsApp number. Email is optional."],
                    ["Check and submit", "Review the date and role, then confirm. The system prevents the same slot from being double-booked."]
                  ].map(([title, copy], index) => (
                    <div key={title} className="flex gap-4"><StepNumber>{index + 1}</StepNumber><div><div className="font-semibold">{title}</div><p className="mt-1 text-sm leading-6 text-muted-foreground">{copy}</p></div></div>
                  ))}
                </div>
                <MockBrowser title="Upper Room · Book a Slot">
                  <div className="mx-auto max-w-sm space-y-3">
                    <div className="text-center"><div className="font-['Playfair_Display'] text-xl font-bold">Book your slot</div><div className="mt-1 text-[11px] text-slate-500">Prayer & Worship · Mon–Thu</div></div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="rounded-xl border-2 border-orange-400 bg-orange-50 p-3 text-center"><HandHeart className="mx-auto h-5 w-5 text-blue-600" /><div className="mt-1 text-xs font-semibold">Prayer</div></div>
                      <div className="rounded-xl border border-slate-200 bg-white p-3 text-center"><Music className="mx-auto h-5 w-5 text-purple-600" /><div className="mt-1 text-xs font-semibold">Worship</div></div>
                    </div>
                    <div className="rounded-xl border border-orange-100 bg-white p-3"><div className="text-[10px] text-slate-400">Full name</div><div className="mt-1 rounded-lg bg-slate-50 px-3 py-2 text-xs">Your name</div></div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="rounded-xl border border-orange-100 bg-white p-3"><div className="text-[10px] text-slate-400">Date</div><div className="mt-1 text-xs font-medium">Monday 28 Sep</div></div>
                      <div className="rounded-xl border border-orange-100 bg-white p-3"><div className="text-[10px] text-slate-400">Time</div><div className="mt-1 text-xs font-medium">8–9 PM</div></div>
                    </div>
                    <div className="rounded-full bg-gradient-to-r from-orange-500 to-red-600 px-4 py-2.5 text-center text-xs font-semibold text-white">Confirm Booking</div>
                  </div>
                </MockBrowser>
              </div>
              <div className="mt-6 rounded-2xl border border-blue-100 bg-blue-50/60 p-4 text-sm text-blue-900"><strong>Tip:</strong> if a slot is already booked, choose another date or the other role.</div>
            </section>

            <section id="calendar" className="scroll-mt-24">
              <div className="mb-5"><div className="text-sm font-semibold uppercase tracking-[0.12em] text-orange-600">03 · Calendar</div><h2 className="mt-1 font-['Playfair_Display'] text-3xl font-bold">Two calendar views on mobile</h2><p className="mt-3 max-w-3xl leading-7 text-muted-foreground">On a phone you can switch between an easy list and the full traditional calendar. On a computer, the full calendar is shown automatically.</p></div>
              <div className="grid gap-7 lg:grid-cols-2">
                <div>
                  <div className="mb-3 flex items-center gap-2 font-semibold"><List className="h-5 w-5 text-orange-600" /> Easy View</div>
                  <MockPhone><div className="p-4">
                    <div className="grid grid-cols-2 rounded-xl border border-orange-100 bg-white p-1"><div className="rounded-lg bg-gradient-to-r from-orange-500 to-red-600 px-2 py-2 text-center text-[10px] font-semibold text-white">Easy View</div><div className="px-2 py-2 text-center text-[10px] text-slate-500">Calendar View</div></div>
                    <div className="mt-4 space-y-3">
                      <div className="rounded-xl border border-orange-200 bg-white p-3"><div className="mb-2 text-xs font-semibold">Monday 28 September</div><div className="space-y-2"><MiniSlot icon={HandHeart} label="Prayer" /><MiniSlot icon={Music} label="Worship" available={false} bookedBy="Samuel J." /></div></div>
                      <div className="rounded-xl border border-orange-100 bg-white p-3"><div className="mb-2 text-xs font-semibold">Tuesday 29 September</div><div className="space-y-2"><MiniSlot icon={HandHeart} label="Prayer" /><MiniSlot icon={Music} label="Worship" /></div></div>
                    </div>
                  </div></MockPhone>
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">Best for quickly finding the next open slot. Tap an available card to go straight to booking.</p>
                </div>
                <div>
                  <div className="mb-3 flex items-center gap-2 font-semibold"><Grid3X3 className="h-5 w-5 text-orange-600" /> Calendar View</div>
                  <MockPhone><div className="p-3">
                    <div className="grid grid-cols-2 rounded-xl border border-orange-100 bg-white p-1"><div className="px-2 py-2 text-center text-[10px] text-slate-500">Easy View</div><div className="rounded-lg bg-gradient-to-r from-orange-500 to-red-600 px-2 py-2 text-center text-[10px] font-semibold text-white">Calendar View</div></div>
                    <div className="mt-4 overflow-hidden rounded-xl border border-orange-100 bg-white">
                      <div className="grid grid-cols-4 bg-orange-50 text-center text-[9px] font-semibold">{["Mon","Tue","Wed","Thu"].map((d) => <div key={d} className="p-2">{d}</div>)}</div>
                      <div className="grid grid-cols-4">{[28,29,30,1].map((day, i) => <div key={day} className="min-h-[115px] border-r border-t border-orange-50 p-1.5"><div className="text-[10px] font-semibold">{day}</div><div className="mt-2 space-y-1"><div className={"rounded px-1 py-1 text-[8px] " + (i === 0 ? "bg-orange-50 text-orange-700" : "bg-green-50 text-green-700")}>Prayer</div><div className="rounded bg-orange-50 px-1 py-1 text-[8px] text-orange-700">Worship</div></div></div>)}</div>
                    </div>
                    <div className="mt-2 text-center text-[9px] text-slate-400">Swipe sideways to see the whole week</div>
                  </div></MockPhone>
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">Best for seeing the rota as a month, including previous bookings. On small screens, swipe sideways.</p>
                </div>
              </div>
            </section>

            <section id="confirmation" className="scroll-mt-24">
              <div className="mb-5"><div className="text-sm font-semibold uppercase tracking-[0.12em] text-orange-600">04 · After booking</div><h2 className="mt-1 font-['Playfair_Display'] text-3xl font-bold">Your confirmation screen</h2></div>
              <div className="grid gap-7 xl:grid-cols-[0.95fr_1.05fr] xl:items-center">
                <MockBrowser title="Booking confirmed"><div className="mx-auto max-w-md text-center"><div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-100"><Check className="h-7 w-7 text-green-700" /></div><div className="mt-3 font-['Playfair_Display'] text-xl font-bold">You’re booked!</div><div className="mt-1 text-xs text-slate-500">Lead Prayer · Monday 28 September · 8:00 PM</div><div className="mt-4 grid gap-2 sm:grid-cols-3"><div className="rounded-xl bg-orange-50 p-3 text-[10px] font-medium">Add to Calendar</div><div className="rounded-xl bg-blue-50 p-3 text-[10px] font-medium text-blue-700">Join Zoom</div><div className="rounded-xl bg-slate-50 p-3 text-[10px] font-medium">View Calendar</div></div></div></MockBrowser>
                <div className="space-y-4">
                  {[
                    [CalendarCheck2, "Add to Calendar", "Downloads a calendar event containing the booking date, meeting time and Zoom link."],
                    [Video, "Join Zoom", "Opens the Upper Room Zoom meeting directly."],
                    [Calendar, "View Calendar", "Returns to the rota so you can see the rest of the month."],
                    [RefreshCw, "Book another slot", "Starts a fresh booking if you need to serve on another date."]
                  ].map(([Icon, title, copy]) => <div key={title} className="flex gap-3 rounded-2xl border border-orange-100 bg-white p-4"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-orange-600"><Icon className="h-5 w-5" /></div><div><div className="font-semibold">{title}</div><p className="mt-1 text-sm leading-6 text-muted-foreground">{copy}</p></div></div>)}
                </div>
              </div>
            </section>

            <section id="messages" className="scroll-mt-24">
              <div className="mb-5"><div className="text-sm font-semibold uppercase tracking-[0.12em] text-orange-600">05 · Notifications</div><h2 className="mt-1 font-['Playfair_Display'] text-3xl font-bold">WhatsApp and email</h2></div>
              <div className="grid gap-5 lg:grid-cols-2">
                <Card className="border-green-100 bg-green-50/30"><CardContent className="p-5"><div className="flex items-center gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-xl bg-green-100 text-green-700"><MessageCircle className="h-5 w-5" /></div><div><div className="font-semibold">WhatsApp</div><div className="text-sm text-muted-foreground">Recommended for quick reminders</div></div></div><div className="mt-5 space-y-3 text-sm"><div className="flex gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 text-green-600" /> Booking confirmation after booking.</div><div className="flex gap-2"><BellRing className="mt-0.5 h-4 w-4 text-green-600" /> Same-day reminder before the meeting.</div><div className="flex gap-2"><ShieldCheck className="mt-0.5 h-4 w-4 text-green-600" /> Used for Upper Room booking-related messages.</div></div></CardContent></Card>
                <Card className="border-blue-100 bg-blue-50/30"><CardContent className="p-5"><div className="flex items-center gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-100 text-blue-700"><Mail className="h-5 w-5" /></div><div><div className="font-semibold">Email</div><div className="text-sm text-muted-foreground">Optional additional notification</div></div></div><div className="mt-5 space-y-3 text-sm"><div className="flex gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 text-blue-600" /> Add your email only if you want email updates too.</div><div className="flex gap-2"><CalendarCheck2 className="mt-0.5 h-4 w-4 text-blue-600" /> Confirmation includes role, date and time.</div><div className="flex gap-2"><Video className="mt-0.5 h-4 w-4 text-blue-600" /> Meeting information includes the Zoom link.</div></div></CardContent></Card>
              </div>
            </section>

            <section id="remember" className="scroll-mt-24">
              <div className="mb-5"><div className="text-sm font-semibold uppercase tracking-[0.12em] text-orange-600">06 · Convenience</div><h2 className="mt-1 font-['Playfair_Display'] text-3xl font-bold">Remembering your details</h2></div>
              <div className="grid gap-6 lg:grid-cols-[1fr_0.9fr] lg:items-center">
                <div className="space-y-4 text-sm leading-6 text-muted-foreground">
                  <p>If you choose to remember your details, the site can pre-fill your name, WhatsApp number and optional email the next time you book on the same device.</p>
                  <div className="rounded-2xl border border-orange-100 bg-white p-4"><div className="flex items-start gap-3"><Smartphone className="mt-0.5 h-5 w-5 text-orange-600" /><div><div className="font-semibold text-foreground">Stored on your device</div><p className="mt-1">This remembered information is kept in your browser rather than creating a separate member account.</p></div></div></div>
                  <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4 text-amber-900">If you are booking for somebody else, edit the details first or use <strong>“Not you? Clear saved details”</strong>.</div>
                </div>
                <MockBrowser title="Welcome back"><div className="mx-auto max-w-sm"><div className="rounded-2xl border border-orange-100 bg-white p-4"><div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-100"><UserRound className="h-5 w-5 text-orange-700" /></div><div><div className="text-xs text-slate-400">Welcome back</div><div className="text-sm font-semibold">Your details are ready</div></div></div><div className="mt-4 rounded-lg bg-orange-50 px-3 py-2 text-xs text-orange-700">Not you? Clear saved details</div></div></div></MockBrowser>
              </div>
            </section>

            <section id="install" className="scroll-mt-24">
              <div className="mb-5"><div className="text-sm font-semibold uppercase tracking-[0.12em] text-orange-600">07 · App installation</div><h2 className="mt-1 font-['Playfair_Display'] text-3xl font-bold">Install Upper Room on your device</h2><p className="mt-3 max-w-3xl leading-7 text-muted-foreground">Upper Room is a Progressive Web App, so it can be added to your home screen without an app store.</p></div>
              <div className="grid gap-4 md:grid-cols-3">
                {[
                  [Smartphone, "iPhone / iPad", "Open in Safari → Share → Add to Home Screen → Add."],
                  [Download, "Android", "Open in Chrome → browser menu or install prompt → Install app / Add to Home screen."],
                  [Monitor, "Computer", "Open in Chrome or Edge → use the install icon in the address bar or browser menu."]
                ].map(([Icon, title, copy]) => <Card key={title} className="border-orange-100"><CardContent className="p-5"><Icon className="h-6 w-6 text-orange-600" /><div className="mt-3 font-semibold">{title}</div><p className="mt-2 text-sm leading-6 text-muted-foreground">{copy}</p></CardContent></Card>)}
              </div>
              <div className="mt-5"><Link to="/install"><Button variant="outline" className="gap-2 border-orange-200">Open the installation guide <ChevronRight className="h-4 w-4" /></Button></Link></div>
            </section>

            <section id="admin" className="scroll-mt-24">
              <div className="mb-5"><div className="text-sm font-semibold uppercase tracking-[0.12em] text-orange-600">08 · Admin tools</div><h2 className="mt-1 font-['Playfair_Display'] text-3xl font-bold">For authorised administrators</h2><p className="mt-3 max-w-3xl leading-7 text-muted-foreground">Admin pages are protected and are intended for people managing the rota. The public booking experience does not require admin access.</p></div>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {[
                  [CalendarCheck2, "Today", "See tonight’s Prayer and Worship leaders, message status and quick send actions."],
                  [BookOpen, "Bookings", "Search, filter, edit, move, cancel or delete bookings and optionally resend confirmation after changes."],
                  [MessageCircle, "WhatsApp Centre", "See message history, sent/delivered/read/failed status, retry counts and retry failed messages."],
                  [HeartPulse, "System Health", "Check backend, database, WhatsApp, email, scheduler and recent delivery-event status."],
                  [RefreshCw, "Logs", "Review booking changes, delivery events, retries and system activity."],
                  [ShieldCheck, "Reports & Analytics", "Review participation and booking information for administration."]
                ].map(([Icon, title, copy]) => <Card key={title} className="border-orange-100"><CardContent className="p-5"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-100"><Icon className="h-5 w-5 text-orange-700" /></div><div className="mt-3 font-semibold">{title}</div><p className="mt-1 text-sm leading-6 text-muted-foreground">{copy}</p></CardContent></Card>)}
              </div>
              <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700"><div className="flex items-start gap-3"><Lock className="mt-0.5 h-5 w-5 shrink-0" /><p>Never share administrator login details or access tokens. Admin access should only be used by authorised church administrators.</p></div></div>
            </section>

            <section id="help" className="scroll-mt-24">
              <div className="mb-5"><div className="text-sm font-semibold uppercase tracking-[0.12em] text-orange-600">09 · Troubleshooting</div><h2 className="mt-1 font-['Playfair_Display'] text-3xl font-bold">If something does not look right</h2></div>
              <div className="space-y-3">
                {[
                  ["I cannot book the date I want", "Bookings are limited to Monday–Thursday and the active booking window. The slot may also already be taken."],
                  ["The calendar looks small on my phone", "Switch to Easy View for the clearest mobile layout, or use Calendar View and swipe sideways."],
                  ["I did not receive WhatsApp immediately", "A message can take a short time to move from accepted to sent/delivered. Genuine temporary failures can be retried by the admin system."],
                  ["My saved details belong to somebody else", "Use “Not you? Clear saved details” before booking, then enter the correct participant information."],
                  ["A direct page link does not open", "Refresh the page once. Direct routes such as /book, /calendar, /guide and /privacy are supported."]
                ].map(([q, a]) => <details key={q} className="group rounded-2xl border border-orange-100 bg-white p-4"><summary className="flex cursor-pointer list-none items-center justify-between gap-3 font-semibold">{q}<ChevronRight className="h-4 w-4 shrink-0 text-orange-600 transition-transform group-open:rotate-90" /></summary><p className="mt-3 text-sm leading-6 text-muted-foreground">{a}</p></details>)}
              </div>
              <div className="mt-6 rounded-2xl bg-gradient-to-r from-orange-500 to-red-600 p-6 text-white"><div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between"><div><div className="font-['Playfair_Display'] text-2xl font-bold">Ready to use Upper Room?</div><p className="mt-1 text-sm text-white/85">Book a slot or check who is serving this week.</p></div><div className="flex flex-wrap gap-2"><Link to="/book"><Button className="bg-white text-orange-700 hover:bg-orange-50">Book a Slot</Button></Link><Link to="/calendar"><Button variant="outline" className="border-white/50 bg-white/10 text-white hover:bg-white/20">View Calendar</Button></Link></div></div></div>
            </section>
          </div>
        </div>
      </main>

      <footer className="border-t border-orange-100 bg-white/80">
        <div className="container mx-auto flex flex-col items-center justify-between gap-3 px-4 py-6 text-sm text-muted-foreground sm:flex-row">
          <span>© 2026 Hebron Pentecostal Assembly UK</span>
          <div className="flex gap-4"><Link to="/privacy" className="font-medium hover:text-orange-600">Privacy Policy</Link><Link to="/install" className="font-medium hover:text-orange-600">Install App</Link></div>
        </div>
      </footer>
    </div>
  );
};

export default GuidePage;
