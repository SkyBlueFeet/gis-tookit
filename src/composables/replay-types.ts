import type { LeafletLngLat } from "@/lib/leaflet";

export interface AjaxResult<T = unknown> {
  code?: number;
  msg?: string;
  data?: T;
  [key: string]: unknown;
}

export interface ReplayRunRecord {
  runId: string;
  shardTable: string;
  status: string;
  startedAt: string | null;
  endedAt: string | null;
  firstSeqNo: number | null;
  lastSeqNo: number | null;
  firstSimTimeMs: number | null;
  lastSimTimeMs: number | null;
  recordCount: number;
}

export interface ReplayStatus {
  enabled: boolean;
  state: string;
  runId: string | null;
  speed: number;
  currentSeqNo: number | null;
  currentSimTimeMs: number | null;
  replayedCount: number;
  sourceStartedAt: string | null;
  sourceEndedAt: string | null;
  replayStartedAt: string | null;
  updatedAt: string | null;
  completedAt: string | null;
}

export interface ReplayApiCallOptions {
  silent?: boolean;
}

export interface ReplayMarkerUpdate {
  id: string;
  position: LeafletLngLat;
  rotation: number;
  source: "armsTargetGRIs" | "positionDynamics";
}
