// Voice list from new_voice.md
export interface VoiceOption {
  value: string
  label: string
  gender: 'male' | 'female'
}

export const TTS_VOICES_V2: VoiceOption[] = [
  { value: 'Achernar', label: 'Achernar', gender: 'female' },
  { value: 'Achird', label: 'Achird', gender: 'male' },
  { value: 'Algenib', label: 'Algenib', gender: 'male' },
  { value: 'Algieba', label: 'Algieba', gender: 'male' },
  { value: 'Alnilam', label: 'Alnilam', gender: 'male' },
  { value: 'Aoede', label: 'Aoede', gender: 'female' },
  { value: 'Autonoe', label: 'Autonoe', gender: 'female' },
  { value: 'Callirrhoe', label: 'Callirrhoe', gender: 'female' },
  { value: 'Charon', label: 'Charon', gender: 'male' },
  { value: 'Despina', label: 'Despina', gender: 'female' },
  { value: 'Enceladus', label: 'Enceladus', gender: 'male' },
  { value: 'Erinome', label: 'Erinome', gender: 'female' },
  { value: 'Fenrir', label: 'Fenrir', gender: 'male' },
  { value: 'Gacrux', label: 'Gacrux', gender: 'female' },
  { value: 'Iapetus', label: 'Iapetus', gender: 'male' },
  { value: 'Kore', label: 'Kore', gender: 'female' },
  { value: 'Laomedeia', label: 'Laomedeia', gender: 'female' },
  { value: 'Leda', label: 'Leda', gender: 'female' },
  { value: 'Orus', label: 'Orus', gender: 'male' },
  { value: 'Pulcherrima', label: 'Pulcherrima', gender: 'female' },
  { value: 'Puck', label: 'Puck', gender: 'male' },
  { value: 'Rasalgethi', label: 'Rasalgethi', gender: 'male' },
  { value: 'Sadachbia', label: 'Sadachbia', gender: 'male' },
  { value: 'Sadaltager', label: 'Sadaltager', gender: 'male' },
  { value: 'Schedar', label: 'Schedar', gender: 'male' },
  { value: 'Sulafat', label: 'Sulafat', gender: 'female' },
  { value: 'Umbriel', label: 'Umbriel', gender: 'male' },
  { value: 'Vindemiatrix', label: 'Vindemiatrix', gender: 'female' },
  { value: 'Zephyr', label: 'Zephyr', gender: 'female' },
  { value: 'Zubenelgenubi', label: 'Zubenelgenubi', gender: 'male' },
]

export const getVoicesByGender = (gender: 'male' | 'female' | 'all'): VoiceOption[] => {
  if (gender === 'all') {
    return TTS_VOICES_V2
  }
  return TTS_VOICES_V2.filter(voice => voice.gender === gender)
}

export const getMaleVoices = (): VoiceOption[] => getVoicesByGender('male')
export const getFemaleVoices = (): VoiceOption[] => getVoicesByGender('female')
