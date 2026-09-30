"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Settings as SettingsIcon, User, MapPin, Star, Loader2, Trash2, AlertTriangle, Download, X } from "lucide-react";
import { api } from "@/lib/api-client";
import type { RiderSettings as RiderSettingsType } from "@/lib/types";
import { toast } from "sonner";

interface Props {
  onClose: () => void;
  onAccountDeleted: () => void;
}

export default function SettingsPanel({ onClose, onAccountDeleted }: Props) {
  const [settings, setSettings] = React.useState<RiderSettingsType | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [name, setName] = React.useState("");
  const [region, setRegion] = React.useState("");
  const [confirmDelete, setConfirmDelete] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);

  React.useEffect(() => {
    api.getSettings()
      .then((s) => {
        setSettings(s);
        setName(s.displayName);
        setRegion(s.region ?? "");
      })
      .catch((e) => toast.error(e instanceof Error ? e.message : "Failed to load settings"))
      .finally(() => setLoading(false));
  }, []);

  const save = async () => {
    if (name.trim().length < 3) {
      toast.error("Display name must be at least 3 characters.");
      return;
    }
    setSaving(true);
    try {
      const updated = await api.updateSettings({
        displayName: name.trim(),
        region: region.trim() || null,
      });
      setSettings(updated);
      toast.success("Settings saved.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const deleteAccount = async () => {
    setDeleting(true);
    try {
      await api.deleteAccount();
      toast.success("Account deleted. A new anonymous ID will be created.");
      onAccountDeleted();
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setDeleting(false);
    }
  };

  const exportData = () => {
    if (!settings) return;
    const data = {
      profile: settings,
      exportedAt: new Date().toISOString(),
      note: "Your RIVO data export. Delete this account via Settings to remove all data from our servers.",
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `rivo-data-${settings.displayName}-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Data exported.");
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-base">
          <span className="flex items-center gap-2"><SettingsIcon className="h-4 w-4" /> Settings</span>
          <button onClick={onClose} className="rounded-md p-1 hover:bg-accent" aria-label="Close"><X className="h-4 w-4" /></button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </div>
        ) : !settings ? (
          <div className="py-6 text-center text-sm text-muted-foreground">Failed to load settings.</div>
        ) : (
          <>
            {/* Profile */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <User className="h-3.5 w-3.5" /> Profile
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="display-name" className="text-xs">Display name</Label>
                <Input id="display-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={30} placeholder="Rider-XXXX" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="region" className="text-xs flex items-center gap-1"><MapPin className="h-3 w-3" /> Home region (optional)</Label>
                <Input id="region" value={region} onChange={(e) => setRegion(e.target.value)} maxLength={50} placeholder="e.g. Bengaluru" />
              </div>
              <Button onClick={save} disabled={saving} size="sm" className="w-full gap-1.5">
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                Save profile
              </Button>
            </div>

            {/* Account info */}
            <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Member since</span>
                <span className="font-medium">{new Date(settings.createdAt).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Last seen</span>
                <span className="font-medium">{new Date(settings.lastSeenAt).toLocaleDateString()}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Reputation</span>
                <Badge variant="secondary" className="gap-1"><Star className="h-3 w-3 fill-amber-400 text-amber-400" /> {settings.reputation}</Badge>
              </div>
            </div>

            {/* Data export */}
            <div className="space-y-1.5">
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Your data</div>
              <p className="text-[11px] text-muted-foreground">
                Your data is anonymous and tied to an opaque token in your browser. Export a copy or delete your account anytime.
              </p>
              <Button onClick={exportData} variant="outline" size="sm" className="w-full gap-1.5">
                <Download className="h-3.5 w-3.5" /> Export my data (JSON)
              </Button>
            </div>

            {/* Danger zone */}
            <div className="space-y-2 rounded-lg border border-red-300/50 bg-red-50/50 p-3 dark:bg-red-950/10">
              <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-red-600">
                <AlertTriangle className="h-3.5 w-3.5" /> Danger zone
              </div>
              <p className="text-[11px] text-muted-foreground">
                Deleting your account permanently removes all your reports, votes, trips, favorites, SOS contacts, and reputation. This cannot be undone.
              </p>
              {!confirmDelete ? (
                <Button onClick={() => setConfirmDelete(true)} variant="outline" size="sm" className="w-full gap-1.5 border-red-300 text-red-600 hover:bg-red-50">
                  <Trash2 className="h-3.5 w-3.5" /> Delete my account
                </Button>
              ) : (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-2">
                  <p className="text-xs font-medium text-red-700">Are you absolutely sure?</p>
                  <div className="flex gap-2">
                    <Button onClick={deleteAccount} disabled={deleting} variant="destructive" size="sm" className="flex-1 gap-1.5">
                      {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                      Yes, delete everything
                    </Button>
                    <Button onClick={() => setConfirmDelete(false)} variant="outline" size="sm">
                      Cancel
                    </Button>
                  </div>
                </motion.div>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
