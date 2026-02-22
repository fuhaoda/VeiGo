# MiniWeiqi

MiniWeiqi 是一个可部署到 GitHub Pages 的迷你围棋（11x11）Web App。首版支持完整特殊规则与双人异地对弈（WebRTC 交换码模式）。

## 功能概览
- 规则引擎（TypeScript, deterministic）
- 三阶段流程：布局三手 -> 争先手竞价 -> 主对局
- 特殊机制：重叠减目点、隐藏手、扫描、+/- 点首次触发
- 终局计分：活子 + 基地加分 + 事件分 + 地盘（减目点不计） + 贴还点
- P2P 联机：创建 Offer 交换码 / 加入并返回 Answer 交换码
- 自动匹配入口占位（首版不实现）

## 规则摘要
- 棋盘：11x11 交叉点。
- 布局：每人暗下 3 手基地子，双方确认后公开。
- 重叠：若同点重叠，双方该点基地子消失，点位转为动态减目点。
- 争先手：0-50 出价，高者执黑先行，后手获得该贴还点；首轮平局进入二轮；二轮再平局则按种子随机决定先后手，后手得二轮贴还。
- + / - 点：任意玩家首次落到该点触发 +5 / -5，仅触发一次。
- 隐藏手：每人一次，默认对手不可见，满足显露条件后公开。
- 查找：对手使用隐藏手后，你可一次扫描（-2 分），扫描不消耗回合。
- 终局：连续两次 Pass 或 Resign。

## 联机模型（首版）
- 严格 GitHub 边界：前端部署在 GitHub Pages，不依赖自建后端。
- 连接方式：WebRTC + 交换码（Offer/Answer）。
- 穿透：公开 STUN，不使用 TURN。
- 公平性：好友信任模型（本地规则校验 + 状态哈希同步，不做强防作弊）。
- 断线：弱恢复策略，断线即终止当前对局。

## 开发与运行
```bash
npm install
npm run test
npm run dev
```

## 部署
- 使用 GitHub Actions 自动执行 `test -> build -> deploy`。
- 默认 Vite base 为 `/VeiGo/`，如仓库名不同可通过 `VITE_BASE_PATH` 覆盖。

## 目录结构
```text
apps/web             # React + Vite 前端
packages/engine      # 规则引擎与计分
packages/protocol    # P2P 协议与交换码编解码
.github/workflows    # CI + GitHub Pages 发布
```

## 已知限制
- 自动匹配暂未实现（仅入口占位）。
- 不支持强抗作弊。
- 部分 NAT 网络在无 TURN 情况下可能无法互连。

## 法务与命名
- 本项目不使用 Batoo 商标资产与原始美术素材。
- 建议发布时继续使用独立命名与原创视觉。
