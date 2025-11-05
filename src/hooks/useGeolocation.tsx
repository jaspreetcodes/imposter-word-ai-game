import { useEffect, useState } from "react";

type GeoState =
  | { status: "idle" }
  | { status: "prompt" }
  | { status: "granted"; coords: GeolocationCoordinates }
  | { status: "denied"; error?: string }
  | { status: "error"; error: string };

export function useGeolocation(options?: PositionOptions) {
  const [state, setState] = useState<GeoState>({ status: "idle" });

  useEffect(() => {
    let cancelled = false;

    async function checkAndGet() {
      // optional: check permissions API (not supported in every browser)
      try {
        if (navigator.permissions && (navigator as any).permissions.query) {
          const perm = await (navigator as any).permissions.query({
            name: "geolocation",
          });
          if (cancelled) return;
          if (perm.state === "denied") {
            setState({ status: "denied" });
            return;
          }
          if (perm.state === "prompt") setState({ status: "prompt" });
        }
      } catch {
        /* ignore permission API errors */
      }

      if (!navigator.geolocation) {
        setState({ status: "error", error: "Geolocation not supported" });
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (pos) =>
          !cancelled && setState({ status: "granted", coords: pos.coords }),
        (err) =>
          !cancelled && setState({ status: "denied", error: err.message }),
        options ?? {
          enableHighAccuracy: false,
          timeout: 10000,
          maximumAge: 1000 * 60 * 5,
        }
      );
    }

    checkAndGet();
    return () => {
      cancelled = true;
    };
  }, [options]);

  return state;
}
