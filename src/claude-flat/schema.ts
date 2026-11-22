import { z } from "zod";

const frame = z.number().int().nonnegative();
export const flatEditSchema = z.object({
  frames: frame,
  words: z.array(z.string()),
  ends: z.array(frame),
  pages: z.array(
    z.object({
      first: frame,
      last: frame,
      key: frame,
      start: frame,
      end: frame,
    }),
  ),
  poses: z.array(z.object({ at: frame, name: z.string() })),
  stresses: z.array(frame),
  stages: z.array(frame).length(10),
  counter: frame,
});
export type FlatEdit = z.infer<typeof flatEditSchema>;
