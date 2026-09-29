"use client";

import * as React from "react";

/**
 * Shake-to-SOS gesture hook.
 *
 * Listens for device motion events and triggers a callback when a significant
 * shake is detected. Requires permission on iOS 13+ (DeviceMotionEvent.requestPermission).
 *
 * The rider can shake their phone to open the SOS dialog — useful when their
 * hands are wet/gloved and precise tapping is hard.
 *
 * NOTE: This is a supplementary trigger; actual SOS activation still requires
 * the modal button press to prevent false alarms.
 */
export function useShakeToSos(onShake: () => void, enabled: boolean) {
  const lastTriggerRef = React.useRef(0);
  const threshold = 18; // m/s^2 acceleration delta
  const cooldownMs = 3000;

  React.useEffect(() => {
    if (!enabled) return;
    if (typeof window === "undefined") return;

    const handler = (e: DeviceMotionEvent) => {
      const acc = e.accelerationIncludingGravity;
      if (!acc || acc.x == null || acc.y == null || acc.z == null) return;
      // Compute total acceleration magnitude delta from gravity (9.8).
      const delta = Math.abs(acc.x) + Math.abs(acc.y) + Math.abs(acc.z) - 9.8;
      if (delta > threshold) {
        const now = Date.now();
        if (now - lastTriggerRef.current < cooldownMs) return;
        lastTriggerRef.current = now;
        onShake();
      }
    };

    // iOS 13+ requires explicit permission request via a user gesture.
    const DME = window.DeviceMotionEvent as unknown as { requestPermission?: () => Promise<string> };
    if (DME && typeof DME.requestPermission === "function") {
      // Permission will be requested on first user interaction elsewhere;
      // here we just attempt to add the listener (may silently fail on iOS
      // until permission is granted).
      window.addEventListener("devicemotion", handler);
      return () => window.removeEventListener("devicemotion", handler);
    }

    window.addEventListener("devicemotion", handler);
    return () => window.removeEventListener("devicemotion", handler);
  }, [onShake, enabled]);
}

/** Request device motion permission (iOS 13+). Call from a user gesture. */
export async function requestMotionPermission(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  const DME = window.DeviceMotionEvent as unknown as { requestPermission?: () => Promise<string> };
  if (DME && typeof DME.requestPermission === "function") {
    try {
      const res = await DME.requestPermission();
      return res === "granted";
    } catch {
      return false;
    }
  }
  return true; // Android/desktop: no permission needed
}
