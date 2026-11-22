import { existsSync } from "node:fs";
// Use an installed Chromium on macOS if available. Some Headless Shell builds
// fail to locate ICU data in their GPU subprocess on macOS 26.
export const browserExecutable =
  process.env.REMOTION_BROWSER_EXECUTABLE ??
  (process.platform === "darwin"
    ? [
        "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
        "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser",
        "/Applications/Chromium.app/Contents/MacOS/Chromium",
      ].find(existsSync)
    : undefined);
