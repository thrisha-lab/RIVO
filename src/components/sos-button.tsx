"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Phone, X, AlertTriangle, Shield, Plus, Trash2, Loader2, CheckCircle2, MapPin, PhoneCall } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { api } from "@/lib/api-client";
import type { SosContact, SosAlertInfo } from "@/lib/types";
import { toast } from "sonner";

interface Props {
  location: { lat: number; lng: number } | null;
  onSosTrigger: (loc: { lat: number; lng: number }, message?: string) => void;
  onSosCancel: () => void;
}

export default function SosButton({ location, onSosTrigger, onSosCancel }: Props) {
  const [open, setOpen] = React.useState(false);
  const [active, setActive] = React.useState<SosAlertInfo | null>(null);
  const [contacts, setContacts] = React.useState<SosContact[]>([]);
  const [contactsLoading, setContactsLoading] = React.useState(false);
  const [showContacts, setShowContacts] = React.useState(false);
  const [triggering, setTriggering] = React.useState(false);
  const [cancelling, setCancelling] = React.useState(false);

  // form
  const [name, setName] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [relation, setRelation] = React.useState("family");
  const [adding, setAdding] = React.useState(false);

  // Check for active SOS on mount.
  const refreshActive = React.useCallback(async () => {
    try {
      const r = await api.getActiveSos();
      setActive(r.active);
    } catch {
      /* ignore */
    }
  }, []);

  React.useEffect(() => {
    refreshActive();
  }, [refreshActive]);

  const loadContacts = React.useCallback(async () => {
    setContactsLoading(true);
    try {
      const r = await api.getSosContacts();
      setContacts(r.contacts);
    } catch {
      /* ignore */
    } finally {
      setContactsLoading(false);
    }
  }, []);

  const handleOpen = () => {
    setOpen(true);
    loadContacts();
  };

  const trigger = async () => {
    if (!location) {
      toast.error("Location required. Tap “Find me” first.");
      return;
    }
    setTriggering(true);
    try {
      const res = await api.triggerSos({ lat: location.lat, lng: location.lng });
      onSosTrigger(location);
      setActive({
        id: res.alertId,
        lat: location.lat,
        lng: location.lng,
        message: null,
        status: res.status,
        triggeredAt: res.triggeredAt,
      });
      toast.error("SOS activated", {
        description: res.message,
        duration: 6000,
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "SOS failed");
    } finally {
      setTriggering(false);
    }
  };

  const cancel = async () => {
    setCancelling(true);
    try {
      await api.cancelSos();
      onSosCancel();
      setActive(null);
      toast.success("SOS cancelled. Glad you're safe.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Cancel failed");
    } finally {
      setCancelling(false);
    }
  };

  const addContact = async () => {
    if (!name.trim() || !phone.trim()) {
      toast.error("Name and phone are required.");
      return;
    }
    setAdding(true);
    try {
      const c = await api.addSosContact({ name: name.trim(), phone: phone.trim(), relation });
      setContacts((prev) => [...prev, c]);
      setName("");
      setPhone("");
      setRelation("family");
      toast.success("Emergency contact added.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to add contact");
    } finally {
      setAdding(false);
    }
  };

  const removeContact = async (id: string) => {
    try {
      await api.deleteSosContact(id);
      setContacts((prev) => prev.filter((c) => c.id !== id));
      toast.success("Contact removed.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to remove");
    }
  };

  const callEmergency = () => {
    // Direct emergency number dial (India: 112). Opens tel: link.
    window.location.href = "tel:112";
  };

  return (
    <>
      {/* Floating SOS button */}
      <motion.button
        type="button"
        onClick={handleOpen}
        aria-label="Emergency SOS"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="fixed bottom-5 right-5 z-[950] flex h-16 w-16 items-center justify-center rounded-full bg-red-600 text-white shadow-xl ring-4 ring-red-600/30 transition hover:bg-red-700"
      >
        {active ? (
          <span className="absolute inset-0 animate-ping rounded-full bg-red-500 opacity-60" />
        ) : null}
        <span className="relative flex flex-col items-center leading-none">
          <Shield className="h-5 w-5" />
          <span className="mt-0.5 text-[10px] font-black tracking-wider">SOS</span>
        </span>
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[800] flex items-end justify-center bg-black/50 p-3 backdrop-blur-sm sm:items-center"
            onClick={() => setOpen(false)}
          >
            <motion.div
              initial={{ y: 40, opacity: 0, scale: 0.98 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 40, opacity: 0, scale: 0.98 }}
              transition={{ type: "spring", stiffness: 260, damping: 24 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md overflow-hidden rounded-2xl border bg-background shadow-2xl"
            >
              {/* Header */}
              <div className={`flex items-center justify-between px-5 py-4 ${active ? "bg-red-600 text-white" : "bg-gradient-to-r from-red-600 to-orange-600 text-white"}`}>
                <div className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  <div>
                    <div className="text-base font-bold">Emergency SOS</div>
                    <div className="text-xs opacity-90">{active ? "SOS ACTIVE — help is alerted" : "Trigger emergency assistance"}</div>
                  </div>
                </div>
                <button onClick={() => setOpen(false)} className="rounded-md p-1 transition hover:bg-white/20" aria-label="Close">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="max-h-[70vh] overflow-y-auto p-5">
                {active ? (
                  /* ACTIVE SOS STATE */
                  <div className="space-y-4">
                    <motion.div
                      initial={{ scale: 0.9 }}
                      animate={{ scale: 1 }}
                      className="flex flex-col items-center gap-3 rounded-xl border-2 border-red-500 bg-red-50 p-5 text-center dark:bg-red-950/30"
                    >
                      <div className="relative">
                        <span className="absolute inset-0 animate-ping rounded-full bg-red-500 opacity-50" />
                        <AlertTriangle className="relative h-10 w-10 text-red-600" />
                      </div>
                      <div>
                        <div className="text-lg font-bold text-red-700 dark:text-red-300">SOS Active</div>
                        <div className="text-xs text-muted-foreground">
                          Triggered {new Date(active.triggeredAt).toLocaleTimeString()} · {active.lat.toFixed(4)}, {active.lng.toFixed(4)}
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Your live location is being shared with your emergency contacts and nearby riders. Stay where you are if it's safe.
                      </p>
                    </motion.div>

                    <Button onClick={callEmergency} className="w-full gap-2 bg-red-600 hover:bg-red-700" size="lg">
                      <PhoneCall className="h-5 w-5" /> Call 112 (Emergency)
                    </Button>

                    <Button onClick={cancel} disabled={cancelling} variant="outline" className="w-full gap-2" size="lg">
                      {cancelling ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                      I'm safe — cancel SOS
                    </Button>
                  </div>
                ) : (
                  /* IDLE STATE */
                  <div className="space-y-4">
                    <div className="rounded-xl border bg-muted/30 p-4">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                        <p className="text-xs text-muted-foreground">
                          Triggering SOS will alert your emergency contacts and nearby riders with your live location. Use only in genuine emergencies.
                        </p>
                      </div>
                    </div>

                    {!location && (
                      <div className="rounded-lg border border-amber-400/60 bg-amber-50 p-2.5 text-xs text-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
                        <MapPin className="mr-1 inline h-3 w-3" />Location required — tap "Find me" first so we know where to send help.
                      </div>
                    )}

                    <Button onClick={trigger} disabled={triggering || !location} className="w-full gap-2 bg-red-600 hover:bg-red-700" size="lg">
                      {triggering ? <Loader2 className="h-5 w-5 animate-spin" /> : <Shield className="h-5 w-5" />}
                      {triggering ? "Activating SOS…" : "Activate SOS"}
                    </Button>

                    <Button onClick={callEmergency} variant="outline" className="w-full gap-2" size="lg">
                      <PhoneCall className="h-5 w-5" /> Call 112 directly
                    </Button>

                    {/* Emergency contacts */}
                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={() => setShowContacts((v) => !v)}
                        className="flex w-full items-center justify-between text-sm font-medium"
                      >
                        <span className="flex items-center gap-1.5"><Phone className="h-4 w-4" /> Emergency contacts ({contacts.length})</span>
                        <span className="text-xs text-muted-foreground">{showContacts ? "Hide" : "Manage"}</span>
                      </button>

                      {showContacts && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} className="mt-3 space-y-2">
                          {contactsLoading ? (
                            <div className="py-3 text-center text-xs text-muted-foreground">Loading…</div>
                          ) : contacts.length === 0 ? (
                            <div className="rounded-lg border border-dashed p-3 text-center text-xs text-muted-foreground">
                              No contacts yet. Add someone you trust.
                            </div>
                          ) : (
                            <div className="space-y-1.5">
                              {contacts.map((c) => (
                                <div key={c.id} className="flex items-center gap-2 rounded-lg border bg-card/50 p-2">
                                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-red-100 text-red-600 dark:bg-red-950 dark:text-red-300">
                                    <Phone className="h-3.5 w-3.5" />
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <div className="truncate text-sm font-medium">{c.name}</div>
                                    <div className="truncate text-xs text-muted-foreground">{c.phone} · {c.relation}</div>
                                  </div>
                                  <a href={`tel:${c.phone}`} className="rounded-md p-1.5 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950" aria-label={`Call ${c.name}`}>
                                    <PhoneCall className="h-3.5 w-3.5" />
                                  </a>
                                  <button onClick={() => removeContact(c.id)} className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive" aria-label="Remove contact">
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Add contact form */}
                          <div className="space-y-2 rounded-lg border bg-muted/20 p-3">
                            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Add contact</div>
                            <div className="grid grid-cols-2 gap-2">
                              <Input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} className="h-8 text-sm" />
                              <Input placeholder="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} className="h-8 text-sm" />
                            </div>
                            <Select value={relation} onValueChange={setRelation}>
                              <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="family">Family</SelectItem>
                                <SelectItem value="friend">Friend</SelectItem>
                                <SelectItem value="coworker">Coworker</SelectItem>
                                <SelectItem value="other">Other</SelectItem>
                              </SelectContent>
                            </Select>
                            <Button onClick={addContact} disabled={adding} size="sm" className="w-full gap-1.5">
                              {adding ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                              Add contact
                            </Button>
                          </div>
                        </motion.div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
