import type { MessageConfigWithRole } from "./message"

// 基础菜单项
export type ActionMenuItemBase = {
  label: string
  messages: MessageConfigWithRole[]
}

// 带子菜单的项
export type ActionMenuItemWithChildren = {
  label: string
  child: {
    label: string
    messages: MessageConfigWithRole[]
  }[]
  messages?: never
}

// 联合类型
export type ActionMenuItem = ActionMenuItemBase | ActionMenuItemWithChildren

// 菜单列表
export type ActionMenu = ActionMenuItem[]
