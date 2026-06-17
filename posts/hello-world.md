# Hello World

> 第一篇博客文章，测试 Markdown 渲染效果。

---

## 代码块

### JavaScript

```js
function greet(name) {
  return `你好，${name}！`
}

console.log(greet('世界'))
```

### TypeScript

```ts
interface User {
  name: string
  age: number
}

const user: User = { name: 'Coke', age: 25 }
```

### Python

```python
def fibonacci(n):
    a, b = 0, 1
    for _ in range(n):
        yield a
        a, b = b, a + b

print(list(fibonacci(10)))
```

## 表格

| 名称 | 类型 | 描述 |
|------|------|------|
| Nuxt | 框架 | Vue 全栈框架 |
| Tailwind | CSS | 实用优先的 CSS 框架 |
| markdown-it | 渲染 | Markdown 解析器 |

## 引用

> 代码如诗，架构如画。
> — 某位程序员

## 列表

1. 安装依赖
2. 配置项目
3. 开始开发
4. 部署上线

---

*写于 2024 年*
