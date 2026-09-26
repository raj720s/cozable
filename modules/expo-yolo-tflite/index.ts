// Re-export the native module. On web, it will be resolved to ExpoYoloTfliteModule.web.ts
// and on native platforms to ExpoYoloTfliteModule.ts
export { default } from './src/ExpoYoloTfliteModule';
export * from './src/ExpoYoloTflite.types';
