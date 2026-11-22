import { mkdirSync, rmSync } from "node:fs";
import path from "node:path";
import { bundle } from "@remotion/bundler";
import {
  openBrowser,
  renderStill,
  selectComposition,
} from "@remotion/renderer";
import { browserExecutable } from "./browser";

// Export the light and dark inboxes as actual image files with identical content bounds.
const dest = path.resolve("public/episodes/inbox-dot-png/art");
mkdirSync(dest, { recursive: true });
const serveUrl = await bundle({
  entryPoint: path.resolve("src/inbox-png/MailStill.tsx"),
  publicDir: path.resolve("public/episodes/ai-review-loop/fonts"),
});
const browser = await openBrowser("chrome", { browserExecutable });
try {
  for (const dark of [false, true]) {
    const inputProps = { dark };
    const composition = await selectComposition({
      serveUrl,
      id: "MailboxImage",
      inputProps,
      puppeteerInstance: browser,
    });
    await renderStill({
      serveUrl,
      composition,
      inputProps,
      puppeteerInstance: browser,
      output: `${dest}/inbox${dark ? "-dark" : ""}.png`,
      imageFormat: "png",
      frame: 0,
      scale: 2,
    });
  }
} finally {
  await browser.close({ silent: true });
  rmSync(serveUrl, { recursive: true, force: true });
}
