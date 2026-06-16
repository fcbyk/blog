import MarkdownIt from 'markdown-it'
import hljs from 'highlight.js'

let md: MarkdownIt | null = null

function getMd(): MarkdownIt {
  if (md) return md

  md = new MarkdownIt({
    html: true,
    linkify: true,
    typographer: true,
    highlight(str: string, lang: string) {
      if (lang && hljs.getLanguage(lang)) {
        try {
          return hljs.highlight(str, { language: lang }).value
        } catch {
          // fallthrough
        }
      }
      return '' // 不传 lang 的代码块不额外处理
    },
  })

  return md
}

export function renderMarkdown(raw: string): string {
  return getMd().render(raw)
}
