Food Tray Day-Colour Detector App
Version: 1.0
Platform: Android (APK sideloading)
Framework: React Native CLI + VisionCamera v4 + react-native-fast-tflite
Development Timeline: 48 hours (hackathon)

🎯 App Overview
A single-purpose mobile computer vision app that captures one continuous video sweep across a rack of food-service trays, detects each tray label in real-time, and classifies the day-colour marking (7 colours: Blue, Yellow, Red, Brown, Green, Orange, Black) with ≤1 second latency per label.
Key Capabilities
    • ✅ Single continuous video capture — one tap starts recording, operator pans across rack in one motion [Section 4.1]
    • ✅ Real-time per-label detection + classification — 7-colour day marking recognition [Section 4.2]
    • ✅ Live bounding box overlay — green (≥0.6 confidence) / amber (<0.6 confidence) [Section 4.3]
    • ✅ De-duplication — each physical label counted once, not per frame [Section 4.2]
    • ✅ Coverage check — running count "X of Y detected" [Section 4.4]
    • ✅ End-of-capture summary — list all detections with confidence scores [Section 4.5]
    • ✅ Re-scan loop — targeted re-capture of flagged (amber) labels [Section 4.5]
    • ✅ 100% on-device — no backend, no network, no ERP integration [Section 8]
    • ✅ Android APK sideloading — no Play Store, no review process [Section 2]

📱 Screen-by-Screen Breakdown
Screen 1: Splash Screen
Purpose: Display app branding while pre-loading the TFLite model into memory.
Features
    • App logo + name (centered)
    • Loading spinner
    • Auto-navigate to Home Screen after model loads (~2 seconds)
    • Error toast if model fails to load
Technical Details
// Pre-load TFLite model in background
const model = useTFLiteModel({
  asset: require('../assets/day_colour_detector.tflite'),
});

useEffect(() => {
  if (model) {
    setTimeout(() => navigation.navigate('Home'), 500);
  }
}, [model]);

User Flow
App Launch → Load Model → (Success) → Home Screen
                          → (Failure) → Error Toast → Retry


Screen 2: Home Screen (Setup)
Purpose: Allow operator to enter expected tray count and start recording.
Features
    • Numeric input field for expected tray count (default: 9, range 1-99)
    • "Start Recording" button (primary CTA)
    • Info text: "Enter the number of trays in the rack"
    • Optional: Display previous scan results (from AsyncStorage)
UI Elements
<View style={styles.container}>
  <Text style={styles.title}>Tray Colour Detector</Text>

  <TextInput
    style={styles.input}
    keyboardType="numeric"
    value={expectedCount.toString()}
    onChangeText={(text) => setExpectedCount(parseInt(text) || 9)}
    placeholder="Enter tray count (e.g., 9)"
  />

  {error && <Text style={styles.error}>{error}</Text>}

  <Button 
    title="Start Recording" 
    onPress={handleStart}
    disabled={!model}
  />

  {!model && <Text>Loading model...</Text>}
</View>

Validation
    • Input must be between 1 and 99
    • Shows error message if invalid
    • Disables "Start Recording" button if model not loaded
User Flow
Splash Screen → Home Screen → Enter Count → Start Recording → Camera Screen


Screen 3: Camera Screen (Recording + Live Overlay)
Purpose: Capture continuous video sweep, detect labels in real-time, display bounding box overlay with confidence feedback.
Features
    • Live camera preview @ 30 FPS (full-screen)
    • Real-time TFLite inference on every frame (or every 3rd frame for performance)
    • Bounding box overlay (Skia canvas):
        ◦ 🟢 Green box = confidence ≥ 0.6 (detected + classified)
        ◦ 🟠 Amber box = confidence < 0.6 (detected but uncertain)
        ◦ No box = not yet detected
    • Running count badge (top-right): "7 of 9 detected"
    • De-duplication logic — track label centroids across frames, count each physical label once
    • "Stop Recording" button (bottom-center)
    • Confidence legend (top-left): green/amber key
    • HDR mode for better low-light performance [Section 5, Condition 2]
UI Layout
┌─────────────────────────────────────┐
│ 🟢=High 🟠=Low        [7 of 9] ▲    │ ← Running count (top-right)
│                                     │
│                                     │
│        [Camera Preview]             │
│        + Bounding Boxes             │
│        (Green/Amber)                │
│                                     │
│                                     │
│           [Stop Recording]          │ ← Bottom-center
└─────────────────────────────────────┘

Frame Processing Pipeline
const frameProcessor = useFrameProcessor((frame) => {
  'worklet';

  if (!model) return;

  // Run TFLite inference
  const results = runModel(model, {
    input: frame,
    inputSize: 320,
    confidenceThreshold: 0.6,
  });

  // Parse detections
  const detections = parseResults(results);

  // De-duplication (centroid tracking)
  const distinctLabels = deduplicateLabels(detections, trackedLabels);

  // Update Skia overlay
  boundingBoxes.value = distinctLabels.map((label) => ({
    bbox: label.bbox,
    colour: label.colour,
    confidence: label.confidence,
    isGreen: label.confidence >= 0.6,
  }));

  // Update running count
  detectedCount.value = distinctLabels.length;
}, [model]);

De-Duplication Logic
function deduplicateLabels(newDetections, trackedLabels) {
  const CENTROID_THRESHOLD = 50; // pixels
  const TIME_WINDOW = 200; // ms

  return newDetections.filter((detection) => {
    const centroid = {
      x: detection.bbox.x + detection.bbox.width / 2,
      y: detection.bbox.y + detection.bbox.height / 2,
    };

    const isDuplicate = trackedLabels.some((prev) => {
      const distance = Math.sqrt(
        Math.pow(centroid.x - prev.centroid.x, 2) +
        Math.pow(centroid.y - prev.centroid.y, 2)
      );
      const timeDiff = Date.now() - prev.timestamp;

      return distance < CENTROID_THRESHOLD && timeDiff < TIME_WINDOW;
    });

    return !isDuplicate;
  });
}

Performance Optimisations
    • Process every 3rd frame (20 FPS) if latency >1s
    • Use INT8 quantised TFLite model for 2-3x speedup
    • Run inference on native thread (worklet) — zero JS bridge overhead
User Flow
Home Screen → Start Recording → Live Preview + Overlay
                              → Detect Labels (real-time)
                              → Update Count ("7 of 9")
                              → Stop Recording → Summary Screen


Screen 4: Summary Screen (End-of-Capture)
Purpose: Display detected labels with classifications, flag low-confidence results, enable re-scan of flagged labels.
Features
    • Header: "Scan Complete"
    • Summary card: "Detected 7 of 9 expected"
    • List of all detected labels (FlatList):
        ◦ Tray sequence number
        ◦ Classified colour (Blue, Yellow, Red, Brown, Green, Orange, Black)
        ◦ Confidence score (0.00-1.00)
        ◦ ✅ Green checkmark if confidence ≥ 0.6
        ◦ ⚠️ Amber warning if confidence < 0.6
    • "Missing labels" warning if detected < expected
    • "Re-scan Flagged Labels" button (if any amber labels)
    • "Done" button (navigate to Home)
    • Optional: Save results to AsyncStorage for demo export
UI Layout
┌─────────────────────────────────────┐
│        Scan Complete                │
│                                     │
│  Detected 7 of 9 expected           │
│  ⚠️ Missing 2 labels                │
│                                     │
│  ┌───────────────────────────────┐  │
│  │ Tray #1: Blue (0.92) ✅       │  │
│  │ Tray #2: Red (0.54) ⚠️        │  │
│  │ Tray #3: Green (0.88) ✅      │  │
│  │ Tray #4: Yellow (0.91) ✅     │  │
│  │ Tray #5: Orange (0.48) ⚠️     │  │
│  │ ...                           │  │
│  └───────────────────────────────┘  │
│                                     │
│  [Re-scan Flagged Labels]  [Done]   │
└─────────────────────────────────────┘

State Management
const [detections, setDetections] = useState<Detection[]>([]);
const flaggedLabels = detections.filter((d) => d.confidence < 0.6);

const handleRescan = () => {
  navigation.navigate('Camera', { 
    expectedCount, 
    rescanIndices: flaggedLabels.map((d) => d.sequence) 
  });
};

const handleDone = () => {
  navigation.navigate('Home');
};

User Flow
Camera Screen (Stop) → Summary Screen → (Re-scan) → Camera Screen
                                           → (Done) → Home Screen


Screen 5: Re-scan Screen (Targeted Capture)
Purpose: Allow operator to re-capture only flagged (amber) labels without redoing the entire rack.
Features
    • Same camera functionality as Screen 3 (live preview, bounding boxes, running count)
    • Banner message: "Re-scanning trays: #2, #5"
    • Pre-filtered overlay (optional): Only show bounding boxes for flagged labels
    • Merge results on stop: New detections replace old flagged labels
    • Navigate back to Summary Screen (updated)
UI Layout
┌─────────────────────────────────────┐
│  Re-scanning trays: #2, #5          │ ← Banner (top)
│                                     │
│  🟢=High 🟠=Low        [2 of 2] ▲   │
│                                     │
│        [Camera Preview]             │
│        + Bounding Boxes             │
│                                     │
│           [Stop Recording]          │
└─────────────────────────────────────┘

Result Merging Logic
// After re-scan stops
const mergedDetections = [
  ...previousDetections.filter((d) => !flaggedIndices.includes(d.sequence)),
  ...newDetections, // Replace flagged with new results
];

setDetections(mergedDetections);
navigation.navigate('Summary', { detections: mergedDetections });

User Flow
Summary Screen → Re-scan → Camera (targeted) → Stop → Summary Screen (updated)


🏗️ Technical Architecture
Tech Stack
Layer
Technology
Purpose
Framework
React Native CLI (0.74.0)
Full native module access, sideloading
Camera
react-native-vision-camera (v4)
60 FPS frame streaming, worklet-based frame processors
ML Inference
react-native-fast-tflite (v1.0)
Run custom YOLOv5n model on each frame
UI Overlay
@shopify/react-native-skia (v1.5)
GPU-accelerated bounding box rendering
State Management
react-native-reanimated (v3.10)
Shared Values for real-time updates
Local Storage
@react-native-async-storage/async-storage (optional)
Save results for demo export

Dependencies (package.json)
{
  "dependencies": {
    "react-native": "0.74.0",
    "react-native-vision-camera": "^4.0.0",
    "react-native-fast-tflite": "^1.0.0",
    "@shopify/react-native-skia": "^1.5.0",
    "react-native-reanimated": "^3.10.0",
    "@react-native-async-storage/async-storage": "^1.21.0"
  },
  "devDependencies": {
    "@react-native/gradle-plugin": "0.74.0",
    "typescript": "^5.0.0"
  }
}

Model Specifications
    • Architecture: YOLOv5n (fine-tuned on 7-colour dataset)
    • Input Size: 320×320 RGB
    • Output: 7-class softmax (Blue, Yellow, Red, Brown, Green, Orange, Black) + bounding box
    • Quantisation: INT8 (if possible, for 2-3x speedup)
    • File Size: <5MB
    • Inference Time: <15ms on mid-range Android device
Project Structure
food-tray-detector/
├── android/
│   ├── app/
│   │   ├── src/main/
│   │   │   ├── assets/
│   │   │   │   └── day_colour_detector.tflite  # Bundled model
│   │   │   ├── java/com/foodtraydetector/
│   │   │   └── AndroidManifest.xml
│   │   └── build.gradle
├── src/
│   ├── screens/
│   │   ├── SplashScreen.tsx
│   │   ├── HomeScreen.tsx
│   │   ├── CameraScreen.tsx
│   │   ├── SummaryScreen.tsx
│   │   └── RescanScreen.tsx
│   ├── components/
│   │   ├── BoundingBoxOverlay.tsx
│   │   └── RunningCountBadge.tsx
│   ├── hooks/
│   │   ├── useFrameProcessor.ts
│   │   └── useDeDuplication.ts
│   ├── utils/
│   │   ├── tflite-model.ts
│   │   ├── colour-mapping.ts
│   │   └── deduplication.ts
│   └── App.tsx
├── assets/
│   ├── day_colour_detector.tflite
│   └── logo.png
├── package.json
└── README.md


🎨 Day-Colour Reference (Ground Truth)
Day
Colour
Monday
🔵 Blue
Tuesday
🟡 Yellow
Wednesday
🔴 Red
Thursday
🟤 Brown
Friday
🟢 Green
Saturday
🟠 Orange
Sunday
⚫ Black

Judging Rule: Results are scored on the weakest-performing colour, not a blended average. Red/Orange and Blue/Black are the pairs most likely to be confused under poor lighting — deliberately stress-test these two pairs. [Section 3]

🧪 Testing Requirements (6 Conditions)
Run at least one video capture (15-30 seconds, ~8-12 labels) under each condition:
#
Condition
Why It Matters
Target Accuracy
1
Normal floor lighting
Baseline accuracy and latency
≥80%
2
Low light / dim area
Simulates chill/cold-storage zones (hard requirement)
≥60%
3
Glare / reflective surface
Foil-wrapped trays catch light and wash out colour
≥70%
4
Motion blur (fast pan)
Direct trade-off against sweep speed
≥70%
5
Angled / off-axis view
Operator won't always shoot square-on
≥75%
6
Partial occlusion
Label partly covered by another tray, hand, or packaging
≥65%

Success Metrics per Condition:
    • Colour accuracy — % correct, called out by weakest individual colour (not average) [Section 6]
    • Latency — worst-case per-label time from detection to classified result (must be ≤1s) [Section 4.6]
    • Throughput — labels correctly identified per minute of video
    • De-duplication correctness — confirm distinct-label count matched physical tray count, not frame count [Section 4.2]

⚡ Performance Targets
Metric
Target
Measurement
Per-label latency
≤1 second
Time from detection to classified result [Section 4.6]
Frame rate
30 FPS minimum
VisionCamera fps prop
De-duplication accuracy
100%
Distinct labels = physical trays [Section 4.2]
App startup time
<3 seconds (cold start)
Splash Screen → Home Screen
APK size
<50MB
Including TFLite model
Crash-free sessions
>95%
During 6-condition testing


📦 Deliverables Checklist
    • ☐ Installable APK file (sideloaded, no Play Store) [Section 7]
    • ☐ Source code / repo (GitHub/GitLab) [Section 7]
    • ☐ Results table (accuracy, latency, throughput per condition) [Section 7]
    • ☐ 6 test videos (15-30s each, ~60 labels total) [Section 7]
    • ☐ Confidence threshold value + rationale (0.6, with Red/Orange + Blue/Black notes) [Section 4.6][Section 7]
    • ☐ Live demo of detect → flag → re-scan → resolve loop [Section 6][Section 7]

⚠️ Out of Scope (Do NOT Build)
    • ❌ Product / item / RC-code identification — colour only, nothing else read from the label [Section 8]
    • ❌ Any ERP posting or backend integration — no data leaves the device [Section 8]
    • ❌ New hardware, QR codes, relabelling, robotics, IoT — app must work with existing phone cameras + existing labels [Section 8]
    • ❌ App Store / Play Store submission or review — sideload only (APK) [Section 2][Section 8]
    • ❌ Statistically rigorous accuracy proof — hackathon sample size is feasibility demo, not final validation [Section 6][Section 8]

🚀 Quick Start (For Developers)
Prerequisites
    • Node.js 18+
    • Android Studio (JDK 17)
    • Android device (API 29+) for testing
    • Pre-trained TFLite model (day_colour_detector.tflite)
Setup
# Clone repo
git clone https://github.com/your-org/food-tray-detector.git
cd food-tray-detector

# Install dependencies
npm install

# Copy TFLite model to assets
cp day_colour_detector.tflite android/app/src/main/assets/

# Build APK
cd android
./gradlew assembleRelease

# APK location
ls app/build/outputs/apk/release/app-release.apk

Sideload to Device
# Enable "Unknown Sources" on Android device
# Transfer APK via USB/WhatsApp/Drive
# Install via file manager

# Or use ADB
adb install app/build/outputs/apk/release/app-release.apk


📸 Demo Flow (For Judges)
    1. Launch app → Splash Screen (2s) → Home Screen
    2. Enter expected count (e.g., "9") → Tap "Start Recording"
    3. Pan across rack in one continuous motion (15-30s)
        ◦ Show live bounding boxes (green/amber)
        ◦ Show running count ("7 of 9")
    4. Stop recording → Summary Screen appears
    5. Point out amber flag on one label (e.g., "Tray #2: Red (0.54) ⚠️")
    6. Tap "Re-scan Flagged Labels" → Re-scan Screen
    7. Re-capture just that label → Stop → Summary Screen (updated)
    8. Show green checkmark on re-scanned label (e.g., "Tray #2: Red (0.89) ✅")
    9. Tap "Done" → Return to Home Screen
Key message: This demonstrates the failure-and-recovery loop working — a single flawless pass is a weaker demo than showing the amber → green re-scan flow. [Section 6]

📄 License
MIT License — free for hackathon use.

Built in 48 hours for [Hackathon Name]
Team: [Your Team Name]
Date: September 24, 2026