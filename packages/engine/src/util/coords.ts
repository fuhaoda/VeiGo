import type { Coord } from "../model";

export function coordKey(coord: Coord): string {
  return `${coord.x},${coord.y}`;
}

export function parseCoordKey(key: string): Coord {
  const [x, y] = key.split(",").map(Number);
  return { x, y };
}

export function sameCoord(a: Coord, b: Coord): boolean {
  return a.x === b.x && a.y === b.y;
}

export function inBounds(coord: Coord, size: number): boolean {
  return coord.x >= 0 && coord.y >= 0 && coord.x < size && coord.y < size;
}

export function neighbors(coord: Coord, size: number): Coord[] {
  const list: Coord[] = [
    { x: coord.x - 1, y: coord.y },
    { x: coord.x + 1, y: coord.y },
    { x: coord.x, y: coord.y - 1 },
    { x: coord.x, y: coord.y + 1 }
  ];
  return list.filter((c) => inBounds(c, size));
}
