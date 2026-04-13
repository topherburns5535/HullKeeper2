from __future__ import annotations

import json
import math
from collections import Counter, deque
from pathlib import Path
from typing import Iterable

from PIL import Image, ImageColor, ImageDraw, ImageFont


# Paths
INPUT_IMAGE = Path(r"C:\Users\tophe\Downloads\NormDebris1.webp")
OUTPUT_DIR = Path(r"C:\Users\tophe\OneDrive\Documents\hull-keeper\public\assets\debris\common")
MANIFEST_PATH = OUTPUT_DIR / "debris_manifest.json"
DEBUG_OVERLAY_PATH = OUTPUT_DIR / "debris_slice_debug.png"
NOTES_PATH = OUTPUT_DIR / "README.md"

# Grid configuration
TILE_WIDTH = 128
TILE_HEIGHT = 128
X_OFFSET = 0
Y_OFFSET = 0
COLUMNS = 8
ROWS = 8
PADDING_BETWEEN_TILES = 0

# Extraction tuning
TRIM_PADDING = 8
BACKGROUND_BIN_SIZE = 12
BACKGROUND_COLOR_TOLERANCE = 28
ALPHA_THRESHOLD = 8
MIN_FOREGROUND_PIXELS = 220
MAX_FOREGROUND_COVERAGE = 0.82
MIN_BBOX_SIDE = 18

# These tiles are regular-grid crops that are clearly not suitable as common debris.
# Indexes are 1-based in row-major order.
MANUAL_REJECT_TILE_IDS = {
    4,
    5,
    6,
    7,
    8,
    12,
    14,
    15,
    16,
    17,
    18,
    19,
    22,
    23,
    24,
    25,
    28,
    30,
    31,
    32,
    34,
    40,
    41,
    42,
    43,
    44,
    45,
    46,
    47,
    48,
    49,
    50,
    51,
    52,
    53,
    54,
    55,
    56,
    21,
}


def quantize_color(rgb: tuple[int, int, int], bin_size: int = BACKGROUND_BIN_SIZE) -> tuple[int, int, int]:
    return tuple(int(round(channel / bin_size) * bin_size) for channel in rgb)


def color_distance(a: tuple[int, int, int], b: tuple[int, int, int]) -> float:
    return math.sqrt(sum((ax - bx) ** 2 for ax, bx in zip(a, b)))


def border_coordinates(width: int, height: int) -> Iterable[tuple[int, int]]:
    for x in range(width):
        yield x, 0
        yield x, height - 1
    for y in range(1, height - 1):
        yield 0, y
        yield width - 1, y


def infer_background_palette(tile: Image.Image) -> list[tuple[int, int, int]]:
    border_pixels = [tile.getpixel(point) for point in border_coordinates(*tile.size)]
    counts = Counter(quantize_color(pixel) for pixel in border_pixels)
    palette = [rgb for rgb, _count in counts.most_common(6)]
    if not palette:
        palette = [(128, 128, 128)]
    return palette


def is_background_pixel(rgb: tuple[int, int, int], palette: list[tuple[int, int, int]]) -> bool:
    return min(color_distance(rgb, sample) for sample in palette) <= BACKGROUND_COLOR_TOLERANCE


def build_foreground_mask(tile: Image.Image) -> Image.Image:
    rgb_tile = tile.convert("RGB")
    width, height = rgb_tile.size
    palette = infer_background_palette(rgb_tile)
    background = [[False for _x in range(width)] for _y in range(height)]
    queue: deque[tuple[int, int]] = deque()

    for point in border_coordinates(width, height):
        x, y = point
        if background[y][x]:
            continue
        if is_background_pixel(rgb_tile.getpixel(point), palette):
            background[y][x] = True
            queue.append(point)

    while queue:
        x, y = queue.popleft()
        for nx, ny in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)):
            if nx < 0 or ny < 0 or nx >= width or ny >= height:
                continue
            if background[ny][nx]:
                continue
            if is_background_pixel(rgb_tile.getpixel((nx, ny)), palette):
                background[ny][nx] = True
                queue.append((nx, ny))

    mask = Image.new("L", tile.size, 0)
    pixels = mask.load()
    for y in range(height):
        for x in range(width):
            if not background[y][x]:
                pixels[x, y] = 255
    return mask


def trim_to_alpha(image: Image.Image, padding: int = TRIM_PADDING) -> tuple[Image.Image, tuple[int, int, int, int] | None]:
    alpha = image.getchannel("A")
    bbox = alpha.point(lambda value: 255 if value > ALPHA_THRESHOLD else 0).getbbox()
    if bbox is None:
        return image, None

    left, top, right, bottom = bbox
    left = max(0, left - padding)
    top = max(0, top - padding)
    right = min(image.width, right + padding)
    bottom = min(image.height, bottom + padding)
    return image.crop((left, top, right, bottom)), (left, top, right, bottom)


def empty_reason(mask: Image.Image, bbox: tuple[int, int, int, int] | None) -> str | None:
    histogram = mask.histogram()
    opaque_pixels = sum(histogram[ALPHA_THRESHOLD + 1 :])
    if opaque_pixels < MIN_FOREGROUND_PIXELS:
        return "mostly_empty"

    coverage = opaque_pixels / (mask.width * mask.height)
    if coverage > MAX_FOREGROUND_COVERAGE:
        return "too_full"

    if bbox is None:
        return "no_visible_bounds"

    left, top, right, bottom = bbox
    if (right - left) < MIN_BBOX_SIDE or (bottom - top) < MIN_BBOX_SIDE:
        return "too_small"

    return None


def tile_box(tile_index: int) -> tuple[int, int, int, int]:
    row = tile_index // COLUMNS
    column = tile_index % COLUMNS
    left = X_OFFSET + column * (TILE_WIDTH + PADDING_BETWEEN_TILES)
    top = Y_OFFSET + row * (TILE_HEIGHT + PADDING_BETWEEN_TILES)
    return left, top, left + TILE_WIDTH, top + TILE_HEIGHT


def write_notes() -> None:
    notes = f"""# Common Debris Slicer

This folder contains debris tiles extracted from `{INPUT_IMAGE}` with `scripts/slice_common_debris.py`.

## Run

From the repo root:

```bash
python scripts/slice_common_debris.py
```

Install Pillow first if needed:

```bash
pip install pillow
```

## Adjust If Alignment Is Off

Edit these constants near the top of `scripts/slice_common_debris.py`:

- `TILE_WIDTH`
- `TILE_HEIGHT`
- `X_OFFSET`
- `Y_OFFSET`
- `COLUMNS`
- `ROWS`
- `PADDING_BETWEEN_TILES`

Useful cleanup tuning values are also exposed there:

- `TRIM_PADDING`
- `BACKGROUND_COLOR_TOLERANCE`
- `MIN_FOREGROUND_PIXELS`
- `MAX_FOREGROUND_COVERAGE`
- `MANUAL_REJECT_TILE_IDS`

## Outputs

- Individual PNGs: `{OUTPUT_DIR}`
- Debug grid overlay: `{DEBUG_OVERLAY_PATH.name}`
- Manifest: `{MANIFEST_PATH.name}`

The exported files are trimmed to their visible content and keep a small transparent padding margin.
"""
    NOTES_PATH.write_text(notes, encoding="utf-8")


def main() -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    for existing_file in OUTPUT_DIR.glob("debris_*.png"):
        existing_file.unlink()
    write_notes()

    source = Image.open(INPUT_IMAGE).convert("RGBA")
    overlay = source.copy()
    draw = ImageDraw.Draw(overlay)
    font = ImageFont.load_default()

    manifest: list[dict[str, object]] = []
    exported_count = 0

    for row in range(ROWS):
        for column in range(COLUMNS):
            tile_id = row * COLUMNS + column + 1
            box = tile_box(tile_id - 1)
            tile = source.crop(box)
            mask = build_foreground_mask(tile)
            rgba_tile = tile.copy()
            rgba_tile.putalpha(mask)
            trimmed_tile, trimmed_bbox = trim_to_alpha(rgba_tile)
            reason = empty_reason(mask, trimmed_bbox)

            if tile_id in MANUAL_REJECT_TILE_IDS:
                reason = "manual_reject"

            if reason is None:
                exported_count += 1
                export_name = f"debris_{exported_count:02d}.png"
                export_path = OUTPUT_DIR / export_name
                trimmed_tile.save(export_path)
                outline_color = "#22c55e"
            else:
                export_name = None
                outline_color = "#ef4444"

            draw.rectangle(box, outline=ImageColor.getrgb(outline_color), width=2)
            draw.text((box[0] + 6, box[1] + 6), str(tile_id), fill="white", font=font)

            manifest.append(
                {
                    "tile_id": tile_id,
                    "row": row,
                    "column": column,
                    "source_box": list(box),
                    "trimmed_box": list(trimmed_bbox) if trimmed_bbox else None,
                    "status": "exported" if export_name else "skipped",
                    "reason": reason,
                    "output_file": export_name,
                }
            )

    overlay.save(DEBUG_OVERLAY_PATH)
    MANIFEST_PATH.write_text(json.dumps(manifest, indent=2), encoding="utf-8")

    print(f"Processed {ROWS * COLUMNS} tiles")
    print(f"Exported {exported_count} debris sprites to {OUTPUT_DIR}")
    print(f"Wrote debug overlay to {DEBUG_OVERLAY_PATH}")
    print(f"Wrote manifest to {MANIFEST_PATH}")


if __name__ == "__main__":
    main()
