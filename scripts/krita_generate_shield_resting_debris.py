from __future__ import annotations

"""
HullKeeper Krita helper: generate subtle shield-resting debris variants.

How to run inside Krita:
1. Open Krita.
2. Go to Tools > Scripts > Scripter.
3. Load this file and run it.
4. Edit the CONFIG block near the top before running if you want a different
   source sprite, output folder, or effect strength.

What it does:
- Loads one existing transparent debris PNG.
- Creates new Krita documents with the debris preserved exactly on its own layer.
- Adds two generated layers underneath the debris:
  - a soft cyan contact glow
  - a faint ripple/ring
- Exports subtle PNG variants with transparent backgrounds.
- Optionally leaves the generated documents open in Krita for manual polish.

Assumptions:
- Tested logically against Krita 5.x style Python API names, but not executed
  in this environment because Krita is not installed here.
- Uses PyQt5's QImage, which ships with Krita's Python.
- Uses RGBA/U8 documents. Krita's integer RGBA pixel order for setPixelData is
  Blue, Green, Red, Alpha, so this script writes BGRA bytes on purpose.
"""

from dataclasses import dataclass
from pathlib import Path

from PyQt5.QtCore import QByteArray
from PyQt5.QtGui import QImage
from krita import InfoObject, Krita


PROJECT_ROOT = Path(r"C:\Users\tophe\OneDrive\Documents\hull-keeper")


@dataclass(frozen=True)
class Variant:
    suffix: str
    scale: float
    y_scale: float
    glow_opacity: float
    ring_opacity: float
    x_offset: int = 0
    y_offset: int = 0


@dataclass(frozen=True)
class Config:
    input_path: Path = PROJECT_ROOT / "public" / "assets" / "debris" / "CommonDebris1.png"
    # If you point input_path somewhere else, usually set output_dir to that same folder.
    output_dir: Path = PROJECT_ROOT / "public" / "assets" / "debris"
    output_tag: str = "_ShieldResting"
    output_resolution_ppi: float = 72.0
    open_output_documents: bool = True
    close_documents_after_export: bool = False

    # Small canvas padding so the glow is visible without creating a giant canvas.
    pad_left_right: int = 4
    pad_top: int = 2
    pad_bottom: int = 8

    # Shield footprint sizing. Keep these restrained for subtle support contact.
    footprint_width_scale: float = 1.08
    footprint_height_scale: float = 0.18
    min_contact_height: int = 4
    max_height_vs_width: float = 0.34

    # Core glow tuning.
    glow_color: tuple[int, int, int] = (92, 220, 255)
    glow_alpha: int = 64
    glow_edge_softness: float = 0.42

    # Secondary ripple/ring tuning.
    ring_color: tuple[int, int, int] = (154, 238, 255)
    ring_alpha: int = 28
    ring_position: float = 0.80
    ring_width: float = 0.16

    # Bottom alpha band used to estimate the "resting" footprint.
    alpha_threshold: int = 10
    footprint_band_ratio: float = 0.24
    footprint_column_threshold: float = 0.18

    variants: tuple[Variant, ...] = (
        Variant("_1", scale=0.97, y_scale=0.93, glow_opacity=0.92, ring_opacity=0.88, x_offset=-1),
        Variant("_2", scale=1.00, y_scale=1.00, glow_opacity=1.00, ring_opacity=1.00, x_offset=0),
        Variant("_3", scale=1.03, y_scale=0.97, glow_opacity=1.07, ring_opacity=0.95, x_offset=1, y_offset=1),
    )


CONFIG = Config()


@dataclass(frozen=True)
class SpriteMetrics:
    min_x: int
    min_y: int
    max_x: int
    max_y: int
    support_left: int
    support_right: int
    support_center_x: float

    @property
    def width(self) -> int:
        return self.max_x - self.min_x + 1

    @property
    def height(self) -> int:
        return self.max_y - self.min_y + 1

    @property
    def support_width(self) -> int:
        return self.support_right - self.support_left + 1


def clamp(value: float, minimum: float, maximum: float) -> float:
    return max(minimum, min(maximum, value))


def smoothstep(edge0: float, edge1: float, value: float) -> float:
    if edge0 == edge1:
        return 0.0 if value < edge0 else 1.0
    t = clamp((value - edge0) / (edge1 - edge0), 0.0, 1.0)
    return t * t * (3.0 - 2.0 * t)


def load_image(path: Path) -> QImage:
    image = QImage(str(path))
    if image.isNull():
        raise RuntimeError(f"Could not load PNG: {path}")
    return image.convertToFormat(QImage.Format_ARGB32)


def analyze_sprite(image: QImage, alpha_threshold: int) -> SpriteMetrics:
    min_x = image.width()
    min_y = image.height()
    max_x = -1
    max_y = -1

    for y in range(image.height()):
        for x in range(image.width()):
            alpha = (image.pixel(x, y) >> 24) & 0xFF
            if alpha <= alpha_threshold:
                continue
            min_x = min(min_x, x)
            min_y = min(min_y, y)
            max_x = max(max_x, x)
            max_y = max(max_y, y)

    if max_x < min_x or max_y < min_y:
        raise RuntimeError("The input sprite appears fully transparent.")

    sprite_height = max_y - min_y + 1
    band_height = max(2, int(round(sprite_height * CONFIG.footprint_band_ratio)))
    band_top = max(min_y, max_y - band_height + 1)

    column_weights: list[int] = []
    total_weight = 0
    weighted_x_sum = 0

    for x in range(min_x, max_x + 1):
        weight = 0
        for y in range(band_top, max_y + 1):
            alpha = (image.pixel(x, y) >> 24) & 0xFF
            if alpha > alpha_threshold:
                weight += alpha
        column_weights.append(weight)
        total_weight += weight
        weighted_x_sum += x * weight

    strongest_column = max(column_weights) if column_weights else 0
    threshold = strongest_column * CONFIG.footprint_column_threshold
    support_indices = [i for i, weight in enumerate(column_weights) if weight >= threshold and weight > 0]

    if support_indices:
        support_left = min_x + support_indices[0]
        support_right = min_x + support_indices[-1]
    else:
        support_left = min_x
        support_right = max_x

    if total_weight > 0:
        support_center_x = weighted_x_sum / total_weight
    else:
        support_center_x = (support_left + support_right) / 2.0

    return SpriteMetrics(
        min_x=min_x,
        min_y=min_y,
        max_x=max_x,
        max_y=max_y,
        support_left=support_left,
        support_right=support_right,
        support_center_x=support_center_x,
    )


def qimage_to_krita_bgra(image: QImage) -> QByteArray:
    raw = bytearray(image.width() * image.height() * 4)
    index = 0

    for y in range(image.height()):
        for x in range(image.width()):
            argb = image.pixel(x, y)
            raw[index] = argb & 0xFF
            raw[index + 1] = (argb >> 8) & 0xFF
            raw[index + 2] = (argb >> 16) & 0xFF
            raw[index + 3] = (argb >> 24) & 0xFF
            index += 4

    return QByteArray(bytes(raw))


def transparent_bgra(width: int, height: int) -> bytearray:
    return bytearray(width * height * 4)


def blend_pixel_bgra(raw: bytearray, index: int, rgb: tuple[int, int, int], alpha: int) -> None:
    if alpha <= 0:
        return

    src_r, src_g, src_b = rgb
    src_a = alpha / 255.0

    dst_b = raw[index]
    dst_g = raw[index + 1]
    dst_r = raw[index + 2]
    dst_a = raw[index + 3] / 255.0

    out_a = src_a + dst_a * (1.0 - src_a)
    if out_a <= 0.0:
        return

    out_r = (src_r * src_a + dst_r * dst_a * (1.0 - src_a)) / out_a
    out_g = (src_g * src_a + dst_g * dst_a * (1.0 - src_a)) / out_a
    out_b = (src_b * src_a + dst_b * dst_a * (1.0 - src_a)) / out_a

    raw[index] = int(round(clamp(out_b, 0.0, 255.0)))
    raw[index + 1] = int(round(clamp(out_g, 0.0, 255.0)))
    raw[index + 2] = int(round(clamp(out_r, 0.0, 255.0)))
    raw[index + 3] = int(round(clamp(out_a * 255.0, 0.0, 255.0)))


def build_glow_layer(
    width: int,
    height: int,
    center_x: float,
    center_y: float,
    radius_x: float,
    radius_y: float,
    color: tuple[int, int, int],
    max_alpha: int,
    edge_softness: float,
) -> QByteArray:
    raw = transparent_bgra(width, height)
    edge_start = clamp(1.0 - edge_softness, 0.0, 0.98)

    for y in range(height):
        for x in range(width):
            dx = (x + 0.5 - center_x) / max(radius_x, 0.001)
            dy = (y + 0.5 - center_y) / max(radius_y, 0.001)
            distance = (dx * dx + dy * dy) ** 0.5
            if distance >= 1.0:
                continue

            edge = smoothstep(edge_start, 1.0, distance)
            core = (1.0 - edge) ** 1.45
            alpha = int(round(max_alpha * core))
            blend_pixel_bgra(raw, (y * width + x) * 4, color, alpha)

    return QByteArray(bytes(raw))


def build_ring_layer(
    width: int,
    height: int,
    center_x: float,
    center_y: float,
    radius_x: float,
    radius_y: float,
    color: tuple[int, int, int],
    max_alpha: int,
    ring_position: float,
    ring_width: float,
) -> QByteArray:
    raw = transparent_bgra(width, height)
    inner = max(0.0, ring_position - ring_width)
    outer = min(1.35, ring_position + ring_width)

    for y in range(height):
        for x in range(width):
            dx = (x + 0.5 - center_x) / max(radius_x, 0.001)
            dy = (y + 0.5 - center_y) / max(radius_y, 0.001)
            distance = (dx * dx + dy * dy) ** 0.5
            if distance <= inner or distance >= outer:
                continue

            if distance <= ring_position:
                band = smoothstep(inner, ring_position, distance)
            else:
                band = 1.0 - smoothstep(ring_position, outer, distance)

            alpha = int(round(max_alpha * band))
            blend_pixel_bgra(raw, (y * width + x) * 4, color, alpha)

    return QByteArray(bytes(raw))


def create_export_config() -> InfoObject:
    info = InfoObject()
    info.setProperty("alpha", True)
    info.setProperty("compression", 9)
    info.setProperty("forceSRGB", False)
    info.setProperty("indexed", False)
    info.setProperty("interlaced", False)
    info.setProperty("saveSRGBProfile", True)
    info.setProperty("transparencyFillcolor", [0, 0, 0])
    return info


def create_variant_document(
    app: Krita,
    image: QImage,
    metrics: SpriteMetrics,
    variant: Variant,
    output_path: Path,
) -> None:
    canvas_width = image.width() + CONFIG.pad_left_right * 2
    canvas_height = image.height() + CONFIG.pad_top + CONFIG.pad_bottom
    doc = app.createDocument(
        canvas_width,
        canvas_height,
        output_path.stem,
        "RGBA",
        "U8",
        "",
        CONFIG.output_resolution_ppi,
    )
    doc.setBatchmode(True)

    if CONFIG.open_output_documents and app.activeWindow() is not None:
        app.activeWindow().addView(doc)

    root = doc.rootNode()
    top_level_nodes = doc.topLevelNodes()
    if not top_level_nodes:
        raise RuntimeError("Krita did not create the default transparent layer.")

    ripple_layer = top_level_nodes[0]
    ripple_layer.setName("Shield Ripple")

    glow_layer = doc.createNode("Shield Glow", "paintLayer")
    debris_layer = doc.createNode("Debris Original", "paintLayer")
    root.addChildNode(glow_layer, None)
    root.addChildNode(debris_layer, None)

    debris_x = CONFIG.pad_left_right
    debris_y = CONFIG.pad_top
    support_width = metrics.support_width * CONFIG.footprint_width_scale * variant.scale
    support_height = max(
        CONFIG.min_contact_height,
        min(
            metrics.height * CONFIG.footprint_height_scale * variant.y_scale,
            support_width * CONFIG.max_height_vs_width,
        ),
    )

    center_x = debris_x + metrics.support_center_x + variant.x_offset
    center_y = debris_y + metrics.max_y + 1 + (support_height * 0.32) + variant.y_offset
    glow_radius_x = max(4.0, support_width * 0.5)
    glow_radius_y = max(2.0, support_height * 0.5)
    ring_radius_x = glow_radius_x * 1.04
    ring_radius_y = glow_radius_y * 1.10

    glow_alpha = int(round(CONFIG.glow_alpha * variant.glow_opacity))
    ring_alpha = int(round(CONFIG.ring_alpha * variant.ring_opacity))

    debris_layer.setPixelData(qimage_to_krita_bgra(image), debris_x, debris_y, image.width(), image.height())
    glow_layer.setPixelData(
        build_glow_layer(
            canvas_width,
            canvas_height,
            center_x,
            center_y,
            glow_radius_x,
            glow_radius_y,
            CONFIG.glow_color,
            glow_alpha,
            CONFIG.glow_edge_softness,
        ),
        0,
        0,
        canvas_width,
        canvas_height,
    )
    ripple_layer.setPixelData(
        build_ring_layer(
            canvas_width,
            canvas_height,
            center_x,
            center_y,
            ring_radius_x,
            ring_radius_y,
            CONFIG.ring_color,
            ring_alpha,
            CONFIG.ring_position,
            CONFIG.ring_width,
        ),
        0,
        0,
        canvas_width,
        canvas_height,
    )

    doc.refreshProjection()
    doc.waitForDone()

    output_path.parent.mkdir(parents=True, exist_ok=True)
    if not doc.exportImage(str(output_path), create_export_config()):
        raise RuntimeError(f"Failed to export PNG: {output_path}")

    print(f"Exported {output_path.name}")

    if CONFIG.close_documents_after_export and not CONFIG.open_output_documents:
        doc.close()


def build_output_path(input_path: Path, output_dir: Path, output_tag: str, variant_suffix: str) -> Path:
    return output_dir / f"{input_path.stem}{output_tag}{variant_suffix}.png"


def main() -> None:
    app = Krita.instance()
    input_path = CONFIG.input_path
    output_dir = CONFIG.output_dir

    image = load_image(input_path)
    metrics = analyze_sprite(image, CONFIG.alpha_threshold)

    print(f"Input: {input_path}")
    print(f"Output dir: {output_dir}")
    print(
        "Sprite bounds: "
        f"({metrics.min_x}, {metrics.min_y}) -> ({metrics.max_x}, {metrics.max_y}), "
        f"support width={metrics.support_width}px"
    )

    for variant in CONFIG.variants:
        output_path = build_output_path(input_path, output_dir, CONFIG.output_tag, variant.suffix)
        create_variant_document(app, image, metrics, variant, output_path)

    print("Done. Generated shield-resting variants and kept transparency intact.")


if __name__ == "__main__":
    main()
