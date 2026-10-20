import { render } from "preact";
import { App } from "./app";
import { applyTheme, getTheme } from "./lib/settings";
import "./styles.css";

applyTheme(getTheme());
render(<App />, document.getElementById("app")!);

if ("serviceWorker" in navigator && import.meta.env.PROD) {
  // Registered after load so it never competes with the first render.
  addEventListener("load", () => navigator.serviceWorker.register("/sw.js").catch(() => {}));
}
