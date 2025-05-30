export const TTS_VOICES = [
  { value: 'alloy', label: 'Alloy' },
  { value: 'ash', label: 'Ash' },
  { value: 'ballad', label: 'Ballad' },
  { value: 'coral', label: 'Coral' },
  { value: 'echo', label: 'Echo' },
  { value: 'fable', label: 'Fable' },
  { value: 'nova', label: 'Nova' },
  { value: 'onyx', label: 'Onyx' },
  { value: 'sage', label: 'Sage' },
  { value: 'shimmer', label: 'Shimmer' },
] as const

export const TTS_VIBES = [
  { value: 'friendly', label: 'Thân thiện' },
  { value: 'professional', label: 'Chuyên nghiệp' },
  { value: 'energetic', label: 'Năng động' },
  { value: 'calm', label: 'Bình tĩnh' },
] as const

export const VIBE_INSTRUCTIONS = {
  friendly: {
    voiceAffect: "Warm and welcoming",
    tone: "Friendly and approachable",
    pacing: "Natural and conversational",
    emotions: "Warmth and enthusiasm",
    pronunciation: "Clear and natural"
  },
  professional: {
    voiceAffect: "Clear and authoritative",
    tone: "Professional and confident",
    pacing: "Steady and measured",
    emotions: "Confidence and competence",
    pronunciation: "Precise and articulate"
  },
  energetic: {
    voiceAffect: "Dynamic and lively",
    tone: "Enthusiastic and engaging",
    pacing: "Upbeat and quick",
    emotions: "Energy and excitement",
    pronunciation: "Clear and vibrant"
  },
  calm: {
    voiceAffect: "Calm and composed",
    tone: "Soothing and reassuring",
    pacing: "Slow and steady",
    emotions: "Peace and tranquility",
    pronunciation: "Soft and clear"
  }
} as const

export const getVibeInstructions = (vibe: keyof typeof VIBE_INSTRUCTIONS) => {
  const instructions = VIBE_INSTRUCTIONS[vibe]
  return `Voice Affect: ${instructions.voiceAffect}. Tone: ${instructions.tone}. Pacing: ${instructions.pacing}. Emotions: ${instructions.emotions}. Pronunciation: ${instructions.pronunciation}.`
}

export type TTSVoice = typeof TTS_VOICES[number]['value']
export type TTSVibe = typeof TTS_VIBES[number]['value']
