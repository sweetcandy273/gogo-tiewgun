import { showToast } from './copy'

/** Read Chinese text aloud with the phone's built-in voice (Web Speech API, free, no network). */
export function canSpeak(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window
}

function pickVoice(): SpeechSynthesisVoice | undefined {
  const voices = window.speechSynthesis.getVoices()
  return voices.find((v) => /^zh[-_]CN/i.test(v.lang))
    ?? voices.find((v) => /^zh/i.test(v.lang) && !/HK|TW|yue/i.test(v.lang))
    ?? voices.find((v) => /^zh/i.test(v.lang))
}

export function speakZh(text: string): void {
  if (!canSpeak()) { showToast('มือถือเครื่องนี้เล่นเสียงไม่ได้'); return }
  const t = text.replace(/[·]/g, '，').trim()
  if (!t) return
  const synth = window.speechSynthesis
  synth.cancel() // stop anything still playing
  const u = new SpeechSynthesisUtterance(t)
  u.lang = 'zh-CN'
  u.rate = 0.8
  const v = pickVoice()
  if (v) u.voice = v
  u.onerror = (e) => { if (e.error !== 'interrupted' && e.error !== 'canceled') showToast('เล่นเสียงไม่ได้ ลองเปิดเสียงเครื่อง/ปิดโหมดเงียบ') }
  synth.speak(u)
}

// some browsers load voices asynchronously
if (canSpeak()) window.speechSynthesis.getVoices()
