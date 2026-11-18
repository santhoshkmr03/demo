"""Preprocessing: grayscale, invert, resize, rule removal, normalise, augment."""

import numpy as np
from PIL import Image, ImageFilter, ImageEnhance
import torch
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from pathlib import Path
from scipy import ndimage

from src import config


def load_image(path):
    """Load an image from disk and return a PIL Image."""
    return Image.open(path).convert("RGB")


def to_grayscale_float(img):
    """Convert PIL Image to grayscale float32 numpy array in [0, 1]."""
    gray = img.convert("L")
    arr = np.array(gray, dtype=np.float32) / 255.0
    return arr


def invert_image(img_array):
    """Invert pixel values so white-on-black becomes dark-on-light."""
    return 1.0 - img_array


def resize_with_padding(img_array, target_size):
    """Aspect-preserving resize with padding to target_size (H, W)."""
    target_h, target_w = target_size
    h, w = img_array.shape[:2]

    scale = min(target_h / h, target_w / w)
    new_h = int(h * scale)
    new_w = int(w * scale)

    pil_img = Image.fromarray((img_array * 255).astype(np.uint8), mode="L")
    pil_img = pil_img.resize((new_w, new_h), Image.BILINEAR)
    resized = np.array(pil_img, dtype=np.float32) / 255.0

    pad_val = float(np.mean(resized))
    padded = np.full((target_h, target_w), pad_val, dtype=np.float32)
    y_off = (target_h - new_h) // 2
    x_off = (target_w - new_w) // 2
    padded[y_off : y_off + new_h, x_off : x_off + new_w] = resized
    return padded


def remove_ruling_lines(img_array, kernel_length=None):
    """Remove horizontal ruling lines using morphological opening while preserving smooth illumination gradients."""
    if kernel_length is None:
        kernel_length = config.RULE_KERNEL_LENGTH
    inv = (1.0 - img_array)
    # Detect horizontal lines via opening on the inverted image
    h_opened = ndimage.grey_opening(inv, size=(1, kernel_length))
    # Enforce vertical line thinness (<= 5 px) to avoid subtracting smooth camera vignetting or lighting shading
    v_opened = ndimage.grey_opening(h_opened, size=(5, 1))
    thin_lines = np.clip(h_opened - v_opened, 0.0, 1.0)
    # Subtract detected thin lines
    result = np.clip(img_array + thin_lines, 0.0, 1.0)
    return result


def normalize_contrast(img_array):
    """Subtract mean and divide by std, guarding against zero std."""
    mu = np.mean(img_array)
    sigma = np.std(img_array)
    if sigma < 1e-6:
        sigma = 1.0
    return (img_array - mu) / sigma


def augment(img_array, rng=None):
    """Apply training augmentations: rotation, scale, brightness/contrast jitter."""
    if rng is None:
        rng = np.random.default_rng(config.SEED)

    h, w = img_array.shape[:2]
    pil_img = Image.fromarray((np.clip(img_array, 0, 1) * 255).astype(np.uint8), mode="L")

    # Rotation
    angle = rng.uniform(-config.AUGMENT_ROTATION, config.AUGMENT_ROTATION)
    pil_img = pil_img.rotate(angle, resample=Image.BILINEAR, fillcolor=int(np.mean(img_array) * 255))

    # Scale
    scale = rng.uniform(*config.AUGMENT_SCALE)
    new_h, new_w = int(h * scale), int(w * scale)
    pil_img = pil_img.resize((new_w, new_h), Image.BILINEAR)
    # Crop or pad back to original size
    arr = np.array(pil_img, dtype=np.float32) / 255.0
    result = np.full((h, w), float(np.mean(arr)), dtype=np.float32)
    paste_h = min(new_h, h)
    paste_w = min(new_w, w)
    y_off = max(0, (h - new_h) // 2)
    x_off = max(0, (w - new_w) // 2)
    src_y = max(0, (new_h - h) // 2)
    src_x = max(0, (new_w - w) // 2)
    result[y_off : y_off + paste_h, x_off : x_off + paste_w] = arr[
        src_y : src_y + paste_h, src_x : src_x + paste_w
    ]

    # Brightness jitter
    brightness_delta = rng.uniform(-config.AUGMENT_BRIGHTNESS, config.AUGMENT_BRIGHTNESS)
    result = result + brightness_delta

    # Contrast jitter
    contrast_factor = 1.0 + rng.uniform(-config.AUGMENT_CONTRAST, config.AUGMENT_CONTRAST)
    mu = np.mean(result)
    result = mu + contrast_factor * (result - mu)

    result = np.clip(result, 0.0, 1.0)
    return result


def preprocess_letter(path, augment_flag=False, rng=None):
    """Full pipeline for a letter image: load, grayscale, resize, [augment], normalise → tensor."""
    img = load_image(path)
    arr = to_grayscale_float(img)
    arr = resize_with_padding(arr, config.LETTER_SIZE)
    if augment_flag:
        arr = augment(arr, rng=rng)
    arr = normalize_contrast(arr)
    tensor = torch.from_numpy(arr).unsqueeze(0)  # (1, H, W)
    return tensor


def preprocess_page(path, dataset_name, augment_flag=False, rng=None):
    """Full pipeline for a page image: load, grayscale, [invert D2], [remove rules], resize, [augment], normalise → tensor."""
    img = load_image(path)
    arr = to_grayscale_float(img)

    if dataset_name == "D2":
        arr = invert_image(arr)

    if config.REMOVE_RULES:
        arr = remove_ruling_lines(arr)

    arr = resize_with_padding(arr, config.PAGE_SIZE)
    if augment_flag:
        arr = augment(arr, rng=rng)
    arr = normalize_contrast(arr)
    tensor = torch.from_numpy(arr).unsqueeze(0)  # (1, H, W)
    return tensor


def extract_patches(page_tensor, patch_size=None, stride=None):
    """Extract overlapping patches from a page tensor (1, H, W). Returns (N, 1, patch_size, patch_size)."""
    if patch_size is None:
        patch_size = config.PATCH_SIZE
    if stride is None:
        stride = config.PATCH_STRIDE

    _, h, w = page_tensor.shape
    patches = []
    for y in range(0, h - patch_size + 1, stride):
        for x in range(0, w - patch_size + 1, stride):
            patch = page_tensor[:, y : y + patch_size, x : x + patch_size]
            patches.append(patch)
    if len(patches) == 0:
        # Page smaller than patch size: resize the whole page as one patch
        resized = torch.nn.functional.interpolate(
            page_tensor.unsqueeze(0), size=(patch_size, patch_size), mode="bilinear", align_corners=False
        ).squeeze(0)
        patches.append(resized)
    return torch.stack(patches)  # (N, 1, patch_size, patch_size)


def save_preprocessing_grid(images_before, images_after, save_path, title="Preprocessing Comparison"):
    """Save a matplotlib grid showing raw vs preprocessed images."""
    n = len(images_before)
    fig, axes = plt.subplots(2, n, figsize=(3 * n, 6))
    if n == 1:
        axes = axes.reshape(2, 1)
    for i in range(n):
        axes[0, i].imshow(images_before[i], cmap="gray")
        axes[0, i].set_title(f"Raw {i+1}")
        axes[0, i].axis("off")
        axes[1, i].imshow(images_after[i], cmap="gray")
        axes[1, i].set_title(f"Processed {i+1}")
        axes[1, i].axis("off")
    fig.suptitle(title)
    plt.tight_layout()
    Path(save_path).parent.mkdir(parents=True, exist_ok=True)
    fig.savefig(save_path, dpi=150)
    plt.close(fig)
    print(f"Saved preprocessing grid to {save_path}")
