export type SegmentStats = {
  total: number;
  ready: number;
  sent: number;
  opened: number;
  breached: number;
};

export type SegmentType = keyof SegmentStats;
