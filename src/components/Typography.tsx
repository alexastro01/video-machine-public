import { loadFont } from "@remotion/fonts";
import { staticFile } from "remotion";
loadFont({
  family: "DM Sans",
  url: staticFile("fonts/dmsans.ttf"),
  weight: "100 1000",
});
loadFont({
  family: "Fraunces",
  url: staticFile("fonts/fraunces.ttf"),
  weight: "100 900",
});
