import { afterEach, vi } from "vitest";
import { cleanup } from "@testing-library/preact";

afterEach(() => { cleanup(); vi.restoreAllMocks(); localStorage.clear(); location.hash = ""; });
