import { useEffect, useState } from "preact/hooks";
import type { ComponentType } from "preact";
import { I18nProvider } from "./lib/i18n";
import { useRoute } from "./lib/router";
import Home from "./pages/Home";

// Home is in the main bundle; every other screen is code-split and loaded on first use.
const pages: Record<string, () => Promise<{ default: ComponentType<any> }>> = {
  ecg: () => import("./pages/ImageAnalysis"), skin: () => import("./pages/ImageAnalysis"), wound: () => import("./pages/ImageAnalysis"),
  symptoms: () => import("./pages/Symptoms"), workflow: () => import("./pages/Workflow"),
  encounter: () => import("./pages/Encounter"), history: () => import("./pages/History"),
  reference: () => import("./pages/References"), medications: () => import("./pages/Medications"),
  settings: () => import("./pages/Settings"), privacy: () => import("./pages/Privacy"),
};

function Lazy({ name, props }: { name: string; props: Record<string, unknown> }) {
  const [C, setC] = useState<ComponentType<any> | null>(null);
  useEffect(() => {
    let live = true;
    setC(null);
    pages[name]().then((m) => live && setC(() => m.default));
    return () => { live = false; };
  }, [name]);
  return C ? <C {...props} /> : <main aria-busy="true" />;
}

function Routes() {
  const [name, arg] = useRoute();
  if (!pages[name]) return <Home />;
  const props: Record<string, unknown> =
    name === "ecg" || name === "skin" || name === "wound" ? { task: name, encounterId: arg }
    : name === "workflow" || name === "encounter" ? { id: arg ?? "new" }
    : name === "reference" ? { tab: arg } : {};
  // key forces a fresh screen (and cleanup of the previous one) on every route change
  return <Lazy key={`${name}/${arg ?? ""}`} name={name} props={props} />;
}

export function App() {
  return <I18nProvider><Routes /></I18nProvider>;
}
