/** Thai readings for Chinese terms (term → คำอ่าน), registered by each trip guide. */
const readings = new Map<string, string>()

export function registerReadings(map: Record<string, string>): void {
  for (const [k, v] of Object.entries(map)) if (k && v) readings.set(k, v)
}

export function readingOf(term: string): string | undefined {
  return readings.get(term.trim())
}

const ZH_SPAN = /<span class="zh">([^<]+)<\/span>/g

/** Insert a small Thai reading right after every Chinese chip in trusted guide HTML. */
export function withReadings(html: string): string {
  return html.replace(ZH_SPAN, (m, term: string) => {
    const th = readingOf(term)
    return th ? `${m}<span class="zh-th">${escapeHtml(th)}</span>` : m
  })
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string)
}
