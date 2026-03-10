import { useCallback, useRef } from "react";
import { useSessionTimeout } from "@/contexts/SessionTimeoutContext";

/**
 * Wraps an async function so that the session idle timeout
 * is automatically paused while the operation is running.
 * Use this for long-running uploads / imports.
 */
export function useUploadSafeTimeout() {
  const { pauseTimeout, resumeTimeout, isPaused } = useSessionTimeout();
  const activeOps = useRef(0);

  const wrapWithPause = useCallback(
    <T,>(fn: () => Promise<T>): Promise<T> => {
      activeOps.current += 1;
      if (activeOps.current === 1) {
        pauseTimeout();
      }
      return fn().finally(() => {
        activeOps.current -= 1;
        if (activeOps.current <= 0) {
          activeOps.current = 0;
          resumeTimeout();
        }
      });
    },
    [pauseTimeout, resumeTimeout]
  );

  return { wrapWithPause, isPaused };
}
