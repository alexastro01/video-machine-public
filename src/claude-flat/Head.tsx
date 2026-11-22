import { between } from "./art";
import type { Rig } from "./rig";
const line = "#251e24",
  skin = "#f4b17f",
  tint = "#db9068";
const hair =
  "M276 318Q249 300 251 267L232 292Q229 272 234 249L217 267Q221 237 236 215L211 232Q210 201 231 177L206 185Q219 164 246 151L224 158Q238 135 270 118L241 122Q255 103 290 92L269 85Q296 74 318 72L286 66Q322 50 354 48L330 45Q351 30 393 37L387 25Q419 24 444 42Q456 33 455 13Q481 21 487 46L491 21Q512 33 519 65L526 43Q543 61 536 90L562 70Q568 96 545 114Q565 112 580 134L554 136Q574 150 568 173L551 162Q559 183 545 204L528 192Q520 158 491 122Q473 117 453 137Q431 147 407 138Q375 147 356 191L353 155Q331 172 329 204Q318 241 341 294L353 323L337 348L356 367L346 378L361 407Q335 402 322 378L324 395Q298 385 298 357Z";
const locks = [
  [
    "M220 177Q258 145 299 143Q339 139 374 108Q343 153 293 160Q254 163 220 177Z",
    "#764834",
  ],
  [
    "M245 125Q279 100 323 98Q365 93 389 71Q376 108 329 118Q276 124 245 125Z",
    "#8c5638",
  ],
  [
    "M286 88Q322 68 366 67Q397 65 420 50Q399 79 362 86Q329 89 303 98Z",
    "#805039",
  ],
  [
    "M338 45Q374 34 404 51Q431 62 442 93Q417 64 394 62Q372 55 352 59Z",
    "#925d40",
  ],
  ["M398 31Q429 30 450 56Q463 75 460 104Q452 74 431 57Z", "#9e6644"],
  [
    "M460 22Q485 37 481 69Q479 86 468 110Q471 79 463 62Q477 60 460 22Z",
    "#87563a",
  ],
  ["M500 38Q524 58 512 87Q506 103 485 119Q504 91 502 64Z", "#754631"],
  ["M528 81Q539 82 554 76Q550 100 521 115L500 121Q521 107 528 81Z", "#855038"],
  [
    "M226 218Q253 187 280 181Q321 175 345 147Q334 182 303 199Q270 209 247 232L239 244Z",
    "#62402f",
  ],
  [
    "M241 258Q261 227 294 217Q310 212 322 195Q314 232 285 247Q260 260 254 280Z",
    "#53372d",
  ],
  [
    "M276 146Q318 144 351 119M317 97Q354 98 377 81M400 46Q430 48 443 73M470 33Q480 49 476 67",
    "#b07750",
  ],
] as const;
function Eye({
  x,
  y,
  far,
  gazeX,
  gazeY,
  open,
}: {
  x: number;
  y: number;
  far: boolean;
  gazeX: number;
  gazeY: number;
  open: number;
}) {
  const w = far ? 51 : 67,
    h = far ? 34 : 38;
  const top =
    "M" +
    -w * 0.52 +
    " 6Q" +
    -w * 0.07 +
    " " +
    -h * 0.85 +
    " " +
    w * 0.48 +
    " " +
    -h * 0.42;
  const shape =
    top +
    "Q" +
    w * 0.62 +
    " " +
    h * 0.29 +
    " " +
    w * 0.13 +
    " " +
    h * 0.48 +
    "Q" +
    -w * 0.29 +
    " " +
    h * 0.57 +
    " " +
    -w * 0.52 +
    " 6Z";
  const id = far ? "alexFarEye" : "alexNearEye";
  return (
    <g transform={"translate(" + x + " " + y + ") rotate(-9)"}>
      <path
        d={
          "M" +
          -w * 0.51 +
          " 1Q0 " +
          -h * 0.99 +
          " " +
          w * 0.49 +
          " " +
          -h * 0.59
        }
        stroke="#c78463"
        fill="none"
        strokeWidth="4"
      />
      <g transform={"scale(1 " + open + ")"}>
        <defs>
          <clipPath id={id}>
            <path d={shape} />
          </clipPath>
        </defs>
        <path d={shape} fill="#fff7eb" stroke={line} strokeWidth="3.4" />
        <g clipPath={"url(#" + id + ")"}>
          <path d={shape} transform="translate(0 -11)" fill="#e1d6cf" />
          <g transform={"translate(" + (7 + gazeX) + " " + (-3 + gazeY) + ")"}>
            <ellipse rx={far ? 16 : 19} ry={far ? 22 : 25} fill="#442e29" />
            <path
              d={
                far
                  ? "M-15 6Q0 17 15 3Q10 25-3 23Q-12 22-15 6"
                  : "M-18 7Q1 17 17 3Q13 27-4 26Q-15 24-18 7"
              }
              fill="#a36d43"
            />
            <ellipse cy="-2" rx={far ? 8 : 10} ry="16" fill="#241e20" />
            <ellipse cx="-5" cy="-10" rx="5" ry="6" fill="#fffaf2" />
            <circle cx="7" cy="8" r="2.7" fill="#fff5da" />
          </g>
        </g>
        <path
          d={top}
          stroke={line}
          strokeWidth="7.8"
          fill="none"
          strokeLinecap="round"
        />
      </g>
      {open < 0.24 && (
        <path
          d={"M" + -w * 0.5 + " 5Q0 1 " + w * 0.47 + " -7"}
          stroke={line}
          strokeWidth="5.5"
          fill="none"
          strokeLinecap="round"
        />
      )}
    </g>
  );
}
export function Head({
  rig,
  f,
  blink,
}: {
  rig: Rig;
  f: number;
  blink: number;
}) {
  const mood = rig.mood,
    panic = mood === "startled",
    tired = mood === "tired",
    happy = mood === "happy",
    focused = mood === "focused",
    doubt = mood === "doubt" || mood === "thinking";
  const eyeOpen = Math.max(
    0.065,
    (1 - blink) *
      (panic ? 1.22 : tired ? 0.3 : happy ? 0.76 : focused ? 0.84 : 1),
  );
  const head = rig.head,
    brow = panic ? -16 : tired ? 15 : focused ? 7 : 0;
  const hairLag = Math.sin(f * 0.092) * 0.35 + rig.strain * 17;
  return (
    <g
      transform={"rotate(" + head + " 421 409)"}
      strokeLinejoin="round"
      strokeLinecap="round"
    >
      <path
        d="M312 285Q285 344 318 392L326 379L346 411L358 383L371 392L386 356Z"
        fill="#3a2927"
        stroke={line}
        strokeWidth="5"
      />
      <path
        d="M326 194Q341 149 397 123Q452 86 494 110Q528 123 544 170Q551 192 550 215Q550 244 557 259Q569 278 566 300Q568 334 554 356Q542 389 527 409Q506 430 476 425Q411 417 369 385Q347 368 337 351Q311 373 287 351Q263 331 272 301Q279 279 299 278Q316 275 333 291Q316 249 326 194Z"
        fill={skin}
        stroke={line}
        strokeWidth="6"
      />
      <path
        d="M333 200Q349 150 399 136Q439 122 457 132Q413 139 381 164Q351 188 340 223Z"
        fill="#d78d62"
      />
      <path
        d="M301 286Q282 286 280 307Q277 323 291 336Q302 345 312 340Q303 334 298 322Q298 310 312 309Q316 319 325 324Q318 298 301 286Z"
        fill={tint}
      />
      <path
        d="M285 309q4-17 18-13q11 4 14 14m-15 5q-12 10-2 17"
        fill="none"
        stroke="#a5674d"
        strokeWidth="3.5"
      />
      <path
        d="M338 340Q357 369 377 379Q421 404 463 410Q504 416 532 398Q520 423 492 425Q432 421 386 395Q353 375 338 350Z"
        fill="#d49069"
      />
      <path
        d="M493 227Q491 248 502 264L517 280Q515 290 499 297"
        fill="none"
        stroke="#9b604c"
        strokeWidth="3.8"
      />
      <path d="M496 276l14 7-14 12-18 4q9-6 18-8Z" fill="#d8946b" />
      <path
        d="M481 298q6-6 10-4m8 3q7-1 11-6"
        fill="none"
        stroke="#9c624f"
        strokeWidth="3"
      />
      <Eye
        x={408}
        y={253}
        far={false}
        gazeX={rig.gazeX}
        gazeY={rig.gazeY}
        open={eyeOpen}
      />
      <Eye
        x={518}
        y={228}
        far
        gazeX={rig.gazeX * 0.7}
        gazeY={rig.gazeY * 0.78}
        open={eyeOpen}
      />
      <g fill="#372820" stroke={line} strokeWidth="3">
        <path
          transform={
            "translate(0 " +
            (brow + (doubt ? -8 : 0)) +
            ") rotate(" +
            (focused ? 10 : panic ? -11 : doubt ? -5 : 0) +
            " 407 219)"
          }
          d="M348 237Q354 222 372 215Q418 210 445 190L447 205Q428 222 397 225Q368 228 348 244Z"
        />
        <path
          transform={
            "translate(0 " +
            (brow + (doubt ? 5 : 0)) +
            ") rotate(" +
            (focused ? -8 : panic ? 9 : doubt ? 6 : 0) +
            " 515 181)"
          }
          d="M483 183Q501 167 520 164Q533 164 543 177L541 186Q530 177 521 180L484 198Z"
        />
      </g>
      {panic ? (
        <g>
          <path
            d="M459 349Q469 319 491 316Q509 313 511 337Q511 365 490 375Q466 385 459 365Z"
            fill="#512a2b"
            stroke={line}
            strokeWidth="4"
          />
          <path d="M470 368q15-14 30-10q-10 20-30 10" fill="#d27466" />
        </g>
      ) : happy || mood === "bright" ? (
        <g>
          <path
            d="M444 341Q466 325 501 319L530 314Q522 351 499 363Q466 378 444 345Z"
            fill="#552c2d"
            stroke={line}
            strokeWidth="4.4"
          />
          <path d="M449 341q33-18 73-22l-4 10-61 16z" fill="#fff3da" />
          <path d="M464 357q23-12 40-7q-17 17-40 7Z" fill="#d27865" />
        </g>
      ) : (
        <g>
          <path
            d={
              tired
                ? "M451 356q27-21 55-10"
                : focused
                  ? "M457 346q25 2 49-11"
                  : "M452 347q20 5 34-2l24-10"
            }
            stroke={line}
            strokeWidth="4.5"
            fill="none"
          />
          <path
            d="M476 364q14 1 23-6"
            stroke="#c47f61"
            strokeWidth="3"
            fill="none"
          />
        </g>
      )}
      {[0, 1, 2].map((row) =>
        Array.from({ length: 15 }, (_, i) => {
          const x = 351 + i * 12.2 + row * 2;
          const y = 354 + Math.sin((i / 14) * Math.PI * 0.79) * 43 + row * 5;
          return (
            <path
              key={row + "-" + i}
              d={"M" + x + " " + y + "l-2 4"}
              stroke="#ad775b"
              opacity={0.48 - (i % 3) * 0.045}
              strokeWidth="2.1"
            />
          );
        }),
      )}
      <g transform={"rotate(" + hairLag + " 395 239)"}>
        <path d={hair} stroke={line} strokeWidth="6" fill="#493129" />
        {locks.map(([d, col], i) => (
          <path
            key={d}
            d={d}
            fill={i === locks.length - 1 ? "none" : col}
            stroke={i === locks.length - 1 ? col : "none"}
            strokeWidth="2.8"
          />
        ))}
        <path
          d="M233 174q35-27 67-25m-29-42q42-27 83-26m-18-22q29-11 53 0m60 66q3-26-14-48m19 47q27-33 25-60m-176 91q27-6 50-25"
          fill="none"
          stroke="#392923"
          strokeWidth="4"
        />
      </g>
      {panic && (
        <g transform={"translate(0 " + 5 * Math.sin(f * 0.22) + ")"}>
          <path
            d="M569 179q9 9 9 16q-1 8-8 7q-8-2-5-10Z"
            fill="#a1c5dc"
            stroke="#47516b"
            strokeWidth="2.8"
          />
        </g>
      )}
    </g>
  );
}
export function eyelid(f: number) {
  let best = 0;
  for (const s of [
    106, 287, 463, 654, 824, 1066, 1334, 1457, 1734, 1897, 2119, 2351, 2517,
    2650,
  ]) {
    const d = f - s;
    if (d < 0 || d > 8) continue;
    best = Math.max(best, d < 3 ? d / 3 : d < 5 ? 1 : 1 - (d - 5) / 3);
  }
  return between(best, 0, 1);
}
