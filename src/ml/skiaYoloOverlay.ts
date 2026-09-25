import {
  FontStyle,
  PaintStyle,
  Skia,
  type SkCanvas,
} from '@shopify/react-native-skia';
import type { SkiaFrameRender } from './skiaClassifierOverlay';
import type { YoloDetection } from './yoloDecode';

const strokePaint = Skia.Paint();
strokePaint.setColor(Skia.Color('#42d77d'));
strokePaint.setStyle(PaintStyle.Stroke);
strokePaint.setStrokeWidth(3);
strokePaint.setAntiAlias(true);

const labelBg = Skia.Paint();
labelBg.setColor(Skia.Color('rgba(7, 17, 13, 0.75)'));
labelBg.setStyle(PaintStyle.Fill);

const textPaint = Skia.Paint();
textPaint.setColor(Skia.Color('#FFFFFF'));
textPaint.setAntiAlias(true);

const typeface = Skia.FontMgr.System().matchFamilyStyle(
  'sans-serif',
  FontStyle.Bold,
);
const font = typeface != null ? Skia.Font(typeface, 16) : null;
const metaFont = typeface != null ? Skia.Font(typeface, 12) : null;

function drawDetections(
  canvas: SkCanvas,
  texW: number,
  texH: number,
  detections: YoloDetection[],
): void {
  'worklet';
  for (let i = 0; i < detections.length; i++) {
    const d = detections[i]!;
    const x = d.x * texW;
    const y = d.y * texH;
    const w = d.width * texW;
    const h = d.height * texH;
    canvas.drawRect(Skia.XYWHRect(x, y, w, h), strokePaint);

    const title = `${d.label} ${(d.confidence * 100).toFixed(0)}%`;
    const labelH = 22;
    const labelW = Math.min(texW - 8, Math.max(80, title.length * 9));
    const ly = Math.max(4, y - labelH - 2);
    canvas.drawRect(Skia.XYWHRect(x, ly, labelW, labelH), labelBg);
    if (font != null) {
      canvas.drawText(title, x + 6, ly + 16, textPaint, font);
    }
  }

  if (metaFont != null) {
    canvas.drawText(
      detections.length === 0
        ? 'YOLO · scanning…'
        : `YOLO · ${detections.length} box${detections.length === 1 ? '' : 'es'}`,
      12,
      texH - 14,
      textPaint,
      metaFont,
    );
  }
}

/** SkiaCamera: camera texture + YOLO boxes (last known detections). */
export function renderYoloFrame(
  render: SkiaFrameRender,
  detections: YoloDetection[],
): void {
  'worklet';
  render(({ canvas, frameTexture }) => {
    canvas.drawImage(frameTexture, 0, 0);
    drawDetections(
      canvas,
      frameTexture.width(),
      frameTexture.height(),
      detections,
    );
  });
}
