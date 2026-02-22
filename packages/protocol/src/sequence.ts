export class SequenceGuard {
  private lastSeq = -1;

  canAccept(seq: number): boolean {
    return Number.isInteger(seq) && seq > this.lastSeq;
  }

  accept(seq: number): void {
    if (!this.canAccept(seq)) {
      throw new Error(`Invalid sequence ${seq}, expected > ${this.lastSeq}`);
    }
    this.lastSeq = seq;
  }

  getLastSeq(): number {
    return this.lastSeq;
  }
}
