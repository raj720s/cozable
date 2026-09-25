import {
  FontStyle,
  PaintStyle,
  Skia,
  type SkCanvas,
  type SkImage,
} from '@shopify/react-native-skia';
import type { ClassificationResult } from './classifyFrame';

export type SkiaRenderState = {
  frameTexture: SkImage;
  canvas: SkCanvas;
};

export type SkiaFrameRender = (
  onDraw: (state: SkiaRenderState) => void,
) => void;

const strokePaint = Skia.Paint();
strokePaint.setColor(Skia.Color('#42d77d'));
strokePaint.setStyle(PaintStyle.Stroke);
strokePaint.setStrokeWidth(4);
strokePaint.setAntiAlias(true);

const fillPaint = Skia.Paint();
fillPaint.setColor(Skia.Color('rgba(7, 17, 13, 0.72)'));
fillPaint.setStyle(PaintStyle.Fill);
fillPaint.setAntiAlias(true);

const textPaint = Skia.Paint();
textPaint.setColor(Skia.Color('#FFFFFF'));
textPaint.setAntiAlias(true);

const typeface = Skia.FontMgr.System().matchFamilyStyle(
  'sans-serif',
  FontStyle.Bold,
);
const titleFont = typeface != null ? Skia.Font(typeface, 20) : null;
const metaFont = typeface != null ? Skia.Font(typeface, 13) : null;

function drawClassificationHud(
  canvas: SkCanvas,
  textureWidth: number,
  textureHeight: number,
  prediction: ClassificationResult | null,
): void {
  'worklet';
  const box = prediction?.box ?? { x: 0.22, y: 0.22, width: 0.56, height: 0.56 };
  const x = box.x * textureWidth;
  const y = box.y * textureHeight;
  const w = box.width * textureWidth;
  const h = box.height * textureHeight;

  canvas.drawRect(Skia.XYWHRect(x, y, w, h), strokePaint);

  const label = prediction != null && prediction.index >= 0 ? prediction.label : 'scanning…';
  const scoreText =
    prediction != null && prediction.index >= 0
      ? `${(prediction.score * 100).toFixed(0)}%`
      : '';
  const lockedTag = prediction?.locked ? ' · LOCKED' : '';
  const hud =
    scoreText.length > 0 ? `${label}  ·  ${scoreText}${lockedTag}` : label;

  const pad = 12;
  const boxH = 40;
  const labelY = Math.max(pad, y - boxH - 8);
  const boxW = Math.min(textureWidth - pad * 2, Math.max(200, hud.length * 10));
  const labelX = Math.max(pad, Math.min(x, textureWidth - boxW - pad));

  canvas.drawRect(Skia.XYWHRect(labelX, labelY, boxW, boxH), fillPaint);

  if (titleFont != null) {
    canvas.drawText(hud, labelX + 10, labelY + 26, textPaint, titleFont);
  }

  if (metaFont != null) {
    canvas.drawText(
      prediction?.locked ? 'result locked ≥50%' : 'best-of-5 crops · not a detector',
      labelX + 10,
      Math.min(textureHeight - 14, y + h + 20),
      textPaint,
      metaFont,
    );
  }
}

/**
 * Draw camera texture + tracking box. Does not dispose the Frame —
 * caller must dispose after optionally copying pixels for async ML.
 */
export function renderClassifierFrame(
  render: SkiaFrameRender,
  prediction: ClassificationResult | null,
): void {
  'worklet';
  render(({ canvas, frameTexture }) => {
    canvas.drawImage(frameTexture, 0, 0);
    drawClassificationHud(
      canvas,
      frameTexture.width(),
      frameTexture.height(),
      prediction,
    );
  });
}
