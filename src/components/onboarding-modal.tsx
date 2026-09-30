"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, MapPin, Siren, CloudSun, Users, Sparkles, X, ChevronRight, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  isNew: boolean;
  onClose: () => void;
}

const STEPS = [
  {
    icon: <Shield className="h-10 w-10 text-sky-500" />,
    title: "Welcome to RIVO",
    body: "Your AI weather safety co-pilot. We help delivery riders make safer travel decisions with real-time intelligence.",
    bg: "from-sky-500/10 to-emerald-500/10",
  },
  {
    icon: <MapPin className="h-10 w-10 text-emerald-500" />,
    title: "Set your location & destination",
    body: "Tap \"Find me\" to share your GPS, then search or tap the map to set a destination. We'll compute a deterministic risk score for your trip.",
    bg: "from-emerald-500/10 to-teal-500/10",
  },
  {
    icon: <CloudSun className="h-10 w-10 text-amber-500" />,
    title: "Weather & route intelligence",
    body: "Live weather, 12-hour forecast, best departure time, and route-aware hazard sampling — all feeding a transparent risk score.",
    bg: "from-amber-500/10 to-orange-500/10",
  },
  {
    icon: <Users className="h-10 w-10 text-violet-500" />,
    title: "Community rider network",
    body: "Report hazards, confirm or dispute others' reports, and earn reputation. The leaderboard celebrates top safety contributors.",
    bg: "from-violet-500/10 to-fuchsia-500/10",
  },
  {
    icon: <Siren className="h-10 w-10 text-red-500" />,
    title: "Emergency SOS",
    body: "The red SOS button (bottom-right) alerts your emergency contacts and nearby riders with your live location. Add trusted contacts in the SOS panel.",
    bg: "from-red-500/10 to-rose-500/10",
  },
  {
    icon: <Sparkles className="h-10 w-10 text-sky-500" />,
    title: "AI explains, never overrides",
    body: "The deterministic risk engine is the source of truth. The AI co-pilot only explains the score and offers tailored safety tips.",
    bg: "from-sky-500/10 to-indigo-500/10",
  },
];

export default function OnboardingModal({ isNew, onClose }: Props) {
  const [open, setOpen] = React.useState(false);
  const [step, setStep] = React.useState(0);

  React.useEffect(() => {
    if (isNew) {
      // Small delay so the page loads first.
      const t = setTimeout(() => setOpen(true), 600);
      return () => clearTimeout(t);
    }
  }, [isNew]);

  const close = () => {
    setOpen(false);
    onClose();
  };

  const next = () => {
    if (step < STEPS.length - 1) setStep((s) => s + 1);
    else close();
  };

  const prev = () => setStep((s) => Math.max(0, s - 1));

  const s = STEPS[step];

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[900] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
        >
          <motion.div
            initial={{ scale: 0.92, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.92, opacity: 0, y: 20 }}
            transition={{ type: "spring", stiffness: 260, damping: 24 }}
            className="relative w-full max-w-md overflow-hidden rounded-2xl border bg-background shadow-2xl"
          >
            <button onClick={close} className="absolute right-3 top-3 z-10 rounded-md p-1.5 text-muted-foreground transition hover:bg-accent" aria-label="Skip onboarding">
              <X className="h-4 w-4" />
            </button>

            {/* Step content */}
            <div className={`bg-gradient-to-br ${s.bg} px-6 pb-6 pt-10`}>
              <motion.div
                key={step}
                initial={{ scale: 0.5, opacity: 0, rotate: -10 }}
                animate={{ scale: 1, opacity: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 200, damping: 15 }}
                className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-background shadow-md"
              >
                {s.icon}
              </motion.div>
            </div>

            <div className="px-6 py-5">
              <AnimatePresence mode="wait">
                <motion.div
                  key={step}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                >
                  <h2 className="text-lg font-bold">{s.title}</h2>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{s.body}</p>
                </motion.div>
              </AnimatePresence>

              {/* Progress dots */}
              <div className="mt-5 flex items-center justify-center gap-1.5">
                {STEPS.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setStep(i)}
                    aria-label={`Go to step ${i + 1}`}
                    className={`h-1.5 rounded-full transition-all ${i === step ? "w-6 bg-primary" : "w-1.5 bg-muted-foreground/30 hover:bg-muted-foreground/50"}`}
                  />
                ))}
              </div>

              {/* Actions */}
              <div className="mt-5 flex items-center justify-between">
                <Button variant="ghost" size="sm" onClick={close} className="text-xs">
                  Skip tour
                </Button>
                <div className="flex items-center gap-2">
                  {step > 0 && (
                    <Button variant="outline" size="sm" onClick={prev} className="gap-1">
                      <ChevronLeft className="h-4 w-4" /> Back
                    </Button>
                  )}
                  <Button size="sm" onClick={next} className="gap-1">
                    {step === STEPS.length - 1 ? "Get started" : "Next"}
                    {step < STEPS.length - 1 && <ChevronRight className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
