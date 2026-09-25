/**
 * @deprecated Prefer {@link ./classifyFrame} — kept so older imports keep working.
 */
export { frameToMobileNetInput, MOBILENET_INPUT_SIZE } from './classifyFrame';

import { top1FromOutput } from './classifyFrame';

/** @deprecated Use top1FromOutput from classifyFrame. */
export function top1Uint8(scores: Uint8Array): { index: number; score: number } {
  const copy = scores.buffer.slice(
    scores.byteOffset,
    scores.byteOffset + scores.byteLength,
  ) as ArrayBuffer;
  return top1FromOutput(copy, 'uint8');
}
