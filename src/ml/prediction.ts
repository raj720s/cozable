export type NormBox = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type ClassificationResult = {
  index: number;
  label: string;
  score: number;
  /** Box in normalized upright preview coords (0..1). */
  box: NormBox;
  /** True once score crossed the lock threshold. */
  locked?: boolean;
};

/** Default center box (matches MobileNet SEARCH_REGIONS[0]). */
export const CENTER_BOX: NormBox = {
  x: 0.22,
  y: 0.22,
  width: 0.56,
  height: 0.56,
};

export const EMPTY_PREDICTION: ClassificationResult = {
  index: -1,
  label: '—',
  score: 0,
  box: CENTER_BOX,
  locked: false,
};
