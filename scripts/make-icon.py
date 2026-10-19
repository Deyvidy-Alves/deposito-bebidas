"""
Gera build/icon.ico (e icon.png) a partir de uma imagem da sua logo.

Uso:
    python scripts/make-icon.py caminho/para/sua-logo.png
    python scripts/make-icon.py logo.png --round     # cantos arredondados
    python scripts/make-icon.py logo.png --bg "#10b981"  # cor de fundo (senão transparente)

Depois é só rodar:  npm run dist
(O electron-builder usa build/icon.ico automaticamente.)

Requisito: pip install Pillow
"""
import sys, os
from PIL import Image, ImageDraw

def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    if not args:
        print("Informe o caminho da imagem. Ex.: python scripts/make-icon.py logo.png")
        sys.exit(1)
    src = args[0]
    rounded = "--round" in sys.argv
    bg = None
    for a in sys.argv:
        if a.startswith("--bg"):
            # formato: --bg "#RRGGBB" (como argumento seguinte) ou --bg=#RRGGBB
            if "=" in a:
                bg = a.split("=", 1)[1]
            else:
                i = sys.argv.index(a)
                if i + 1 < len(sys.argv):
                    bg = sys.argv[i + 1]

    SIZE = 256
    im = Image.open(src).convert("RGBA")
    # Ajusta mantendo proporção, centralizado numa tela SIZE x SIZE
    im.thumbnail((SIZE, SIZE), Image.LANCZOS)
    canvas = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    if bg:
        canvas.paste(Image.new("RGBA", (SIZE, SIZE), bg), (0, 0))
    ox = (SIZE - im.width) // 2
    oy = (SIZE - im.height) // 2
    canvas.alpha_composite(im, (ox, oy))

    if rounded:
        mask = Image.new("L", (SIZE, SIZE), 0)
        ImageDraw.Draw(mask).rounded_rectangle([0, 0, SIZE - 1, SIZE - 1], radius=int(SIZE * 0.225), fill=255)
        out = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
        out.paste(canvas, (0, 0), mask)
        canvas = out

    os.makedirs("build", exist_ok=True)
    canvas.save("build/icon.ico", sizes=[(256, 256), (128, 128), (64, 64), (48, 48), (32, 32), (16, 16)])
    canvas.save("build/icon.png")
    print("ok -> build/icon.ico e build/icon.png. Rode: npm run dist")

if __name__ == "__main__":
    main()
