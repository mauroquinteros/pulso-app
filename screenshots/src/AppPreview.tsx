import React from "react";
import { AbsoluteFill, Sequence, staticFile } from "remotion";
import { BACKGROUND, FPS, OUTRO_FRAMES, Outro, Scene } from "./Promo";

/**
 * Cuts of public/preview/recording.mov, in seconds of the source. The recording
 * runs 80s of tour and Apple caps a preview at 30s, outro included, so each scene
 * keeps one screen.
 */
const SCENES = [
  { from: 29, to: 34, title: "Todo tu portafolio\nen una pantalla", accent: "portafolio" },
  { from: 44.5, to: 51.5, title: "El detalle de\ncada acción", accent: "detalle" },
  { from: 57, to: 63.5, title: "Cómo está repartido\ntu dinero", accent: "repartido" },
  { from: 86.5, to: 92.5, title: "Tu historial\ncompleto", accent: "historial" },
].map(({ from, to, ...scene }) => ({
  ...scene,
  trimBefore: Math.round(from * FPS),
  frames: Math.round((to - from) * FPS),
}));

const SCENES_FRAMES = SCENES.reduce((total, scene) => total + scene.frames, 0);

export const PREVIEW_FRAMES = SCENES_FRAMES + OUTRO_FRAMES;

/** 886x1920, the App Store preview size for every iPhone from 6.1" to 6.9". */
export const AppPreview: React.FC = () => {
  let start = 0;
  return (
    <AbsoluteFill style={{ background: BACKGROUND }}>
      {SCENES.map((scene) => {
        const from = start;
        start += scene.frames;
        return (
          <Sequence key={scene.trimBefore} from={from} durationInFrames={scene.frames} layout="absolute-fill">
            <Scene src={staticFile("preview/recording.mov")} {...scene} />
          </Sequence>
        );
      })}
      <Sequence from={SCENES_FRAMES} durationInFrames={OUTRO_FRAMES} layout="absolute-fill">
        <Outro />
      </Sequence>
    </AbsoluteFill>
  );
};
