import { test } from "node:test";
import { execFileSync } from "node:child_process";
import path from "node:path";

test("dialogue retains quiet word edges, reply gaps and unclipped loud transients", () => {
  execFileSync(
    "uv",
    [
      "run",
      "--no-project",
      "--with",
      "numpy",
      "--",
      "python",
      "tests/dialogue_media_fixture.py",
    ],
    {
      cwd: path.resolve(import.meta.dirname, ".."),
      timeout: 60000,
      stdio: "pipe",
    },
  );
});
