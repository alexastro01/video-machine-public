/** Native HTML dimensions must match the requested format: never crop a film implicitly. */
export function assertHyperframesDimensions(html: string, portrait: boolean) {
  const root = html.match(
    /<[^>]+\bdata-composition-id=["']main["'][^>]*>/,
  )?.[0];
  const width = Number(root?.match(/\bdata-width=["'](\d+)["']/)?.[1]);
  const height = Number(root?.match(/\bdata-height=["'](\d+)["']/)?.[1]);
  const expected = portrait ? [1080, 1920] : [1920, 1080];
  if (width !== expected[0] || height !== expected[1])
    throw new Error(
      `HyperFrames composition is ${width || "unknown"}×${height || "unknown"}; requested ${expected[0]}×${expected[1]}. Author the requested format before rendering.`,
    );
}
