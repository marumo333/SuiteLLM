/**
 * @param {string} markdown
 * @returns {{ title: string, items: { done: boolean, text: string }[] }[]}
 */
export function parseTasks(markdown) {
  const sections = []
  let current = null
  for (const line of markdown.split('\n')) {
    const heading = /^##\s+(.+)\s*$/.exec(line)
    if (heading) {
      current = { title: heading[1], items: [] }
      sections.push(current)
      continue
    }
    const item = /^- \[([ x])\]\s+(.+)\s*$/.exec(line)
    if (!item) continue
    if (!current) {
      current = { title: '作業', items: [] }
      sections.push(current)
    }
    current.items.push({ done: item[1] === 'x', text: item[2] })
  }
  return sections
}
