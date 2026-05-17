export type FrameInfo = {
  index: number
  timeSec: number
  timecode: string
  file: string
}

export type BatchInfo = {
  id: string
  index: number
  fromFrame: string
  toFrame: string
  fromTime: string
  toTime: string
  frames: string[]
  promptFile: string
  contactSheetFile?: string
}

export type StoryManifest = {
  inputVideo: string
  outputDir: string
  videoDurationSec: number
  frameCount: number
  batchSize: number
  frames: FrameInfo[]
  batches: BatchInfo[]
}

export type QwenEvent = {
  fromFrame: string
  toFrame: string
  fromTime: string
  toTime: string
  visible: string
  action: string
  meaning: string
  editingHint?: string
  voiceoverHint?: string
}

export type QwenKeyframe = {
  frame: string
  timecode: string
  timeSec?: number
  reason: string
  storyRole?: string
  importance?: "low" | "medium" | "high"
}

export type QwenBatchResult = {
  batch: string
  coverage: {
    from: string
    to: string
    framesSeen: number
  }
  events: QwenEvent[]
  possibleKeyframes?: QwenKeyframe[]
  segmentSummary?: string
}
