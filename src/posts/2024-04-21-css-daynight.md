---
title: 用 60 行 CSS 实现昼夜呼吸
date: 2024-04-21
tag: 工程
slug: css-daynight
---

这个博客的昼夜切换，从日出橙到深林绿，背后只有一个 HTML 属性、一组 CSS 变量、和几行 JavaScript。

没有框架，没有状态管理。切换一个属性，颜色就跟着变。

## 核心思路

用 `data-theme` 属性作为开关，挂在 `<html>` 元素上：

```css
:root[data-theme="day"] {
  --bg:   #f4ecd8;
  --ink:  #4a3f2f;
  --moss: #7a8c4a;
  --gold: #d4a943;
}

:root[data-theme="night"] {
  --bg:   #1a2118;
  --ink:  #e8e4d4;
  --moss: #8fa85a;
  --gold: #f0c95a;
}
```

然后整个页面的所有颜色都用 `var(--ink)`、`var(--bg)` 这类变量写。切换主题时，只需要改 `data-theme` 的值，CSS 变量会级联更新到所有地方。

## 过渡动画

光有变量还不够，直接切换会闪烁。加一条 `transition` 让它呼吸：

```css
body {
  background: var(--bg);
  color: var(--ink);
  transition:
    background 1.1s cubic-bezier(.4, 0, .2, 1),
    color 1.1s ease;
}
```

注意曲线选的是缓入缓出，不是线性。颜色变化本身就是视觉信息，一点缓冲让眼睛有时间适应。1.1 秒是我测试后觉得最"像呼吸"的时长——再快变成切换，再慢变成等待。

## JavaScript 部分

```javascript
const root = document.documentElement;

toggle.addEventListener('click', () => {
  const theme = root.getAttribute('data-theme');
  root.setAttribute('data-theme', theme === 'day' ? 'night' : 'day');
});
```

就这几行。不需要 `localStorage`（这是个阅读型页面，不是应用），不需要监听系统偏好（主题是读者主动选的）。

## 为什么不用 CSS class

很多实现用 `.dark-mode` class 切换，理论上也可以。我用 `data-theme` 是因为它更语义化——属性名就说清楚了这是什么。而且以后想加第三个主题（比如"黄昏"）也是自然扩展：

```css
:root[data-theme="dusk"] {
  --bg:   #2d1f1a;
  --ink:  #f0e0c8;
  --moss: #c8906a;
}
```

而不是 `.dark-mode.dusk-mode` 这种奇怪的组合。

---

大部分视觉系统的复杂度，都可以用"对的抽象层"压下去。这里的对的抽象层，是 CSS 自定义属性。
