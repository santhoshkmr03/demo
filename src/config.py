"""Global configuration and hyperparameters for Handwriting-Based Dyslexia Screening.

Model architecture: 5-Fold ConvNeXt-Tiny + Attention Multiple Instance Learning (MIL)
Input: Full-page / sentence handwriting specimens (512x512)
Explainability: Integrated Gradients (stroke attribution) & Grad-CAM (class activation saliency)
"""

import torch
from pathlib import Path

# ── Project root ──────────────────────────────────────────────────────────────
PROJECT_ROOT = Path('/content') if Path('/content/data').exists() or str(Path.cwd()).startswith('/content') else Path(__file__).resolve().parent.parent
DATA_ROOT = PROJECT_ROOT / "data" / "raw"
MANIFEST_DIR = PROJECT_ROOT / "data" / "manifests"
MANIFEST_ALL = MANIFEST_DIR / "manifest_all.csv"
MANIFEST_CLEAN = MANIFEST_DIR / "manifest_clean.csv"

# ── Output directories ───────────────────────────────────────────────────────
OUTPUT_DIR = PROJECT_ROOT / "outputs"
CHECKPOINT_DIR = OUTPUT_DIR / "checkpoints"
REPORTS_DIR = OUTPUT_DIR / "reports"

# ── Reproducibility ──────────────────────────────────────────────────────────
SEED = 42

# ── Device ────────────────────────────────────────────────────────────────────
DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")

# ── Image processing ──────────────────────────────────────────────────────────
PAGE_SIZE = (512, 512)          # H, W for page images after resize+pad

# ── Page branch: patch extraction ─────────────────────────────────────────────
PATCH_SIZE = 224
PATCH_STRIDE = 112

# ── Page architecture ────────────────────────────────────────────────────────
BACKBONE = "convnext_tiny"      # Primary deep backbone (ConvNeXt-Tiny)
PAGE_ATTENTION_DIM = 128        # Attention MIL projection dimension

# ── Cross-validation & Ensemble ──────────────────────────────────────────────
K_FOLDS = 5
SCREENING_THRESHOLD = 0.50

# ── Preprocessing ─────────────────────────────────────────────────────────────
REMOVE_RULES = True             # remove ruling lines via morphological opening
RULE_KERNEL_LENGTH = 50         # horizontal kernel length for rule removal
