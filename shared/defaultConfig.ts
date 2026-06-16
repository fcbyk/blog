import type { Datas } from './types/database'

export const DEFAULT_CONFIG: Datas = {
  baseConfig: {
    helloMsg: [
        {
            type: 'text',
            content: '请求超时, 请稍后重试'
        }
    ],
    avatar: {},
    menu: []
  },
  keywordReplies: {},
  regexReplies: [],
  urlTriggers: {}
}
