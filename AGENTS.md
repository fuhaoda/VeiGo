# AGENTS.md - MiniWeiqi Execution Guide

## 1) 项目目标
交付一个可部署到 GitHub Pages 的迷你围棋 Web App：
- 完整规则首版上线（布局三手、争先手竞价、隐藏手、扫描、+/- 点、终局计分）
- 支持异地双人对弈（10 位交换码）
- 引擎 deterministic，可测试，可复用

## 2) 非目标
- 不做权威服务器与强防作弊
- 不做自动匹配（仅保留入口占位）
- 不做强断线恢复
- 不使用原品牌素材或命名

## 3) 技术栈与部署边界
- Engine: TypeScript strict
- Web: React + Vite
- Tests: Vitest
- P2P: PeerJS（公共信令）+ RTCDataChannel
- NAT: 公开 STUN，不使用 TURN
- Deploy: GitHub Actions -> GitHub Pages
- 边界：不引入自建后端；允许使用第三方公共信令

## 4) 规则权威来源与默认假设
规则来源以中文维基“迷你围棋”要点为基线，默认实现：
- 提子/禁入点：标准围棋逻辑，默认禁自杀（除非提子）
- 劫：simple ko
- 终局：双 Pass 或 Resign
- 基地子：活子计 1，基地额外 +4（总值 5）
- 基地子被提：提子方即时 +5
- +/- 点触发：首次实体落子触发一次
- 默认点位：`-` 在 `(2,2)/(2,8)/(8,2)/(8,8)`，`+` 在 `(0,5)/(5,0)/(10,5)/(5,10)`
- 扫描：不消耗回合，固定 -2
- 隐藏手：选择坐标后提交；提交后自己可见（`H` 标记），对手不可见，直到显露条件触发

全部假设由 `GameConfig` 可配置。

## 5) 代码结构与职责
- `packages/engine/src/model.ts`
  - 核心类型、状态、动作定义
- `packages/engine/src/rules.ts`
  - `createInitialState` 与 `applyAction` reducer
- `packages/engine/src/scoring.ts`
  - 计分拆分与总分
- `packages/engine/src/go_core/*`
  - chain/liberty/territory/ko 算法
- `packages/protocol/src/*`
  - wire message 解析、序列校验
- `apps/web/src/pages/*`
  - `/`, `/create`, `/join`, `/room/:roomId`（10位交换码）
- `apps/web/src/state/useGameController.ts`
  - 本地引擎状态、P2P 消息同步、错误处理

## 6) 联机协议与一致性约定
- 消息类型：`HELLO`, `ACTION`, `ACK`, `SNAPSHOT`, `END`
- 每个 ACTION 包含 `seq + prevStateHash`
- 本地校验：收到 ACTION 时先比对 `prevStateHash`
  - 一致：执行 action，回 ACK
  - 不一致：回 SNAPSHOT（RESYNC）
- 对局结束时广播 END

## 7) 测试策略
必须覆盖：
- 布局重叠与动态减目点
- 竞价规则（含双平局随机）
- +/- 点仅触发一次
- 隐藏手显露条件与扫描扣分
- 提子、simple ko
- 终局计分公式
- 协议编解码与序列单调性

## 8) CI/CD 要求
- PR 与主分支均执行：`npm run test` + `npm run build`
- 主分支 push 自动发布 GitHub Pages
- `VITE_BASE_PATH` 默认 `/VeiGo/`，必要时在 workflow 覆盖

## 9) 版本路线图
- v1: 交换码联机 + 完整规则 + Pages 上线
- v1.1: 自动匹配可行性评估（在不破坏轻量部署前提下）
- v1.2: 观战/棋谱/断线恢复增强（按需求）

## 10) 执行原则
- 引擎先行：所有规则变更必须先过单测
- UI 不绕过引擎：不在前端写规则分叉
- 协议优先一致性：不一致先 RESYNC，再考虑优化
- 默认中文文案，后续再做 i18n
