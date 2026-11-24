"""Render the placeholder app icon and launch image from the site's text wordmark.

The site has no logo file (src/app/favicon.ico is the Next.js default), so these are
built from `.story-wordmark` in src/app/globals.css: bold, -0.03em tracking, STORY in
--brand-word (#f7f4ec), HOME in --brand-home (#f5b71e), on --env-0 (#0b0d11).
Replace with a designed icon before App Store submission.

Usage: python3 render-placeholder-brand.py /path/to/Inter-Bold.ttf
"""

import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

BACKGROUND = (11, 13, 17)
WORD = (247, 244, 236)
HOME = (245, 183, 30)
TRACKING_EM = -0.03

ASSETS = Path(__file__).resolve().parent.parent / "ios" / "App" / "App" / "Assets.xcassets"


def run_width(font: ImageFont.FreeTypeFont, text: str, size: int) -> float:
    tracking = TRACKING_EM * size
    return sum(font.getlength(ch) for ch in text) + tracking * (len(text) - 1)


def draw_run(draw: ImageDraw.ImageDraw, font, text: str, x: float, baseline: float, size: int, fill) -> float:
    tracking = TRACKING_EM * size
    for ch in text:
        draw.text((x, baseline), ch, font=font, fill=fill, anchor="ls")
        x += font.getlength(ch) + tracking
    return x


def fit_size(font_path: str, text: str, target_width: float) -> int:
    size = 100
    font = ImageFont.truetype(font_path, size)
    return int(size * target_width / run_width(font, text, size))


def render_icon(font_path: str) -> Image.Image:
    side = 1024
    image = Image.new("RGB", (side, side), BACKGROUND)
    draw = ImageDraw.Draw(image)
    size = fit_size(font_path, "STORY", side * 0.70)
    font = ImageFont.truetype(font_path, size)
    cap = font.getbbox("H", anchor="ls")
    cap_height = cap[3] - cap[1]
    gap = cap_height * 0.32
    top_baseline = (side - (2 * cap_height + gap)) / 2 + cap_height
    for text, fill, baseline in (
        ("STORY", WORD, top_baseline),
        ("HOME", HOME, top_baseline + cap_height + gap),
    ):
        width = run_width(font, text, size)
        draw_run(draw, font, text, (side - width) / 2, baseline, size, fill)
    return image


def render_splash(font_path: str) -> Image.Image:
    side = 2732
    image = Image.new("RGB", (side, side), BACKGROUND)
    draw = ImageDraw.Draw(image)
    size = fit_size(font_path, "STORYHOME", 640)
    font = ImageFont.truetype(font_path, size)
    cap = font.getbbox("H", anchor="ls")
    baseline = (side + (cap[3] - cap[1])) / 2
    total = run_width(font, "STORYHOME", size) + TRACKING_EM * size
    x = (side - total) / 2
    x = draw_run(draw, font, "STORY", x, baseline, size, WORD) + TRACKING_EM * size
    draw_run(draw, font, "HOME", x, baseline, size, HOME)
    return image


def main() -> None:
    if len(sys.argv) != 2:
        raise SystemExit(__doc__)
    font_path = sys.argv[1]
    render_icon(font_path).save(ASSETS / "AppIcon.appiconset" / "AppIcon-512@2x.png", optimize=True)
    splash = render_splash(font_path)
    for name in ("splash-2732x2732.png", "splash-2732x2732-1.png", "splash-2732x2732-2.png"):
        splash.save(ASSETS / "Splash.imageset" / name, optimize=True)


if __name__ == "__main__":
    main()
