import { loadFont } from "@remotion/fonts";
import { registerRoot, staticFile, Still } from "remotion";
import { MailFace, mailSize } from "./MailFace";

loadFont({
  family: "Inbox Inter",
  url: staticFile("InterVariable.woff2"),
  weight: "100 900",
});
const MailStill = () => (
  <Still
    id="MailboxImage"
    component={MailFace}
    {...mailSize}
    defaultProps={{ dark: false }}
  />
);
registerRoot(MailStill);
