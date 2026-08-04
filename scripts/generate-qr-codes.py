from pathlib import Path

import qrcode
from PIL import Image, ImageDraw, ImageFont

OUT_DIR = Path(__file__).resolve().parents[1] / "qr-codes"
BASE = "https://angela-celebration-experience.vercel.app/challenge.html?table="
NAVY = (6, 38, 54)
GOLD = (212, 173, 94)
CREAM = (247, 241, 231)
WHITE = (255, 255, 255)


def load_font(size: int) -> ImageFont.ImageFont:
    candidates = [
        "C:/Windows/Fonts/arialbd.ttf",
        "C:/Windows/Fonts/arial.ttf",
        "C:/Windows/Fonts/seguisb.ttf",
        "C:/Windows/Fonts/segoeui.ttf",
    ]
    for path in candidates:
        if Path(path).exists():
            return ImageFont.truetype(path, size)
    return ImageFont.load_default()


def make_table_qr(table: int) -> Path:
    url = f"{BASE}{table}"
    qr = qrcode.QRCode(
        version=None,
        error_correction=qrcode.constants.ERROR_CORRECT_H,
        box_size=12,
        border=2,
    )
    qr.add_data(url)
    qr.make(fit=True)
    qr_img = qr.make_image(fill_color=NAVY, back_color=WHITE).convert("RGB")

    qr_size = 780
    qr_img = qr_img.resize((qr_size, qr_size), Image.Resampling.NEAREST)

    label_h = 150
    canvas = Image.new("RGB", (qr_size, qr_size + label_h), NAVY)
    canvas.paste(qr_img, (0, 0))

    draw = ImageDraw.Draw(canvas)
    title_font = load_font(54)
    sub_font = load_font(24)
    title = f"TABLE {table}"
    subtitle = "Scan for The Angela Challenge"

    title_box = draw.textbbox((0, 0), title, font=title_font)
    sub_box = draw.textbbox((0, 0), subtitle, font=sub_font)
    title_w = title_box[2] - title_box[0]
    sub_w = sub_box[2] - sub_box[0]

    draw.text(((qr_size - title_w) / 2, qr_size + 28), title, fill=GOLD, font=title_font)
    draw.text(((qr_size - sub_w) / 2, qr_size + 95), subtitle, fill=CREAM, font=sub_font)

    # Gold rule under the QR
    draw.rectangle([40, qr_size + 8, qr_size - 40, qr_size + 12], fill=GOLD)

    out = OUT_DIR / f"table-{table}.png"
    canvas.save(out, "PNG", optimize=True)
    return out


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    for table in range(1, 7):
        path = make_table_qr(table)
        print(f"Created {path.name}")


if __name__ == "__main__":
    main()
