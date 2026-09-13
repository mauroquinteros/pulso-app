import React from "react";
import { AbsoluteFill, CanvasImage, staticFile } from "remotion";
import { loadFont } from "@remotion/google-fonts/Manrope";

const { fontFamily } = loadFont("normal", {
  weights: ["500", "800"],
  subsets: ["latin"],
});

/**
 * The ground stays in the brand ink family the whole way down. It deliberately
 * never reaches the app's own background (#0A0E27, a navy): when it did, the
 * bottom edge of the device dissolved into the page.
 */
const INK_TOP = "#0A3A33";
const INK = "#04211E";
const ACCENT = "#00E5CC";

const CANVAS_WIDTH = 1320;
const SHOT_COUNT = 5;

/** The device sits centered, wide enough to dominate but not to crowd the edges. */
const DEVICE_WIDTH = 1050;
const BEZEL = 13;

type Props = {
  readonly capture: string;
  readonly headline: string;
  readonly accent: string;
  readonly subheadline: string;
  readonly index: number;
};

/**
 * One App Store screenshot: a raw simulator capture dropped into a drawn bezel,
 * with a headline above it on a branded ground. The capture is never scaled up -
 * it comes in at 1320x2868 and renders smaller.
 *
 * The glow behind it belongs to a single panorama 5 screenshots wide, of which
 * this frame shows one slice. Swiping the listing reads as one continuous image
 * rather than five unrelated cards, which is the whole reason `index` exists.
 */
export const StoreFrame: React.FC<Props> = ({
  capture,
  headline,
  accent,
  subheadline,
  index,
}) => {
  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(180deg, ${INK_TOP} 0%, ${INK} 100%)`,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 0,
          left: -index * CANVAS_WIDTH,
          width: CANVAS_WIDTH * SHOT_COUNT,
          height: "100%",
          background: `
            radial-gradient(ellipse 2600px 2000px at 22% -5%, rgba(0,229,204,0.20), transparent 62%),
            radial-gradient(ellipse 2400px 1800px at 58% 105%, rgba(0,229,204,0.13), transparent 60%),
            radial-gradient(ellipse 2000px 1600px at 88% 10%, rgba(0,229,204,0.16), transparent 58%)
          `,
        }}
      />

      <AbsoluteFill style={{ alignItems: "center", paddingTop: 130 }}>
        <h1
          style={{
            fontFamily,
            fontWeight: 800,
            fontSize: 92,
            lineHeight: 1.14,
            letterSpacing: "-0.03em",
            color: "#FFFFFF",
            textAlign: "center",
            whiteSpace: "pre-line",
            margin: 0,
            maxWidth: 1120,
          }}
        >
          {highlight(headline, accent)}
        </h1>

        <p
          style={{
            fontFamily,
            fontWeight: 500,
            fontSize: 38,
            lineHeight: 1.35,
            color: "rgba(255,255,255,0.62)",
            textAlign: "center",
            whiteSpace: "pre-line",
            margin: 0,
            marginTop: 30,
            maxWidth: 1120,
          }}
        >
          {subheadline}
        </p>

        <div
          style={{
            marginTop: 70,
            width: DEVICE_WIDTH + BEZEL * 2,
            background: "#1A1C24",
            borderRadius: 78,
            padding: BEZEL,
            boxShadow: "0 40px 90px rgba(0,0,0,0.5)",
          }}
        >
          <div style={{ borderRadius: 66, overflow: "hidden", display: "flex" }}>
            <CanvasImage
              src={staticFile(`captures/${capture}`)}
              style={{ width: DEVICE_WIDTH, height: "auto", display: "block" }}
            />
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/** Paints every occurrence of `accent` in the headline teal, leaving the rest white. */
const highlight = (text: string, accent: string) => {
  if (!accent) return text;

  return text.split(accent).map((part, i, parts) => (
    <React.Fragment key={i}>
      {part}
      {i < parts.length - 1 ? <span style={{ color: ACCENT }}>{accent}</span> : null}
    </React.Fragment>
  ));
};
