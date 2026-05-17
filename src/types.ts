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

export type StoryRole =
  | "setup"
  | "user_instruction"
  | "agent_work"
  | "code_change"
  | "test_or_error"
  | "visual_result"
  | "decision"
  | "final_result"
  | "transition"
  | "evidence"

export type EventKind =
  | "setup"
  | "instruction"
  | "agent_work"
  | "code_edit"
  | "test"
  | "error"
  | "browser_check"
  | "result"
  | "idle"
  | "transition"
  | "other"

export type Importance = "low" | "medium" | "high"
export type SuggestedSpeed = "keep" | "speed_up" | "cut"

export type QwenEvent = {
  id?: string
  fromFrame: string
  toFrame: string
  fromTime: string
  toTime: string
  visible: string
  action: string
  meaning: string
  kind?: EventKind
  importance?: Importance
  isIdle?: boolean
  suggestedSpeed?: SuggestedSpeed
  requiresKeyframe?: boolean
  editingHint?: string
  voiceoverHint?: string
}

export type QwenKeyframe = {
  frame: string
  timecode: string
  timeSec?: number
  reason: string
  storyRole?: StoryRole
  coverageGroup?: string
  noveltyScore?: number
  mustKeep?: boolean
  duplicateOf?: string
  coveredEventIds?: string[]
  importance?: Importance
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

export type TimelineFile = {
  inputVideo: string
  videoDurationSec: number
  batches: QwenBatchResult[]
}

export type StoryChapter = {
  id: string
  title: string
  fromTime: string
  toTime: string
  summary: string
  importantEvents: string[]
  recommendedKeyframeRoles: StoryRole[]
  editingNotes: string
  voiceoverAngle: string
}
