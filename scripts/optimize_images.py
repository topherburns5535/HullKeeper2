from __future__ import annotations

import argparse
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable

from PIL import Image


IMAGE_EXTENSIONS = {".png", ".jpg", ".jpeg", ".webp"}
DEFAULT_SOURCE = Path("public/assets")
DEFAULT_OUTPUT = Path("public/assets_optimized")
JPEG_WEBP_QUALITY = 86
PNG_COMPRESS_LEVEL = 9


@dataclass(frozen=True)
class OptimizationResult:
    source: Path
    output: Path
    category: str
    original_size: int
    optimized_size: int
    original_dimensions: tuple[int, int]
    optimized_dimensions: tuple[int, int]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Resize and optimize image assets for Hull Keeper.",
    )
    parser.add_argument(
        "--source",
        type=Path,
        default=DEFAULT_SOURCE,
        help="Source asset directory. Defaults to public/assets",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=DEFAULT_OUTPUT,
        help="Output directory. Ignored when --in-place is used. Defaults to public/assets_optimized",
    )
    parser.add_argument(
        "--in-place",
        action="store_true",
        help="Overwrite files in the source directory instead of writing to a separate output folder.",
    )
    parser.add_argument(
        "--quality",
        type=int,
        default=JPEG_WEBP_QUALITY,
        help="Quality used for JPEG and WEBP output. Defaults to 86.",
    )
    parser.add_argument(
        "--match",
        action="append",
        default=[],
        help="Optional filename glob filter. Can be passed multiple times.",
    )
    return parser.parse_args()


def iter_image_files(source_dir: Path, patterns: list[str]) -> Iterable[Path]:
    for path in sorted(source_dir.rglob("*")):
        if not (path.is_file() and path.suffix.lower() in IMAGE_EXTENSIONS):
            continue
        if patterns and not any(path.match(pattern) or path.name.lower() == pattern.lower() for pattern in patterns):
            continue
        yield path


def detect_category(path: Path, source_dir: Path) -> str:
    relative_parts = {part.lower() for part in path.relative_to(source_dir).parts}
    if "vacuum" in relative_parts or "vaccum" in relative_parts:
        return "vacuum"
    if "bots" in relative_parts or source_dir.name.lower() == "bots":
        return "bots"
    if "debris" in relative_parts:
        return "debris"
    if "effects" in relative_parts:
        return "effects"
    if "background" in relative_parts or "board" in relative_parts:
        return "background"
    return "other"


def max_dimensions_for(category: str) -> tuple[int, int]:
    if category == "vacuum":
        return (256, 256)
    if category == "bots":
        return (192, 192)
    if category == "debris":
        return (128, 128)
    if category == "effects":
        return (256, 256)
    if category == "background":
        return (1024, 1024)
    return (1024, 1024)


def ensure_parent(path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)


def optimize_image(
    source_path: Path,
    destination_path: Path,
    category: str,
    quality: int,
) -> OptimizationResult:
    original_size = source_path.stat().st_size

    with Image.open(source_path) as image:
        image.load()
        original_dimensions = image.size
        processed = image.copy()
        processed.thumbnail(max_dimensions_for(category), Image.Resampling.LANCZOS)
        optimized_dimensions = processed.size

        ensure_parent(destination_path)
        suffix = destination_path.suffix.lower()

        if suffix == ".png":
            processed.save(destination_path, optimize=True, compress_level=PNG_COMPRESS_LEVEL)
        elif suffix in {".jpg", ".jpeg"}:
            save_image = processed.convert("RGB")
            save_image.save(
                destination_path,
                optimize=True,
                quality=quality,
                progressive=True,
            )
        elif suffix == ".webp":
            processed.save(
                destination_path,
                format="WEBP",
                quality=quality,
                method=6,
            )
        else:
            processed.save(destination_path)

    optimized_size = destination_path.stat().st_size
    return OptimizationResult(
        source=source_path,
        output=destination_path,
        category=category,
        original_size=original_size,
        optimized_size=optimized_size,
        original_dimensions=original_dimensions,
        optimized_dimensions=optimized_dimensions,
    )


def format_bytes(size: int) -> str:
    units = ["B", "KB", "MB", "GB"]
    value = float(size)
    for unit in units:
        if value < 1024 or unit == units[-1]:
            return f"{value:.2f} {unit}"
        value /= 1024
    return f"{value:.2f} GB"


def main() -> int:
    args = parse_args()
    source_dir = args.source.resolve()
    output_dir = args.output.resolve()

    if not source_dir.exists():
        print(f"Source directory not found: {source_dir}")
        return 1

    results: list[OptimizationResult] = []
    destination_root = source_dir if args.in_place else output_dir

    for image_path in iter_image_files(source_dir, args.match):
        category = detect_category(image_path, source_dir)
        relative_path = image_path.relative_to(source_dir)
        destination_path = destination_root / relative_path
        result = optimize_image(
            source_path=image_path,
            destination_path=destination_path,
            category=category,
            quality=args.quality,
        )
        results.append(result)

    if not results:
        print("No image files found to optimize.")
        return 0

    total_before = sum(result.original_size for result in results)
    total_after = sum(result.optimized_size for result in results)
    total_saved = total_before - total_after
    reduction_ratio = (total_saved / total_before * 100) if total_before else 0

    print("Optimized image assets:")
    for result in results:
        print(
            f"- {result.source.relative_to(source_dir)} [{result.category}] "
            f"{result.original_dimensions[0]}x{result.original_dimensions[1]} -> "
            f"{result.optimized_dimensions[0]}x{result.optimized_dimensions[1]} | "
            f"{format_bytes(result.original_size)} -> {format_bytes(result.optimized_size)}"
        )

    print("")
    print(f"Files processed: {len(results)}")
    print(f"Total before: {format_bytes(total_before)}")
    print(f"Total after:  {format_bytes(total_after)}")
    print(f"Saved:        {format_bytes(total_saved)} ({reduction_ratio:.1f}%)")
    print(f"Output:       {destination_root}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
