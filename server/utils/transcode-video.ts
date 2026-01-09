import { execa } from 'execa'
import path from 'path'

// Define interfaces for better type safety
interface ResolutionVariant {
  height: number
  videoBitrate: string // Base bitrate for this resolution
}

interface AudioVariant {
  bitrate: string
  channels: number
}

// Constants
const SEGMENT_DURATION = 4
const FPS = 30
const GOP_SIZE = FPS * SEGMENT_DURATION

// Codec definition strictly ordered as requested
const CODECS = [
  { name: 'av1', ffmpegCodec: 'libsvtav1', ext: 'av1' },
  { name: 'hevc', ffmpegCodec: 'libx265', ext: 'hevc' },
  { name: 'vp9', ffmpegCodec: 'libvpx-vp9', ext: 'vp9' },
  { name: 'avc', ffmpegCodec: 'libx264', ext: 'avc' },
]

// Resolutions ordered descending (1920 -> 1080 -> 720)
const VIDEO_VARIANTS: ResolutionVariant[] = [
  { height: 1080, videoBitrate: '3500k' },
  { height: 720, videoBitrate: '2000k' },
  { height: 480, videoBitrate: '1200k' },
]

// Exactly two audio streams as requested
const AUDIO_VARIANTS: AudioVariant[] = [
  { bitrate: '192k', channels: 2 }, // High quality
  { bitrate: '128k', channels: 2 }, // Standard quality
]

export async function generateMpd(params: { mediaId: string }): Promise<string> {
  const fs = useStorage('fs')

  const { mediaId } = params
  const mpdXml = await fs.getItemRaw(path.join('cache/video', `${mediaId}.mpd`))

  return mpdXml
}

export default async function (filePath: string, outputDir: string) {
  if (!filePath || typeof filePath !== 'string') throw new Error('Invalid filePath')

  const absoluteFilePath = path.resolve(filePath)
  const outputName = path.basename(filePath.split('_').at(-1)!, path.extname(filePath))

  const ffmpegArgs: string[] = [
    '-y', // Overwrite output
    '-i',
    absoluteFilePath,
  ]

  // =========================================================================
  // 1. CONSTRUCT FILTER COMPLEX (Optimization: Scale Once, Split Many)
  // =========================================================================
  const filterComplex: string[] = []

  // We need to map which filter output goes to which video stream index (0-11)
  // Logic:
  // Loop Res 1920 -> Codec AV1(0), HEVC(1), VP9(2), AVC(3)
  // Loop Res 1080 -> Codec AV1(4), HEVC(5), VP9(6), AVC(7)
  // ...

  VIDEO_VARIANTS.forEach((variant) => {
    // Input label for this resolution chain
    const scaleOutLabel = `vscale_${variant.height}`

    // Safety scaling: Ensure width is divisible by 2 for YUV420p
    // trunc(oh*a/2)*2 ensures even width based on aspect ratio
    const scaleFilter = `[0:v]scale=trunc(oh*a/2)*2:${variant.height}:flags=lanczos,fps=${FPS}[${scaleOutLabel}]`
    filterComplex.push(scaleFilter)

    // Split the scaled output into 4 streams (one for each codec)
    // Output labels will be like: [v1920_av1], [v1920_hevc], etc.
    const splitOutputs = CODECS.map((c) => `[v${variant.height}_${c.name}]`).join('')
    filterComplex.push(`[${scaleOutLabel}]split=${CODECS.length}${splitOutputs}`)
  })

  ffmpegArgs.push('-filter_complex', filterComplex.join(';'))

  // =========================================================================
  // 2. CONSTRUCT VIDEO STREAMS (Indices 0 - 11)
  // =========================================================================
  let outputStreamIndex = 0

  VIDEO_VARIANTS.forEach((variant) => {
    CODECS.forEach((codec) => {
      const currentIdx = outputStreamIndex
      const inputLabel = `[v${variant.height}_${codec.name}]`

      // Map the specific split output to this stream index
      ffmpegArgs.push('-map', inputLabel)

      // Common Video Settings
      ffmpegArgs.push(
        `-c:v:${currentIdx}`,
        codec.ffmpegCodec,
        `-g:v:${currentIdx}`,
        `${GOP_SIZE}`, // Fixed GOP
        `-keyint_min:v:${currentIdx}`,
        `${GOP_SIZE}`, // Minimum Keyframe interval
        `-sc_threshold:v:${currentIdx}`,
        '0', // Disable scene cut detection (CRITICAL for DASH)
        `-flags:v:${currentIdx}`,
        '+cgop' // Closed GOP
      )

      // Codec Specific Optimization
      if (codec.name === 'av1') {
        ffmpegArgs.push(
          `-crf:v:${currentIdx}`,
          '35',
          `-preset:v:${currentIdx}`,
          '8',
          `-svtav1-params:v:${currentIdx}`,
          `tune=0:enable-overlays=1:scm=0` // Optional SVT-AV1 tuning
        )
      } else {
        // Bitrate control for non-AV1
        const bufSize = `${parseInt(variant.videoBitrate) * 2}k`
        ffmpegArgs.push(`-b:v:${currentIdx}`, variant.videoBitrate, `-maxrate:v:${currentIdx}`, variant.videoBitrate, `-bufsize:v:${currentIdx}`, bufSize)

        if (codec.name === 'avc') {
          ffmpegArgs.push(`-profile:v:${currentIdx}`, 'high', `-preset:v:${currentIdx}`, 'medium')
        } else if (codec.name === 'hevc') {
          ffmpegArgs.push(`-tag:v:${currentIdx}`, 'hvc1', `-preset:v:${currentIdx}`, 'medium')
        } else if (codec.name === 'vp9') {
          ffmpegArgs.push(`-row-mt:v:${currentIdx}`, '1', `-deadline:v:${currentIdx}`, 'good', `-cpu-used:v:${currentIdx}`, '2')
        }
      }

      outputStreamIndex++
    })
  })

  // =========================================================================
  // 3. CONSTRUCT AUDIO STREAMS (Indices 12, 13)
  // =========================================================================
  // Current outputStreamIndex should be 12 here

  AUDIO_VARIANTS.forEach((audioVar) => {
    const currentIdx = outputStreamIndex
    ffmpegArgs.push(
      '-map',
      '0:a:0', // Always map from original first audio track
      `-c:a:${currentIdx}`,
      'aac',
      `-b:a:${currentIdx}`,
      audioVar.bitrate,
      `-ac:a:${currentIdx}`,
      `${audioVar.channels}`,
      `-ar:a:${currentIdx}`,
      '48000'
    )
    outputStreamIndex++
  })

  // =========================================================================
  // 4. GENERATE ADAPTATION SETS STRINGS
  // =========================================================================
  // We need to group streams by codec.
  // Structure:
  // AV1 Group:  Indices where codec is AV1 (0, 4, 8)
  // HEVC Group: Indices where codec is HEVC (1, 5, 9)
  // ...
  // Audio Group: Indices 12, 13

  const adaptationSets: string[] = []

  // Create Video Adaptation Sets (0 to 3)
  CODECS.forEach((codec, codecIndex) => {
    // Logic: The codec appears every 4th stream, starting at its own index
    // e.g. AV1 is at 0, then 0+4, then 0+4+4...
    const streamIndices: number[] = []
    VIDEO_VARIANTS.forEach((_, resIndex) => {
      const streamId = codecIndex + resIndex * CODECS.length
      streamIndices.push(streamId)
    })

    adaptationSets.push(`id=${codecIndex},streams=${streamIndices.join(',')}`)
  })

  // Create Audio Adaptation Set (4)
  const audioIndices = AUDIO_VARIANTS.map((_, i) => 12 + i).join(',')
  adaptationSets.push(`id=${CODECS.length},streams=${audioIndices}`)

  // =========================================================================
  // 5. DASH OUTPUT CONFIGURATION
  // =========================================================================
  const mpdFileName = `${outputName}.mpd`

  ffmpegArgs.push(
    '-f',
    'dash',
    '-seg_duration',
    `${SEGMENT_DURATION}`,
    '-use_timeline',
    '1',
    '-use_template',
    '1',
    '-adaptation_sets',
    adaptationSets.join(' '),
    '-init_seg_name',
    `${outputName}_$RepresentationID$_init.mp4`,
    '-media_seg_name',
    `${outputName}_$RepresentationID$_seg_$Number$.m4s`,
    mpdFileName
  )

  try {
    await execa('ffmpeg', ffmpegArgs, { cwd: outputDir })

    return {
      success: true,
      mpdFile: path.join(outputDir, mpdFileName),
      outputDir: outputDir,
    }
  } catch (error: unknown) {
    console.error('❌ FFmpeg failed:', error)
    // Re-throw to allow caller to handle
    throw error
  }
}
