"use client";

import { useEffect, useRef } from "react";
import {
  track,
  type AnalyticsEventName,
  type AnalyticsPropsMap,
} from "@/lib/analytics";

type Props<E extends AnalyticsEventName> = {
  event: E;
  props: AnalyticsPropsMap[E];
};

/**
 * Fire a catalog event from a server-rendered page without redesigning the page.
 */
export function AnalyticsPageBeacon<E extends AnalyticsEventName>({
  event,
  props,
}: Props<E>) {
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current) return;
    fired.current = true;
    track(event, props);
    // Intentionally once on mount for this event+props snapshot.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event]);

  return null;
}
