export function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob),
    link = document.createElement('a')
  link.href = url
  link.download = name
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 30000)
}
export const safeName = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .slice(0, 80) || 'motion'
