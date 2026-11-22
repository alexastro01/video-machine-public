import { Img, staticFile } from "remotion";
import { assetRoot, cues, ease, pulse } from "./timing";

function ChargeSlip({
  frame,
  start,
  second,
  opacity,
}: {
  frame: number;
  start: number;
  second?: boolean;
  opacity: number;
}) {
  if (frame < start || opacity <= 0) return null;
  const t = ease(frame, start, 15);
  const settle = pulse(frame, start + 6, 17);
  return (
    <div
      className="fr-slip"
      style={{
        left: second ? 614 : 427,
        top: second ? 977 : 848,
        opacity: opacity * Math.min(1, t * 3),
        transform: `translate(${(1 - t) * -77}px,${(1 - t) * -105 - settle * 9}px) rotate(${(second ? -4 : 6) + (1 - t) * -12}deg) scale(${0.82 + 0.18 * t})`,
      }}
    >
      <div className="fr-slip-head">
        <span>Card charge</span>
        <span>#{second ? "042" : "041"}</span>
      </div>
      <div className="fr-slip-main">
        <strong>$12.00</strong>
        <span className="fr-stamp">PAID</span>
      </div>
    </div>
  );
}

function CheckoutCursor({
  x,
  y,
  press,
  opacity,
}: {
  x: number;
  y: number;
  press: number;
  opacity: number;
}) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 54 65"
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: 55,
        height: 66,
        opacity,
        transform: `scale(${1 - 0.16 * press})`,
        transformOrigin: "5px 5px",
        filter: "drop-shadow(2px 4px 1px #16161650)",
      }}
    >
      <path
        d="m5 4 39 29-18 3 8 18-8 4-8-19-12 13Z"
        fill="#f3ebd6"
        stroke="#171918"
        strokeWidth="4"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Checkout({ frame }: { frame: number }) {
  const first = ease(frame, cues.chargeOne, 15);
  const reset = ease(frame, cues.reset, 13);
  const paid = ease(frame, cues.paid, 12);
  const zoomButton = ease(frame, cues.point - 5, 20);
  const salary = ease(frame, cues.salaryMove - 4, 34);
  const enter = ease(frame, 0, 21);
  const chargeStage = first * (1 - reset) + paid;
  const press =
    pulse(frame, cues.bugClick - 3, 9) + pulse(frame, cues.fixClick - 3, 9);
  const nowWidth = frame < cues.point ? 1 : ease(frame, cues.now - 2, 8);
  const cursorEntry = ease(frame, cues.bugClick - 34, 31);
  const reaim =
    1 -
    ease(frame, cues.bugClick + 17, 18) +
    ease(frame, cues.fixClick - 29, 25);
  const cardScale = 0.98 + 0.02 * enter + 0.055 * zoomButton - 0.38 * salary;
  const label =
    frame >= cues.chargeTwo && frame < cues.reset ? "$24.00" : "$12.00";
  const liftedButton = zoomButton * (1 - salary);
  const slipOpacity = (1 - ease(frame, cues.point, 18)) * (1 - salary);
  return (
    <>
      <div
        className="fr-checkout"
        style={{
          transform: `translate(${(1 - enter) * 21 - chargeStage * 44 - zoomButton * 8 + salary * 101}px,${(1 - enter) * 21 - chargeStage * 17 + salary * 4}px) rotate(${-3.3 + enter * 0.6 + chargeStage * 1.3 + zoomButton * 0.6 + salary * 3.8}deg) scale(${cardScale})`,
          transformOrigin: "48% 34%",
          opacity: 1 - salary,
        }}
      >
        <div className="fr-chrome">
          <span className="fr-chrome-dots">
            <i />
            <i />
            <i />
          </span>
          <span>Alex’s take-home</span>
          <span className="fr-window-mark">↗</span>
        </div>
        <div className="fr-product">
          <div className="fr-product-art">
            <Img
              src={staticFile(assetRoot + "/art/mug.webp")}
              style={{
                width: "82%",
                height: "85%",
                objectFit: "contain",
                transform: `translateY(${-4 * chargeStage}px) rotate(-5deg)`,
              }}
            />
          </div>
          <div className="fr-description">
            <div className="fr-item-title">
              Studio
              <br />
              mug
            </div>
            <div className="fr-item-price">$12.00</div>
            <div className="fr-quantity">
              Qty <span>1</span>
            </div>
          </div>
        </div>
        <div className="fr-purchase-row">
          <div className="fr-total">
            <span>{chargeStage > 0.5 ? "Charged" : "Order total"}</span>
            <b key={label}>{label}</b>
          </div>
          <div className="fr-buy-slot" style={{ opacity: liftedButton }} />
          <div
            className="fr-buy"
            style={{
              transform: `translate(${24 * liftedButton}px,${145 * liftedButton}px) scale(${1 - 0.045 * press + 0.31 * liftedButton})`,
              boxShadow:
                liftedButton > 0.1
                  ? "0 3px 0 #c6bfae,0 9px 16px #33251a32"
                  : undefined,
            }}
          >
            <span>Buy</span>
            <span
              style={{
                display: "inline-block",
                color: frame >= cues.now ? "#a5291f" : "inherit",
                overflow: "hidden",
                whiteSpace: "nowrap",
                width: nowWidth * 82,
              }}
            >
              {"\u00a0now"}
            </span>
            <span className="fr-buy-arrow">↗</span>
          </div>
        </div>
        <CheckoutCursor
          x={650 + 55 * (1 - cursorEntry) + 22 * (1 - reaim)}
          y={421 + 50 * (1 - cursorEntry) + 31 * (1 - reaim)}
          press={press}
          opacity={cursorEntry * (1 - zoomButton) * (1 - salary)}
        />
      </div>
      <ChargeSlip
        frame={frame}
        start={cues.chargeOne}
        opacity={(1 - reset) * slipOpacity}
      />
      <ChargeSlip
        frame={frame}
        start={cues.chargeTwo}
        second
        opacity={(1 - reset) * slipOpacity}
      />
      <ChargeSlip frame={frame} start={cues.paid} opacity={slipOpacity} />
    </>
  );
}
