import type { CSSProperties } from "react";
import { Img, staticFile } from "remotion";
import type { Episode } from "../engine/schema";
import {
  out,
  pix,
  PixelLayer,
  pos,
  pulse,
  smooth,
  tiny,
  unit,
} from "../instagram-rpg/art";
import inventory from "../../episodes/alex-astro-cs-enrollment/full/art.json";

type Full = NonNullable<Episode["lectureFull"]>;
type Shot = Full["scenes"][number];
type Layer = keyof typeof inventory.sprites;
type SceneProps = {
  base: string;
  frame: number;
  shot: Shot;
  lift: number;
  labels: Full["labels"];
};
const grid = { imageRendering: "pixelated", display: "block" } as const;
const gold = "#ffe397";
const round = Math.round;

function Art({
  src,
  x,
  y,
  w,
  h,
  style,
}: {
  src: string;
  x: number;
  y: number;
  w: number;
  h: number;
  style?: CSSProperties;
}) {
  return (
    <Img
      src={staticFile(src)}
      style={{
        ...pos(round(x), round(y), round(w), round(h)),
        ...grid,
        ...style,
      }}
    />
  );
}
function Plate({
  base,
  name,
  style,
}: {
  base: string;
  name: string;
  style?: CSSProperties;
}) {
  return (
    <Art
      src={base + "/full/art/" + name + ".png"}
      x={0}
      y={0}
      w={270}
      h={480}
      style={style}
    />
  );
}
function Piece({
  base,
  name,
  x,
  feet,
  h,
  flip = false,
  angle = 0,
  opacity = 1,
}: {
  base: string;
  name: Layer;
  x: number;
  feet: number;
  h: number;
  flip?: boolean;
  angle?: number;
  opacity?: number;
}) {
  const size = inventory.sprites[name];
  const w = (h * size.w) / size.h;
  return (
    <div
      data-piece={name}
      style={{
        ...pos(round(x - w / 2), round(feet - h), round(w), round(h)),
        transformOrigin: "50% 85%",
        transform: "rotate(" + angle + "deg) scaleX(" + (flip ? -1 : 1) + ")",
        opacity,
      }}
    >
      <Art src={base + "/full/art/" + name + ".png"} x={0} y={0} w={w} h={h} />
    </div>
  );
}
function Opus({
  name = "listen",
  x,
  feet,
  h,
  flip = false,
}: {
  name?: "listen" | "shrug" | "explain";
  x: number;
  feet: number;
  h: number;
  flip?: boolean;
}) {
  return (
    <Img
      data-piece={"opus-" + name}
      src={staticFile(
        "episodes/alex-astro-job-market-hell/art/opus-" + name + ".png",
      )}
      style={{
        ...pos(round(x), round(feet - h), undefined, round(h)),
        ...grid,
        transform: "translateX(-50%) scaleX(" + (flip ? -1 : 1) + ")",
      }}
    />
  );
}
function Spark({
  x,
  y,
  f,
  start,
  span = 18,
  color = gold,
}: {
  x: number;
  y: number;
  f: number;
  start: number;
  span?: number;
  color?: string;
}) {
  if (f < start || f >= start + span) return null;
  const t = unit(f, start, start + span),
    r = round(2 + 4 * pulse(f, start, span));
  return (
    <svg
      aria-hidden
      width={19}
      height={19}
      style={{ ...pos(round(x) - 9, round(y) - 9), opacity: 1 - t * 0.65 }}
      shapeRendering="crispEdges"
    >
      <path
        fill={color}
        d={
          "M8 " +
          (9 - r) +
          "h2v" +
          (r - 1) +
          "h" +
          (r - 1) +
          "v2h-" +
          (r - 1) +
          "v" +
          (r - 1) +
          "H8v-" +
          (r - 1) +
          "H" +
          (9 - r) +
          "V8h" +
          (r - 1) +
          "z"
        }
      />
      <rect x={8} y={8} width={2} height={2} fill="#ffffe7" />
    </svg>
  );
}
function InkMarks({
  x,
  y,
  f,
  start,
  side = 1,
}: {
  x: number;
  y: number;
  f: number;
  start: number;
  side?: number;
}) {
  if (f < start || f >= start + 15) return null;
  const length = 2 + round(pulse(f, start, 15) * 4);
  return (
    <svg
      aria-hidden
      viewBox="0 0 16 17"
      style={{ ...pos(x, y, 16, 17), transform: "scaleX(" + side + ")" }}
      shapeRendering="crispEdges"
    >
      <path
        d={
          "M1 7h" + length + "v2H1z M4 1h2v2h2v2H6V3H4z M4 15h2v-2h2v-2H6v2H4z"
        }
        fill={gold}
      />
    </svg>
  );
}
function Camera({
  zoom,
  y,
  shake = 0,
  children,
}: {
  zoom: number;
  y: number;
  shake?: number;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        ...pos(
          round((1 - zoom) * 135 + shake),
          round((1 - zoom) * y),
          270,
          480,
        ),
        transform: "scale(" + zoom + ")",
        transformOrigin: "0 0",
      }}
    >
      {children}
    </div>
  );
}
function Steam({ f }: { f: number }) {
  return (
    <svg
      aria-hidden
      style={pos(110, 155, 55, 43)}
      viewBox="0 0 55 43"
      shapeRendering="crispEdges"
    >
      {[0, 1, 2].map((i) => {
        const step = (Math.floor(f / 4) + i * 9) % 22;
        return (
          <path
            key={i}
            fill="#fbe3a6"
            opacity={0.47 * (1 - step / 22)}
            d={
              "M" +
              (13 + i * 9 + round(Math.sin(step * 0.45))) +
              " " +
              (35 - step) +
              "h2v-3h1v-4h-2v4h-1z"
            }
          />
        );
      })}
    </svg>
  );
}
function Dinner({ base, shot, frame: f, lift }: SceneProps) {
  const e = shot.events,
    turned = f >= e.turn,
    answer = f >= e.answer;
  const punch = round(2 * pulse(f, e.turn, 12) * Math.sin((f - e.turn) * 1.4));
  const zoom = answer
    ? 1.22 + 0.035 * smooth(f, e.answer, e.jobs)
    : f >= e.ask
      ? 1.12
      : 1.02;
  return (
    <Camera zoom={zoom} y={answer ? 230 : 195} shake={punch}>
      <Plate base={base} name="dinner-room" />
      <Piece
        base={base}
        name={turned ? "cousin-turn" : "cousin-down"}
        x={133}
        feet={154}
        h={48}
      />
      <Piece
        base={base}
        name={turned ? "aunt-turn" : "aunt-down"}
        x={53}
        feet={230 - (answer ? 0 : lift)}
        h={63}
      />
      <Piece
        base={base}
        name={turned ? "uncle-turn" : "uncle-down"}
        x={190}
        feet={231}
        h={63}
        flip
      />
      <Plate
        base={base}
        name="dinner-room"
        style={{ clipPath: "ellipse(66px 52px at 134px 208px)" }}
      />
      <Steam f={f} />
      <Piece
        base={base}
        name={answer ? "deflate" : "rare"}
        x={134}
        feet={285 - (answer ? lift : 0)}
        h={63}
      />
      <InkMarks x={62} y={157} f={f} start={e.turn} />
      <InkMarks x={176} y={158} f={f} start={e.turn} side={-1} />
      <InkMarks x={144} y={102} f={f} start={e.turn} />
      <Spark x={65} y={180} f={f} start={e.now} />
    </Camera>
  );
}
function Scroll({
  base,
  label,
  x,
  y,
  f,
  hit,
  side,
  slot,
}: {
  base: string;
  label: string;
  x: number;
  y: number;
  f: number;
  hit: number;
  side: number;
  slot: number;
}) {
  const pull = out(f, hit + 2, hit + 19);
  const reach = smooth(f, hit - 12, hit);
  const withdraw = smooth(f, hit + 2, hit + 21);
  const vertical = slot === 1;
  const off = vertical ? 0 : side * (1 - reach + withdraw) * 170;
  const dy = vertical ? -(1 - reach + withdraw) * 160 : 0;
  const paperX = x + (vertical ? 0 : round(side * pull * 177));
  const paperY =
    y + (vertical ? round(-145 * pull) : round(-9 * pulse(f, hit + 2, 15)));
  return (
    <>
      {f < hit + 19 && (
        <div
          data-quest-scroll={slot}
          style={{
            ...pos(paperX - 23, paperY - 30, 46, 61),
            transformOrigin: "50% 15%",
            transform:
              "rotate(" + round((slot - 1) * 2 + side * pull * 16) + "deg)",
          }}
        >
          <Art src={base + "/full/art/scroll.png"} x={0} y={0} w={46} h={61} />
          <div
            style={{
              ...pos(5, 19, 36),
              fontFamily: pix,
              fontWeight: 700,
              fontSize: 9,
              lineHeight: "9px",
              color: "#352c31",
              textAlign: "center",
            }}
          >
            {label.split(" ").map((w) => (
              <div key={w}>{w}</div>
            ))}
          </div>
        </div>
      )}
      {f >= hit - 12 &&
        f < hit + 21 &&
        (vertical ? (
          <Piece base={base} name="pincer" x={x} feet={y - 6 + dy} h={73} />
        ) : (
          <Art
            src={base + "/full/art/claw.png"}
            x={side > 0 ? x + off - 6 : x + off - 102}
            y={y - 15}
            w={108}
            h={40}
            style={{ transform: side < 0 ? "scaleX(-1)" : undefined }}
          />
        ))}
      <Spark x={x} y={y - 12} f={f} start={hit} span={13} />
    </>
  );
}
function Board({ base, shot, frame: f, lift, labels }: SceneProps) {
  const e = shot.events,
    shrug = f >= e.shrug - 2;
  const kicks = [e.zip1, e.zip2, e.zip3].reduce(
    (v, k) => v + pulse(f, k, 12),
    0,
  );
  return (
    <Camera zoom={shrug ? 1.22 : 1.03 + kicks * 0.035} y={shrug ? 235 : 154}>
      <Plate base={base} name="career-board" />
      {[70, 134, 198].map((x, i) => (
        <Scroll
          key={i}
          base={base}
          x={x}
          y={114 + (i === 1 ? 3 : 0)}
          slot={i}
          side={i === 0 ? -1 : 1}
          hit={e["zip" + (i + 1)]}
          f={f}
          label={labels.quest}
        />
      ))}
      <Piece
        base={base}
        name={shrug ? "deflate" : "reach"}
        x={109}
        feet={246 - (shrug ? 0 : lift)}
        h={68}
      />
      <Opus
        name={shrug ? "shrug" : "listen"}
        x={162}
        feet={248 - (shrug ? lift : 0)}
        h={71}
      />
      <InkMarks x={169} y={177} f={f} start={e.shrug} />
    </Camera>
  );
}
function Study({ base, shot, frame: f, lift }: SceneProps) {
  const e = shot.events,
    first = f < e.slam1,
    second = f < e.slam2,
    inDoor = f >= e.nurse - 4;
  const slam = [e.slam1, e.slam2].reduce(
    (v, k) => v + 3 * pulse(f, k, 11) * Math.sin((f - k) * 1.8),
    0,
  );
  const closed =
    (f >= e.slam1 && f < e.slam1 + 20) || (f >= e.slam2 && f < e.nurse - 5);
  const zoom = inDoor
    ? 1.18 + 0.07 * smooth(f, e.nurse, e.thriving)
    : !first
      ? 1.12
      : 1.02;
  return (
    <Camera zoom={zoom} y={inDoor ? 135 : 185} shake={round(slam)}>
      <Plate base={base} name="study-room" />
      {closed && (
        <Art src={base + "/full/art/door.png"} x={114} y={40} w={42} h={84} />
      )}
      {inDoor && (
        <Piece
          base={base}
          name={f < e.thriving ? "nurse" : "nurse-wave"}
          x={134}
          feet={116}
          h={58}
        />
      )}
      {first && (
        <Piece
          base={base}
          name={f >= e.wave1 + 5 ? "friend-a-wave" : "friend-a"}
          x={65}
          feet={196}
          h={65}
          angle={round(-4 * pulse(f, e.wave1 + 5, 18))}
        />
      )}
      {second && (
        <Piece
          base={base}
          name={f >= e.wave2 ? "friend-b-wave" : "friend-b"}
          x={196}
          feet={196}
          h={66}
          angle={round(4 * pulse(f, e.wave2, 17))}
        />
      )}
      <InkMarks x={46} y={145} f={f} start={e.slam1} />
      <InkMarks x={196} y={142} f={f} start={e.slam2} />
      <Piece
        base={base}
        name={first ? "reach" : "deflate"}
        x={112}
        feet={253 - (second ? lift : 0)}
        h={69}
      />
      <Opus
        name={inDoor ? "explain" : second ? "listen" : "shrug"}
        x={159}
        feet={254 - (second ? 0 : lift)}
        h={69}
      />
      <Spark x={147} y={75} f={f} start={e.thriving} span={26} />
    </Camera>
  );
}
function Rehook({ base, shot, frame: f, lift }: SceneProps) {
  const e = shot.events;
  const dim = 0.56 + 0.28 * smooth(f, e.lean, e.dark + 9);
  return (
    <>
      <Camera zoom={1.28} y={135}>
        <Plate base={base} name="study-room" />
      </Camera>
      <div
        style={{ ...pos(0, 0, 270, 480), background: "#080e20", opacity: dim }}
      />
      <div
        style={{
          ...pos(0, 0, 270, 334),
          overflow: "hidden",
          maskImage: "linear-gradient(black 0%, black 92%, transparent 100%)",
        }}
      >
        <Piece
          base={base}
          name="opus-aside"
          x={133}
          feet={333 - lift}
          h={f >= e.dark ? 301 : 269 + round(8 * smooth(f, e.lean, e.dark))}
        />
      </div>
      <InkMarks x={169} y={102} f={f} start={e.look} />
    </>
  );
}
function PortalRing({ f, start }: { f: number; start: number }) {
  const step = Math.floor((f - start) / 3);
  return (
    <svg
      aria-hidden
      viewBox="0 0 270 480"
      style={pos(0, 0, 270, 480)}
      shapeRendering="crispEdges"
    >
      {Array.from({ length: 18 }, (_, i) => {
        const theta = (i * Math.PI) / 9 + step * 0.022,
          rad = 43 + ((i * 11 + step) % 18);
        const x = round(134 + Math.cos(theta) * rad),
          y = round(139 + Math.sin(theta) * rad * 1.12);
        return (
          <rect
            key={i}
            x={x}
            y={y}
            width={i % 5 === 0 ? 2 : 1}
            height={i % 5 === 0 ? 2 : 1}
            fill={i % 3 === 0 ? "#ffdb98" : "#9cfffc"}
            opacity={0.28 + (0.46 * (1 + Math.sin(theta + step * 0.11))) / 2}
          />
        );
      })}
    </svg>
  );
}
function Offer({
  base,
  fromX,
  fromY,
  toX,
  toY,
  frame: f,
  start,
  number,
}: {
  base: string;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  frame: number;
  start: number;
  number: number;
}) {
  if (f < start) return null;
  const p = smooth(f, start, start + 25);
  const x = fromX + (toX - fromX) * p,
    y = fromY + (toY - fromY) * p - 26 * Math.sin(Math.PI * p);
  return (
    <Piece
      base={base}
      name="paper"
      x={x}
      feet={y}
      h={18 + 7 * pulse(f, start, 26)}
      angle={(number - 1) * 9 + round(16 * Math.sin(Math.PI * p))}
    />
  );
}
function Portal({ base, shot, frame: f, labels, lift }: SceneProps) {
  const e = shot.events,
    closer = f >= e.soon,
    printer = f >= e.printer - 3;
  const zoom = printer
    ? 1.16
    : closer
      ? 1.16 + 0.036 * pulse(f, e.rare, 20)
      : 1.01 + 0.035 * smooth(f, e.arrival1, e.offer1);
  return (
    <Camera zoom={zoom} y={closer ? 202 : 155}>
      <Plate base={base} name="portal-court" />
      <PortalRing f={f} start={shot.start} />
      {f < e.offer2 && (
        <div
          style={{
            ...pos(58, 24, 154),
            textAlign: "center",
            fontFamily: pix,
            fontWeight: 700,
            color: "#fff0ba",
            fontSize: 11,
            lineHeight: "14px",
            textShadow: "1px 1px #233142, -1px -1px #233142",
            background: "rgba(22,37,52,.85)",
            padding: "1px 0",
          }}
        >
          {labels.future}
        </div>
      )}
      {(["a", "b", "c"] as const).map((who, i) => {
        const arrival = e["arrival" + (i + 1)],
          release = e["offer" + (i + 1)];
        if (f < arrival) return null;
        const near = f >= release - 12;
        const x = (near ? [80, 135, 188] : [104, 133, 162])[i];
        const feet = (near ? [189, 177, 189] : [153, 149, 152])[i];
        return (
          <Piece
            key={who}
            base={base}
            name={f >= release - 6 ? `offer-${who}` : `hire-${who}`}
            x={x}
            feet={feet - 2 * pulse(f, arrival, 12)}
            h={near ? 57 : 34}
            angle={round(4 * pulse(f, release - 6, 15))}
          />
        );
      })}
      <Piece
        base={base}
        name={closer ? "rare" : "reach"}
        x={115}
        feet={249 - (closer && !printer ? lift : 0)}
        h={69}
      />
      <Opus
        name={printer ? "explain" : closer ? "listen" : "explain"}
        x={161}
        feet={250 - (closer && !printer ? 0 : lift)}
        h={69}
      />
      {[0, 1, 2].map((i) => (
        <Offer
          key={i}
          number={i}
          frame={f}
          start={e["offer" + (i + 1)]}
          base={base}
          fromX={[76, 128, 182][i]}
          fromY={[151, 142, 151][i]}
          toX={[124, 132, 140][i]}
          toY={[250, 252, 251][i]}
        />
      ))}
      {printer && (
        <div
          style={{
            ...pos(114, 130, 44, 38),
            transform:
              "translateY(" + round(-4 * pulse(f, e.printer - 3, 17)) + "px)",
          }}
        >
          <Art src={base + "/full/art/printer.png"} x={0} y={0} w={44} h={38} />
          {f >= e.works && (
            <Art
              src={base + "/full/art/paper.png"}
              x={10}
              y={22}
              w={22}
              h={round(2 + 13 * out(f, e.works, e.works + 14))}
            />
          )}
        </div>
      )}
      <Spark x={147} y={140} f={f} start={e.works} span={18} />
      <Spark x={100} y={185} f={f} start={e.rare} />
    </Camera>
  );
}
function Payoff({ base, shot, frame: f, lift, labels }: SceneProps) {
  const e = shot.events,
    p = out(f, e.counter, e.land + 5),
    landed = f >= e.land;
  const zoom = 1 + 0.1 * smooth(f, shot.start, e.shine);
  const drop = smooth(f, e.counter, e.land);
  const bounce = f < e.class ? lift : 0;
  return (
    <>
      <Camera zoom={zoom} y={205}>
        <Art src={base + "/art/empty-hall.png"} x={0} y={0} w={270} h={480} />
        <Piece
          base={base}
          name={landed ? "trophy-alex" : "rare"}
          x={135}
          feet={222 - bounce}
          h={landed ? 124 : 82}
        />
        {!landed && (
          <Piece
            base={base}
            name="trophy"
            x={135}
            feet={53 + 82 * drop - bounce}
            h={44}
            angle={round(-9 * (1 - drop))}
          />
        )}
        {[
          [104, 119],
          [163, 119],
          [151, 101],
          [116, 102],
        ].map(([x, sy], i) => (
          <Spark key={x} x={x} y={sy} f={f} start={e.land + i * 4} span={18} />
        ))}
        <Spark x={150} y={109} f={f} start={e.shine} span={20} />
      </Camera>
      <div
        data-payoff-counter
        style={{
          ...pos(round(15 + (135 - 15) * p), round(21 + (233 - 21) * p)),
          fontFamily: tiny,
          fontSize: 8 + round(4 * p),
          lineHeight: "14px",
          color: "#fffefa",
          whiteSpace: "nowrap",
          transform: "translateX(-" + 50 * p + "%)",
          textShadow: "1px 1px #19202b,-1px 1px #19202b,1px -1px #19202b",
        }}
      >
        {labels.counter}
      </div>
      <Spark x={204} y={237} f={f} start={e.punch} span={16} />
    </>
  );
}
export function CampusScene(props: SceneProps) {
  const shots = {
    dinner: Dinner,
    board: Board,
    study: Study,
    rehook: Rehook,
    portal: Portal,
    payoff: Payoff,
  };
  const id = props.shot.id;
  if (id === "empty" || id === "flashback") return null;
  const Set = shots[id];
  return (
    <div data-campus={id}>
      <PixelLayer>
        <Set {...props} />
      </PixelLayer>
    </div>
  );
}
