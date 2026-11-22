import { createContext, useContext, type ReactNode } from "react";
import type { FocusTarget } from "../engine/schema";
export const FocusValues = createContext<Partial<Record<FocusTarget, number>>>(
  {},
);
const Highlight = createContext(0);
export const useSubjectHighlight = () => useContext(Highlight);
export function FocusSubject({
  target,
  children,
}: {
  target: FocusTarget;
  children: ReactNode;
}) {
  const values = useContext(FocusValues);
  const parent = useContext(Highlight);
  return (
    <Highlight.Provider value={Math.max(parent, values[target] ?? 0)}>
      {children}
    </Highlight.Provider>
  );
}
