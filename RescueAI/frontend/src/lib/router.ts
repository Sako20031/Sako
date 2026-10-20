// Minimal hash router: no dependency, instant back navigation, works from the home-screen PWA.
import { useEffect, useState } from "preact/hooks";

export function useRoute(): string[] {
  const parse = () => (location.hash.replace(/^#\/?/, "") || "home").split("/").map(decodeURIComponent);
  const [route, setRoute] = useState(parse);
  useEffect(() => {
    const on = () => { setRoute(parse()); window.scrollTo(0, 0); };
    window.addEventListener("hashchange", on);
    return () => window.removeEventListener("hashchange", on);
  }, []);
  return route;
}

export const go = (path: string) => { location.hash = `#/${path}`; };
export const back = () => (history.length > 1 ? history.back() : go("home"));
