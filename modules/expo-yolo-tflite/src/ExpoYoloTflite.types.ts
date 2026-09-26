export type TensorInfo = {
  index: number;
  name: string;
  shape: number[];
  dataType: string;
};

export type ModelTensorReport = {
  inputs: TensorInfo[];
  outputs: TensorInfo[];
  /** Flat fields for quick Metro / AGENTS.md verification */
  inputShape: number[];
  inputDtype: string;
  outputShape: number[];
  outputDtype: string;
  numClasses: number;
  /** True when LiteRT GpuDelegate was attached successfully. */
  usingGpu?: boolean;
};

/** Normalized detection in source-image coords (0..1). */
export type YoloDetection = {
  x: number;
  y: number;
  width: number;
  height: number;
  classId: number;
  confidence: number;
  label: string;
};
