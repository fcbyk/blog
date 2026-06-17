import type {
  HelloMsg,
  KeywordReplyConfig,
  RegexReplyConfig,
  UrlTriggerConfig,
  AvatarConfig
} from "./config"
import type { ActionMenu } from "./menu"

export type Datas = {
  baseConfig: {
    helloMsg: HelloMsg
    avatar: AvatarConfig
    menu: ActionMenu
  }
  keywordReplies: KeywordReplyConfig
  regexReplies: RegexReplyConfig
  urlTriggers: UrlTriggerConfig
}
