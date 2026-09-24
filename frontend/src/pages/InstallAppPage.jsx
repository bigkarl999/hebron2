import { useEffect, useState } from "react";
import Navigation from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Apple,
  CheckCircle2,
  Download,
  MonitorDown,
  PlusSquare,
  Share2,
  Smartphone,
} from "lucide-react";

const InstallAppPage = () => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      window.navigator.standalone === true;
    setInstalled(standalone);

    const handler = (event) => {
      event.preventDefault();
      setDeferredPrompt(event);
    };
    const installedHandler = () => {
      setInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("appinstalled", installedHandler);
    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener("appinstalled", installedHandler);
    };
  }, []);

  const install = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="container mx-auto max-w-5xl px-4 py-10 md:py-14">
        <div className="mx-auto mb-8 max-w-2xl text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500 to-red-600 text-white shadow-lg shadow-orange-200">
            <Download className="h-7 w-7" />
          </div>
          <h1 className="mt-5 font-['Playfair_Display'] text-3xl font-bold md:text-4xl">Install Upper Room</h1>
          <p className="mt-3 text-muted-foreground">
            Add Upper Room to your phone or computer so it opens like an app, with its own icon and full-screen experience.
          </p>

          {installed ? (
            <div className="mx-auto mt-5 inline-flex items-center gap-2 rounded-full bg-green-100 px-4 py-2 text-sm font-medium text-green-700">
              <CheckCircle2 className="h-4 w-4" /> Already installed on this device
            </div>
          ) : deferredPrompt ? (
            <Button onClick={install} className="btn-primary mt-5 gap-2 px-6">
              <Download className="h-4 w-4" /> Install Upper Room
            </Button>
          ) : (
            <div className="mt-5 text-sm text-muted-foreground">
              Follow the steps for your device below.
            </div>
          )}
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          <Card className="border-orange-100">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Apple className="h-5 w-5" /> iPhone / iPad
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="flex gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-orange-100 font-semibold text-orange-700">1</span>
                <p>Open Upper Room in <strong>Safari</strong>.</p>
              </div>
              <div className="flex gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-orange-100 font-semibold text-orange-700">2</span>
                <p>Tap the <Share2 className="mx-1 inline h-4 w-4" /> <strong>Share</strong> button.</p>
              </div>
              <div className="flex gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-orange-100 font-semibold text-orange-700">3</span>
                <p>Choose <PlusSquare className="mx-1 inline h-4 w-4" /> <strong>Add to Home Screen</strong>, then tap Add.</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-orange-100">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Smartphone className="h-5 w-5" /> Android
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="flex gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-orange-100 font-semibold text-orange-700">1</span>
                <p>Open Upper Room in <strong>Chrome</strong>.</p>
              </div>
              <div className="flex gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-orange-100 font-semibold text-orange-700">2</span>
                <p>Use the install prompt if it appears, or open Chrome's menu.</p>
              </div>
              <div className="flex gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-orange-100 font-semibold text-orange-700">3</span>
                <p>Tap <strong>Install app</strong> or <strong>Add to Home screen</strong>.</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-orange-100">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <MonitorDown className="h-5 w-5" /> Computer
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="flex gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-orange-100 font-semibold text-orange-700">1</span>
                <p>Open Upper Room in Chrome or Microsoft Edge.</p>
              </div>
              <div className="flex gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-orange-100 font-semibold text-orange-700">2</span>
                <p>Look for the install icon in the address bar or browser menu.</p>
              </div>
              <div className="flex gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-orange-100 font-semibold text-orange-700">3</span>
                <p>Select <strong>Install Upper Room</strong>.</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="mt-6 rounded-2xl border border-orange-100 bg-orange-50/60 p-5 text-sm text-muted-foreground">
          This is a Progressive Web App (PWA), so members do not need an App Store or Google Play download. It still uses the same live Upper Room website and bookings.
        </div>
      </main>
    </div>
  );
};

export default InstallAppPage;
