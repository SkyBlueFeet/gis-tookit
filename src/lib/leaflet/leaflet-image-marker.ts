import L, { DivIcon, type LeafletEventHandlerFnMap, type Map as LeafletMap, Marker } from "leaflet";
import type { LeafletImageMarkerOptions, LeafletImageSize, LeafletLngLat } from "./types";

const DEFAULT_SIZE: LeafletImageSize = {
  width: 48,
  height: 48,
};

function createMarkerId(): string {
  return `leaflet-image-marker-${Math.random().toString(36).slice(2, 10)}`;
}

function escapeHtmlAttr(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function resolveAnchor(
  size: LeafletImageSize,
  anchor?: [number, number],
): [number, number] {
  if (anchor) {
    return anchor;
  }

  return [size.width / 2, size.height / 2];
}

function toLeafletLatLng(position: LeafletLngLat): [number, number] {
  return [position[1], position[0]];
}

export class LeafletImageMarker {
  private readonly id: string;
  private readonly marker: Marker;
  private options: Required<Omit<LeafletImageMarkerOptions, "id" | "anchor">> & {
    anchor: [number, number];
  };

  constructor(options: LeafletImageMarkerOptions) {
    const size = options.size ?? DEFAULT_SIZE;
    this.id = options.id ?? createMarkerId();
    this.options = {
      position: options.position,
      imageUrl: options.imageUrl,
      size,
      rotation: options.rotation ?? 0,
      opacity: options.opacity ?? 1,
      visible: options.visible ?? true,
      draggable: options.draggable ?? false,
      zIndexOffset: options.zIndexOffset ?? 0,
      anchor: resolveAnchor(size, options.anchor),
      alt: options.alt ?? "marker",
      className: options.className ?? "",
    };

    this.marker = L.marker(toLeafletLatLng(this.options.position), {
      icon: this.createIcon(),
      draggable: this.options.draggable,
      zIndexOffset: this.options.zIndexOffset,
      opacity: this.options.opacity,
      keyboard: false,
      alt: this.options.alt,
    });

    this.marker.on("move", () => {
      const position = this.marker.getLatLng();
      this.options.position = [position.lng, position.lat];
    });
  }

  getId(): string {
    return this.id;
  }

  addTo(target: LeafletMap): this {
    this.marker.addTo(target);
    this.syncVisibility();
    return this;
  }

  on(events: LeafletEventHandlerFnMap): this {
    this.marker.on(events);
    return this;
  }

  getMarker(): Marker {
    return this.marker;
  }

  getPosition(): LeafletLngLat {
    return [...this.options.position] as LeafletLngLat;
  }

  setPosition(position: LeafletLngLat): this {
    this.options.position = position;
    this.marker.setLatLng(toLeafletLatLng(position));
    return this;
  }

  setRotation(rotation: number): this {
    this.options.rotation = rotation;
    this.syncImageElement();
    return this;
  }

  rotateBy(delta: number): this {
    return this.setRotation(this.options.rotation + delta);
  }

  setImageUrl(imageUrl: string): this {
    this.options.imageUrl = imageUrl;
    this.syncImageElement();
    return this;
  }

  setSize(size: LeafletImageSize, anchor?: [number, number]): this {
    this.options.size = size;
    this.options.anchor = resolveAnchor(size, anchor);
    this.refreshIcon();
    return this;
  }

  setOpacity(opacity: number): this {
    this.options.opacity = opacity;
    this.marker.setOpacity(opacity);
    return this;
  }

  setVisible(visible: boolean): this {
    this.options.visible = visible;
    this.syncVisibility();
    return this;
  }

  setZIndexOffset(zIndexOffset: number): this {
    this.options.zIndexOffset = zIndexOffset;
    this.marker.setZIndexOffset(zIndexOffset);
    return this;
  }

  remove(): this {
    this.marker.remove();
    return this;
  }

  destroy(): void {
    this.marker.off();
    this.remove();
  }

  private refreshIcon(): void {
    this.marker.setIcon(this.createIcon());
    this.syncVisibility();
    this.syncImageElement();
  }

  private syncVisibility(): void {
    const element = this.marker.getElement();
    if (!element) {
      return;
    }

    element.style.display = this.options.visible ? "" : "none";
  }

  private syncImageElement(): void {
    const image = this.getImageElement();
    if (!image) {
      return;
    }

    const { alt, imageUrl, rotation, size } = this.options;
    image.src = imageUrl;
    image.alt = alt;
    image.width = size.width;
    image.height = size.height;
    image.style.width = `${size.width}px`;
    image.style.height = `${size.height}px`;
    image.style.transform = `rotate(${rotation}deg)`;
  }

  private getImageElement(): HTMLImageElement | null {
    const element = this.marker.getElement();
    if (!element) {
      return null;
    }

    return element.querySelector(".leaflet-image-marker__image");
  }

  private createIcon(): DivIcon {
    const { alt, className, imageUrl, rotation, size } = this.options;
    const classes = ["leaflet-image-marker", className].filter(Boolean).join(" ");
    const html = [
      `<img`,
      ` class="leaflet-image-marker__image"`,
      ` src="${escapeHtmlAttr(imageUrl)}"`,
      ` alt="${escapeHtmlAttr(alt)}"`,
      ` width="${size.width}"`,
      ` height="${size.height}"`,
      ` style="width:${size.width}px;height:${size.height}px;transform:rotate(${rotation}deg);"`,
      ` />`,
    ].join("");

    return L.divIcon({
      className: classes,
      html,
      iconSize: [size.width, size.height],
      iconAnchor: this.options.anchor,
    });
  }
}
