import type { CSSProperties } from "react";
import { Img, staticFile } from "remotion";
import plan from "../../episodes/human-in-the-loop/plan.json";
import { LavaBackground } from "./LavaBackground";
import { e, enter, headlineAt, mix, profileLayout } from "./motion";

export const art = (name: string) =>
  staticFile(`episodes/human-in-the-loop/art/${name}.png`);
const ui = plan.ui;
const paths = {
  pencil:
    "m12.4 5.6 6 6M4.5 19.5l4.7-1 11-11a1.8 1.8 0 0 0 0-2.6l-1.1-1.1a1.8 1.8 0 0 0-2.6 0l-11 11-1 4.7Z",
  search:
    "M16.25 16.25 21 21M18.2 10.8a7.4 7.4 0 1 1-14.8 0 7.4 7.4 0 1 1 14.8 0Z",
  bell: "M5 16.2c1.8-2 1.9-4.6 1.9-7.2a5.1 5.1 0 0 1 10.2 0c0 2.7.1 5.2 1.9 7.2l.7 1.2H4.3l.7-1.2ZM9.5 20c.7 1.4 4.3 1.4 5 0",
  check: "m4.9 12.3 4.5 4.4 9.9-10",
} as const;
export function Icon({
  name,
  size = 32,
}: {
  name: keyof typeof paths;
  size?: number;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.65"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={paths[name]} />
    </svg>
  );
}
function Cover({
  height,
  top,
}: {
  height: number;
  top: number;
}) {
  return (
    <div className="hl-cover" style={{ height, top }}>
      <LavaBackground className="hl-cover-texture" />
      <svg
        width="100%"
        height="100%"
        style={{ position: "absolute", inset: 0 }}
        viewBox="0 0 1000 300"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <g fill="none" stroke="#777b7d" strokeWidth="1.5">
          {Array.from({ length: 31 }, (_, i) => (
            <path
              key={i}
              opacity={0.22 + i * 0.009}
              d={`M${170 + i * 9} -40 C${572 + i * 6} ${-35 + i * 2},${424 + i * 8} ${268 - i * 2},${850 + i * 9} 364`}
            />
          ))}
        </g>
      </svg>
    </div>
  );
}
export function Profile({ frame }: { frame: number }) {
  const l = profileLayout(frame);
  const title = headlineAt(frame);
  const surface = l.nav + l.cover;
  const full = 1 - l.settle;
  const unread =
    enter(frame, e.notification, 8) * (1 - enter(frame, e.board - 7, 9));
  const avatarTop = surface - l.avatar * 0.43;
  return (
    <div
      className="hl-profile"
      style={{
        left: l.x,
        top: l.y,
        width: l.w,
        height: l.h,
        borderRadius: 28 * l.settle,
        borderWidth: 2 * l.settle,
      }}
    >
      <div
        className="hl-nav"
        style={{
          height: l.nav,
          paddingLeft: mix(50, 36, l.settle),
          paddingRight: mix(52, 37, l.settle),
        }}
      >
        <div className="hl-brand" aria-label={ui.network}>
          <span>Linked</span>
          <b>in</b>
        </div>
        <div className="hl-navicons">
          <Icon name="search" size={34} />
          <div className="hl-navline" />
          <span className="hl-bell">
            <Icon name="bell" size={35} />
            <i style={{ opacity: unread }} />
          </span>
        </div>
      </div>
      <Cover height={l.cover} top={l.nav} />
      <div
        className="hl-avatar"
        style={{
          left: mix(53, 40, l.settle),
          top: avatarTop,
          width: l.avatar,
          height: l.avatar,
        }}
      >
        <Img src={art("alex-avatar")} />
      </div>
      <div
        className="hl-name"
        style={{
          left: mix(267, 181, l.settle),
          top: surface + mix(33, 13, l.settle),
          fontSize: mix(63, 43, l.settle),
        }}
      >
        {ui.name}
      </div>
      <span
        className="hl-edit"
        style={{
          top: surface + mix(39, 18, l.settle),
          right: mix(60, 42, l.settle),
        }}
      >
        <Icon name="pencil" size={31} />
      </span>
      <div
        className="hl-field"
        style={{
          left: mix(57, 40, l.settle),
          right: mix(57, 40, l.settle),
          top: l.fieldY,
        }}
      >
        <div className="hl-label" style={{ fontSize: mix(33, 25, l.settle) }}>
          {ui.headlineLabel}
        </div>
        <div
          className="hl-title"
          style={{ fontSize: l.titleSize, marginTop: mix(13, 7, l.settle) }}
        >
          <span
            style={{
              color: title.strike
                ? `rgb(${Math.round(242 - title.strike * 62)},${Math.round(242 - title.strike * 62)},${Math.round(239 - title.strike * 59)})`
                : undefined,
            }}
          >
            {title.text}
            <span
              className="hl-strike"
              style={{ transform: `rotate(-1.1deg) scaleX(${title.strike})` }}
            />
          </span>
          {title.caret && <i className="hl-caret" />}
        </div>
        <div className="hl-fieldline" style={{ opacity: 0.56 + 0.22 * full }} />
      </div>
    </div>
  );
}
function Notification({ frame }: { frame: number }) {
  const l = profileLayout(frame);
  const show =
    enter(frame, e.notification, 13) * (1 - enter(frame, e.board - 12, 12));
  if (show <= 0) return null;
  const [name, body] = ui.notification.split(" viewed ");
  return (
    <div
      className="hl-toast hl-surface"
      style={{
        left: mix(53, 80, l.settle),
        right: mix(53, 80, l.settle),
        top: l.companionY,
        opacity: show,
        transform: `translateY(${(1 - show) * 25}px) scale(${0.979 + show * 0.021})`,
      }}
    >
      <div className="hl-notice-avatar">
        <Img src={art("opus-avatar")} />
      </div>
      <div className="hl-notice-text">
        <div className="hl-notice-meta">
          <span>Notifications</span>
          <span>now</span>
        </div>
        <div className="hl-notice-body">
          <b>{name}</b> viewed {body}
        </div>
      </div>
    </div>
  );
}
function Board({ frame }: { frame: number }) {
  const start = enter(frame, e.board - 7, 15);
  const fold = enter(frame, e.prompt - 12, 34);
  const diff =
    enter(frame, e.diff - 3, 9) *
    (1 - enter(frame, e.strikeSupervisor + 15, 10));
  const visible = start * (1 - enter(frame, e.queue - 5, 14)) * (1 - diff);
  if (visible <= 0) return null;
  const done = ui.issues.filter((_, i) => frame >= e.done + i * 6 + 3).length;
  return (
    <div
      className="hl-board hl-surface"
      style={{
        top: 570,
        opacity: visible,
        height: mix(207, 87, fold),
        transform: `translateY(${(1 - start) * 23}px)`,
      }}
    >
      <div className="hl-board-head">
        <svg width="38" height="38" viewBox="0 0 32 32" aria-hidden="true">
          <path fill="#83b4fd" d="M16 1 31 16 16 31 1 16Z" />
          <path fill="#202d42" d="m16 10 6 6-6 6-6-6Z" />
          <path fill="#4676b5" d="M16 1 8 9l5 5 3-4 6 6 4-5Z" />
        </svg>
        <b>{ui.board}</b>
        <i>/</i>
        <span>{ui.sprint}</span>
        <div
          className="hl-board-count"
          style={{ color: done === 3 ? "#a5dfb7" : undefined }}
        >
          {done}
          <span> / 3</span>
        </div>
      </div>
      <div className="hl-issues" style={{ opacity: 1 - fold }}>
        {ui.issues.map((issue, i) => {
          const p = enter(frame, e.done + i * 6, 9);
          return (
            <div
              key={issue.key}
              className="hl-issue"
              style={
                {
                  "--done": p,
                  transform: `perspective(700px) rotateX(${Math.sin(p * Math.PI) * -24}deg)`,
                } as CSSProperties
              }
            >
              <div className="hl-issue-top">
                <span>{issue.key}</span>
                <div className="hl-status" style={{ opacity: 0.55 + 0.45 * p }}>
                  {p > 0.28 ? <Icon name="check" size={23} /> : <i />}
                </div>
              </div>
              <b>{issue.text}</b>
            </div>
          );
        })}
      </div>
    </div>
  );
}
function Diff({ frame }: { frame: number }) {
  const open = enter(frame, e.diff - 3, 9),
    close = enter(frame, e.strikeSupervisor + 15, 10),
    opacity = open * (1 - close);
  if (opacity <= 0) return null;
  return (
    <div
      className="hl-diff hl-surface"
      style={{
        opacity,
        transform: `translateY(${(1 - open) * 17 - close * 7}px) scale(${0.965 + 0.035 * open})`,
      }}
    >
      <Img
        src={art("review-loop-diff")}
        style={{
          display: "block",
          width: "100%",
          height: "auto",
          marginTop: "-18.6%",
        }}
      />
    </div>
  );
}
export function WorkCards({ frame }: { frame: number }) {
  return (
    <>
      <Notification frame={frame} />
      <Board frame={frame} />
      <Diff frame={frame} />
    </>
  );
}
