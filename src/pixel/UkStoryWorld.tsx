import {
  AbsoluteFill,
  Img,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import type { Episode } from "../engine/schema";
import { PixelStage } from "./PixelStage";
import { UkLights, Particles, TradeNetwork, UkCamera } from "./UkGeometry";
import { SceneryCamera, DetailedRunway, IrelandAtlas } from "./UkScenery";
import {
  StoryCamera,
  WholeUkMap,
  SeaFlight,
  Stadium,
  DublinTraffic,
} from "./UkStoryGeometry";
import {
  ArticulatedMiko,
  Tankard,
  MikoHand,
  type HandPoint,
} from "./ArticulatedMiko";
import { smooth } from "./timeline";

const ramp = (time: number, start: number, duration: number) =>
  smooth((time - start) / duration);
const hand = (a: HandPoint, b: HandPoint, p: number): HandPoint => [
  a[0] + (b[0] - a[0]) * p,
  a[1] + (b[1] - a[1]) * p,
];
const cover = {
  width: "100%",
  height: "100%",
  objectFit: "cover" as const,
  imageRendering: "pixelated" as const,
};
type Shot = NonNullable<Episode["ukEdit"]>["shots"][number];
function Back({ file, zoom = 1 }: { file: string; zoom?: number }) {
  return (
    <Img
      src={staticFile(file)}
      style={{ ...cover, position: "absolute", transform: `scale(${zoom})` }}
    />
  );
}

function Dust({ time, cold = false }: { time: number; cold?: boolean }) {
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      {Array.from({ length: 18 }, (_, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: ((i * 173 + time * (8 + (i % 3))) % 1150) - 30,
            top: ((i * 271 + time * (3 + (i % 5))) % 2000) - 40,
            width: (i % 3) + 3,
            height: (i % 2) + 3,
            background: cold ? "#bed0d0" : "#dfcda0",
            opacity: 0.12 + (i % 3) * 0.04,
          }}
        />
      ))}
    </AbsoluteFill>
  );
}

function Cockpit({
  episode,
  time,
  shot,
  sceneTime,
}: {
  episode: Episode;
  time: number;
  shot: Shot;
  sceneTime: number;
}) {
  const close = shot.view === "runway",
    question = shot.sceneId === "question",
    landing = shot.sceneId === "dublin",
    ending = shot.sceneId === "closer";
  const finalFrame = time >= episode.duration - 1 / episode.fps - 0.0001;
  const settle = ending ? ramp(time, episode.duration - 0.8, 0.8) : 0;
  const actionTime = finalFrame ? 0 : ending ? sceneTime * (1 - settle) : time;
  const hookEnd = episode.scenes[0].duration;
  const vanish = landing
    ? 0
    : question
      ? 1
      : ending
        ? 0.18 + Math.sin(actionTime * 0.8) * 0.06
        : Math.min(1, 0.18 + (time / hookEnd) * 0.82);
  const correction = Math.max(0, actionTime - 1.25);
  const turn =
    Math.sin((actionTime + 0.15) * 4) * Math.exp(-actionTime * 2.2) * 17 +
    (actionTime >= 1.25
      ? Math.sin(correction * 8) * Math.exp(-correction * 3) * 12
      : 0);
  const fear = question || (!ending && actionTime > 0.35);
  const grip = (side: number): HandPoint => {
    const angle = (turn * Math.PI) / 180,
      body = (turn * 0.12 * Math.PI) / 180;
    const px = (378 + side * 99 * Math.cos(angle) - 135) / (485 / 400) - 200;
    const py = (1110 + side * 99 * Math.sin(angle) - 560) / (485 / 400) - 510;
    return [
      200 + px * Math.cos(body) + py * Math.sin(body),
      510 - px * Math.sin(body) + py * Math.cos(body),
    ];
  };
  const right: HandPoint = question ? [300, 363] : grip(1);
  const left: HandPoint = question ? [107, 452] : grip(-1);
  return (
    <AbsoluteFill
      style={{
        background: question ? "#263f51" : "#9caba6",
        transform: `scale(${1 + 0.18 * Math.exp(-actionTime * 8)})`,
        transformOrigin: "42% 45%",
      }}
    >
      <AbsoluteFill
        style={{
          background: "linear-gradient(#84958e,#b8aa8d 35%,#172f43 68%)",
        }}
      />
      <AbsoluteFill
        style={{
          transform: `translateY(${close ? -200 : -290}px) scale(${close ? 1.25 : 1})`,
        }}
      >
        <PixelStage portrait background="transparent" transparent>
          {landing ? (
            <StoryCamera
              mode="dublin"
              progress={(time - shot.start) / shot.duration}
            />
          ) : question ? (
            <StoryCamera mode="sea" progress={0.2} />
          ) : (
            <SceneryCamera
              view="runway"
              progress={vanish}
              zoom={close ? 1.15 : 1}
            />
          )}
          <UkLights scenery warmth={question ? 0 : landing ? 0.35 : 0.8} />
          {landing ? (
            <DublinTraffic time={time - shot.start} />
          ) : question ? (
            <SeaFlight time={sceneTime} circle />
          ) : (
            <DetailedRunway progress={vanish} time={actionTime} />
          )}
        </PixelStage>
      </AbsoluteFill>
      {!close && (
        <>
          <Back file="pixel/uk-scenes/cockpit-frame-v1.png" />
          <div
            style={{
              position: "absolute",
              left: 140,
              top: 1280,
              width: 480,
              height: 75,
              borderRadius: "50%",
              background: "#121f2c70",
              filter: "blur(18px)",
            }}
          />
          <ArticulatedMiko
            x={135}
            y={560}
            width={485}
            time={actionTime}
            left={left}
            right={right}
            lean={question ? -3 : turn * 0.12}
            headTilt={question ? 6 : turn * 0.18}
            surprised={fear}
            blink={actionTime % 3.1 > 2.93}
            legs={false}
          />
          <svg
            width="1080"
            height="1920"
            style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
          >
            <g
              transform={`translate(378 1110) rotate(${turn})`}
              fill="#607584"
              stroke="#1b2c3c"
              strokeWidth="10"
            >
              <path d="M-115-38H-83V5H83V-38H115V40H18V100H-18V40H-115Z" />
              {!question &&
                [-1, 1].map((side) => (
                  <g
                    key={side}
                    transform={`translate(${side * 99} 0) scale(${485 / 400})`}
                  >
                    <MikoHand at={[0, 0]} />
                  </g>
                ))}
            </g>
          </svg>
          <div
            style={{
              position: "absolute",
              left: 735,
              top: 1075,
              width: 43,
              height: 24,
              background: fear ? "#bd5d54" : "#829379",
              opacity: 0.65 + Math.sin(actionTime * 14) * 0.18,
              boxShadow: fear ? "0 0 20px #bd5d5455" : "none",
            }}
          />
          <Dust time={actionTime} cold={question} />
          {landing && (
            <div
              style={{
                position: "absolute",
                left: 714,
                top: 1175,
                width: 220,
                height: 77,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "#163242",
                border: "7px solid #547078",
                color: "#bdcfa7",
                fontFamily: "DM Sans",
                fontWeight: 900,
                fontSize: 37,
              }}
            >
              DUBLIN
            </div>
          )}
        </>
      )}
    </AbsoluteFill>
  );
}

function Food({
  time,
  sceneTime,
  detail,
  events,
}: {
  time: number;
  sceneTime: number;
  detail: boolean;
  events: Record<string, number>;
}) {
  const gone = ramp(time, events.fishGone, 0.4),
    lift = ramp(time, events.friedFish - 0.6, 0.65),
    serve = ramp(sceneTime, 0, 0.55);
  const right = hand([310, 455], [289, 338], lift),
    left = hand([95, 460], [116, 406], serve);
  const fish = staticFile("pixel/uk-scenes-v6/fried-fish-clean.png");
  return (
    <AbsoluteFill>
      <AbsoluteFill
        style={{
          transform: detail
            ? "translate(-35px,20px) scale(1.08)"
            : "scale(1.015)",
          transformOrigin: "55% 48%",
        }}
      >
        <Back file="pixel/uk-scenes-v6/fish-shop.png" />
        <AbsoluteFill
          style={{ background: "#183c5090", opacity: gone * 0.48 }}
        />
        <ArticulatedMiko
          x={292}
          y={510}
          width={505}
          time={sceneTime}
          left={left}
          right={right}
          headTilt={lift * 9}
          surprised={gone > 0.2 && lift < 0.8}
          legs={false}
          lean={-serve * 2}
          blink={sceneTime % 2.7 > 2.53}
          rightItem={
            <image
              href={fish}
              x={-149}
              y={-92}
              width={270}
              height={148}
              style={{ imageRendering: "pixelated" }}
            />
          }
        />
        <Img
          src={fish}
          style={{ position: "absolute", opacity: 0, width: 1, height: 1 }}
        />
        <svg
          width="1080"
          height="1920"
          style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
          shapeRendering="crispEdges"
        >
          <g transform={`translate(${255 - 80 * (1 - serve)},1138)`}>
            <path
              d="M-174-24H177L149 29H-143Z"
              fill="#e2d6ac"
              stroke="#283c46"
              strokeWidth={10}
            />
            {Array.from({ length: 18 }, (_, i) => {
              const p = ramp(time, events.fishGone + (i % 4) * 0.04, 0.38);
              return (
                <g
                  key={i}
                  transform={`translate(${(i % 6) * 42 - 114},${Math.floor(i / 6) * 19 - 61 + p * p * 400}) rotate(${((i % 3) - 1) * 18 + p * (i % 2 ? 36 : -28)})`}
                  opacity={1 - p}
                >
                  <path
                    d="M0 0H23V64H0Z"
                    fill={i % 2 ? "#d6b65d" : "#b99648"}
                    stroke="#795e35"
                    strokeWidth={5}
                  />
                  <path d="M5 7V52" stroke="#e5ce84" strokeWidth={4} />
                </g>
              );
            })}
          </g>
          {gone > 0 &&
            gone < 1 &&
            Array.from({ length: 12 }, (_, i) => (
              <rect
                key={i}
                x={160 + (i % 4) * 62 + gone * (i - 6) * 10}
                y={1100 + gone * gone * 280 + Math.floor(i / 4) * 12}
                width={7}
                height={9}
                fill="#b9c1a9"
                opacity={1 - gone}
              />
            ))}
        </svg>
        <Dust time={sceneTime} />
      </AbsoluteFill>
    </AbsoluteFill>
  );
}

function Pub({
  time,
  sceneTime,
  close,
  stop,
}: {
  time: number;
  sceneTime: number;
  close: boolean;
  stop: number;
}) {
  const frozen = Math.min(time, stop),
    local = frozen - (time - sceneTime);
  const toast = ramp(local, 0, 0.65),
    sip = ramp(local, 0.8, 1.15);
  const right = hand(hand([330, 495], [310, 412], toast), [255, 359], sip);
  const retract = ramp(local, 0.7, 0.7);
  const tilt = -sip * 22;
  return (
    <AbsoluteFill>
      <AbsoluteFill
        style={{
          transform: close
            ? "translate(-55px,-15px) scale(1.1)"
            : "scale(1.015)",
          transformOrigin: "52% 51%",
        }}
      >
        <Back file="pixel/uk-scenes-v6/pub.png" />
        <ArticulatedMiko
          x={300}
          y={720}
          width={470}
          time={frozen}
          right={right}
          left={hand([100, 460], [115, 433], toast)}
          headTilt={sip * -5}
          lean={sip * -2}
          surprised={time > stop + 0.1}
          legs={false}
          rightItem={<Tankard tilt={tilt} />}
        />
        <svg
          width="1080"
          height="1920"
          style={{ position: "absolute", inset: 0 }}
          shapeRendering="crispEdges"
        >
          <g
            transform={`translate(${180 + toast * 390 - retract * 290},${1450 - toast * 210 + retract * 80}) scale(1.3) rotate(${toast * 8})`}
          >
            <path
              d="M-180 100L-25 1L8 32L-160 150Z"
              fill="#546360"
              stroke="#24343e"
              strokeWidth={10}
            />
            <Tankard tilt={10} />
            <MikoHand at={[0, 0]} />
          </g>
          <g
            transform={`translate(${990 - toast * 255 + retract * 255},${1450 - toast * 210 + retract * 80}) scale(1.25) rotate(${-toast * 8})`}
          >
            <path
              d="M180 100L25 1L-8 32L160 150Z"
              fill="#4a5967"
              stroke="#24343e"
              strokeWidth={10}
            />
            <Tankard tilt={-10} />
            <MikoHand at={[0, 0]} />
          </g>
          {Array.from({ length: 5 }, (_, i) => (
            <rect
              key={i}
              x={635 + i * 13}
              y={1085 + Math.sin(i) * 21 + Math.max(0, 1 - toast) * 50}
              width={7}
              height={10}
              fill="#e4d4af"
              opacity={time > stop ? 0.85 : toast * 0.6}
            />
          ))}
        </svg>
        <AbsoluteFill
          style={{
            background: "#193a5b",
            opacity: ramp(time, stop, 0.3) * 0.17,
          }}
        />
        <Dust time={sceneTime} />
      </AbsoluteFill>
    </AbsoluteFill>
  );
}

function Trading({
  time,
  sceneTime,
  network,
  events,
}: {
  time: number;
  sceneTime: number;
  network: boolean;
  events: Record<string, number>;
}) {
  const off = ramp(time, events.overnight, 2.9),
    tap = ramp(sceneTime, 0.1, 0.3) - ramp(sceneTime, 0.55, 0.3);
  return (
    <AbsoluteFill>
      <Back file="pixel/uk-scenes/trading-v1.png" zoom={1.03} />
      <AbsoluteFill
        style={{ background: "#162d43", opacity: network ? 0.94 : 0.5 }}
      />
      {!network ? (
        <div
          style={{
            position: "absolute",
            left: 145,
            top: 290,
            width: 815,
            height: 690,
            background: "#132c39",
            border: "20px solid #3f5a65",
            boxShadow: "0 22px 0 #122431",
            padding: 34,
            transform: "perspective(1600px) rotateY(-6deg)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              color: "#bbceaf",
              fontSize: 110,
              fontWeight: 900,
              fontFamily: "DM Sans",
            }}
          >
            <span>£</span>
            <span style={{ fontSize: 68 }}>4th</span>
          </div>
          {Array.from({ length: 5 }, (_, i) => {
            const red = time > events.overnight + i * 0.16;
            return (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  height: 88,
                  borderTop: "3px solid #304d58",
                  color: red ? "#bc6761" : "#a5baa2",
                  fontFamily: "DM Sans",
                  fontSize: 45,
                  fontWeight: 800,
                }}
              >
                <span style={{ width: 175, fontSize: 32 }}>
                  {["GBP/USD", "GBP/EUR", "GBP/JPY", "GBP/CHF", "GBP/CAD"][i]}
                </span>
                <span style={{ width: 160, fontSize: 43 }}>
                  {["1.28", "1.18", "192.40", "1.13", "1.74"][i]}
                </span>
                <svg width="350" height="75" viewBox="0 0 430 75">
                  <path
                    d={
                      red
                        ? "M0 16L65 22L120 17L190 41L250 37L330 58L420 67"
                        : "M0 53L65 42L120 49L190 28L250 34L330 19L420 25"
                    }
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={6}
                  />
                </svg>
              </div>
            );
          })}
        </div>
      ) : (
        <>
          <div
            style={{
              position: "absolute",
              left: 120,
              top: 260,
              width: 840,
              height: 750,
              border: "16px solid #405b66",
              background: "#183447",
            }}
          />
          <PixelStage
            portrait
            background="transparent"
            transparent
            orthographic
          >
            <UkCamera zoom={1} />
            <UkLights cold />
            <group position={[0, 1.2, 0]} scale={0.65}>
              <TradeNetwork progress={off} />
            </group>
          </PixelStage>
          <div
            style={{
              position: "absolute",
              left: 510,
              top: 565,
              width: 14,
              height: 14,
              borderRadius: "50%",
              background: off > 0.2 ? "#b97069" : "#bbcaa1",
              boxShadow: off > 0.2 ? "0 0 16px #b9706955" : "none",
            }}
          />
          <div
            style={{
              position: "absolute",
              left: 535,
              top: 555,
              fontFamily: "DM Sans",
              fontSize: 29,
              fontWeight: 800,
              color: "#c0cdb6",
            }}
          >
            LONDON
          </div>
          <div
            style={{
              position: "absolute",
              left: 465,
              top: 800,
              width: 420,
              display: "grid",
              gridTemplateColumns: "repeat(20,1fr)",
              gap: 6,
            }}
          >
            {Array.from({ length: 100 }, (_, i) => (
              <div
                key={i}
                style={{
                  height: 16,
                  background: i < 38 && off > i / 38 ? "#304955" : "#9db698",
                  opacity: i < 38 && off > i / 38 ? 0.55 : 0.9,
                }}
              />
            ))}
          </div>
          <div
            style={{
              position: "absolute",
              left: 180,
              top: 350,
              color: time > events.dark ? "#cb7369" : "#b3c79e",
              fontFamily: "DM Sans",
              fontSize: 145,
              fontWeight: 900,
            }}
          >
            38%
          </div>
        </>
      )}
      <ArticulatedMiko
        x={20}
        y={760}
        width={380}
        time={sceneTime}
        legs={false}
        right={[299, 350 - tap * 35]}
        left={[106, 460]}
        surprised={off > 0.2}
        headTilt={network ? -7 : 4}
        lean={tap * 3}
      />
      <svg
        width="1080"
        height="1920"
        style={{ position: "absolute", inset: 0 }}
      >
        <path
          d="M72 1280H426V1680H392V1510H106V1680H72Z"
          fill="#2c4556"
          stroke="#182d3b"
          strokeWidth={10}
        />
        <path
          d="M70 1217H393L429 1280H57Z"
          fill="#4a616a"
          stroke="#1a303e"
          strokeWidth={10}
        />
        {Array.from({ length: 20 }, (_, i) => (
          <rect
            key={i}
            x={83 + (i % 10) * 28}
            y={1230 + Math.floor(i / 10) * 20}
            width={19}
            height={10}
            fill={i === 12 && tap > 0.5 ? "#b8c6b0" : "#86958d"}
          />
        ))}
      </svg>
      <Dust time={sceneTime} cold />
    </AbsoluteFill>
  );
}

function Transition({ shot, local }: { shot: Shot; local: number }) {
  if (shot.start === 0 || local > 0.2) return null;
  const p = smooth(local / 0.2);
  if (shot.cut === "blocks")
    return (
      <AbsoluteFill style={{ pointerEvents: "none" }}>
        {Array.from({ length: 12 }, (_, i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              width: 310,
              height: 680,
              left: (i % 4) * 300 - 30,
              top: Math.floor(i / 4) * 680 - p * 2600 - (i % 3) * 80,
              background: i % 2 ? "#50696b" : "#718574",
              border: "5px solid #2b4554",
            }}
          />
        ))}
      </AbsoluteFill>
    );
  return null;
}

export function UkStoryWorld({ episode }: { episode: Episode }) {
  const frame = useCurrentFrame(),
    { fps } = useVideoConfig(),
    time = frame / fps;
  const edit = episode.ukEdit!,
    events = edit.events!;
  const shot =
    edit.shots.find((s) => time >= s.start && time < s.start + s.duration) ??
    edit.shots.at(-1)!;
  const scene = episode.scenes.find((s) => s.id === shot.sceneId)!,
    local = time - shot.start,
    sceneTime = time - scene.start,
    progress = local / shot.duration;
  const view = shot.view;
  let picture;
  if (view === "cockpit" || view === "runway" || view === "closer")
    picture = (
      <Cockpit
        episode={episode}
        time={time}
        sceneTime={sceneTime}
        shot={shot}
      />
    );
  else if (view === "map-whole" || view === "ireland")
    picture = (
      <AbsoluteFill style={{ background: "#152c40" }}>
        <PixelStage
          portrait
          background="#152c40"
          orthographic={view === "ireland"}
        >
          {view === "ireland" ? (
            <SceneryCamera view="ireland" progress={progress} />
          ) : (
            <StoryCamera mode="whole-map" />
          )}
          <UkLights scenery cold />
          {view === "ireland" ? (
            <IrelandAtlas progress={0.55 + progress * 0.45} time={time} />
          ) : (
            <WholeUkMap progress={ramp(time, events.vanished - 0.5, 1.65)} />
          )}
          <Particles time={time} mist />
        </PixelStage>
      </AbsoluteFill>
    );
  else if (view === "question" || view === "approach-dublin")
    picture = (
      <AbsoluteFill style={{ background: "#1a3346" }}>
        <PixelStage portrait background="#1a3346">
          <StoryCamera mode="sea" progress={progress} />
          <UkLights cold />
          <SeaFlight time={sceneTime} circle={view === "approach-dublin"} />
          <Particles time={time} mist />
        </PixelStage>
        <Dust time={time} cold />
      </AbsoluteFill>
    );
  else if (view === "fish" || view === "fish-detail")
    picture = (
      <Food
        time={time}
        sceneTime={sceneTime}
        detail={view === "fish-detail"}
        events={events}
      />
    );
  else if (view === "pints" || view === "pints-close")
    picture = (
      <Pub
        time={time}
        sceneTime={sceneTime}
        close={view === "pints-close"}
        stop={events.stopSip}
      />
    );
  else if (view === "screens" || view === "network")
    picture = (
      <Trading
        time={time}
        sceneTime={sceneTime}
        network={view === "network"}
        events={events}
      />
    );
  else if (view === "stadium" || view === "ball") {
    const cancelled = ramp(time, events.cancelled, 0.5);
    picture = (
      <AbsoluteFill style={{ background: "#233b50" }}>
        <PixelStage portrait background="#233b50">
          <StoryCamera
            mode={view === "ball" ? "ball" : "stadium"}
            progress={progress}
          />
          <UkLights cold />
          <Stadium
            time={sceneTime}
            cancel={cancelled}
            stopAt={events.cancelled - scene.start}
          />
          <Particles time={time} mist />
        </PixelStage>
        {view === "stadium" && (
          <div
            style={{
              transform: `translateY(${cancelled * 1200}px)`,
              opacity: 1 - cancelled,
            }}
          >
            <ArticulatedMiko
              x={115}
              y={660}
              width={325}
              time={sceneTime}
              right={hand([305, 460], [300, 350], ramp(sceneTime, 0.1, 0.45))}
              headTilt={-8}
              surprised={cancelled > 0}
            />
          </div>
        )}
        <div
          style={{
            position: "absolute",
            left: 230,
            top: view === "ball" ? 420 : 370,
            width: 620,
            height: 170,
            border: "17px solid #4b6371",
            background: "#142a37",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: cancelled > 0 ? "#c2786d" : "#b5c6ae",
            fontFamily: "DM Sans",
            fontWeight: 900,
            fontSize: 68,
            letterSpacing: 2,
            boxShadow: "0 12px 0 #162b39",
          }}
        >
          {cancelled > 0 ? "CANCELLED" : "0 : 0"}
        </div>
      </AbsoluteFill>
    );
  } else if (view === "dublin")
    picture = (
      <Cockpit
        episode={episode}
        time={time}
        shot={shot}
        sceneTime={sceneTime}
      />
    );
  else throw Error(`Unimplemented UK story shot ${view}`);
  const whip = shot.cut === "whip" ? (1 - smooth(local / 0.18)) * 115 : 0;
  return (
    <AbsoluteFill style={{ background: "#172f43", overflow: "hidden" }}>
      <AbsoluteFill
        key={`${shot.sceneId}:${view}`}
        style={{ transform: `translateX(${whip}px)` }}
      >
        {picture}
      </AbsoluteFill>
      <Transition shot={shot} local={local} />
      <AbsoluteFill
        style={{
          boxShadow: "inset 0 0 130px 10px #12283d35",
          pointerEvents: "none",
        }}
      />
    </AbsoluteFill>
  );
}
