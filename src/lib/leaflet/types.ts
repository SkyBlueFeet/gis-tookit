import type { TileLayerOptions } from "leaflet";

export type LeafletLngLat = [longitude: number, latitude: number];

export interface LeafletMapControllerOptions {
  container: HTMLElement | string;
  center?: LeafletLngLat;
  zoom?: number;
  minZoom?: number;
  maxZoom?: number;
  zoomControl?: boolean;
  attributionControl?: boolean;
  tileLayerUrl?: string;
  tileLayerOptions?: TileLayerOptions;
}

export interface LeafletImageSize {
  width: number;
  height: number;
}

export interface LeafletImageMarkerOptions {
  id?: string;
  position: LeafletLngLat;
  imageUrl: string;
  size?: LeafletImageSize;
  rotation?: number;
  opacity?: number;
  visible?: boolean;
  draggable?: boolean;
  zIndexOffset?: number;
  anchor?: [x: number, y: number];
  alt?: string;
  className?: string;
}
