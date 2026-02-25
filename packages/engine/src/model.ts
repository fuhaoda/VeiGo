export type PlayerId = "P1" | "P2";
export type Color = "B" | "W";
export type StoneKind = "NORMAL" | "BASE" | "HIDDEN";

export interface Coord {
  x: number;
  y: number;
}

export interface Stone {
  id: string;
  owner: PlayerId;
  color: Color;
  kind: StoneKind;
  coord: Coord;
  visibleTo: Record<PlayerId, boolean>;
}

export interface MapConfig {
  size: number;
  plusPoints: Coord[];
  minusPoints: Coord[];
}

export type ScoreEventType = "PLUS" | "MINUS" | "SCAN_COST";

export interface ScoreEvent {
  type: ScoreEventType;
  player: PlayerId;
  amount: number;
  coord?: Coord;
  turnIndex: number;
}

export type Phase =
  | "BASE_BUILD"
  | "TURN_BETTING_R1"
  | "TURN_BETTING_R2"
  | "MAIN_PLAY"
  | "ENDED";

export interface GameConfig {
  boardSize: number;
  map: MapConfig;
  koRule: "simple";
  allowSuicide: boolean;
  baseBuildCount: number;
  baseStoneBonus: number;
  plusMinusAmount: number;
  scanCost: number;
  bidMin: number;
  bidMax: number;
  seed: number;
}

export interface ScoreBreakdown {
  aliveStones: Record<PlayerId, number>;
  baseBonus: Record<PlayerId, number>;
  plusMinusAndScan: Record<PlayerId, number>;
  territory: Record<PlayerId, number>;
  komi: Record<PlayerId, number>;
  total: Record<PlayerId, number>;
}

export interface GameState {
  config: GameConfig;
  phase: Phase;
  board: (string | null)[][];
  stones: Record<string, Stone>;
  dynamicMinusPoints: string[];
  triggeredPointMarkers: string[];
  baseBuildSelections: Record<PlayerId, Coord[]>;
  baseBuildConfirmed: Record<PlayerId, boolean>;
  bids: {
    r1?: Record<PlayerId, number>;
    r2?: Record<PlayerId, number>;
  };
  komiAwardToWhite: number;
  playerColor: Record<PlayerId, Color>;
  nextToAct: PlayerId;
  hiddenStonePlaced: Record<PlayerId, boolean>;
  scanAvailable: Record<PlayerId, boolean>;
  scanUsed: Record<PlayerId, boolean>;
  consecutivePasses: number;
  scoreEvents: ScoreEvent[];
  moveIndex: number;
  lastMoveCoord?: Coord;
  lastMovePlayer?: PlayerId;
  historyBoardHashes: string[];
  rngSeed: number;
  winner?: PlayerId;
  endReason?: "DOUBLE_PASS" | "RESIGN" | "DISCONNECT" | "TIMEOUT";
  finalScore?: ScoreBreakdown;
}

export type Action =
  | { type: "PlaceBaseStone"; player: PlayerId; coord: Coord }
  | { type: "ConfirmBaseBuild"; player: PlayerId }
  | { type: "SubmitBid"; player: PlayerId; round: 1 | 2; value: number }
  | { type: "PlaceStone"; player: PlayerId; coord: Coord; kind: "NORMAL" | "HIDDEN" }
  | { type: "Scan"; player: PlayerId; coord: Coord }
  | { type: "Pass"; player: PlayerId }
  | { type: "Resign"; player: PlayerId };

export type EngineEvent =
  | { type: "REVEAL"; player: PlayerId; coord: Coord; reason: string; stoneId: string }
  | { type: "CAPTURE"; by: PlayerId; stoneIds: string[]; coords: Coord[] }
  | { type: "SCORE_DELTA"; player: PlayerId; amount: number; reason: string; coord?: Coord }
  | { type: "PHASE_CHANGE"; phase: Phase }
  | { type: "END"; reason: "DOUBLE_PASS" | "RESIGN" | "DISCONNECT" | "TIMEOUT"; winner?: PlayerId };

export interface ApplyResult {
  nextState: GameState;
  events: EngineEvent[];
  stateHash: string;
}

export class RuleError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RuleError";
  }
}
