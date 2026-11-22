import { z } from "zod";

const frame = z.number().int().nonnegative();
const position = z.number().min(0).max(1);
const camera = z.object({ frame, x: position, y: position, zoom: z.number().positive() });
export const presenterEditSchema = z.object({
  shots: z.array(z.object({
    name: z.string(),
    file: z.string().regex(/^media\/[\w./-]+$/).refine((p) => !p.includes("..")),
    pixels: z.tuple([z.number().positive(), z.number().positive()]),
    frames: frame, rate: z.number().nonnegative(), start: frame,
    width: z.number().positive(), height: z.number().positive(), speed: z.number().positive(),
    cutStyle: z.enum(["cut", "slide", "wipe"]), address: z.string(),
    camera: z.array(camera).min(1),
    mark: z.object({ kind: z.enum(["underline", "tap"]), frame, x: position, y: position, width: position }).optional(),
  })).min(1),
  words: z.array(z.object({ text: z.string(), start: z.number(), end: z.number() })).min(1),
  mouth: z.array(z.number().int().min(0).max(3)),
  accents: z.array(frame),
  blinks: z.array(frame),
  warmFrame: frame,
  sourceRate: z.number().positive().optional(),
  mixFile: z.string().regex(/^[\w/-]+\.wav$/).optional(),
  commentEnding: z.object({
    start: frame, typingFrames: z.array(frame).min(1), postFrame: frame, fileFrame: frame,
    keyword: z.string().min(1), speaker: z.string(), fileTitle: z.string(), fileDetail: z.string(),
    thumbnail: z.string().regex(/^media\/[\w/-]+\.jpg$/), backThumbnail: z.string().regex(/^media\/[\w/-]+\.jpg$/),
  }).optional(),
});
export type PresenterEdit = z.infer<typeof presenterEditSchema>;
