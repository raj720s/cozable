package expo.modules.yolotflite

import android.content.Context
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.Typeface
import android.media.MediaCodec
import android.media.MediaCodecInfo
import android.media.MediaFormat
import android.media.MediaMetadataRetriever
import android.media.MediaMuxer
import android.net.Uri
import android.util.Log
import java.io.File
import kotlin.math.abs
import kotlin.math.max
import kotlin.math.min

/**
 * Burns YOLO boxes into a copy of a recorded video using sampled frames
 * + H.264 encode. Frame reports are `{ atMs, detections: [...] }`.
 */
internal object VideoAnnotator {
  private const val TAG = "YoloTflite"
  private const val MIME = "video/avc"
  private const val FRAME_STEP_MS = 100L
  private const val BIT_RATE = 4_000_000
  private const val I_FRAME_INTERVAL = 1
  private const val BOX_GREEN = "#22C55E"
  private const val BOX_AMBER = "#F59E0B"

  data class Det(
    val x: Float,
    val y: Float,
    val width: Float,
    val height: Float,
    val label: String,
    val confidence: Float,
  )

  data class Report(
    val atMs: Long,
    val detections: List<Det>,
  )

  fun annotate(
    context: Context,
    uri: String,
    frameReports: List<Map<String, Any>>,
    confThresh: Float,
  ): String {
    val path = resolvePath(uri)
    val reports = parseReports(frameReports)
    if (reports.isEmpty()) {
      Log.w(TAG, "annotateVideoUri: no frame reports — returning original")
      return path
    }

    val retriever = MediaMetadataRetriever()
    try {
      retriever.setDataSource(path)
    } catch (e: Exception) {
      retriever.setDataSource(context, Uri.parse(if (uri.startsWith("file:")) uri else "file://$path"))
    }

    val durationMs =
      retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_DURATION)?.toLongOrNull()
        ?: 0L
    if (durationMs <= 0L) {
      retriever.release()
      throw Exception("Could not read video duration")
    }

    val first =
      retriever.getFrameAtTime(0, MediaMetadataRetriever.OPTION_CLOSEST_SYNC)
        ?: run {
          retriever.release()
          throw Exception("Could not decode first video frame")
        }

    var width = first.width
    var height = first.height
    // Encoder requires even dimensions.
    if (width % 2 != 0) width -= 1
    if (height % 2 != 0) height -= 1
    first.recycle()

    val out = File(context.cacheDir, "yolo_annot_vid_${System.currentTimeMillis()}.mp4")
    if (out.exists()) out.delete()

    val format =
      MediaFormat.createVideoFormat(MIME, width, height).apply {
        setInteger(MediaFormat.KEY_COLOR_FORMAT, MediaCodecInfo.CodecCapabilities.COLOR_FormatYUV420SemiPlanar)
        setInteger(MediaFormat.KEY_BIT_RATE, BIT_RATE)
        setInteger(MediaFormat.KEY_FRAME_RATE, 10)
        setInteger(MediaFormat.KEY_I_FRAME_INTERVAL, I_FRAME_INTERVAL)
      }

    val encoder = MediaCodec.createEncoderByType(MIME)
    encoder.configure(format, null, null, MediaCodec.CONFIGURE_FLAG_ENCODE)
    encoder.start()

    val muxer = MediaMuxer(out.absolutePath, MediaMuxer.OutputFormat.MUXER_OUTPUT_MPEG_4)
    var trackIndex = -1
    var muxerStarted = false
    val bufferInfo = MediaCodec.BufferInfo()

    val yuv = ByteArray(width * height * 3 / 2)
    var ptsUs = 0L
    val frameDurationUs = FRAME_STEP_MS * 1000L
    var t = 0L
    var framesEncoded = 0
    val maxFrames = ((durationMs / FRAME_STEP_MS) + 2).toInt().coerceAtMost(450)

    try {
      while (t <= durationMs && framesEncoded < maxFrames) {
        val raw =
          retriever.getFrameAtTime(t * 1000L, MediaMetadataRetriever.OPTION_CLOSEST)
            ?: break
        val frame =
          if (raw.width == width && raw.height == height) {
            raw
          } else {
            val scaled = Bitmap.createScaledBitmap(raw, width, height, true)
            if (scaled !== raw) raw.recycle()
            scaled
          }

        val dets = nearestDets(reports, t)
        drawBoxes(frame, dets, confThresh)
        bitmapToNv12(frame, yuv, width, height)
        if (!frame.isRecycled) frame.recycle()

        // Feed encoder
        var inputDone = false
        while (!inputDone) {
          val inIndex = encoder.dequeueInputBuffer(10_000)
          if (inIndex >= 0) {
            val inBuf = encoder.getInputBuffer(inIndex)!!
            inBuf.clear()
            inBuf.put(yuv)
            encoder.queueInputBuffer(inIndex, 0, yuv.size, ptsUs, 0)
            inputDone = true
          } else {
            drainEncoder(encoder, bufferInfo, muxer, trackIndex, muxerStarted).also {
              trackIndex = it.first
              muxerStarted = it.second
            }
          }
        }

        val drained = drainEncoder(encoder, bufferInfo, muxer, trackIndex, muxerStarted)
        trackIndex = drained.first
        muxerStarted = drained.second

        ptsUs += frameDurationUs
        t += FRAME_STEP_MS
        framesEncoded++
      }

      // EOS
      val inIndex = encoder.dequeueInputBuffer(50_000)
      if (inIndex >= 0) {
        encoder.queueInputBuffer(inIndex, 0, 0, ptsUs, MediaCodec.BUFFER_FLAG_END_OF_STREAM)
      }
      var eos = false
      while (!eos) {
        val drained = drainEncoder(encoder, bufferInfo, muxer, trackIndex, muxerStarted, waitEos = true)
        trackIndex = drained.first
        muxerStarted = drained.second
        eos = drained.third
      }
    } finally {
      try {
        encoder.stop()
      } catch (_: Exception) {
      }
      encoder.release()
      if (muxerStarted) {
        try {
          muxer.stop()
        } catch (_: Exception) {
        }
      }
      muxer.release()
      retriever.release()
    }

    if (!out.exists() || out.length() < 1000L) {
      throw Exception("Annotated video encode produced empty file")
    }
    Log.i(TAG, "annotateVideoUri wrote ${out.absolutePath} (${out.length()} bytes, $framesEncoded frames)")
    return out.absolutePath
  }

  private fun drainEncoder(
    encoder: MediaCodec,
    bufferInfo: MediaCodec.BufferInfo,
    muxer: MediaMuxer,
    trackIndexIn: Int,
    muxerStartedIn: Boolean,
    waitEos: Boolean = false,
  ): Triple<Int, Boolean, Boolean> {
    var trackIndex = trackIndexIn
    var muxerStarted = muxerStartedIn
    var eos = false
    while (true) {
      val outIndex = encoder.dequeueOutputBuffer(bufferInfo, if (waitEos) 50_000 else 0)
      when {
        outIndex == MediaCodec.INFO_TRY_AGAIN_LATER -> break
        outIndex == MediaCodec.INFO_OUTPUT_FORMAT_CHANGED -> {
          if (muxerStarted) throw RuntimeException("format changed twice")
          trackIndex = muxer.addTrack(encoder.outputFormat)
          muxer.start()
          muxerStarted = true
        }
        outIndex >= 0 -> {
          val outBuf = encoder.getOutputBuffer(outIndex)!!
          if (bufferInfo.flags and MediaCodec.BUFFER_FLAG_CODEC_CONFIG != 0) {
            bufferInfo.size = 0
          }
          if (bufferInfo.size != 0 && muxerStarted) {
            outBuf.position(bufferInfo.offset)
            outBuf.limit(bufferInfo.offset + bufferInfo.size)
            muxer.writeSampleData(trackIndex, outBuf, bufferInfo)
          }
          val isEos = bufferInfo.flags and MediaCodec.BUFFER_FLAG_END_OF_STREAM != 0
          encoder.releaseOutputBuffer(outIndex, false)
          if (isEos) {
            eos = true
            break
          }
        }
      }
    }
    return Triple(trackIndex, muxerStarted, eos)
  }

  private fun parseReports(raw: List<Map<String, Any>>): List<Report> {
    return raw.mapNotNull { m ->
      val atMs = ((m["atMs"] as? Number)?.toLong()) ?: return@mapNotNull null
      @Suppress("UNCHECKED_CAST")
      val detsRaw = m["detections"] as? List<Map<String, Any>> ?: emptyList()
      val dets =
        detsRaw.map { d ->
          Det(
            x = (d["x"] as? Number)?.toFloat() ?: 0f,
            y = (d["y"] as? Number)?.toFloat() ?: 0f,
            width = (d["width"] as? Number)?.toFloat() ?: 0f,
            height = (d["height"] as? Number)?.toFloat() ?: 0f,
            label = d["label"] as? String ?: "obj",
            confidence = (d["confidence"] as? Number)?.toFloat() ?: 0f,
          )
        }
      Report(atMs = atMs, detections = dets)
    }.sortedBy { it.atMs }
  }

  private fun nearestDets(reports: List<Report>, tMs: Long): List<Det> {
    if (reports.isEmpty()) return emptyList()
    var best = reports[0]
    var bestDist = abs(best.atMs - tMs)
    for (r in reports) {
      val d = abs(r.atMs - tMs)
      if (d < bestDist) {
        best = r
        bestDist = d
      }
    }
    // Only show boxes if a sample was near this timestamp (avoid stale boxes).
    return if (bestDist <= FRAME_STEP_MS * 3) best.detections else emptyList()
  }

  private fun drawBoxes(bitmap: Bitmap, dets: List<Det>, confThresh: Float) {
    if (dets.isEmpty()) return
    val canvas = Canvas(bitmap)
    val stroke =
      Paint(Paint.ANTI_ALIAS_FLAG).apply {
        style = Paint.Style.STROKE
        strokeWidth = max(3f, bitmap.width / 200f)
      }
    val fill =
      Paint(Paint.ANTI_ALIAS_FLAG).apply {
        style = Paint.Style.FILL
        color = Color.argb(190, 7, 17, 13)
      }
    val textPaint =
      Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = Color.WHITE
        textSize = max(28f, bitmap.width / 28f)
        typeface = Typeface.DEFAULT_BOLD
      }

    for (d in dets) {
      val high = d.confidence >= confThresh
      stroke.color = Color.parseColor(if (high) BOX_GREEN else BOX_AMBER)
      val x = d.x * bitmap.width
      val y = d.y * bitmap.height
      val w = d.width * bitmap.width
      val h = d.height * bitmap.height
      canvas.drawRect(x, y, x + w, y + h, stroke)
      val title = "${d.label} ${(d.confidence * 100).toInt()}%"
      val tw = textPaint.measureText(title)
      val th = textPaint.textSize + 12f
      val ly = max(0f, y - th - 4f)
      fill.color = Color.parseColor(if (high) BOX_GREEN else BOX_AMBER)
      fill.alpha = 200
      canvas.drawRect(x, ly, min(bitmap.width.toFloat(), x + tw + 16f), ly + th, fill)
      canvas.drawText(title, x + 8f, ly + th - 10f, textPaint)
    }
  }

  /** NV12 (YUV420 semi-planar) for COLOR_FormatYUV420SemiPlanar. */
  private fun bitmapToNv12(bitmap: Bitmap, out: ByteArray, width: Int, height: Int) {
    val argb = IntArray(width * height)
    bitmap.getPixels(argb, 0, width, 0, 0, width, height)
    var yIndex = 0
    var uvIndex = width * height
    for (j in 0 until height) {
      for (i in 0 until width) {
        val c = argb[j * width + i]
        val r = (c shr 16) and 0xff
        val g = (c shr 8) and 0xff
        val b = c and 0xff
        val y = ((66 * r + 129 * g + 25 * b + 128) shr 8) + 16
        out[yIndex++] = y.coerceIn(0, 255).toByte()
        if (j % 2 == 0 && i % 2 == 0) {
          val u = ((-38 * r - 74 * g + 112 * b + 128) shr 8) + 128
          val v = ((112 * r - 94 * g - 18 * b + 128) shr 8) + 128
          if (uvIndex + 1 < out.size) {
            out[uvIndex++] = u.coerceIn(0, 255).toByte()
            out[uvIndex++] = v.coerceIn(0, 255).toByte()
          }
        }
      }
    }
  }

  private fun resolvePath(uri: String): String {
    return when {
      uri.startsWith("file://") -> uri.removePrefix("file://")
      uri.startsWith("content://") -> throw Exception("content:// URIs not supported for annotateVideoUri")
      else -> uri
    }
  }
}
