import { Link } from "react-router-dom";
import Navigation from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  ArrowLeft,
  CheckCircle2,
  Database,
  ExternalLink,
  Lock,
  Mail,
  MessageCircle,
  ShieldCheck,
  Smartphone,
  UserRound,
  BarChart3,
} from "lucide-react";

const Section = ({ icon: Icon, title, children }) => (
  <section className="scroll-mt-24">
    <div className="mb-3 flex items-center gap-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-100 text-orange-600">
        <Icon className="h-5 w-5" />
      </div>
      <h2 className="font-['Playfair_Display'] text-2xl font-semibold text-foreground">
        {title}
      </h2>
    </div>
    <div className="ml-0 text-[15px] leading-7 text-muted-foreground sm:ml-[52px]">
      {children}
    </div>
  </section>
);

const PrivacyPolicyPage = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <header className="relative overflow-hidden border-b border-orange-100">
        <div className="absolute inset-0 bg-gradient-to-br from-orange-50 via-amber-50/60 to-background" />
        <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-orange-200/30 blur-3xl" />
        <div className="absolute -bottom-32 -left-20 h-72 w-72 rounded-full bg-amber-200/25 blur-3xl" />

        <div className="container relative mx-auto px-4 py-14 sm:py-16 md:py-20">
          <div className="mx-auto max-w-4xl">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-orange-200 bg-white/80 px-3 py-1.5 text-sm font-medium text-orange-700 shadow-sm backdrop-blur">
              <ShieldCheck className="h-4 w-4" />
              Your privacy matters
            </div>

            <h1 className="font-['Playfair_Display'] text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
              Privacy Policy
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
              How Hebron Pentecostal Assembly handles information used by the Upper Room booking system.
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
              <span>Last updated: 24 September 2026</span>
              <span className="hidden h-1 w-1 rounded-full bg-orange-300 sm:inline-block" />
              <span>Upper Room Booking System</span>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-10 sm:py-12 md:py-16">
        <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[260px_minmax(0,1fr)]">
          <aside className="hidden lg:block">
            <div className="sticky top-24 rounded-2xl border border-orange-100 bg-white p-5 shadow-sm">
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-orange-600">
                On this page
              </p>
              <nav className="space-y-1 text-sm text-muted-foreground">
                {[
                  ["information", "Information we collect"],
                  ["use", "How we use information"],
                  ["whatsapp", "WhatsApp"],
                  ["analytics", "Visitor analytics"],
                  ["remembered", "Remembered details"],
                  ["access", "Who can access it"],
                  ["third-party", "Third-party services"],
                  ["retention", "Data retention"],
                  ["choices", "Your choices"],
                  ["contact", "Contact"],
                ].map(([id, label]) => (
                  <a
                    key={id}
                    href={`#${id}`}
                    className="block rounded-lg px-3 py-2 transition-colors hover:bg-orange-50 hover:text-orange-700"
                  >
                    {label}
                  </a>
                ))}
              </nav>
            </div>
          </aside>

          <Card className="overflow-hidden border-orange-100 bg-white shadow-[0_16px_50px_-28px_rgba(234,88,12,0.28)]">
            <CardContent className="p-5 sm:p-8 md:p-10">
              <div className="mb-10 rounded-2xl border border-orange-100 bg-gradient-to-r from-orange-50 to-amber-50 p-5 sm:p-6">
                <div className="flex gap-3">
                  <Lock className="mt-0.5 h-5 w-5 shrink-0 text-orange-600" />
                  <p className="text-sm leading-6 text-foreground/80">
                    Hebron Pentecostal Assembly respects your privacy. This policy explains what information we collect, why we use it, and the choices available to you when using the Upper Room booking system.
                  </p>
                </div>
              </div>

              <div className="space-y-11">
                <div id="information">
                  <Section icon={UserRound} title="Information we collect">
                    <p>When you make a booking, we may collect:</p>
                    <ul className="mt-3 space-y-2">
                      {[
                        "Your name",
                        "Your selected role, such as Prayer or Worship",
                        "The date of your booking",
                        "Your WhatsApp or phone number, if provided",
                        "Your email address, if provided",
                        "Any notes you choose to enter",
                      ].map((item) => (
                        <li key={item} className="flex gap-2">
                          <CheckCircle2 className="mt-1.5 h-4 w-4 shrink-0 text-orange-500" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                    <p className="mt-4">
                      We may also collect limited technical information, such as a privacy-masked version of your IP address and basic browser information, for security, troubleshooting and administrative logging.
                    </p>
                  </Section>
                </div>

                <div id="use">
                  <Section icon={Database} title="How we use your information">
                    <p>Your information is used only for purposes connected with the Upper Room booking system, including:</p>
                    <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                      {[
                        "Creating and managing bookings",
                        "Showing booking availability",
                        "Sending booking confirmations",
                        "Sending booking reminders",
                        "Sending relevant meeting information",
                        "Helping administrators manage the rota",
                        "Troubleshooting technical issues",
                        "Understanding anonymous website usage",
                        "Preventing misuse of the system",
                      ].map((item) => (
                        <li key={item} className="flex gap-2">
                          <CheckCircle2 className="mt-1.5 h-4 w-4 shrink-0 text-orange-500" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                    <p className="mt-4">
                      If you provide a WhatsApp number, it may be used to send booking confirmations and reminders through the WhatsApp Business Platform. If you provide an email address, it may be used to send booking confirmations and reminders by email.
                    </p>
                  </Section>
                </div>

                <div id="whatsapp">
                  <Section icon={MessageCircle} title="WhatsApp">
                    <p>
                      WhatsApp messages are sent using the WhatsApp Business Platform provided by Meta.
                    </p>
                    <p className="mt-3">
                      When a WhatsApp message is sent, information needed to deliver that message, such as your phone number and message details, may be processed by Meta in accordance with Meta&apos;s own privacy policies and terms.
                    </p>
                    <p className="mt-3">
                      We use WhatsApp only for messages related to the booking system and Upper Room participation.
                    </p>
                  </Section>
                </div>

                <div id="analytics">
                  <Section icon={BarChart3} title="Visitor analytics">
                    <p>
                      We collect limited anonymous usage analytics to understand how the Upper Room website is being used and to help administrators improve the service.
                    </p>
                    <p className="mt-3">
                      This can include page views, an anonymous browser identifier, a temporary browsing-session identifier, the page being viewed, device/browser type, browser language, approximate timezone, and a privacy-masked network prefix.
                    </p>
                    <p className="mt-3">
                      Where our hosting or content-delivery infrastructure supplies coarse location information, such as country, region or city, this may also be recorded for aggregate visitor statistics. We do not store a visitor&apos;s full IP address or GPS location in the visitor analytics system.
                    </p>
                    <p className="mt-3">
                      The anonymous browser identifier is used so repeated visits from the same browser on the same day can be counted as one unique visitor while page views can still be counted separately. The analytics records are not linked to names, phone numbers, email addresses or booking details.
                    </p>
                    <p className="mt-3">
                      Visitor event records are retained for up to approximately 12 months and recent session/activity records for up to approximately 90 days.
                    </p>
                  </Section>
                </div>

                <div id="remembered">
                  <Section icon={Smartphone} title="Remembered details">
                    <p>
                      If you choose to allow the website to remember your details, your name, WhatsApp number and optional email address may be stored locally in your browser on your device.
                    </p>
                    <p className="mt-3">
                      This information is stored on your device rather than as a separate member profile.
                    </p>
                    <p className="mt-3">
                      The site may also store anonymous visitor and session identifiers in your browser so repeat page views can be measured accurately. Clearing your browser&apos;s site data will reset these identifiers on that device.
                    </p>
                    <p className="mt-3">
                      You can remove these saved details by using the <strong className="font-semibold text-foreground">“Not you? Clear saved details”</strong> option on the booking page or by clearing your browser&apos;s site data.
                    </p>
                  </Section>
                </div>

                <div id="access">
                  <Section icon={ShieldCheck} title="Who can access your information">
                    <p>
                      Booking information is accessible only to authorised administrators responsible for managing the Upper Room rota and related church administration.
                    </p>
                    <p className="mt-3">
                      Public calendar views do not display your phone number, email address or other private contact information.
                    </p>
                  </Section>
                </div>

                <div id="third-party">
                  <Section icon={ExternalLink} title="Third-party services">
                    <p>The booking system may use third-party services to operate, including:</p>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      {[
                        ["WhatsApp / Meta", "WhatsApp messaging"],
                        ["Resend", "Email delivery"],
                        ["Railway", "Backend hosting"],
                        ["MongoDB", "Database storage"],
                        ["Hostinger", "Website hosting"],
                      ].map(([name, purpose]) => (
                        <div key={name} className="rounded-xl border border-orange-100 bg-orange-50/40 px-4 py-3">
                          <div className="font-medium text-foreground">{name}</div>
                          <div className="text-sm">{purpose}</div>
                        </div>
                      ))}
                    </div>
                    <p className="mt-4">
                      These providers may process limited information as necessary to provide their services.
                    </p>
                  </Section>
                </div>

                <div id="retention">
                  <Section icon={Database} title="Data retention">
                    <p>
                      Booking and administrative information may be retained for as long as reasonably necessary for rota management, administration, record keeping, security and troubleshooting.
                    </p>
                    <p className="mt-3">
                      Information that is no longer required may be deleted or anonymised.
                    </p>
                  </Section>
                </div>

                <div id="choices">
                  <Section icon={Lock} title="Your choices">
                    <p>
                      You may choose not to provide a WhatsApp number or email address.
                    </p>
                    <p className="mt-3">
                      If you would like information about your booking data to be corrected or removed, you can contact Hebron Pentecostal Assembly.
                    </p>
                  </Section>
                </div>

                <div id="contact">
                  <Section icon={Mail} title="Contact">
                    <div className="rounded-2xl border border-orange-100 bg-gradient-to-br from-orange-50 to-white p-5">
                      <p className="font-semibold text-foreground">Hebron Pentecostal Assembly</p>
                      <div className="mt-3 space-y-2">
                        <a
                          href="mailto:hpaukchurch24@gmail.com"
                          className="flex items-center gap-2 font-medium text-orange-700 hover:text-orange-800 hover:underline"
                        >
                          <Mail className="h-4 w-4" />
                          hpaukchurch24@gmail.com
                        </a>
                        <a
                          href="https://upperroom.hebronpentecostalassembly.org"
                          className="flex items-center gap-2 font-medium text-orange-700 hover:text-orange-800 hover:underline"
                          target="_blank"
                          rel="noreferrer"
                        >
                          <ExternalLink className="h-4 w-4" />
                          upperroom.hebronpentecostalassembly.org
                        </a>
                      </div>
                    </div>
                  </Section>
                </div>
              </div>

              <div className="mt-12 border-t border-orange-100 pt-6">
                <Link to="/">
                  <Button variant="outline" className="gap-2 rounded-full border-orange-200 hover:bg-orange-50">
                    <ArrowLeft className="h-4 w-4" />
                    Back to Upper Room
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      <footer className="border-t border-orange-100 bg-white/70">
        <div className="container mx-auto flex flex-col gap-2 px-4 py-7 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <span>© 2026 Hebron Pentecostal Assembly UK</span>
          <span>Upper Room Booking System</span>
        </div>
      </footer>
    </div>
  );
};

export default PrivacyPolicyPage;
