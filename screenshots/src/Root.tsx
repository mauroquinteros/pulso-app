import "./index.css";
import { Composition, Still } from "remotion";
import { StoreFrame } from "./StoreFrame";
import { FPS, PROMO_FRAMES, Promo } from "./Promo";
import { AppPreview, PREVIEW_FRAMES } from "./AppPreview";

/**
 * One <Still> per App Store screenshot. 1320x2868 is the iPhone 6.9" slot, which
 * is the only iPhone size Apple requires - and exactly what the iPhone 17 Pro Max
 * simulator captures.
 *
 * Order is the order they appear in the listing, and App Store search results show
 * only the first three - so those three carry the pitch on their own. `index` must
 * match that order: it is the slice each frame takes of the shared background
 * panorama, so reordering the listing means reordering these numbers too.
 *
 * defaultProps are inline literals on purpose: that is what lets Remotion Studio
 * write headline edits back into this file.
 */
export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Still
        id="inicio"
        component={StoreFrame}
        width={1320}
        height={2868}
        defaultProps={{
          capture: "01-inicio.png",
          headline: "Tu portafolio,\nde un vistazo",
          accent: "portafolio",
          subheadline: "Valor total, efectivo y rendimiento juntos",
          index: 0,
        }}
      />
      <Still
        id="portafolio"
        component={StoreFrame}
        width={1320}
        height={2868}
        defaultProps={{
          capture: "02-portafolio.png",
          headline: "Cómo está repartido\ntu dinero",
          accent: "repartido",
          subheadline: "Cuánto pesa cada posición en tu cartera",
          index: 1,
        }}
      />
      <Still
        id="detalle"
        component={StoreFrame}
        width={1320}
        height={2868}
        defaultProps={{
          capture: "03-detalle.png",
          headline: "El detalle de\ncada posición",
          accent: "detalle",
          subheadline: "Costo promedio, valor de mercado y retorno",
          index: 2,
        }}
      />
      <Still
        id="movimientos"
        component={StoreFrame}
        width={1320}
        height={2868}
        defaultProps={{
          capture: "04-movimientos.png",
          headline: "Cada movimiento\nqueda registrado",
          accent: "movimiento",
          subheadline: "Tu historial completo, filtrable por tipo",
          index: 3,
        }}
      />
      <Still
        id="nuevo"
        component={StoreFrame}
        width={1320}
        height={2868}
        defaultProps={{
          capture: "05-nuevo.png",
          headline: "Compras, ventas,\ndividendos y efectivo",
          accent: "dividendos",
          subheadline: "Cada tipo con su formulario, sin campos de más",
          index: 4,
        }}
      />

      {/* The WhatsApp promo. 1080x1920 is what WhatsApp plays without letterboxing,
          and the duration is derived from the scene count so the two cannot drift. */}
      <Composition
        id="promo"
        component={Promo}
        width={1080}
        height={1920}
        fps={FPS}
        durationInFrames={PROMO_FRAMES}
      />

      {/* The App Store app preview: the promo's framing over a cut of a simulator recording. */}
      <Composition
        id="preview"
        component={AppPreview}
        width={886}
        height={1920}
        fps={FPS}
        durationInFrames={PREVIEW_FRAMES}
      />
    </>
  );
};
