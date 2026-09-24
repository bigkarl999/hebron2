import { Link } from "react-router-dom";
import Navigation from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Calendar, Home, MapPinOff, Sparkles } from "lucide-react";

const NotFoundPage = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <main className="relative flex min-h-[calc(100vh-4rem)] items-center justify-center overflow-hidden px-4 py-16">
        <div className="absolute inset-0 bg-gradient-to-b from-orange-50/80 via-background to-amber-50/40" />
        <div className="absolute left-[-80px] top-20 h-64 w-64 rounded-full bg-orange-200/30 blur-3xl" />
        <div className="absolute bottom-10 right-[-80px] h-72 w-72 rounded-full bg-amber-200/30 blur-3xl" />

        <div className="relative mx-auto w-full max-w-2xl text-center">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-white shadow-lg shadow-orange-100">
            <MapPinOff className="h-9 w-9 text-orange-600" />
          </div>

          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-orange-200 bg-white/80 px-3 py-1.5 text-sm font-medium text-orange-700 shadow-sm">
            <Sparkles className="h-4 w-4" />
            Page not found
          </div>

          <h1 className="font-['Playfair_Display'] text-6xl font-bold tracking-tight text-foreground sm:text-7xl">
            404
          </h1>
          <h2 className="mt-3 font-['Playfair_Display'] text-2xl font-semibold text-foreground sm:text-3xl">
            Looks like this page has wandered off.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-muted-foreground sm:text-lg">
            The page you were looking for may have moved or the link may be incorrect. You can still book an Upper Room slot or check the calendar below.
          </p>

          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link to="/book" className="w-full sm:w-auto">
              <Button size="lg" className="btn-primary w-full gap-2 px-7 py-6 text-base sm:w-auto">
                Book a Slot
                <Home className="h-5 w-5" />
              </Button>
            </Link>

            <Link to="/calendar" className="w-full sm:w-auto">
              <Button size="lg" variant="outline" className="w-full gap-2 border-orange-200 px-7 py-6 text-base hover:bg-orange-50 sm:w-auto">
                View Calendar
                <Calendar className="h-5 w-5" />
              </Button>
            </Link>
          </div>

          <div className="mt-6">
            <Link to="/" className="text-sm font-medium text-muted-foreground transition-colors hover:text-orange-600">
              Return to homepage
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
};

export default NotFoundPage;
