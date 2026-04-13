from __future__ import annotations

import argparse
import math
import random
from collections import Counter, deque
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageFilter


DEFAULT_INPUT = Path(
    r"C:\Users\tophe\OneDrive\Documents\hull-keeper\public\assets\debris\common\CommonDebris1.png"
)
DEFAULT_OUTPUT = Path(
    r"C:\Users\tophe\OneDrive\Documents\hull-keeper\public\assets\debris\common\CommonDebris1_Resting.png"
)

# Background extraction
BACKGROUND_BIN_SIZE = 12
BACKGROUND_TOLERANCE = 26
MASK_THRESHOLD = 18

# Resting treatment
DEFAULT_DAMAGE = 0.55
DEFAULT_ROTATION_DEGREES = -7.0
DEFAULT_VERTICAL_SQUASH = 0.9
TRIM_PADDING = 14


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Generate a crashed/resting version of a debris sprite."
    )
    parser.add_argument("--input", type=Path, default=DEFAULT_INPUT)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument(
        "--damage",
        type=float,
        default=DEFAULT_DAMAGE,
        help="Damage intensity from 0.0 to 1.0.",
    )
    parser.add_argument(
        "--angle",
        type=float,
        default=DEFAULT_ROTATION_DEGREES,
        help="Small rotation in degrees.",
    )
    parser.add_argument(
        "--squash",
        type=float,
        default=DEFAULT_VERTICAL_SQUASH,
        help="Vertical scale to simulate impact. 1.0 keeps original height.",
    )
    parser.add_argument(
        "--seed",
        type=int,
        default=7,
        help="Random seed for scratches and cracks.",
    )
    return parser.parse_args()


def quantize_color(rgb: tuple[int, int, int], bin_size: int = BACKGROUND_BIN_SIZE) -> tuple[int, int, int]:
    return tuple(int(round(channel / bin_size) * bin_size) for channel in rgb)


def color_distance(a: tuple[int, int, int], b: tuple[int, int, int]) -> float:
    return math.sqrt(sum((ax - bx) ** 2 for ax, bx in zip(a, b)))


def border_coordinates(width: int, height: int):
    for x in range(width):
        yield x, 0
        yield x, height - 1
    for y in range(1, height - 1):
        yield 0, y
        yield width - 1, y


def infer_background_palette(image: Image.Image) -> list[tuple[int, int, int]]:
    counts = Counter(
        quantize_color(image.getpixel(point))
        for point in border_coordinates(*image.size)
    )
    return [rgb for rgb, _count in counts.most_common(6)] or [(128, 128, 128)]


def is_background_pixel(rgb: tuple[int, int, int], palette: list[tuple[int, int, int]]) -> bool:
    return min(color_distance(rgb, sample) for sample in palette) <= BACKGROUND_TOLERANCE


def build_foreground_mask(image: Image.Image) -> Image.Image:
    rgb = image.convert("RGB")
    width, height = rgb.size
    palette = infer_background_palette(rgb)
    background = [[False for _x in range(width)] for _y in range(height)]
    queue: deque[tuple[int, int]] = deque()

    for point in border_coordinates(width, height):
        x, y = point
        if background[y][x]:
            continue
        if is_background_pixel(rgb.getpixel(point), palette):
            background[y][x] = True
            queue.append(point)

    while queue:
        x, y = queue.popleft()
        for nx, ny in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)):
            if nx < 0 or ny < 0 or nx >= width or ny >= height:
                continue
            if background[ny][nx]:
                continue
            if is_background_pixel(rgb.getpixel((nx, ny)), palette):
                background[ny][nx] = True
                queue.append((nx, ny))

    mask = Image.new("L", image.size, 0)
    mask_pixels = mask.load()
    alpha = image.getchannel("A")
    alpha_pixels = alpha.load()
    for y in range(height):
        for x in range(width):
            if not background[y][x] and alpha_pixels[x, y] > MASK_THRESHOLD:
                mask_pixels[x, y] = 255
    return mask


def largest_component(mask: Image.Image) -> Image.Image:
    width, height = mask.size
    source = mask.load()
    visited = [[False for _x in range(width)] for _y in range(height)]
    best_component: list[tuple[int, int]] = []

    for y in range(height):
        for x in range(width):
            if visited[y][x] or source[x, y] <= 0:
                continue

            queue: deque[tuple[int, int]] = deque([(x, y)])
            visited[y][x] = True
            current: list[tuple[int, int]] = []

            while queue:
                cx, cy = queue.popleft()
                current.append((cx, cy))
                for nx, ny in (
                    (cx - 1, cy),
                    (cx + 1, cy),
                    (cx, cy - 1),
                    (cx, cy + 1),
                ):
                    if nx < 0 or ny < 0 or nx >= width or ny >= height:
                        continue
                    if visited[ny][nx] or source[nx, ny] <= 0:
                        continue
                    visited[ny][nx] = True
                    queue.append((nx, ny))

            if len(current) > len(best_component):
                best_component = current

    isolated = Image.new("L", mask.size, 0)
    isolated_pixels = isolated.load()
    for x, y in best_component:
        isolated_pixels[x, y] = 255
    return isolated


def trim_to_alpha(image: Image.Image, padding: int = TRIM_PADDING) -> Image.Image:
    bbox = image.getchannel("A").getbbox()
    if bbox is None:
        return image
    left, top, right, bottom = bbox
    left = max(0, left - padding)
    top = max(0, top - padding)
    right = min(image.width, right + padding)
    bottom = min(image.height, bottom + padding)
    return image.crop((left, top, right, bottom))


def extract_primary_object(image: Image.Image) -> Image.Image:
    mask = build_foreground_mask(image)
    primary_mask = largest_component(mask)
    extracted = image.copy()
    extracted.putalpha(primary_mask)
    return trim_to_alpha(extracted)


def add_bottom_darkening(image: Image.Image, strength: float) -> Image.Image:
    width, height = image.size
    overlay = Image.new("RGBA", image.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)

    for y in range(height):
        normalized = y / max(1, height - 1)
        intensity = max(0.0, (normalized - 0.45) / 0.55)
        alpha = int(70 * strength * intensity)
        draw.line((0, y, width, y), fill=(18, 18, 20, alpha))

    overlay.putalpha(
        ImageChops.multiply(overlay.getchannel("A"), image.getchannel("A"))
    )
    return Image.alpha_composite(image, overlay)


def add_damage(image: Image.Image, damage: float, seed: int) -> Image.Image:
    rng = random.Random(seed)
    width, height = image.size
    alpha = image.getchannel("A")
    bbox = alpha.getbbox()
    if bbox is None:
        return image

    left, top, right, bottom = bbox
    damage_layer = Image.new("RGBA", image.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(damage_layer)

    patch_count = 2 + round(damage * 4)
    scratch_count = 3 + round(damage * 6)
    crack_count = 1 + round(damage * 3)

    def random_point() -> tuple[int, int]:
        for _ in range(200):
            x = rng.randint(left, right - 1)
            y = rng.randint(top, bottom - 1)
            if alpha.getpixel((x, y)) > 32:
                return x, y
        return (left + right) // 2, (top + bottom) // 2

    for _ in range(patch_count):
        x, y = random_point()
        rx = rng.randint(8, 24)
        ry = rng.randint(6, 18)
        color = (45, 45, 50, int(45 + 35 * damage))
        draw.ellipse((x - rx, y - ry, x + rx, y + ry), fill=color)

    for _ in range(scratch_count):
        x1, y1 = random_point()
        length = rng.randint(10, 34)
        angle = rng.uniform(-1.2, 1.2)
        x2 = int(x1 + math.cos(angle) * length)
        y2 = int(y1 + math.sin(angle) * length)
        color = (28, 28, 32, int(85 + 40 * damage))
        draw.line((x1, y1, x2, y2), fill=color, width=rng.randint(1, 2))

    for _ in range(crack_count):
        x, y = random_point()
        segments = [(x, y)]
        for _step in range(rng.randint(2, 4)):
            px, py = segments[-1]
            nx = px + rng.randint(-18, 18)
            ny = py + rng.randint(6, 20)
            segments.append((nx, ny))
        draw.line(
            segments,
            fill=(20, 20, 22, int(110 + 50 * damage)),
            width=1,
            joint="curve",
        )

    clipped_alpha = ImageChops.multiply(damage_layer.getchannel("A"), alpha)
    damage_layer.putalpha(clipped_alpha)
    return Image.alpha_composite(image, damage_layer)


def transform_resting(image: Image.Image, angle: float, squash: float) -> Image.Image:
    width, height = image.size
    squashed_height = max(1, int(height * squash))
    squashed = image.resize((width, squashed_height), resample=Image.Resampling.BICUBIC)
    return squashed.rotate(
        angle,
        resample=Image.Resampling.BICUBIC,
        expand=True,
    )


def add_contact_shadow(image: Image.Image, damage: float) -> Image.Image:
    alpha = image.getchannel("A")
    shadow_alpha = alpha.filter(ImageFilter.GaussianBlur(radius=8))
    shadow = Image.new(
        "RGBA",
        image.size,
        (0, 0, 0, int(88 + 48 * damage)),
    )
    shadow.putalpha(shadow_alpha)

    canvas = Image.new(
        "RGBA",
        (image.width + 20, image.height + 26),
        (0, 0, 0, 0),
    )
    shadow_x = 10
    shadow_y = 14
    sprite_x = 8
    sprite_y = 2
    canvas.alpha_composite(shadow, (shadow_x, shadow_y))
    canvas.alpha_composite(image, (sprite_x, sprite_y))
    return trim_to_alpha(canvas)


def main() -> None:
    args = parse_args()
    damage = max(0.0, min(1.0, args.damage))
    args.output.parent.mkdir(parents=True, exist_ok=True)

    source = Image.open(args.input).convert("RGBA")
    primary = extract_primary_object(source)
    resting = transform_resting(primary, angle=args.angle, squash=args.squash)
    resting = add_bottom_darkening(resting, strength=0.7 + damage * 0.5)
    resting = add_damage(resting, damage=damage, seed=args.seed)
    resting = add_contact_shadow(resting, damage=damage)
    resting.save(args.output)

    print(f"Input:  {args.input}")
    print(f"Output: {args.output}")
    print(f"Damage: {damage:.2f}")
    print(f"Angle:  {args.angle:.2f}")
    print(f"Squash: {args.squash:.2f}")


if __name__ == "__main__":
    main()
