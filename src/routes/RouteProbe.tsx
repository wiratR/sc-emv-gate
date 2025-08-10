// src/routes/RouteProbe.tsx
import { useEffect } from "react";
import { useLocation } from "react-router-dom";
export default function RouteProbe() {
  const loc = useLocation();
  useEffect(() => {
    window.logger?.info?.("[router] render", { pathname: loc.pathname, hash: window.location.hash });
  }, [loc]);
  return null;
}