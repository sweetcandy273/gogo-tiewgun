/** Shrink a phone photo to ≤ maxSide px JPEG before upload (keeps storage and data usage small). */
export async function compressImage(file: File, maxSide = 1080, quality = 0.8): Promise<Blob> {
  if (!file.type.startsWith('image/')) throw new Error('ไฟล์นี้ไม่ใช่รูปภาพ')
  if (file.size > 25 * 1024 * 1024) throw new Error('รูปใหญ่เกินไป (เกิน 25 MB)')

  const url = URL.createObjectURL(file)
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image()
      i.onload = () => resolve(i)
      i.onerror = () => reject(new Error('เปิดรูปนี้ไม่ได้ ลองเลือกรูปอื่นหรือถ่ายใหม่'))
      i.src = url
    })
    const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight))
    const w = Math.max(1, Math.round(img.naturalWidth * scale))
    const h = Math.max(1, Math.round(img.naturalHeight * scale))
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('เบราว์เซอร์นี้ย่อรูปไม่ได้')
    ctx.fillStyle = '#fff' // flatten transparent PNGs
    ctx.fillRect(0, 0, w, h)
    ctx.drawImage(img, 0, 0, w, h)
    return await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('แปลงรูปไม่สำเร็จ'))), 'image/jpeg', quality))
  } finally {
    URL.revokeObjectURL(url)
  }
}
