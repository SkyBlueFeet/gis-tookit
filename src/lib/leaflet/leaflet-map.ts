import L, { type Map as LeafletMap, tileLayer } from "leaflet";
import { LeafletImageMarker } from "./leaflet-image-marker";
import type { LeafletImageMarkerOptions, LeafletMapControllerOptions, LeafletLngLat } from "./types";

const DEFAULT_CENTER: LeafletLngLat = [121.4737, 31.2304];
const DEFAULT_TILE_LAYER = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";

export class LeafletMapController {
  private readonly map: LeafletMap;
  private readonly markers = new Map<string, LeafletImageMarker>();

  constructor(options: LeafletMapControllerOptions) {
    const map = L.map(options.container, {
      zoomControl: options.zoomControl ?? true,
      attributionControl: options.attributionControl ?? true,
      minZoom: options.minZoom,
      maxZoom: options.maxZoom,
    });

    map.setView(
      [options.center?.[1] ?? DEFAULT_CENTER[1], options.center?.[0] ?? DEFAULT_CENTER[0]],
      options.zoom ?? 10,
    );

    tileLayer(options.tileLayerUrl ?? DEFAULT_TILE_LAYER, {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      ...(options.tileLayerOptions ?? {}),
    }).addTo(map);

    this.map = map;
  }

  getMap(): LeafletMap {
    return this.map;
  }

  setView(center: LeafletLngLat, zoom?: number): this {
    this.map.setView([center[1], center[0]], zoom ?? this.map.getZoom());
    return this;
  }

  flyTo(center: LeafletLngLat, zoom?: number): this {
    this.map.flyTo([center[1], center[0]], zoom ?? this.map.getZoom());
    return this;
  }

  createImageMarker(options: LeafletImageMarkerOptions): LeafletImageMarker {
    const marker = new LeafletImageMarker(options).addTo(this.map);
    this.markers.set(marker.getId(), marker);
    return marker;
  }

  addImageMarker(marker: LeafletImageMarker): this {
    marker.addTo(this.map);
    this.markers.set(marker.getId(), marker);
    return this;
  }

  getImageMarker(id: string): LeafletImageMarker | undefined {
    return this.markers.get(id);
  }

  removeImageMarker(id: string): boolean {
    const marker = this.markers.get(id);
    if (!marker) {
      return false;
    }

    marker.destroy();
    this.markers.delete(id);
    return true;
  }

  clearImageMarkers(): this {
    for (const marker of this.markers.values()) {
      marker.destroy();
    }

    this.markers.clear();
    return this;
  }

  destroy(): void {
    this.clearImageMarkers();
    this.map.remove();
  }
}
