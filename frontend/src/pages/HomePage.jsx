import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import Navigation from "@/components/Navigation";
import { motion } from "framer-motion";
import { Calendar, HandHeart, Music, ArrowRight, Clock, Users } from "lucide-react";

const HomePage = () => {
  const features = [
    {
      icon: HandHeart,
      title: "Lead Prayer",
      description: "Book a slot to lead the congregation in prayer during our online meetings.",
      color: "from-blue-500 to-indigo-600",
      bgColor: "bg-blue-50",
    },
    {
      icon: Music,
      title: "Lead Worship",
      description: "Sign up to lead worship and guide the congregation in praise.",
      color: "from-purple-500 to-pink-600",
      bgColor: "bg-purple-50",
    },
    {
      icon: Calendar,
      title: "View Calendar",
      description: "Check availability and see who's serving each day.",
      color: "from-orange-500 to-red-600",
      bgColor: "bg-orange-50",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      {/* Hero Section */}
      <section className="relative overflow-hidden py-20 md:py-32">
        <div className="absolute inset-0 bg-gradient-to-b from-orange-50/80 to-background" />
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: `url('https://images.unsplash.com/photo-1763355873972-7c8d76b060ea?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2OTF8MHwxfHNlYXJjaHwyfHxkaXZlcnNlJTIwY2h1cmNoJTIwY29tbXVuaXR5JTIwd29yc2hpcCUyMGhhbmRzfGVufDB8fHx8MTc3MTk4MzQ4MHww&ixlib=rb-4.1.0&q=85')`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />

        <div className="container relative mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mx-auto max-w-3xl text-center"
          >
            <h1 className="font-['Playfair_Display'] text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
              Join the Circle of{" "}
              <span className="bg-gradient-to-r from-orange-500 to-red-600 bg-clip-text text-transparent">
                Prayer & Worship
              </span>
            </h1>
            <p className="mt-6 text-lg text-muted-foreground md:text-xl">
              Hebron Pentecostal Assembly UK - Online Meeting Scheduling
            </p>

            <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link to="/book">
                <Button
                  size="lg"
                  className="btn-primary gap-2 px-8 py-6 text-lg"
                  data-testid="hero-book-slot-btn"
                >
                  Book a Slot
                  <ArrowRight className="h-5 w-5" />
                </Button>
              </Link>
              <Link to="/calendar">
                <Button
                  size="lg"
                  variant="outline"
                  className="btn-secondary gap-2 px-8 py-6 text-lg"
                  data-testid="hero-view-calendar-btn"
                >
                  View Calendar
                  <Calendar className="h-5 w-5" />
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Meeting Info */}
      <section className="border-y border-orange-100 bg-gradient-to-r from-orange-50 to-amber-50 py-8">
        <div className="container mx-auto px-4">
          <div className="flex flex-col items-center justify-center gap-6 md:flex-row md:gap-12">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-orange-100">
                <Clock className="h-6 w-6 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Meeting Time</p>
                <p className="font-semibold text-foreground">8:00 PM - 9:00 PM UK</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-orange-100">
                <Calendar className="h-6 w-6 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Meeting Days</p>
                <p className="font-semibold text-foreground">Mon - Thu</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-orange-100">
                <Users className="h-6 w-6 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Participation</p>
                <p className="font-semibold text-foreground">Open to All Members</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="mb-12 text-center"
          >
            <h2 className="font-['Playfair_Display'] text-3xl font-bold text-foreground md:text-4xl">
              How to Participate
            </h2>
            <p className="mt-4 text-muted-foreground">
              Choose your role and book a slot to serve in our online meetings
            </p>
          </motion.div>

          <div className="grid gap-6 md:grid-cols-3">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <Card className="card-warm h-full" data-testid={`feature-card-${index}`}>
                  <CardContent className="p-6">
                    <div
                      className={`mb-4 flex h-14 w-14 items-center justify-center rounded-xl ${feature.bgColor}`}
                    >
                      <feature.icon
                        className={`h-7 w-7 bg-gradient-to-r ${feature.color} bg-clip-text`}
                        style={{
                          color:
                            feature.color === "from-blue-500 to-indigo-600"
                              ? "#3b82f6"
                              : feature.color === "from-purple-500 to-pink-600"
                              ? "#a855f7"
                              : "#f97316",
                        }}
                      />
                    </div>
                    <h3 className="font-['Playfair_Display'] text-xl font-semibold text-foreground">
                      {feature.title}
                    </h3>
                    <p className="mt-2 text-muted-foreground">{feature.description}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative overflow-hidden py-16 md:py-24">
        <div className="absolute inset-0 bg-gradient-to-r from-orange-500 to-red-600" />
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: `url('https://images.unsplash.com/photo-1767353461394-7dce69402122?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2OTF8MHwxfHNlYXJjaHw0fHxkaXZlcnNlJTIwY2h1cmNoJTIwY29tbXVuaXR5JTIwd29yc2hpcCUyMGhhbmRzfGVufDB8fHx8MTc3MTk4MzQ4MHww&ixlib=rb-4.1.0&q=85')`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />

        <div className="container relative mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="font-['Playfair_Display'] text-3xl font-bold text-white md:text-4xl">
              Ready to Serve?
            </h2>
            <p className="mt-4 text-lg text-white/90">
              Book your slot today and be part of our online ministry
            </p>
            <Link to="/book">
              <Button
                size="lg"
                className="mt-8 bg-white px-8 py-6 text-lg text-orange-600 hover:bg-orange-50"
                data-testid="cta-book-slot-btn"
              >
                Book Now
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>
    </div>
  );
};

export default HomePage;
