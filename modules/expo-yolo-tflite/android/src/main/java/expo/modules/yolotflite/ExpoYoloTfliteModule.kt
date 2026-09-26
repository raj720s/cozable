package expo.modules.yolotflite

import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Matrix
import android.graphics.Paint
import android.graphics.Typeface
import android.media.ExifInterface
import android.net.Uri
import android.util.Log
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import org.tensorflow.lite.Interpreter
import org.tensorflow.lite.gpu.CompatibilityList
import org.tensorflow.lite.gpu.GpuDelegate
import org.tensorflow.lite.support.common.FileUtil
import java.io.File
import java.io.FileInputStream
import java.io.FileOutputStream
import java.nio.ByteBuffer
import java.nio.ByteOrder
import kotlin.math.exp
import kotlin.math.max
import kotlin.math.min

class ExpoYoloTfliteModule : Module() {
  private var interpreter: Interpreter? = null
  private var gpuDelegate: GpuDelegate? = null
  private var usingGpu = false

  private val context
    get() = requireNotNull(appContext.reactContext)

  companion object {
    private const val MODEL_ASSET = "best_final.tflite"
    private const val INPUT_SIZE = 480
    private const val NUM_CLASSES = 7
    private const val NUM_ATTRS = 4 + NUM_CLASSES + 1 // 12 (box + objectness + classes)
    private const val NUM_ANCHORS = 4725
    private const val CONF_THRESH = 0.30f
    private const val IOU_THRESH = 0.30f
    private const val MAX_DETECTIONS = 20
    private const val PAD_COLOR = 114f / 255f

    // Order MUST match data.yaml class order
    private val LABELS = arrayOf(
      "Black : Sunday",     // 0
      "Blue : Monday",      // 1
      "Brown : Thursday",   // 2
      "Green : Friday",     // 3
      "Orange : Saturday",  // 4
      "Red : Wednesday",    // 5
      "Yellow : Tuesday",   // 6
    )
  }

  private data class LetterboxMeta(
    val scale: Float,
    val padX: Int,
    val padY: Int,
    val srcW: Int,
    val srcH: Int,
  )

  private data class Detection(
    val x: Float,
    val y: Float,
    val width: Float,
    val height: Float,
    val classId: Int,
    val confidence: Float,
    val label: String,
  )

  override fun definition() = ModuleDefinition {
    Name("ExpoYoloTflite")

    Function("isSupported") {
      true
    }

    Function("isLoaded") {
      interpreter != null
    }

    AsyncFunction("loadModel") {
      ensureInterpreter()
      tensorReport()
    }

    Function("getTensorInfo") {
      if (interpreter == null) {
        throw Exception("Model not loaded. Call loadModel() first.")
      }
      tensorReport()
    }

    AsyncFunction("detectImageUri") { uri: String ->
      ensureInterpreter()
      val bitmap = decodeBitmap(uri)
        ?: throw Exception("Could not decode image: $uri")
      try {
        detectBitmap(bitmap).map { it.toMap() }
      } finally {
        if (!bitmap.isRecycled) bitmap.recycle()
      }
    }

    AsyncFunction("detectRgb") { pixels: ByteArray, width: Int, height: Int, stride: Int, channels: Int, isBgra: Boolean ->
      ensureInterpreter()
      val bitmap = rgbToBitmap(pixels, width, height, stride, channels, isBgra)
      try {
        detectBitmap(bitmap).map { it.toMap() }
      } finally {
        if (!bitmap.isRecycled) bitmap.recycle()
      }
    }

    /**
     * Draw YOLO boxes onto the image and write a JPEG next to cache.
     * Returns the absolute filesystem path of the annotated image.
     */
    AsyncFunction("annotateImageUri") { uri: String, detections: List<Map<String, Any>> ->
      val original = decodeBitmap(uri)
        ?: throw Exception("Could not decode image: $uri")
      val bitmap = original.copy(Bitmap.Config.ARGB_8888, true)
      if (original !== bitmap && !original.isRecycled) original.recycle()

      val canvas = Canvas(bitmap)
      val stroke = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        style = Paint.Style.STROKE
        strokeWidth = max(3f, bitmap.width / 200f)
        color = Color.parseColor("#42D77D")
      }
      val fill = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        style = Paint.Style.FILL
        color = Color.argb(190, 7, 17, 13)
      }
      val textPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = Color.WHITE
        textSize = max(28f, bitmap.width / 28f)
        typeface = Typeface.DEFAULT_BOLD
      }

      for (d in detections) {
        val x = ((d["x"] as? Number)?.toFloat() ?: 0f) * bitmap.width
        val y = ((d["y"] as? Number)?.toFloat() ?: 0f) * bitmap.height
        val w = ((d["width"] as? Number)?.toFloat() ?: 0f) * bitmap.width
        val h = ((d["height"] as? Number)?.toFloat() ?: 0f) * bitmap.height
        val label = d["label"] as? String ?: "obj"
        val conf = ((d["confidence"] as? Number)?.toFloat() ?: 0f)
        val title = "$label ${(conf * 100).toInt()}%"

        canvas.drawRect(x, y, x + w, y + h, stroke)
        val tw = textPaint.measureText(title)
        val th = textPaint.textSize + 12f
        val ly = max(0f, y - th - 4f)
        canvas.drawRect(x, ly, x + tw + 16f, ly + th, fill)
        canvas.drawText(title, x + 8f, ly + th - 10f, textPaint)
      }

      val out = File(context.cacheDir, "yolo_annot_${System.currentTimeMillis()}.jpg")
      FileOutputStream(out).use { stream ->
        bitmap.compress(Bitmap.CompressFormat.JPEG, 92, stream)
      }
      if (!bitmap.isRecycled) bitmap.recycle()
      out.absolutePath
    }

    AsyncFunction("unload") {
      interpreter?.close()
      interpreter = null
      gpuDelegate?.close()
      gpuDelegate = null
      usingGpu = false
    }
  }

  private fun ensureInterpreter() {
    if (interpreter != null) return
    Log.i("YoloTflite", "Loading model asset=$MODEL_ASSET …")
    val modelBuffer = FileUtil.loadMappedFile(context, MODEL_ASSET)
    // INT8 + GpuDelegate often hangs or stalls on first Interpreter() on Samsung /
    // Adreno. Prefer CPU (XNNPACK) for quantized assets; float32 may still use GPU.
    val preferGpu = !MODEL_ASSET.contains("int8", ignoreCase = true)
    interpreter = buildInterpreter(modelBuffer, preferGpu = preferGpu)
    Log.i(
      "YoloTflite",
      if (usingGpu) "Interpreter ready with GPU delegate"
      else "Interpreter ready on CPU (4 threads)",
    )
  }

  private fun buildInterpreter(
    modelBuffer: java.nio.MappedByteBuffer,
    preferGpu: Boolean,
  ): Interpreter {
    if (preferGpu) {
      try {
        CompatibilityList().use { compat ->
          if (compat.isDelegateSupportedOnThisDevice) {
            val options = Interpreter.Options()
            val delegate = GpuDelegate(compat.bestOptionsForThisDevice)
            options.addDelegate(delegate)
            try {
              val interp = Interpreter(modelBuffer, options)
              gpuDelegate = delegate
              usingGpu = true
              return interp
            } catch (e: Exception) {
              Log.w("YoloTflite", "GPU Interpreter failed — falling back to CPU", e)
              delegate.close()
            }
          } else {
            Log.i("YoloTflite", "GPU delegate not supported on this device")
          }
        }
      } catch (e: Exception) {
        Log.w("YoloTflite", "GPU CompatibilityList failed — CPU fallback", e)
      }
    }

    usingGpu = false
    gpuDelegate = null
    val cpuOptions = Interpreter.Options().apply {
      setNumThreads(4)
      try {
        setUseXNNPACK(true)
      } catch (_: Throwable) {
        // Older LiteRT builds may not expose XNNPACK toggle
      }
    }
    return Interpreter(modelBuffer, cpuOptions)
  }

  private fun tensorReport(): Map<String, Any> {
    val interp = interpreter ?: throw Exception("Model not loaded")
    val inputs = (0 until interp.inputTensorCount).map { i ->
      val t = interp.getInputTensor(i)
      mapOf(
        "index" to i,
        "name" to (t.name() ?: "input_$i"),
        "shape" to t.shape().toList(),
        "dataType" to t.dataType().toString().lowercase(),
      )
    }
    val outputs = (0 until interp.outputTensorCount).map { i ->
      val t = interp.getOutputTensor(i)
      mapOf(
        "index" to i,
        "name" to (t.name() ?: "output_$i"),
        "shape" to t.shape().toList(),
        "dataType" to t.dataType().toString().lowercase(),
      )
    }
    val input0 = inputs.firstOrNull()
    val output0 = outputs.firstOrNull()
    @Suppress("UNCHECKED_CAST")
    val inputShape = (input0?.get("shape") as? List<Int>) ?: emptyList()
    @Suppress("UNCHECKED_CAST")
    val outputShape = (output0?.get("shape") as? List<Int>) ?: emptyList()
    return mapOf(
      "inputs" to inputs,
      "outputs" to outputs,
      // Flat fields for Metro / AGENTS.md shape verification
      "inputShape" to inputShape,
      "inputDtype" to (input0?.get("dataType") ?: "unknown"),
      "outputShape" to outputShape,
      "outputDtype" to (output0?.get("dataType") ?: "unknown"),
      "numClasses" to NUM_CLASSES,
      "usingGpu" to usingGpu,
    )
  }

  private fun decodeBitmap(uriString: String): Bitmap? {
    val uri = Uri.parse(uriString)
    val pathForExif: String? = when {
      uri.scheme == "file" -> uri.path
      uri.scheme == null -> uriString.removePrefix("file://")
      else -> null
    }

    val decoded = try {
      when (uri.scheme) {
        "content", "android.resource" -> {
          context.contentResolver.openInputStream(uri)?.use { BitmapFactory.decodeStream(it) }
        }
        "file" -> {
          val path = uri.path ?: return null
          FileInputStream(File(path)).use { BitmapFactory.decodeStream(it) }
        }
        null -> {
          FileInputStream(File(uriString.removePrefix("file://"))).use {
            BitmapFactory.decodeStream(it)
          }
        }
        else -> {
          context.contentResolver.openInputStream(uri)?.use { BitmapFactory.decodeStream(it) }
            ?: FileInputStream(File(uriString)).use { BitmapFactory.decodeStream(it) }
        }
      }
    } catch (e: Exception) {
      throw Exception("Failed to open image uri=$uriString: ${e.message}", e)
    } ?: return null

    return applyExifRotation(decoded, pathForExif)
  }

  /** Camera JPEG files are often landscape + EXIF rotate; match upright preview. */
  private fun applyExifRotation(bitmap: Bitmap, path: String?): Bitmap {
    if (path == null) return bitmap
    return try {
      val exif = ExifInterface(path)
      val orientation = exif.getAttributeInt(
        ExifInterface.TAG_ORIENTATION,
        ExifInterface.ORIENTATION_NORMAL,
      )
      val degrees = when (orientation) {
        ExifInterface.ORIENTATION_ROTATE_90 -> 90f
        ExifInterface.ORIENTATION_ROTATE_180 -> 180f
        ExifInterface.ORIENTATION_ROTATE_270 -> 270f
        else -> 0f
      }
      if (degrees == 0f) return bitmap
      val matrix = Matrix().apply { postRotate(degrees) }
      val rotated = Bitmap.createBitmap(bitmap, 0, 0, bitmap.width, bitmap.height, matrix, true)
      if (rotated !== bitmap && !bitmap.isRecycled) bitmap.recycle()
      rotated
    } catch (_: Exception) {
      bitmap
    }
  }

  private fun rgbToBitmap(
    pixels: ByteArray,
    width: Int,
    height: Int,
    stride: Int,
    channels: Int,
    isBgra: Boolean,
  ): Bitmap {
    val bmp = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888)
    val rowStride = if (stride > 0) stride else width * channels
    val colors = IntArray(width * height)
    for (y in 0 until height) {
      for (x in 0 until width) {
        val si = y * rowStride + x * channels
        val r: Int
        val g: Int
        val b: Int
        if (isBgra) {
          b = pixels[si].toInt() and 0xFF
          g = pixels[si + 1].toInt() and 0xFF
          r = pixels[si + 2].toInt() and 0xFF
        } else {
          r = pixels[si].toInt() and 0xFF
          g = pixels[si + 1].toInt() and 0xFF
          b = pixels[si + 2].toInt() and 0xFF
        }
        colors[y * width + x] = (0xFF shl 24) or (r shl 16) or (g shl 8) or b
      }
    }
    bmp.setPixels(colors, 0, width, 0, 0, width, height)
    return bmp
  }

  private fun detectBitmap(bitmap: Bitmap): List<Detection> {
    val interp = interpreter ?: throw Exception("Model not loaded")
    val (input, meta) = letterboxNchw(bitmap)
    val outputShape = interp.getOutputTensor(0).shape()
    val outChannels = if (outputShape.size >= 3) outputShape[1] else NUM_ATTRS
    val outAnchors = if (outputShape.size >= 3) outputShape[2] else NUM_ANCHORS

    // Handle both [1,11,8400] and [1,8400,11]
    val transposed = outChannels == NUM_ANCHORS || (outAnchors == NUM_ATTRS)

    val channels = if (transposed) outAnchors else outChannels
    val anchors = if (transposed) outChannels else outAnchors

    val outputBuffer = ByteBuffer.allocateDirect(4 * channels * anchors).order(ByteOrder.nativeOrder())
    interp.run(input, outputBuffer)
    outputBuffer.rewind()
    val raw = FloatArray(channels * anchors)
    outputBuffer.asFloatBuffer().get(raw)

    val planar = if (transposed) {
      // [anchors, channels] → [channels, anchors]
      val p = FloatArray(channels * anchors)
      for (i in 0 until anchors) {
        for (c in 0 until channels) {
          p[c * anchors + i] = raw[i * channels + c]
        }
      }
      p
    } else {
      raw
    }

    val detections = decodeAndNms(planar, meta, channels, anchors)

    // ===== TEMP DEBUG =====
    // planar layout matches output[0][ch][i] → planar[ch * anchors + i]
    var maxScore = 0f
    var maxIdx = -1
    var maxCls = -1
    var aboveThresh = 0
    val classCount = min(NUM_CLASSES, channels - 4)

    for (i in 0 until anchors) {
      var bestScore = 0f
      var bestCls = -1
      for (c in 0 until classCount) {
        val s = planar[(4 + c) * anchors + i]
        if (s > bestScore) {
          bestScore = s
          bestCls = c
        }
      }
      if (bestScore > maxScore) {
        maxScore = bestScore
        maxIdx = i
        maxCls = bestCls
      }
      if (bestScore > CONF_THRESH) aboveThresh++
    }

    Log.d(
      "YoloTflite",
      "RAW: maxScore=$maxScore maxClass=$maxCls col=$maxIdx aboveThresh=$aboveThresh",
    )
    if (maxIdx >= 0) {
      Log.d(
        "YoloTflite",
        "RAW col=$maxIdx box=[${planar[0 * anchors + maxIdx]}, ${planar[1 * anchors + maxIdx]}, " +
          "${planar[2 * anchors + maxIdx]}, ${planar[3 * anchors + maxIdx]}]",
      )
    }
    Log.d("YoloTflite", "Detections returned: ${detections.size}")
    // ===== END TEMP DEBUG =====

    return detections
  }

  private fun letterboxNchw(src: Bitmap): Pair<ByteBuffer, LetterboxMeta> {
    val srcW = src.width
    val srcH = src.height
    val scale = min(INPUT_SIZE.toFloat() / srcW, INPUT_SIZE.toFloat() / srcH)
    val newW = (srcW * scale).toInt().coerceAtLeast(1)
    val newH = (srcH * scale).toInt().coerceAtLeast(1)
    val padX = (INPUT_SIZE - newW) / 2
    val padY = (INPUT_SIZE - newH) / 2

    val scaled = Bitmap.createScaledBitmap(src, newW, newH, true)
    val plane = INPUT_SIZE * INPUT_SIZE
    val buffer = ByteBuffer.allocateDirect(4 * 3 * plane).order(ByteOrder.nativeOrder())
    val fb = buffer.asFloatBuffer()

    // Fill pad color (NCHW)
    for (c in 0 until 3) {
      for (i in 0 until plane) {
        fb.put(c * plane + i, PAD_COLOR)
      }
    }

    val pixels = IntArray(newW * newH)
    scaled.getPixels(pixels, 0, newW, 0, 0, newW, newH)
    for (y in 0 until newH) {
      for (x in 0 until newW) {
        val argb = pixels[y * newW + x]
        val r = ((argb shr 16) and 0xFF) / 255f
        val g = ((argb shr 8) and 0xFF) / 255f
        val b = (argb and 0xFF) / 255f
        val dx = x + padX
        val dy = y + padY
        val di = dy * INPUT_SIZE + dx
        fb.put(0 * plane + di, r)
        fb.put(1 * plane + di, g)
        fb.put(2 * plane + di, b)
      }
    }
    if (scaled !== src && !scaled.isRecycled) scaled.recycle()

    buffer.rewind()
    return buffer to LetterboxMeta(scale, padX, padY, srcW, srcH)
  }

  private fun decodeAndNms(
    raw: FloatArray,
    meta: LetterboxMeta,
    channels: Int,
    anchors: Int,
  ): List<Detection> {
    val numClasses = NUM_CLASSES
    var needsSigmoid = false
    for (i in 0 until min(anchors, 32)) {
      val s = raw[4 * anchors + i]
      if (s < 0f || s > 1.05f) {
        needsSigmoid = true
        break
      }
    }

    // Ultralytics usually emits letterbox pixel coords (0..640). Some exports are 0..1.
    var maxAbs = 0f
    for (i in 0 until min(anchors, 64)) {
      maxAbs = max(maxAbs, kotlin.math.abs(raw[0 * anchors + i]))
      maxAbs = max(maxAbs, kotlin.math.abs(raw[1 * anchors + i]))
    }
    val coordsNormalized = maxAbs <= 2.5f

    val candidates = ArrayList<Detection>()
    for (i in 0 until anchors) {
      var bestCls = 0
      var bestScore = Float.NEGATIVE_INFINITY
      for (c in 0 until numClasses) {
        var s = raw[(4 + c) * anchors + i]
        if (needsSigmoid) s = sigmoid(s)
        if (s > bestScore) {
          bestScore = s
          bestCls = c
        }
      }
      if (bestScore < CONF_THRESH) continue

      var cx = raw[0 * anchors + i]
      var cy = raw[1 * anchors + i]
      var w = raw[2 * anchors + i]
      var h = raw[3 * anchors + i]
      if (coordsNormalized) {
        cx *= INPUT_SIZE
        cy *= INPUT_SIZE
        w *= INPUT_SIZE
        h *= INPUT_SIZE
      }

      val x0 = (cx - w / 2f - meta.padX) / meta.scale
      val y0 = (cy - h / 2f - meta.padY) / meta.scale
      val x1 = (cx + w / 2f - meta.padX) / meta.scale
      val y1 = (cy + h / 2f - meta.padY) / meta.scale

      val nx = clamp01(x0 / meta.srcW)
      val ny = clamp01(y0 / meta.srcH)
      val nw = clamp01(x1 / meta.srcW) - nx
      val nh = clamp01(y1 / meta.srcH) - ny
      if (nw <= 0.002f || nh <= 0.002f) continue

      val label = if (bestCls in LABELS.indices) LABELS[bestCls] else "class_$bestCls"
      candidates.add(Detection(nx, ny, nw, nh, bestCls, bestScore, label))
    }

    val kept = nms(candidates)
    // Cap to top-N most confident (safety against sticker fan-out)
    val capped = kept
      .sortedByDescending { it.confidence }
      .take(MAX_DETECTIONS)
    Log.d(
      "ExpoYoloTflite",
      "decode candidates=${candidates.size} kept=${kept.size} capped=${capped.size} sigmoid=$needsSigmoid normCoords=$coordsNormalized",
    )
    return capped
  }

  private fun nms(detections: List<Detection>): List<Detection> {
    if (detections.isEmpty()) return emptyList()

    // Sort by confidence descending
    val sorted = detections.sortedByDescending { it.confidence }
    val suppressed = BooleanArray(sorted.size)
    val keep = ArrayList<Detection>()

    for (i in sorted.indices) {
      if (suppressed[i]) continue
      val a = sorted[i]
      keep.add(a)

      // Class-agnostic: one sticker → one box (highest confidence class wins)
      for (j in i + 1 until sorted.size) {
        if (suppressed[j]) continue
        val b = sorted[j]
        if (iou(a, b) > IOU_THRESH) {
          suppressed[j] = true
        }
      }
    }
    return keep
  }

  private fun iou(a: Detection, b: Detection): Float {
    val ax2 = a.x + a.width
    val ay2 = a.y + a.height
    val bx2 = b.x + b.width
    val by2 = b.y + b.height
    val ix1 = max(a.x, b.x)
    val iy1 = max(a.y, b.y)
    val ix2 = min(ax2, bx2)
    val iy2 = min(ay2, by2)
    val iw = max(0f, ix2 - ix1)
    val ih = max(0f, iy2 - iy1)
    val inter = iw * ih
    val union = a.width * a.height + b.width * b.height - inter
    return if (union <= 0f) 0f else inter / union
  }

  private fun Detection.toMap(): Map<String, Any> = mapOf(
    "x" to x.toDouble(),
    "y" to y.toDouble(),
    "width" to width.toDouble(),
    "height" to height.toDouble(),
    "classId" to classId,
    "confidence" to confidence.toDouble(),
    "label" to label,
  )

  private fun clamp01(v: Float): Float = max(0f, min(1f, v))

  private fun sigmoid(x: Float): Float = 1f / (1f + exp(-x))
}
