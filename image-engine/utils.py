import io
import base64
from PIL import Image


def image_to_base64(img: Image.Image, fmt: str = "PNG") -> str:
    buf = io.BytesIO()
    img.save(buf, format=fmt)
    return f"data:image/{fmt.lower()};base64,{base64.b64encode(buf.getvalue()).decode('utf-8')}"


def save_image(img: Image.Image, path: str) -> str:
    img.save(path)
    return path
