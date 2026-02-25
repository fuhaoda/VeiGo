import {
  type Action,
  type ApplyResult,
  type Coord,
  type EngineEvent,
  type GameConfig,
  type GameState,
  type PlayerId,
  RuleError,
  type Stone
} from "./model";
import { getChain } from "./go_core/groups";
import { getLibertiesForChain } from "./go_core/liberties";
import { computeBoardHash, computeStateHash } from "./util/hash";
import { coordKey, inBounds, neighbors, parseCoordKey, sameCoord } from "./util/coords";
import { nextRandomBit } from "./util/random";
import { calculateScoreBreakdown } from "./scoring";

const PLAYERS: PlayerId[] = ["P1", "P2"];

function otherPlayer(player: PlayerId): PlayerId {
  return player === "P1" ? "P2" : "P1";
}

export const DEFAULT_CONFIG: GameConfig = {
  boardSize: 11,
  map: {
    size: 11,
    plusPoints: [
      { x: 0, y: 5 },
      { x: 5, y: 0 },
      { x: 10, y: 5 },
      { x: 5, y: 10 }
    ],
    minusPoints: [
      { x: 2, y: 2 },
      { x: 2, y: 8 },
      { x: 8, y: 2 },
      { x: 8, y: 8 }
    ]
  },
  koRule: "simple",
  allowSuicide: false,
  baseBuildCount: 3,
  baseStoneBonus: 4,
  plusMinusAmount: 5,
  scanCost: 2,
  bidMin: 0,
  bidMax: 50,
  seed: 20260222
};

function buildEmptyBoard(size: number): (string | null)[][] {
  return Array.from({ length: size }, () => Array.from({ length: size }, () => null));
}

export function createInitialState(overrides?: Partial<GameConfig>): GameState {
  const config: GameConfig = {
    ...DEFAULT_CONFIG,
    ...overrides,
    map: {
      ...DEFAULT_CONFIG.map,
      ...(overrides?.map ?? {})
    }
  };

  const initial: GameState = {
    config,
    phase: "BASE_BUILD",
    board: buildEmptyBoard(config.boardSize),
    stones: {},
    dynamicMinusPoints: [],
    triggeredPointMarkers: [],
    baseBuildSelections: { P1: [], P2: [] },
    baseBuildConfirmed: { P1: false, P2: false },
    bids: {},
    komiAwardToWhite: 0,
    playerColor: { P1: "B", P2: "W" },
    nextToAct: "P1",
    hiddenStonePlaced: { P1: false, P2: false },
    scanAvailable: { P1: false, P2: false },
    scanUsed: { P1: false, P2: false },
    consecutivePasses: 0,
    scoreEvents: [],
    moveIndex: 0,
    lastMoveCoord: undefined,
    lastMovePlayer: undefined,
    historyBoardHashes: [],
    rngSeed: config.seed
  };

  initial.historyBoardHashes = [computeBoardHash(initial)];
  return initial;
}

function cloneState(state: GameState): GameState {
  return structuredClone(state);
}

function assertTurn(state: GameState, player: PlayerId): void {
  if (state.nextToAct !== player) {
    throw new RuleError(`Not ${player}'s turn`);
  }
}

function ensureMainPlay(state: GameState): void {
  if (state.phase !== "MAIN_PLAY") {
    throw new RuleError("Action only allowed in MAIN_PLAY");
  }
}

function toStoneColor(state: GameState, owner: PlayerId): "B" | "W" {
  return state.playerColor[owner];
}

function pushScoreEvent(state: GameState, events: EngineEvent[], player: PlayerId, amount: number, reason: string, coord?: Coord): void {
  state.scoreEvents.push({
    type: amount > 0 ? "PLUS" : reason === "SCAN_COST" ? "SCAN_COST" : "MINUS",
    player,
    amount,
    coord,
    turnIndex: state.moveIndex
  });
  events.push({
    type: "SCORE_DELTA",
    player,
    amount,
    reason,
    coord
  });
}

function placeStone(state: GameState, stone: Stone): void {
  state.stones[stone.id] = stone;
  state.board[stone.coord.y][stone.coord.x] = stone.id;
}

function removeStones(state: GameState, stoneIds: string[]): Coord[] {
  const coords: Coord[] = [];
  for (const id of stoneIds) {
    const stone = state.stones[id];
    if (!stone) {
      continue;
    }
    state.board[stone.coord.y][stone.coord.x] = null;
    coords.push(stone.coord);
    delete state.stones[id];
  }
  return coords;
}

function revealStoneToAll(state: GameState, stoneId: string): boolean {
  const stone = state.stones[stoneId];
  if (!stone) {
    return false;
  }
  const before = stone.visibleTo.P1 && stone.visibleTo.P2;
  stone.visibleTo.P1 = true;
  stone.visibleTo.P2 = true;
  return !before;
}

function resolveBaseBuild(state: GameState, events: EngineEvent[]): void {
  const p1Keys = new Set(state.baseBuildSelections.P1.map(coordKey));
  const p2Keys = new Set(state.baseBuildSelections.P2.map(coordKey));

  const overlapKeys = [...p1Keys].filter((k) => p2Keys.has(k));
  state.dynamicMinusPoints = [...new Set([...state.dynamicMinusPoints, ...overlapKeys])];

  for (const player of PLAYERS) {
    for (const coord of state.baseBuildSelections[player]) {
      const key = coordKey(coord);
      if (overlapKeys.includes(key)) {
        continue;
      }
      const id = `BASE-${player}-${coord.x}-${coord.y}`;
      const stone: Stone = {
        id,
        owner: player,
        color: toStoneColor(state, player),
        kind: "BASE",
        coord,
        visibleTo: { P1: true, P2: true }
      };
      placeStone(state, stone);
    }
  }

  state.phase = "TURN_BETTING_R1";
  events.push({ type: "PHASE_CHANGE", phase: state.phase });
  state.historyBoardHashes.push(computeBoardHash(state));
}

function assignColorsAndStartMain(
  state: GameState,
  events: EngineEvent[],
  blackPlayer: PlayerId,
  komiToWhite: number
): void {
  const whitePlayer = otherPlayer(blackPlayer);
  state.playerColor[blackPlayer] = "B";
  state.playerColor[whitePlayer] = "W";
  state.komiAwardToWhite = komiToWhite;
  state.nextToAct = blackPlayer;
  state.phase = "MAIN_PLAY";

  for (const stoneId of Object.keys(state.stones)) {
    state.stones[stoneId].color = toStoneColor(state, state.stones[stoneId].owner);
  }

  events.push({ type: "PHASE_CHANGE", phase: state.phase });
}

function resolveTurnBidding(state: GameState, events: EngineEvent[]): void {
  if (!state.bids.r1 || state.bids.r1.P1 < state.config.bidMin || state.bids.r1.P2 < state.config.bidMin) {
    return;
  }
  const p1 = state.bids.r1.P1;
  const p2 = state.bids.r1.P2;
  if (p1 === p2) {
    state.phase = "TURN_BETTING_R2";
    events.push({ type: "PHASE_CHANGE", phase: state.phase });
    return;
  }

  const black = p1 > p2 ? "P1" : "P2";
  const komi = Math.max(p1, p2);
  assignColorsAndStartMain(state, events, black, komi);
}

function resolveTurnBiddingRound2(state: GameState, events: EngineEvent[]): void {
  if (!state.bids.r2 || state.bids.r2.P1 < state.config.bidMin || state.bids.r2.P2 < state.config.bidMin) {
    return;
  }

  const p1 = state.bids.r2.P1;
  const p2 = state.bids.r2.P2;

  if (p1 === p2) {
    const rnd = nextRandomBit(state.rngSeed);
    state.rngSeed = rnd.seed;
    const black = rnd.bit === 0 ? "P1" : "P2";
    assignColorsAndStartMain(state, events, black, p1);
    return;
  }

  const black = p1 > p2 ? "P1" : "P2";
  const komi = Math.max(p1, p2);
  assignColorsAndStartMain(state, events, black, komi);
}

function checkAndTriggerPointScore(state: GameState, events: EngineEvent[], player: PlayerId, coord: Coord): void {
  const key = coordKey(coord);
  if (state.triggeredPointMarkers.includes(key)) {
    return;
  }

  const plusSet = new Set(state.config.map.plusPoints.map(coordKey));
  const minusSet = new Set([...state.config.map.minusPoints.map(coordKey), ...state.dynamicMinusPoints]);

  if (plusSet.has(key)) {
    pushScoreEvent(state, events, player, state.config.plusMinusAmount, "PLUS_POINT", coord);
    state.triggeredPointMarkers.push(key);
    return;
  }

  if (minusSet.has(key)) {
    pushScoreEvent(state, events, player, -state.config.plusMinusAmount, "MINUS_POINT", coord);
    state.triggeredPointMarkers.push(key);
  }
}

function appendBoardHistory(state: GameState): void {
  state.historyBoardHashes.push(computeBoardHash(state));
}

function enforceSimpleKo(state: GameState): void {
  if (state.historyBoardHashes.length < 2) {
    return;
  }
  const newHash = computeBoardHash(state);
  const twoPliesAgo = state.historyBoardHashes[state.historyBoardHashes.length - 2];
  if (newHash === twoPliesAgo) {
    throw new RuleError("Illegal move: simple ko violation");
  }
}

function resolveCaptures(state: GameState, events: EngineEvent[], player: PlayerId, placed: Stone): number {
  const opponent = otherPlayer(player);
  const capturedStoneIds = new Set<string>();
  const hiddenContributors = new Set<string>();

  for (const n of neighbors(placed.coord, state.config.boardSize)) {
    const nid = state.board[n.y][n.x];
    if (!nid) {
      continue;
    }
    if (state.stones[nid].owner !== opponent) {
      continue;
    }

    const chain = getChain(state, n);
    const liberties = getLibertiesForChain(state, chain);
    if (liberties.length === 0) {
      for (const c of chain) {
        const id = state.board[c.y][c.x];
        if (id) {
          capturedStoneIds.add(id);
        }
        for (const adj of neighbors(c, state.config.boardSize)) {
          const adjId = state.board[adj.y][adj.x];
          if (!adjId) {
            continue;
          }
          const adjStone = state.stones[adjId];
          if (adjStone.owner === player && adjStone.kind === "HIDDEN") {
            hiddenContributors.add(adjId);
          }
        }
      }
    }
  }

  if (capturedStoneIds.size === 0) {
    return 0;
  }

  let capturedBaseCount = 0;
  for (const id of capturedStoneIds) {
    const stone = state.stones[id];
    if (stone?.kind === "BASE") {
      capturedBaseCount += 1;
    }
  }

  const hiddenToReveal: string[] = [];
  for (const id of capturedStoneIds) {
    const stone = state.stones[id];
    if (stone?.kind === "HIDDEN") {
      hiddenToReveal.push(id);
    }
  }

  for (const id of hiddenToReveal) {
    const stone = state.stones[id];
    if (!stone) {
      continue;
    }
    if (revealStoneToAll(state, id)) {
      events.push({
        type: "REVEAL",
        player: stone.owner,
        coord: stone.coord,
        reason: "HIDDEN_CAPTURED",
        stoneId: stone.id
      });
    }
  }

  for (const id of hiddenContributors) {
    const stone = state.stones[id];
    if (!stone) {
      continue;
    }
    if (!stone.visibleTo[opponent]) {
      if (revealStoneToAll(state, id)) {
        events.push({
          type: "REVEAL",
          player: stone.owner,
          coord: stone.coord,
          reason: "HIDDEN_CAPTURE",
          stoneId: stone.id
        });
      }
    }
  }

  if (capturedBaseCount > 0) {
    pushScoreEvent(
      state,
      events,
      player,
      capturedBaseCount * (state.config.baseStoneBonus + 1),
      "BASE_CAPTURE",
      placed.coord
    );
  }

  const coords = removeStones(state, [...capturedStoneIds]);
  events.push({ type: "CAPTURE", by: player, stoneIds: [...capturedStoneIds], coords });

  if (placed.kind === "HIDDEN") {
    if (revealStoneToAll(state, placed.id)) {
      events.push({
        type: "REVEAL",
        player,
        coord: placed.coord,
        reason: "HIDDEN_CAPTURE",
        stoneId: placed.id
      });
    }
  } else {
    const ownChain = getChain(state, placed.coord);
    for (const c of ownChain) {
      const id = state.board[c.y][c.x];
      if (!id) {
        continue;
      }
      const s = state.stones[id];
      if (s.kind === "HIDDEN" && !s.visibleTo[opponent]) {
        if (revealStoneToAll(state, s.id)) {
          events.push({
            type: "REVEAL",
            player,
            coord: s.coord,
            reason: "HIDDEN_CAPTURE",
            stoneId: s.id
          });
        }
      }
    }
  }

  return capturedStoneIds.size;
}

function placeMainStone(next: GameState, action: Extract<Action, { type: "PlaceStone" }>, events: EngineEvent[]): void {
  ensureMainPlay(next);
  assertTurn(next, action.player);

  if (!inBounds(action.coord, next.config.boardSize)) {
    throw new RuleError("Out of bounds");
  }

  if (action.kind === "HIDDEN" && next.hiddenStonePlaced[action.player]) {
    throw new RuleError("Hidden stone already used");
  }

  const occupiedId = next.board[action.coord.y][action.coord.x];
  if (occupiedId) {
    const occupied = next.stones[occupiedId];
    if (occupied.kind === "HIDDEN" && occupied.owner !== action.player && !occupied.visibleTo[action.player]) {
      if (revealStoneToAll(next, occupiedId)) {
        events.push({
          type: "REVEAL",
          player: occupied.owner,
          coord: occupied.coord,
          reason: "PLAY_ON_HIDDEN",
          stoneId: occupied.id
        });
      }
      return;
    }
    throw new RuleError("Point already occupied");
  }

  const id = `S-${next.moveIndex + 1}-${action.player}-${action.coord.x}-${action.coord.y}`;
  const stone: Stone = {
    id,
    owner: action.player,
    color: toStoneColor(next, action.player),
    kind: action.kind,
    coord: action.coord,
    visibleTo:
      action.kind === "HIDDEN"
        ? { [action.player]: true, [otherPlayer(action.player)]: false }
        : { P1: true, P2: true }
  };

  if (action.kind === "HIDDEN") {
    next.hiddenStonePlaced[action.player] = true;
    next.scanAvailable[otherPlayer(action.player)] = true;
  }

  placeStone(next, stone);
  checkAndTriggerPointScore(next, events, action.player, action.coord);

  const capturedCount = resolveCaptures(next, events, action.player, stone);

  const ownChain = getChain(next, action.coord);
  const liberties = getLibertiesForChain(next, ownChain);
  if (liberties.length === 0 && capturedCount === 0 && !next.config.allowSuicide) {
    throw new RuleError("Illegal move: suicide");
  }

  enforceSimpleKo(next);

  next.consecutivePasses = 0;
  next.moveIndex += 1;
  next.lastMoveCoord = action.coord;
  next.lastMovePlayer = action.player;
  next.nextToAct = otherPlayer(action.player);
  appendBoardHistory(next);
}

function maybeEndByDoublePass(next: GameState, events: EngineEvent[]): void {
  if (next.consecutivePasses < 2) {
    return;
  }
  next.phase = "ENDED";
  next.endReason = "DOUBLE_PASS";
  next.finalScore = calculateScoreBreakdown(next);
  next.winner = next.finalScore.total.P1 === next.finalScore.total.P2
    ? undefined
    : next.finalScore.total.P1 > next.finalScore.total.P2
      ? "P1"
      : "P2";
  events.push({ type: "END", reason: "DOUBLE_PASS", winner: next.winner });
}

function applyActionInternal(state: GameState, action: Action): { next: GameState; events: EngineEvent[] } {
  if (state.phase === "ENDED") {
    throw new RuleError("Game already ended");
  }

  const next = cloneState(state);
  const events: EngineEvent[] = [];

  if (action.type === "PlaceBaseStone") {
    if (next.phase !== "BASE_BUILD") {
      throw new RuleError("Not in BASE_BUILD phase");
    }
    if (next.baseBuildConfirmed[action.player]) {
      throw new RuleError("Player already confirmed base build");
    }
    if (!inBounds(action.coord, next.config.boardSize)) {
      throw new RuleError("Out of bounds");
    }
    if (next.baseBuildSelections[action.player].some((c) => sameCoord(c, action.coord))) {
      throw new RuleError("Duplicate base stone coordinate");
    }
    if (next.baseBuildSelections[action.player].length >= next.config.baseBuildCount) {
      throw new RuleError("Base stone limit reached");
    }
    next.baseBuildSelections[action.player].push(action.coord);
    next.lastMoveCoord = action.coord;
    next.lastMovePlayer = action.player;
    return { next, events };
  }

  if (action.type === "ConfirmBaseBuild") {
    if (next.phase !== "BASE_BUILD") {
      throw new RuleError("Not in BASE_BUILD phase");
    }
    if (next.baseBuildSelections[action.player].length !== next.config.baseBuildCount) {
      throw new RuleError("Base stone selection incomplete");
    }
    next.baseBuildConfirmed[action.player] = true;

    if (PLAYERS.every((p) => next.baseBuildConfirmed[p])) {
      resolveBaseBuild(next, events);
    }
    return { next, events };
  }

  if (action.type === "SubmitBid") {
    if (action.value < next.config.bidMin || action.value > next.config.bidMax) {
      throw new RuleError("Bid out of range");
    }

    if (action.round === 1) {
      if (next.phase !== "TURN_BETTING_R1") {
        throw new RuleError("Not in round 1 bidding");
      }
      next.bids.r1 = next.bids.r1 ?? { P1: -1, P2: -1 };
      next.bids.r1[action.player] = action.value;
      if (next.bids.r1.P1 >= next.config.bidMin && next.bids.r1.P2 >= next.config.bidMin) {
        resolveTurnBidding(next, events);
      }
      return { next, events };
    }

    if (next.phase !== "TURN_BETTING_R2") {
      throw new RuleError("Not in round 2 bidding");
    }
    next.bids.r2 = next.bids.r2 ?? { P1: -1, P2: -1 };
    next.bids.r2[action.player] = action.value;
    if (next.bids.r2.P1 >= next.config.bidMin && next.bids.r2.P2 >= next.config.bidMin) {
      resolveTurnBiddingRound2(next, events);
    }
    return { next, events };
  }

  if (action.type === "PlaceStone") {
    placeMainStone(next, action, events);
    return { next, events };
  }

  if (action.type === "Scan") {
    ensureMainPlay(next);
    assertTurn(next, action.player);
    if (!next.scanAvailable[action.player] || next.scanUsed[action.player]) {
      throw new RuleError("Scan not available");
    }
    if (!inBounds(action.coord, next.config.boardSize)) {
      throw new RuleError("Out of bounds");
    }

    next.scanUsed[action.player] = true;
    pushScoreEvent(next, events, action.player, -next.config.scanCost, "SCAN_COST", action.coord);

    const targetId = next.board[action.coord.y][action.coord.x];
    if (targetId) {
      const targetStone = next.stones[targetId];
      if (targetStone.kind === "HIDDEN" && targetStone.owner !== action.player) {
        if (revealStoneToAll(next, targetId)) {
          events.push({
            type: "REVEAL",
            player: targetStone.owner,
            coord: targetStone.coord,
            reason: "SCAN_HIT",
            stoneId: targetStone.id
          });
        }
      }
    }

    next.lastMoveCoord = action.coord;
    next.lastMovePlayer = action.player;

    return { next, events };
  }

  if (action.type === "Pass") {
    ensureMainPlay(next);
    assertTurn(next, action.player);
    next.consecutivePasses += 1;
    next.moveIndex += 1;
    next.nextToAct = otherPlayer(action.player);
    appendBoardHistory(next);
    maybeEndByDoublePass(next, events);
    return { next, events };
  }

  if (action.type === "Resign") {
    ensureMainPlay(next);
    assertTurn(next, action.player);
    const winner = otherPlayer(action.player);
    next.phase = "ENDED";
    next.endReason = "RESIGN";
    next.winner = winner;
    next.finalScore = calculateScoreBreakdown(next);
    events.push({ type: "END", reason: "RESIGN", winner });
    return { next, events };
  }

  throw new RuleError("Unknown action");
}

export function applyAction(state: GameState, action: Action): ApplyResult {
  const { next, events } = applyActionInternal(state, action);
  return {
    nextState: next,
    events,
    stateHash: computeStateHash(next)
  };
}

export function stateFromSnapshot(snapshot: GameState): GameState {
  return cloneState(snapshot);
}

export function getAllMinusPointKeys(state: GameState): Set<string> {
  return new Set([...state.config.map.minusPoints.map(coordKey), ...state.dynamicMinusPoints]);
}

export function getStoneAt(state: GameState, coord: Coord): Stone | undefined {
  const id = state.board[coord.y][coord.x];
  return id ? state.stones[id] : undefined;
}

export function listTriggeredPoints(state: GameState): Coord[] {
  return state.triggeredPointMarkers.map(parseCoordKey);
}
