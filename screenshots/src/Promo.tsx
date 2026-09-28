import React from "react";
import {
  AbsoluteFill,
  Easing,
  Sequence,
  interpolate,
  staticFile,
  useCurrentFrame,
} from "remotion";
import { Video } from "@remotion/media";
import { loadFont } from "@remotion/google-fonts/Manrope";

const { fontFamily } = loadFont("normal", {
  weights: ["500", "800"],
  subsets: ["latin"],
});

const INK_TOP = "#0A3A33";
const INK = "#04211E";
export const BACKGROUND = `linear-gradient(180deg, ${INK_TOP} 0%, ${INK} 100%)`;
const ACCENT = "#00E5CC";

export const FPS = 30;
/** Each clip is cut longer than this; the tail is trimmed rather than recut. */
export const SCENE_FRAMES = 4.5 * FPS;
export const OUTRO_FRAMES = 3 * FPS;

const SCENES = [
  { clip: "1-inicio.mp4", title: "Todo tu portafolio\nen una pantalla", accent: "portafolio" },
  { clip: "2-portafolio.mp4", title: "Cómo está repartido\ntu dinero", accent: "repartido" },
  { clip: "3-detalle.mp4", title: "El detalle de\ncada acción", accent: "detalle" },
  { clip: "4-movimientos.mp4", title: "Tu historial\ncompleto", accent: "historial" },
  { clip: "5-nuevo.mp4", title: "Compras, ventas,\ndividendos y efectivo", accent: "dividendos" },
];

export const PROMO_FRAMES = SCENES.length * SCENE_FRAMES + OUTRO_FRAMES;

/** 1080x1920 vertical, which is what WhatsApp plays back without letterboxing. */
export const Promo: React.FC = () => {
  return (
    <AbsoluteFill style={{ background: BACKGROUND }}>
      {SCENES.map((scene, i) => (
        <Sequence
          key={scene.clip}
          from={i * SCENE_FRAMES}
          durationInFrames={SCENE_FRAMES}
          layout="absolute-fill"
        >
          <Scene
            src={staticFile(`clips/${scene.clip}`)}
            frames={SCENE_FRAMES}
            title={scene.title}
            accent={scene.accent}
          />
        </Sequence>
      ))}
      <Sequence from={SCENES.length * SCENE_FRAMES} durationInFrames={OUTRO_FRAMES} layout="absolute-fill">
        <Outro />
      </Sequence>
    </AbsoluteFill>
  );
};

const DEVICE_WIDTH = 600;
const BEZEL = 8;

/** `trimBefore` is where the scene starts in `src`, in frames; `frames` is how long it runs. */
export const Scene: React.FC<{
  src: string;
  trimBefore?: number;
  frames: number;
  title: string;
  accent: string;
}> = ({ src, trimBefore = 0, frames, title, accent }) => {
  const frame = useCurrentFrame();

  return (
    <AbsoluteFill style={{ alignItems: "center", paddingTop: 120 }}>
      <h1
        style={{
          fontFamily,
          fontWeight: 800,
          fontSize: 58,
          lineHeight: 1.16,
          letterSpacing: "-0.03em",
          color: "#FFFFFF",
          textAlign: "center",
          whiteSpace: "pre-line",
          margin: 0,
          opacity: interpolate(
            frame,
            [0, 12, frames - 12, frames],
            [0, 1, 1, 0],
            { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
          ),
          translate: interpolate(frame, [0, 18], ["0px 26px", "0px 0px"], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.bezier(0.16, 1, 0.3, 1),
          }),
        }}
      >
        {highlight(title, accent)}
      </h1>

      <div
        style={{
          marginTop: 70,
          width: DEVICE_WIDTH + BEZEL * 2,
          background: "#1A1C24",
          borderRadius: 48,
          padding: BEZEL,
          boxShadow: "0 30px 70px rgba(0,0,0,0.5)",
        }}
      >
        <div style={{ borderRadius: 40, overflow: "hidden", display: "flex" }}>
          <Video
            src={src}
            trimBefore={trimBefore}
            trimAfter={trimBefore + frames}
            style={{ width: DEVICE_WIDTH, height: "auto", display: "block" }}
          />
        </div>
      </div>
    </AbsoluteFill>
  );
};

/**
 * Latido, the brand mark: one asymmetric beat between two flatlines, ink on a
 * teal disc. Geometry copied verbatim from assets/brand/README.md - the mark has
 * exactly one construction and this is it.
 */
export const Outro: React.FC = () => {
  const frame = useCurrentFrame();
  const appear = interpolate(frame, [0, 20], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });

  return (
    <AbsoluteFill
      style={{ alignItems: "center", justifyContent: "center", opacity: appear }}
    >
      {/* Gap is the width of the letter "o" at this size, per assets/brand/README.md. */}
      <div style={{ display: "flex", alignItems: "center", gap: 74 }}>
        <svg width={160} height={160} viewBox="0 0 100 100">
          <circle cx={50} cy={50} r={50} fill={ACCENT} />
          <path
            d="M10 50 H30 L41 26 L55 70 L63 50 H90"
            stroke={INK}
            strokeWidth={10}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </svg>
        <span
          style={{
            fontFamily,
            fontWeight: 800,
            fontSize: 128,
            letterSpacing: "-0.03em",
            color: "#FFFFFF",
          }}
        >
          pulso
        </span>
      </div>

      <p
        style={{
          fontFamily,
          fontWeight: 500,
          fontSize: 46,
          color: "rgba(255,255,255,0.62)",
          marginTop: 56,
        }}
      >
        Seguí tus inversiones sin planillas
      </p>
    </AbsoluteFill>
  );
};

/** Paints every occurrence of `accent` teal, leaving the rest white. */
const highlight = (text: string, accent: string) => {
  if (!accent) return text;

  return text.split(accent).map((part, i, parts) => (
    <React.Fragment key={i}>
      {part}
      {i < parts.length - 1 ? <span style={{ color: ACCENT }}>{accent}</span> : null}
    </React.Fragment>
  ));
};
