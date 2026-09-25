import type { Tensor, TfliteModel } from 'react-native-fast-tflite';

export type TensorInfo = {
  index: number;
  name: string;
  shape: number[];
  dataType: Tensor['dataType'];
};

export type ModelTensorReport = {
  inputs: TensorInfo[];
  outputs: TensorInfo[];
};

function toInfo(tensor: Tensor, index: number): TensorInfo {
  return {
    index,
    name: tensor.name,
    shape: [...tensor.shape],
    dataType: tensor.dataType,
  };
}

/** Snapshot input/output tensor metadata from a loaded TFLite model. */
export function inspectModelTensors(model: TfliteModel): ModelTensorReport {
  return {
    inputs: model.inputs.map(toInfo),
    outputs: model.outputs.map(toInfo),
  };
}

function formatTensor(info: TensorInfo): string {
  return `[${info.index}] name="${info.name}" shape=[${info.shape.join(', ')}] type=${info.dataType}`;
}

/**
 * Prove the model pipeline: TFLite → loaded → tensors visible.
 * Logs inspected shapes/types — do not guess from the .tflite filename.
 */
export function logModelTensors(
  model: TfliteModel,
  label = 'TFLite',
): ModelTensorReport {
  const report = inspectModelTensors(model);

  console.log(`[${label}] model loaded`);
  console.log(`[${label}] inputs (${report.inputs.length}):`);
  for (const input of report.inputs) {
    console.log(`  ${formatTensor(input)}`);
  }
  console.log(`[${label}] outputs (${report.outputs.length}):`);
  for (const output of report.outputs) {
    console.log(`  ${formatTensor(output)}`);
  }

  return report;
}
