# 当前排版与断行引擎架构分析

日期：2026-04-26

## 1. 结论概览

当前项目没有一个统一抽象出来的“排版/断行引擎”。实际实现分成两层：

1. **行列表布局层**：由 `packages/core/src/lyric-player/base.ts` 中的 `LyricPlayerBase` 统一负责，处理歌词行状态、当前行定位、纵向滚动、缩放、透明度、模糊、背景人声和间奏点。
2. **行内文本布局层**：不同渲染器各自处理。
   - 默认 `DomLyricPlayer` 主要依赖浏览器 CSS 排版和断行。
   - `DomSlimLyricPlayer` 是低性能设备路径，仍主要依赖 DOM/CSS，但行为更精简。
   - `CanvasLyricPlayer` 使用 `packages/core/src/lyric-player/canvas/text-layout.ts` 中的手写测量与断行逻辑。

因此，当前所谓“断行引擎”的主体在默认路径中并不是一段独立算法，而是由 **分词/分组工具、DOM 结构、CSS 断行规则、浏览器排版引擎** 共同组成。Canvas 路径才有显式手写断行算法，但目前能力和完成度明显弱于 DOM 路径。

## 2. 在整个文本处理系统中的层级关系

### 2.1 数据入口

歌词数据一般来自：

- `packages/lyric/src`：解析 LRC、YRC、QRC、LYS、TTML 等格式。
- `packages/ttml/src`：解析 TTML 并转换为 AMLL 结构。
- playground / react-full 通过解析器拿到 `LyricLine[]` 后传给核心播放器。

核心数据结构位于：

- `packages/core/src/interfaces.ts`

关键结构：

```ts
interface LyricLine {
  words: LyricWord[];
  translatedLyric: string;
  romanLyric: string;
  startTime: number;
  endTime: number;
  isBG: boolean;
  isDuet: boolean;
}
```

这里已经把文本排版所需的主要元信息放在同一个对象里：

- `words`：主歌词及逐词时间轴。
- `translatedLyric`：翻译行。
- `romanLyric`：音译行。
- `isBG`：背景人声行。
- `isDuet`：对唱行，影响水平对齐。

### 2.2 核心播放器层

核心播放器入口：

- `packages/core/src/lyric-player/index.ts`

默认导出：

```ts
DomLyricPlayer as LyricPlayer
```

也就是说，默认使用 DOM 渲染器。

可用实现：

- `DomLyricPlayer`
- `DomSlimLyricPlayer`
- `CanvasLyricPlayer`

`react-full` 中可以通过配置选择这三种实现：

- `packages/react-full/src/states/configAtoms.ts`

### 2.3 共享行列表布局层

`LyricPlayerBase` 位于：

- `packages/core/src/lyric-player/base.ts`

它不是纯文本断行模块，但它是整个歌词显示排版的核心调度层，负责：

- 接收歌词：`setLyricLines()`
- 优化歌词时间轴：`optimizeLyricLines()`
- 判断当前热行：`setCurrentTime()`
- 计算纵向布局：`calcLayout()`
- 设置对齐方式：`setAlignAnchor()` / `setAlignPosition()`
- 管理行尺寸缓存：`lyricLinesSize`
- 管理 ResizeObserver
- 管理行对象生命周期
- 每帧更新动画：`update()`

数据流可以概括为：

```text
歌词解析器
  -> LyricLine[]
  -> LyricPlayerBase.setLyricLines()
  -> structuredClone()
  -> optimizeLyricLines()
  -> 具体渲染器创建 LyricLine 对象
  -> ResizeObserver / measureSize 记录行高
  -> calcLayout() 计算整行位置
  -> update() 每帧推进动画和绘制
```

## 3. 歌词预处理策略

预处理函数：

- `packages/core/src/utils/optimize-lyric.ts`

`setLyricLines()` 会对输入数组深拷贝两份：

- `currentLyricLines`：接近外部传入的原始数据。
- `processedLines`：用于实际显示，会被优化函数原地修改。

默认优化项：

```ts
normalizeSpaces: true
resetLineTimestamps: true
convertExcessiveBackgroundLines: true
syncMainAndBackgroundLines: true
cleanUnintentionalOverlaps: true
tryAdvanceStartTime: true
```

### 3.1 空格规范化

`normalizeSpaces()` 会把每个 word 中连续空白替换成一个普通空格：

```ts
word.word = word.word.replace(/\s+/g, " ");
```

优点：

- 降低异常歌词中大量空白对排版和动画的影响。
- 避免连续空白导致过宽布局。

问题：

- 会丢失原歌词里刻意保留的多个空格。
- 对需要保留制表、换行或格式化空白的场景不友好。

### 3.2 时间戳重置

`resetLineTimestamps()` 会用词级时间戳推导行级时间戳。

单词只有一个且词起止时间都是 0 时，会把行时间戳回填给词时间戳。否则使用第一个词和最后一个词的时间作为行时间。

优点：

- 修复部分解析器或歌词格式只有行级时间的情况。
- 保证后续高亮和滚动逻辑有一致时间依据。

问题：

- 如果词级时间戳本身不完整或顺序异常，行时间也会被污染。

### 3.3 背景人声处理

策略：

- 连续多行 `isBG` 时，只保留第一行背景人声，其余转为主行。
- 主行和紧随其后的背景行会同步起止时间。

优点：

- 匹配“一个主行最多挂一个背景行”的渲染模型。
- 简化布局和激活逻辑。

问题：

- 会改变原始多背景行语义。
- 对复杂合唱、多声部歌词表达能力不足。

### 3.4 重叠清洗与提前入场

`cleanUnintentionalOverlaps()` 会把短重叠视为非刻意重叠，并截断上一行结束时间。

判定逻辑：

- 重叠大于 100ms 且超过下一行时长 10%，才认为是刻意重叠。

`tryAdvanceStartTime()` 会尝试让歌词提前开始：

- 有正常间隔时最多提前 600ms。
- 有重叠时最多提前 400ms，且不越过上一行前 30% 的安全边界。

优点：

- 歌词滚动更早响应，视觉上更接近 Apple Music 的“预入场”效果。

问题：

- 这是显示策略而非纯排版策略，会影响当前行判断。
- 若外部业务希望严格按原时间轴显示，需要关闭对应优化项。

## 4. 分词与行内结构构建

核心工具：

- `packages/core/src/utils/lyric-split-words.ts`

函数：

```ts
chunkAndSplitLyricWords(words: LyricWord[]): (LyricWord | LyricWord[])[]
```

它负责把原始 `LyricWord[]` 变成更适合行内 DOM 构建和逐词动画的片段。

### 4.1 基础拆分

处理过程：

1. 纯空白 word 原样作为独立 atom。
2. 带 ruby 的 word 原样保留，避免破坏注音结构。
3. 其余 word 按空白拆成多个 part。
4. CJK 且没有 romanWord 时，多字词拆成单字，并按长度均分时间。
5. 非 CJK 或带 romanWord 的内容保持为词。

优点：

- CJK 逐字高亮更自然。
- 带 ruby / roman 的内容不被粗暴拆开。

问题：

- CJK 判断依赖 `isCJK()` 的正则，覆盖范围有限。
- CJK 多字时间均分是推断，可能与真实逐字发音不一致。
- 带 romanWord 的 CJK 不拆字，可能形成过宽不可拆块。

### 4.2 Intl.Segmenter 重新分组

如果支持 `Intl.Segmenter`，会再使用：

```ts
new Intl.Segmenter(undefined, { granularity: "word" })
```

对拼接后的全文做词边界分段，然后把 atoms 按分段重新组合。

优点：

- 比简单空格切分更符合多语言词边界。
- 可以把原数据中被切碎但实际属于同一词的片段重新组合。

问题：

- 不同浏览器、不同运行时的 `Intl.Segmenter` 行为可能有差异。
- 这里用的是 `undefined` locale，没有根据歌词语言显式指定 locale。
- 如果运行环境不支持 Segmenter，会退回 atoms，导致断行和动画粒度不同。

## 5. DOM 渲染器的断行与换行规则

默认 DOM 渲染器：

- `packages/core/src/lyric-player/dom/index.ts`
- `packages/core/src/lyric-player/dom/lyric-line.ts`
- `packages/core/src/styles/lyric-player.module.css`

### 5.1 行结构

每个歌词行元素包含三个子节点：

1. 主歌词行
2. 翻译行
3. 音译行

构造位置：

- `LyricLineEl` constructor

动态歌词会通过 `rebuildElement()` 构建词级 DOM：

- 普通词：`span`
- 强调词：内部再拆成 grapheme 级 span
- ruby：`wordWithRuby` + `rubyWord` + `wordBody`
- romanWord：作为词内部的小行

非动态歌词，即每行只有一个 word 的情况，直接设置整行 `innerText`，不做词级 DOM。

### 5.2 CSS 断行策略

主行 CSS：

```css
.lyricMainLine {
  text-wrap: balance;
  word-break: keep-all;
  overflow-wrap: break-word;
}

.lyricMainLine & span {
  display: inline-block;
  text-align: start;
  vertical-align: bottom;
}

.lyricMainLine > span,
span.emphasizeWrapper {
  white-space: pre-wrap;
  display: inline-block;
}
```

含义：

- `text-wrap: balance`：尝试让多行文本更均衡，而不是只在最后一行留下很短尾巴。
- `word-break: keep-all`：尽量避免 CJK/韩文等随意断开。
- `overflow-wrap: break-word`：遇到过长内容时允许强制断开。
- `inline-block`：让每个词或词组作为可测量、可动画的单元。
- `white-space: pre-wrap`：保留空白，同时允许换行。

实际断行决策主要由浏览器完成，项目只是通过 DOM 单元和 CSS 约束影响断行。

### 5.3 断行规则的实际效果

当前 DOM 策略更偏向“动画单元优先”：

- 词需要是独立元素，便于 mask、高亮和浮动。
- 词组需要尽量保持整体，避免一个词中间断开导致高亮断裂。
- CJK 可以被拆成字，从而提高断行和逐字高亮灵活性。

但这也带来一个结构性矛盾：

- 为了动画，代码倾向于把词包成 `inline-block`。
- 为了自然断行，浏览器希望看到连续文本和可断点。

当一个 `inline-block` 很长时，浏览器无法在其内部正常断行，只能把整个块挪到下一行，或者在极端情况下溢出/硬折。

### 5.4 DOM 路径中的换行检测

`areWordsOnSameLine()` 通过 `getBoundingClientRect().top` 判断两个词是否在同一视觉行：

```ts
return Math.abs(rect1.top - rect2.top) < 10;
```

这不是断行算法本身，而是断行后的结果检测。它目前主要作为辅助能力存在，核心断行仍由浏览器处理。

## 6. Canvas 渲染器的手写断行算法

相关文件：

- `packages/core/src/lyric-player/canvas/text-layout.ts`
- `packages/core/src/lyric-player/canvas/lyric-line.ts`
- `packages/core/src/lyric-player/canvas/index.ts`

### 6.1 layoutWord()

`layoutWord()` 是 Canvas 路径中的核心断行函数。

输入：

- `CanvasRenderingContext2D`
- 文本
- 字号、最大宽度、行高等配置
- 初始 X 坐标

输出：

- 每个字符的 `text/index/lineIndex/width/height/x`

算法流程：

1. 从当前游标取剩余文本。
2. 若匹配空白：
   - 标记 `shouldWhitespace = true`
   - 跳过全部连续空白
   - 之后需要绘制时统一产出一个空格
3. 若匹配拉丁串：
   - 先测量整个拉丁串宽度。
   - 如果当前行放不下，先换行。
   - 如果前面有空白，绘制一个空格。
   - 再逐字符测量、逐字符 yield。
   - 若单词本身超出最大宽度，则在字符级强制换行。
4. 其他字符：
   - 如前面有空白，先绘制一个空格。
   - 测量单字符。
   - 超宽则换行。

### 6.2 layoutLine()

`layoutLine()` 调用 `layoutWord()`，把同一个 `lineIndex` 的字符合并成一段文本。

这意味着 Canvas 最后不是逐字符绘制，而是按视觉行片段绘制：

```ts
for (const layout of this.layoutWords) {
  lctx.fillText(layout.text, layout.x, layout.lineIndex * fontSize * lineHeight)
}
```

### 6.3 Canvas 当前局限

Canvas 路径存在几个明显未完成点：

- `chunkAndSplitLyricWords(this.line.words)` 的循环目前没有实际产出布局结果，像是遗留或待实现代码。
- 主歌词实际布局是把所有 word 处理后直接 `.join("")` 成整行文本再断行，丢失词级结构。
- `isDuet` 对齐没有完整实现，仍基本左对齐。
- 缺少与 DOM 等价的逐词 mask、高亮、ruby/roman 细节能力。
- Unicode 支持较弱，不支持完整 UAX #14 line breaking，不支持复杂脚本和 bidi 排版。

## 7. 文本对齐方式实现

### 7.1 纵向对齐

纵向对齐由 `LyricPlayerBase.calcLayout()` 统一实现。

核心参数：

- `alignPosition`：目标位置，占播放器高度比例。
- `alignAnchor`：目标行内部锚点。

计算逻辑：

1. 从顶部开始计算 `curPos`。
2. 减去用户滚动偏移 `scrollOffset`。
3. 累加目标行之前所有行高，得到目标行应该滚动到的位置。
4. 加上 `size[1] * alignPosition`。
5. 根据 `alignAnchor` 修正：
   - `top`：不修正。
   - `center`：减去目标行高度的一半。
   - `bottom`：减去目标行高度。

这套逻辑控制的是“当前目标歌词行在播放器窗口中的垂直位置”，不是文本内部对齐。

### 7.2 水平对齐

DOM 路径中，水平对齐主要由 `isDuet` 控制。

CSS：

```css
.lyricDuetLine {
  text-align: right;
  transform-origin: right;
}

.amll-lyric-player.hasDuetLine .lyricLine:not(.lyricDuetLine) {
  padding-right: 15%;
}

.amll-lyric-player.hasDuetLine .lyricDuetLine {
  padding-left: 15%;
}
```

效果：

- 普通行靠左。
- 对唱行靠右。
- 存在对唱时，两侧都留出额外空间，降低视觉冲突。

Canvas 路径目前只设置了 `ctx.textAlign = "left"`，没有与 DOM 等价的对唱右对齐逻辑。

## 8. 行列表布局工作流程

### 8.1 setLyricLines()

主要步骤：

1. 保存初始时间。
2. 深拷贝输入歌词。
3. 对 `processedLines` 执行优化。
4. 判断是否为非动态歌词。
5. 判断是否存在对唱行。
6. 销毁旧行对象。
7. 清理间奏点、热行、缓冲行。
8. 调用具体渲染器创建新行对象。
9. 初始化弹簧参数。
10. 调用 `calcLayout(true)`。

### 8.2 setCurrentTime()

职责：

- 根据播放时间更新热行 `hotLines`。
- 维护缓冲行 `bufferedLines`。
- 控制行 enable/disable。
- 计算滚动目标 `scrollToIndex`。
- 必要时触发 `calcLayout()`。

当前实现会遍历全部行对象判断当前时间是否落在行时间内。

### 8.3 calcLayout()

职责：

- 计算每一行的目标 Y 坐标。
- 根据当前行、背景行、间奏点决定额外空间。
- 计算 blur、opacity、scale。
- 调用每个行对象的 `setTransform()`。
- 设置底部 bottomLine 的位置。

这是整套歌词视觉排版的核心函数。

### 8.4 update()

职责：

- 更新 bottomLine 和 interludeDots。
- 具体渲染器更新每行：
  - DOM：推进弹簧、更新 transform、可视区挂载/卸载、更新 mask alpha。
  - Canvas：清空画布、绘制可见行离屏 canvas。

## 9. 性能瓶颈分析

### 9.1 高频进度更新 O(n) 扫描

`setCurrentTime()` 每次都会遍历所有行对象判断当前时间是否命中。

风险：

- 长歌词、高刷新率、频繁 seek 时成本明显。
- 如果外部播放器每几十毫秒调用一次，主线程压力会增大。

优化方向：

- 使用当前 index 附近增量推进。
- 对行时间建立二分索引。
- seek 时二分定位，正常播放时只向前扫描。

### 9.2 DOM 行尺寸测量与 ResizeObserver

DOM 默认路径通过 `ResizeObserver` 获取每行高度变化，并触发 `calcLayout(true)`。

风险：

- 行进入可视区后懒构建，会引发行高变化。
- mask 更新会读取 `clientWidth/clientHeight/getComputedStyle`。
- 大量行同时进入视区或窗口 resize 时可能引起多轮 layout。

优化方向：

- 缓存静态行高度。
- 批量 measure/mutate。
- 对字体、宽度、歌词内容建立布局缓存 key。

### 9.3 mask 动画帧生成接近 O(words²)

`generateWebAnimationBasedMaskImage()` 对每个 word 生成动画时，又遍历整行所有 `splittedWords` 来计算渐变衔接。

风险：

- 长句、逐字 CJK、ruby 歌词会产生大量 keyframes。
- 每个词都有独立 Web Animation，内存和启动成本偏高。

优化方向：

- 预计算 prefix width，避免 `slice(0, i).reduce()`。
- 把逐词动画合并为行级统一进度，再用 CSS 变量或 PaintWorklet/Canvas 绘制。
- 对 ruby 时序拆分结果做缓存。

### 9.4 可视区懒构建的抖动风险

默认 DOM 路径在 `show()` 时构建行内容，在 `hide()` 时销毁。

优点：

- 降低长歌词 DOM 常驻成本。

风险：

- 快速滚动时反复创建/销毁 DOM 与 Animation。
- 行高从 fallback 切换为真实高度时，可能造成布局跳动。
- overscan 设置不合理时，行进入视区才构建会有短暂空白或测量延迟。

优化方向：

- 保留已构建行的轻量缓存，而不是离开视区立即销毁。
- 增加 hysteresis，扩大卸载阈值。
- 初始化时预构建当前行附近更多行。

### 9.5 Canvas 离屏 canvas 内存成本

每个 `CanvasLyricLine` 都有自己的 `lineCanvas`。

风险：

- 长歌词时离屏 canvas 数量多。
- resize 时所有行都 relayout 并重绘离屏 canvas。
- 高 DPR 下内存占用按平方放大。

优化方向：

- 只为可见/附近行生成缓存。
- 使用纹理池或 canvas 池。
- 对相同尺寸复用离屏资源。
- resize 时分帧重排。

### 9.6 CSS filter blur 成本

行级 blur 会使用 `filter: blur(...)`。

风险：

- blur 对合成和绘制成本较高。
- 多行同时 blur，尤其在低端设备上容易掉帧。

项目已有开关：

- `enableBlur`
- `DomSlimLyricPlayer`

优化方向：

- 根据设备性能或帧率动态降低 blur。
- 对远离当前行的歌词直接降低 opacity，少用 blur。

## 10. 显示效果问题分析

### 10.1 DOM 断行跨环境不一致

DOM 路径依赖：

- 浏览器 CSS 断行实现。
- `text-wrap: balance` 支持情况。
- `Intl.Segmenter` 支持情况。
- 当前字体 metrics。

结果：

- 同一歌词在不同浏览器、系统字体、语言环境下断行可能不同。
- 这对 Apple Music 类视觉复刻会造成一致性问题。

### 10.2 inline-block 与自然换行冲突

每个词或词组被包成 `inline-block`，有利于动画，但会减少内部断点。

典型问题：

- 长英文词可能整块换到下一行。
- 带 romanWord 的 CJK 不拆字，可能成为过宽块。
- ruby 结构使用 `inline-flex`，更难自然拆行。

### 10.3 空格语义丢失

优化阶段会把连续空白压缩为单空格，Canvas 断行也把连续空白统一成一个空格宽度。

问题：

- 原歌词刻意缩进、对齐、停顿式空格会丢失。
- DOM 与 Canvas 对空白的处理不完全一致。

### 10.4 Canvas Unicode 支持不足

Canvas 手写算法只粗略区分拉丁串、空白和其他字符。

问题：

- emoji 复合字符可能被拆坏。
- 阿拉伯语、希伯来语等 bidi 文本不可靠。
- 泰语等无空格语言不适合简单逐字符断行。
- 标点悬挂、禁则处理、标点避头避尾都没有实现。

### 10.5 Canvas 与 DOM 功能不对齐

Canvas 当前没有完整实现：

- 对唱右对齐。
- 背景人声的 DOM 等价样式。
- 逐词 mask 高亮。
- ruby / romanWord 的完整布局。
- 鼠标交互。

因此 Canvas 更像实验或备用路径，而不是默认渲染器的等价替代。

### 10.6 对齐配置即时生效问题

`setAlignAnchor()` 和 `setAlignPosition()` 只修改字段，不主动调用 `calcLayout()`。

在 React/Vue 包中，props 变化会调用 setter，但如果没有其他状态触发布局，视觉位置可能不会立刻更新。

优化方向：

- setter 内部主动调用 `calcLayout()`。
- 或在文档中明确调用方需要手动触发布局。

## 11. 后续优化建议

### 11.1 抽象统一的行内布局模型

建议把当前散落在 DOM 和 Canvas 中的逻辑抽象为中间层：

```text
LyricLine
  -> TextLayoutInput
  -> TextRun[]
  -> VisualLine[]
  -> Renderer-specific output
```

其中 `TextRun` 可包含：

- 文本
- 时间戳
- ruby
- roman
- 是否可断行
- 是否可强调
- 是否空白
- 原始 word index

收益：

- DOM 和 Canvas 可以共享分词、断点、测量策略。
- 更容易测试断行行为。
- 未来支持 WebGPU/Canvas/DOM 混合渲染时成本更低。

### 11.2 为 DOM 路径补充可控断点

可以考虑：

- 在安全断点插入 `<wbr>`。
- 对 CJK 单字使用更细粒度 wrapper。
- 对长英文词设置更明确的 `overflow-wrap:anywhere` fallback。
- 对 ruby/roman 结构定义最大宽度和内部断点策略。

注意：

- 不能简单放开所有断点，否则逐词高亮会割裂。
- 应基于歌词语言、是否动态、是否有 ruby/roman 分级处理。

### 11.3 引入标准 Unicode line breaking

如果要做真正稳定的断行引擎，应考虑实现或引入：

- Unicode Line Breaking Algorithm (UAX #14)
- grapheme cluster 分割
- bidi 处理
- CJK 禁则
- 标点避头避尾

至少应避免 Canvas 逐 UTF-16 code unit 拆字符。

### 11.4 优化时间索引

建议新增行时间索引：

- `mainLineIndexes`
- `startTimes`
- `endTimes`
- `backgroundLineMap`

正常播放：

- 从当前 index 向前推进。

seek：

- 二分定位。

这样可以降低 `setCurrentTime()` 的全量扫描成本。

### 11.5 优化 mask 生成

短期优化：

- 使用 prefix widths 替换每个 word 内部的 `slice(0, i).reduce()`。
- 缓存 `fadeWidth`、word width、ruby timing frames。
- resize 后只更新受影响的可见行。

中期优化：

- 行级统一进度 + CSS 变量。
- 用 Canvas/SVG mask 渲染整行渐变。
- 对非当前行不创建逐词动画。

### 11.6 明确 Canvas 定位

需要先决定 Canvas 路径的产品定位：

1. **实验/备用渲染器**：保持现状，仅修复明显 bug。
2. **低性能替代 DOM**：应减少离屏 canvas 数量，并补齐基础对齐和高亮。
3. **主力一致性排版引擎**：需要完整实现 Unicode、ruby、roman、duet、mask、交互。

如果目标是短期优化默认体验，优先投入 DOM 路径收益更高。

## 12. 建议的优化优先级

### P0：低风险修正

- `setAlignAnchor()` / `setAlignPosition()` 后触发 `calcLayout()`。
- 移除或保护 Canvas 中无实际作用的 `chunkAndSplitLyricWords()` 空循环。
- Canvas 处理 `isDuet` 基础右对齐。
- 对 mask 生成中的 prefix width 做缓存。

### P1：性能优化

- 为 `setCurrentTime()` 建立时间索引，避免全量扫描。
- DOM 懒构建增加缓存和卸载缓冲。
- resize 时分批更新 mask 和布局。
- 对长歌词减少非可见行的动画创建。

### P2：显示效果优化

- 明确 CJK、英文、ruby、roman 的断点规则。
- 加入可控 `<wbr>` 或软断点。
- 对长无空格文本设置专门 fallback。
- 统一 DOM 与 Canvas 的空白处理策略。

### P3：架构升级

- 抽象统一 TextLayout model。
- 引入 Unicode line breaking。
- 将 DOM/CSS 断行结果和 Canvas 测量结果纳入可测试快照。

## 13. 关键文件索引

- `packages/core/src/interfaces.ts`：歌词核心数据结构。
- `packages/core/src/lyric-player/base.ts`：共享播放器状态、行列表布局、纵向对齐、滚动和动画调度。
- `packages/core/src/utils/optimize-lyric.ts`：歌词时间轴与展示预处理。
- `packages/core/src/utils/lyric-split-words.ts`：词拆分、CJK 拆字、Intl.Segmenter 分组。
- `packages/core/src/styles/lyric-player.module.css`：默认 DOM 断行、对唱、主副行样式。
- `packages/core/src/lyric-player/dom/lyric-line.ts`：默认 DOM 行内结构、逐词动画、mask 生成。
- `packages/core/src/lyric-player/dom-slim/lyric-line.ts`：轻量 DOM 行实现。
- `packages/core/src/lyric-player/canvas/text-layout.ts`：Canvas 手写断行算法。
- `packages/core/src/lyric-player/canvas/lyric-line.ts`：Canvas 行布局和离屏绘制。
- `packages/react/src/lyric-player.tsx`：React 包装层。
- `packages/vue/src/LyricPlayer.tsx`：Vue 包装层。
- `packages/react-full/src/states/configAtoms.ts`：完整播放器实现选择配置。
