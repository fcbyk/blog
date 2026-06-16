export interface TreeItem {
  name: string
  path: string
  type: 'file' | 'folder'
  children?: TreeItem[]
}
