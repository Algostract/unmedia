export type ResolutionEntry = { width: number; height: number; bandwidth: number }

export default function (aspectRatio: string, heights: number[]): ResolutionEntry[] {
  const [wRatio, hRatio] = aspectRatio.split(':').map(Number)

  return heights.map((height) => {
    const width = Math.round((height * wRatio) / hRatio)
    const bandwidth = Math.round(height * height * 10) // simple heuristic
    return { width, height, bandwidth }
  })
}
