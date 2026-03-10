import { createContext, useContext } from "react";

interface SessionTimeoutContextType {
  pauseTimeout: () => void;
  resumeTimeout: () => void;
  isPaused: boolean;
}

export const SessionTimeoutContext = createContext<SessionTimeoutContextType>({
  pauseTimeout: () => {},
  resumeTimeout: () => {},
  isPaused: false,
});

export function useSessionTimeout() {
  return useContext(SessionTimeoutContext);
}
