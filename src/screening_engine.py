"""Production Inference Engine for Handwriting-Based Dyslexia Screening.

⚠️ SCREENING TOOL ONLY: This software is strictly an experimental screening tool,
NOT a diagnostic instrument. It provides risk estimations based on handwriting
patterns and must NEVER replace formal clinical diagnosis by qualified specialists.
"""

from __future__ import annotations

import os
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple, Union

import cv2
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import torch
import torch.nn as nn
from PIL import Image

from src import config, preprocess
from src.explain_ig import integrated_gradients, compute_ink_mask
from src.model_page import PageModel, create_page_model


DISCLAIMER_TEXT = (
    "⚠️ SCREENING TOOL DISCLAIMER: This system is strictly an experimental SCREENING TOOL, "
    "NOT a diagnostic instrument. It provides automated risk assessments based on handwriting "
    "patterns and must NEVER be used as a substitute for professional clinical diagnosis "
    "by qualified medical or educational specialists."
)


class DyslexiaScreeningEngine:
    """Unified inference engine for character- and page-level handwriting dyslexia screening."""

    def __init__(
        self,
        backbone: str = "convnext_tiny",
        checkpoint_dir: Optional[Union[str, Path]] = None,
        device: Optional[torch.device] = None,
    ) -> None:
        """Initialize models, load 5-fold checkpoints, and set operational thresholds."""
        self.device = device or config.DEVICE
        self.backbone = backbone
        self.checkpoint_dir = Path(checkpoint_dir or config.CHECKPOINT_DIR)

        # Operational screening threshold calibrated from training folds
        self.screening_threshold = 0.50

        # Model containers
        self.page_ensemble: List[PageModel] = []

        self._load_models()

    def _load_models(self) -> None:
        """Load 5-fold ensemble for page model (ConvNeXt-Tiny or ResNet-50)."""
        prefix = "convnext" if self.backbone == "convnext_tiny" else "page"
        for fold in range(config.K_FOLDS):
            ckpt_path = self.checkpoint_dir / f"{prefix}_fold{fold}_best.pt"
            if ckpt_path.exists():
                try:
                    m = create_page_model(backbone_name=self.backbone)
                    state = torch.load(ckpt_path, map_location=self.device, weights_only=True)
                    m.load_state_dict(state)
                    m.to(self.device).eval()
                    self.page_ensemble.append(m)
                except Exception as e:
                    print(f"Warning: Failed to load page fold {fold} checkpoint: {e}")

        # If primary backbone checkpoints weren't found, try fallback
        if not self.page_ensemble and prefix != "page":
            print(f"Notice: No {prefix} checkpoints found. Falling back to ResNet-50 checkpoints...")
            self.backbone = "resnet50"
            for fold in range(config.K_FOLDS):
                ckpt_path = self.checkpoint_dir / f"page_fold{fold}_best.pt"
                if ckpt_path.exists():
                    try:
                        m = create_page_model(backbone_name="resnet50")
                        state = torch.load(ckpt_path, map_location=self.device, weights_only=True)
                        m.load_state_dict(state)
                        m.to(self.device).eval()
                        self.page_ensemble.append(m)
                    except Exception as e:
                        print(f"Warning: Failed to load fallback page fold {fold}: {e}")

        print(
            f"[ScreeningEngine] Initialized: {len(self.page_ensemble)} page models ({self.backbone}) "
            f"on {self.device}."
        )

    def screen(
        self,
        image_input: Union[str, Path, Image.Image, np.ndarray],
        force_type: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Universal screening entry point for handwriting specimens."""
        return self.predict_page(image_input)

    def predict_page(
        self,
        image_input: Union[str, Path, Image.Image, np.ndarray],
        invert_if_white_ink: bool = True,
        compute_stroke_ig: bool = True,
        max_crops: int = 60,
    ) -> Dict[str, Any]:
        """Screen a full page or sentence image using the 5-fold Attention MIL ensemble,
        with unified pixel-level stroke Integrated Gradients attribution and character anomaly detection.
        """
        if not self.page_ensemble:
            raise RuntimeError("No page models are loaded in the screening engine.")

        # Load image as PIL
        if isinstance(image_input, (str, Path)):
            pil_img = Image.open(image_input).convert("RGB")
        elif isinstance(image_input, np.ndarray):
            pil_img = Image.fromarray(image_input).convert("RGB")
        else:
            pil_img = image_input.convert("RGB")

        # Preprocessing: convert to grayscale float
        gray_arr = preprocess.to_grayscale_float(pil_img)

        # Check if white ink on dark background (mean < 0.35 suggests dark background)
        if invert_if_white_ink and np.mean(gray_arr) < 0.35:
            gray_arr = 1.0 - gray_arr

        # Remove ruling lines
        if config.REMOVE_RULES:
            gray_arr = preprocess.remove_ruling_lines(gray_arr)

        # Resize with padding to (512, 512)
        padded_arr = preprocess.resize_with_padding(gray_arr, config.PAGE_SIZE)

        # Normalize contrast
        mu = float(np.mean(padded_arr))
        sigma = float(np.std(padded_arr))
        if sigma < 1e-6:
            sigma = 1.0
        norm_arr = (padded_arr - mu) / sigma
        page_tensor = torch.from_numpy(norm_arr).unsqueeze(0).float()  # (1, 512, 512)

        # Forward pass across all loaded ensemble models
        fold_probs: List[float] = []
        fold_attentions: List[np.ndarray] = []

        with torch.no_grad():
            tensor_device = page_tensor.to(self.device)
            for model in self.page_ensemble:
                logit, attn_weights = model(tensor_device)
                prob = float(torch.sigmoid(logit).cpu().item())
                fold_probs.append(prob)
                fold_attentions.append(attn_weights.cpu().numpy())

        # Ensemble Statistics
        mean_risk = float(np.mean(fold_probs))
        std_risk = float(np.std(fold_probs))
        min_risk = float(np.min(fold_probs))
        max_risk = float(np.max(fold_probs))

        # Average attention salience weights across folds
        mean_attn = np.mean(fold_attentions, axis=0)  # (N_patches,)

        # Determine screening classification
        if mean_risk >= self.screening_threshold:
            classification = "Elevated Screening Signal (Specialist Follow-Up Recommended)"
            risk_category = "Elevated Risk"
        else:
            classification = "No Elevated Screening Signal Detected (Typical Pattern)"
            risk_category = "Typical"

        # Generate visual attention salience overlay
        heatmap_overlay = self._generate_attention_overlay(padded_arr, mean_attn)

        # Compute Grad-CAM class activation mapping
        gradcam_overlay = self._compute_gradcam(pil_img, padded_arr, page_tensor)

        # Unified Stroke Integrated Gradients & Character Anomaly Detection
        stroke_info: Dict[str, Any] = {}
        if compute_stroke_ig:
            stroke_info = self._compute_page_stroke_attributions(
                pil_img=pil_img,
                gray_arr=gray_arr,
                padded_arr=padded_arr,
                norm_arr=norm_arr,
                page_tensor=page_tensor,
                mean_risk=mean_risk,
                max_crops=max_crops,
            )

        result: Dict[str, Any] = {
            "input_type": "page",
            "backbone": self.backbone,
            "models_in_ensemble": len(self.page_ensemble),
            "risk_score": mean_risk,
            "risk_percentage": round(mean_risk * 100, 1),
            "uncertainty_band": {
                "std": round(std_risk, 4),
                "low": round(min_risk, 4),
                "high": round(max_risk, 4),
                "spread": round(max_risk - min_risk, 4),
            },
            "per_fold_predictions": [round(p, 4) for p in fold_probs],
            "risk_category": risk_category,
            "screening_classification": classification,
            "threshold": self.screening_threshold,
            "attention_weights": mean_attn.tolist(),
            "preprocessed_image": padded_arr,
            "attention_overlay": heatmap_overlay,
            "gradcam_overlay": gradcam_overlay,
            "disclaimer": DISCLAIMER_TEXT,
        }

        # Merge unified stroke explainability results
        result.update(stroke_info)
        return result

    def _generate_attention_overlay(
        self,
        image_arr: np.ndarray,
        attention_weights: np.ndarray,
    ) -> np.ndarray:
        """Create a smooth salience heatmap overlaid onto the preprocessed handwriting image."""
        h, w = image_arr.shape
        n_patches = len(attention_weights)
        grid_side = int(np.ceil(np.sqrt(n_patches)))

        # Format attention grid
        grid = np.zeros(grid_side * grid_side, dtype=np.float32)
        grid[:n_patches] = attention_weights
        grid = grid.reshape(grid_side, grid_side)

        # Upsample grid to match image dimensions
        pil_attn = Image.fromarray((grid / max(grid.max(), 1e-6) * 255).astype(np.uint8), mode="L")
        pil_attn_smooth = pil_attn.resize((w, h), Image.BICUBIC)
        smooth_attn = np.array(pil_attn_smooth, dtype=np.float32) / 255.0

        # Create blended RGB overlay
        fig, ax = plt.subplots(figsize=(6, 6), dpi=100)
        ax.imshow(image_arr, cmap="gray")
        ax.imshow(smooth_attn, cmap="YlOrRd", alpha=0.45, interpolation="bicubic")
        ax.axis("off")
        fig.tight_layout(pad=0)

        # Render to numpy RGB array
        fig.canvas.draw()
        rgba = np.asarray(fig.canvas.buffer_rgba())
        plt.close(fig)
        return rgba[:, :, :3]

    def _compute_gradcam(
        self,
        pil_img: Image.Image,
        padded_arr: np.ndarray,
        page_tensor: torch.Tensor,
    ) -> Image.Image:
        """Compute Grad-CAM activation heatmap from the primary PageModel."""
        if not self.page_ensemble:
            return Image.new("RGB", pil_img.size)

        primary_model = self.page_ensemble[0]
        # Identify target layer based on backbone
        if hasattr(primary_model.encoder.backbone, "features") and len(primary_model.encoder.backbone.features) > 7:
            target_layer = primary_model.encoder.backbone.features[7]
        elif hasattr(primary_model.encoder.backbone, "layer4"):
            target_layer = primary_model.encoder.backbone.layer4[-1]
        else:
            target_layer = list(primary_model.encoder.backbone.children())[-1]

        activations = []
        gradients = []

        def f_hook(module, inp, out):
            activations.append(out)

        def b_hook(module, grad_in, grad_out):
            gradients.append(grad_out[0])

        handle_f = target_layer.register_forward_hook(f_hook)
        handle_b = target_layer.register_full_backward_hook(b_hook)

        tensor_device = page_tensor.clone().to(self.device).requires_grad_(True)
        logit, _ = primary_model(tensor_device)
        logit.backward()

        handle_f.remove()
        handle_b.remove()

        if not activations or not gradients:
            return Image.new("RGB", pil_img.size)

        act = activations[0]
        grad = gradients[0]
        weights = grad.mean(dim=(2, 3), keepdim=True)
        cam_patches = torch.nn.functional.relu((weights * act).sum(dim=1))

        patch_size = 224
        stride = 144
        full_cam = torch.zeros((512, 512))
        weights_map = torch.zeros((512, 512))

        # 2D Hann cosine window for smooth boundary apodization (zero patch seam artifacts)
        hann_1d = np.hanning(patch_size)
        hann_2d = torch.from_numpy(np.outer(hann_1d, hann_1d)).float()

        cam_upsampled = torch.nn.functional.interpolate(
            cam_patches.unsqueeze(1), size=(patch_size, patch_size), mode="bicubic", align_corners=False
        ).squeeze(1)

        p_idx = 0
        for y in range(0, 512 - patch_size + 1, stride):
            for x in range(0, 512 - patch_size + 1, stride):
                if p_idx < len(cam_upsampled):
                    patch_cam = cam_upsampled[p_idx].detach().cpu()
                    full_cam[y : y + patch_size, x : x + patch_size] += patch_cam * hann_2d
                    weights_map[y : y + patch_size, x : x + patch_size] += hann_2d
                    p_idx += 1

        full_cam = full_cam / torch.clamp(weights_map, min=1e-5)
        cam_np = full_cam.numpy()
        cam_np = (cam_np - cam_np.min()) / (cam_np.max() - cam_np.min() + 1e-6)

        # Unpad back to original image dimensions
        img_rgb = np.array(pil_img)
        H, W = img_rgb.shape[:2]
        target_h, target_w = config.PAGE_SIZE
        scale = min(target_h / H, target_w / W)
        new_h, new_w = int(H * scale), int(W * scale)
        y_off = (target_h - new_h) // 2
        x_off = (target_w - new_w) // 2

        cam_active = cam_np[y_off : y_off + new_h, x_off : x_off + new_w]
        cam_orig = cv2.resize(cam_active, (W, H), interpolation=cv2.INTER_CUBIC)

        # Gentle Gaussian smoothing for organic, continuous activation contours
        ksize = max(15, (int(min(H, W) * 0.08) // 2) * 2 + 1)
        cam_smoothed = cv2.GaussianBlur(cam_orig, (ksize, ksize), 0)
        cam_smoothed = (cam_smoothed - cam_smoothed.min()) / (cam_smoothed.max() - cam_smoothed.min() + 1e-6)

        # Soft transparency mask: low activations (< 0.15) fade completely to transparent,
        # ensuring the white paper background stays clean without bluish/purple cast.
        cam_thresh = 0.15
        alpha = np.clip((cam_smoothed - cam_thresh) / (1.0 - cam_thresh), 0.0, 1.0)
        alpha = (alpha ** 1.3) * 0.65  # Max opacity 65% over high-activation hotspots
        alpha_3d = np.repeat(alpha[:, :, np.newaxis], 3, axis=2)

        cmap = plt.get_cmap("jet")
        heat_rgb = (cmap(cam_smoothed)[:, :, :3] * 255.0)

        # Organic alpha-composited blend
        blended = (img_rgb.astype(np.float32) * (1.0 - alpha_3d) + heat_rgb * alpha_3d).astype(np.uint8)

        return Image.fromarray(blended)

    def _compute_page_stroke_attributions(
        self,
        pil_img: Image.Image,
        gray_arr: np.ndarray,
        padded_arr: np.ndarray,
        norm_arr: np.ndarray,
        page_tensor: torch.Tensor,
        mean_risk: float,
        max_crops: int = 60,
        ig_steps: int = 3,
    ) -> Dict[str, Any]:
        """Compute pixel-level stroke Integrated Gradients from the PageModel ensemble,
        segment characters, and calculate stroke anomaly attribution density per character.
        """
        img_rgb = np.array(pil_img)
        H, W = gray_arr.shape
        target_h, target_w = config.PAGE_SIZE  # (512, 512)

        # 1. Geometry mapping between (512, 512) tensor and original (W, H)
        scale = min(target_h / H, target_w / W)
        new_h, new_w = int(H * scale), int(W * scale)
        y_off = (target_h - new_h) // 2
        x_off = (target_w - new_w) // 2

        # 2. Extract pen ink mask with robust multi-thresholding & line removal
        gray_uint8 = (np.clip(gray_arr, 0.0, 1.0) * 255.0).astype(np.uint8)
        border = np.concatenate([
            gray_uint8[:6, :].ravel(),
            gray_uint8[-6:, :].ravel(),
            gray_uint8[:, :6].ravel(),
            gray_uint8[:, -6:].ravel(),
        ])
        is_dark_bg = float(np.median(border)) < 127.0

        blur = cv2.GaussianBlur(gray_uint8, (5, 5), 0)
        otsu_val, otsu_bin = cv2.threshold(blur, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)
        adapt_bin = cv2.adaptiveThreshold(
            blur, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY_INV, 31, 8
        )

        if is_dark_bg:
            raw_ink = cv2.bitwise_not(otsu_bin)
        else:
            raw_ink = cv2.bitwise_and(otsu_bin, adapt_bin)
            if np.count_nonzero(raw_ink) < 50:
                raw_ink = otsu_bin
            if np.count_nonzero(raw_ink) < 50:
                raw_ink = adapt_bin
            if np.count_nonzero(raw_ink) < 50:
                p15 = np.percentile(blur, 15)
                p85 = np.percentile(blur, 85)
                if p85 - p15 > 10:
                    _, raw_ink = cv2.threshold(
                        blur, int(p15 + (p85 - p15) * 0.35), 255, cv2.THRESH_BINARY_INV
                    )
                else:
                    raw_ink = adapt_bin

        # Horizontal and vertical ruling lines detection & removal
        h_len = max(40, int(W * 0.25))
        h_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (h_len, 1))
        h_lines = cv2.morphologyEx(raw_ink, cv2.MORPH_OPEN, h_kernel)

        v_len = max(40, int(H * 0.60))
        v_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (1, v_len))
        v_lines = cv2.morphologyEx(raw_ink, cv2.MORPH_OPEN, v_kernel)

        lines = cv2.bitwise_or(h_lines, v_lines)
        ink_letters = cv2.subtract(raw_ink, lines)
        ink_mask = (ink_letters > 0).astype(np.float32)

        # 3. Compute PageModel Input * Gradient / Integrated Gradients attribution
        primary_model = self.page_ensemble[0] if self.page_ensemble else None
        if primary_model is None:
            return {}

        mu = float(np.mean(padded_arr))
        sigma = float(np.std(padded_arr))
        if sigma < 1e-6:
            sigma = 1.0

        # Paper baseline (blank paper background with no ink)
        paper_val = float(np.percentile(padded_arr, 90))
        baseline_norm = (paper_val - mu) / sigma
        baseline_tensor = torch.full_like(page_tensor, baseline_norm).to(self.device)

        input_tensor = page_tensor.to(self.device)
        diff_tensor = input_tensor - baseline_tensor

        # Multi-step path gradient integration (smooth across interpolation steps)
        alphas = torch.linspace(1.0 / max(ig_steps, 1), 1.0, ig_steps, device=self.device)
        accum_grads = torch.zeros_like(input_tensor)

        for alpha in alphas:
            step_input = (baseline_tensor + alpha * diff_tensor).clone().detach()
            step_input.requires_grad_(True)
            step_logit, _ = primary_model(step_input)
            step_logit.backward()
            if step_input.grad is not None:
                accum_grads += step_input.grad

        avg_grads = (accum_grads / ig_steps).squeeze().detach().cpu().numpy()
        diff_np = diff_tensor.squeeze().detach().cpu().numpy()

        # Input * Gradient attribution
        attr_512 = np.abs(avg_grads * diff_np)

        # Unpad active image region and resize to original resolution (W, H)
        attr_content = attr_512[y_off : y_off + new_h, x_off : x_off + new_w]
        attr_orig = cv2.resize(attr_content, (W, H), interpolation=cv2.INTER_LINEAR)

        # Strict pen ink stroke masking
        stroke_attr = attr_orig * ink_mask

        # 4. Character / Stroke component segmentation via connected components
        num_labels, labels, stats, centroids = cv2.connectedComponentsWithStats(ink_letters, connectivity=8)

        raw_boxes = []
        raw_areas = []
        for i in range(1, num_labels):
            x, y, w, h, area = stats[i]
            if area < 20 or h < 8 or w < 4:
                continue
            if w > 0.85 * W or h > 0.85 * H:
                continue
            aspect = w / float(h)
            if aspect > 1.3:
                char_w = max(18.0, h * 0.65)
                num_sub = max(2, int(round(w / char_w)))
                sub_w = w / float(num_sub)
                for s in range(num_sub):
                    sx = int(round(x + s * sub_w))
                    sw = int(round(sub_w))
                    raw_boxes.append((sx, y, sw, h))
                    raw_areas.append(sw * h)
            else:
                raw_boxes.append((x, y, w, h))
                raw_areas.append(area)

        # Non-Maximum Suppression
        clean_boxes = []
        if raw_boxes:
            arr_boxes = np.array(raw_boxes)
            arr_areas = np.array(raw_areas)
            bx1 = arr_boxes[:, 0]
            by1 = arr_boxes[:, 1]
            bx2 = arr_boxes[:, 0] + arr_boxes[:, 2]
            by2 = arr_boxes[:, 1] + arr_boxes[:, 3]
            order = arr_areas.argsort()[::-1]
            keep = []
            while order.size > 0:
                i = order[0]
                keep.append(i)
                xx1 = np.maximum(bx1[i], bx1[order[1:]])
                yy1 = np.maximum(by1[i], by1[order[1:]])
                xx2 = np.minimum(bx2[i], bx2[order[1:]])
                yy2 = np.minimum(by2[i], by2[order[1:]])
                iw = np.maximum(0.0, xx2 - xx1)
                ih = np.maximum(0.0, yy2 - yy1)
                inter = iw * ih
                ovr = inter / np.minimum(arr_areas[i], arr_areas[order[1:]])
                inds = np.where(ovr <= 0.30)[0]
                order = order[inds + 1]
            clean_boxes = [arr_boxes[k] for k in keep]

        # Reading order sorting
        line_h = max(20, H // 20)
        sorted_boxes = sorted(clean_boxes, key=lambda b: (b[1] // line_h, b[0]))[:max_crops]

        # 5. Calculate stroke attribution density per character
        box_metrics = []
        for cx, cy, cw, ch in sorted_boxes:
            cx, cy, cw, ch = int(cx), int(cy), int(cw), int(ch)
            box_attr = stroke_attr[cy : cy + ch, cx : cx + cw]
            box_ink = ink_mask[cy : cy + ch, cx : cx + cw]
            n_ink = float(np.sum(box_ink))
            tot_attr = float(np.sum(box_attr))
            density = tot_attr / max(n_ink, 1.0)
            box_metrics.append((cx, cy, cw, ch, n_ink, tot_attr, density))

        max_density = max([m[6] for m in box_metrics]) if box_metrics else 1.0

        annotated_img = img_rgb.copy()
        crop_results: List[Dict[str, Any]] = []

        jet_cmap = plt.get_cmap("jet")

        for idx, (cx, cy, cw, ch, n_ink, tot_attr, density) in enumerate(box_metrics):
            rel_score = density / max(max_density, 1e-6)

            # Mathematically anchored character anomaly risk:
            # Consistent with page risk, weighted by stroke density relative to page maximum
            char_risk = float(np.clip(mean_risk * (0.40 + 0.60 * rel_score), 0.0, 1.0))

            if char_risk >= 0.50:
                risk_cat = "elevated"
                color = (220, 38, 38)  # Red
                is_elevated = True
            elif char_risk >= 0.40:
                risk_cat = "uncertain"
                color = (234, 179, 8)  # Amber
                is_elevated = False
            else:
                risk_cat = "typical"
                color = (22, 163, 74)  # Green
                is_elevated = False

            # Draw box & index on annotated image
            cv2.rectangle(annotated_img, (cx, cy), (cx + cw, cy + ch), color, 2)
            cv2.putText(
                annotated_img,
                str(idx + 1),
                (cx, max(12, cy - 3)),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.45,
                color,
                1,
                cv2.LINE_AA,
            )

            # Clean square character crop with white paper background
            pad = 4
            x1 = max(0, cx - pad)
            y1 = max(0, cy - pad)
            x2 = min(W, cx + cw + pad)
            y2 = min(H, cy + ch + pad)
            eff_w = x2 - x1
            eff_h = y2 - y1

            crop_patch = img_rgb[y1:y2, x1:x2]
            crop_attr = stroke_attr[y1:y2, x1:x2]

            margin = max(4, int(max(eff_h, eff_w) * 0.25))
            sq_side = max(eff_h, eff_w) + 2 * margin
            padded_crop_rgb = np.ones((sq_side, sq_side, 3), dtype=np.uint8) * 255
            sq_py = (sq_side - eff_h) // 2
            sq_px = (sq_side - eff_w) // 2
            padded_crop_rgb[sq_py : sq_py + eff_h, sq_px : sq_px + eff_w] = crop_patch

            # Local character stroke heatmap thumbnail
            padded_attr = np.zeros((sq_side, sq_side), dtype=np.float32)
            padded_attr[sq_py : sq_py + eff_h, sq_px : sq_px + eff_w] = crop_attr
            if padded_attr.max() > 1e-6:
                norm_local = padded_attr / padded_attr.max()
            else:
                norm_local = padded_attr

            heat_local = (jet_cmap(norm_local)[:, :, :3] * 255).astype(np.uint8)
            alpha_local = (norm_local[:, :, None] ** 0.5) * 0.90
            mask_local = (norm_local > 0.05)[:, :, None].astype(np.float32)
            blended_thumb = (
                padded_crop_rgb.astype(np.float32) * (1.0 - alpha_local * mask_local)
                + heat_local.astype(np.float32) * (alpha_local * mask_local)
            ).astype(np.uint8)

            crop_results.append({
                "index": idx + 1,
                "box": (cx, cy, cw, ch),
                "stroke_density": round(density, 4),
                "relative_anomaly": round(rel_score, 4),
                "raw_risk": round(char_risk, 4),
                "risk_probability": round(char_risk, 4),
                "risk_category": risk_cat,
                "is_elevated": is_elevated,
                "crop_thumbnail": Image.fromarray(padded_crop_rgb),
                "letter_ig_thumbnail": Image.fromarray(blended_thumb),
            })

        # 6. Composite full-page stroke Integrated Gradients overlay
        ink_pixels = stroke_attr > 0
        if np.any(ink_pixels):
            p95 = float(np.percentile(stroke_attr[ink_pixels], 95))
            norm_page_attr = np.clip(stroke_attr / max(p95, 1e-6), 0.0, 1.0)
        else:
            norm_page_attr = stroke_attr

        heat_full_rgb = (jet_cmap(norm_page_attr)[:, :, :3] * 255).astype(np.uint8)
        mask_3d = (norm_page_attr > 0.05)[:, :, None].astype(np.float32)
        alpha_page = (norm_page_attr[:, :, None] ** 0.5) * 0.92
        blended_page = (
            img_rgb.astype(np.float32) * (1.0 - alpha_page * mask_3d)
            + heat_full_rgb.astype(np.float32) * (alpha_page * mask_3d)
        ).astype(np.uint8)

        total_crops = len(crop_results)
        elevated_count = sum(1 for c in crop_results if c["risk_category"] == "elevated")
        uncertain_count = sum(1 for c in crop_results if c["risk_category"] == "uncertain")
        typical_count = sum(1 for c in crop_results if c["risk_category"] == "typical")
        elevated_pct = round(100.0 * elevated_count / max(1, total_crops), 1)
        uncertain_pct = round(100.0 * uncertain_count / max(1, total_crops), 1)
        mean_c_risk = round(float(np.mean([c["risk_probability"] for c in crop_results])), 4) if crop_results else 0.0

        return {
            "total_letters_detected": total_crops,
            "elevated_letters_count": elevated_count,
            "uncertain_letters_count": uncertain_count,
            "typical_letters_count": typical_count,
            "elevated_letters_percentage": elevated_pct,
            "uncertain_letters_percentage": uncertain_pct,
            "mean_letter_risk": mean_c_risk,
            "crop_results": crop_results,
            "annotated_boxes_image": Image.fromarray(annotated_img),
            "full_page_ig_overlay": Image.fromarray(blended_page),
            "raw_attribution_map": stroke_attr,
        }

    def segment_and_screen_letters_ig(
        self,
        image: Union[str, Path, Image.Image, np.ndarray],
        max_crops: int = 60,
        steps: int = 3,
        page_risk: Optional[float] = None,
    ) -> Dict[str, Any]:
        """Segment individual letters and compute unified full-page stroke Integrated Gradients.
        Derives all stroke attributions directly from the PageModel for complete mathematical consistency.
        """
        page_res = self.predict_page(image, compute_stroke_ig=True, max_crops=max_crops)
        return {
            "disclaimer": DISCLAIMER_TEXT,
            "total_letters_detected": page_res.get("total_letters_detected", 0),
            "elevated_letters_count": page_res.get("elevated_letters_count", 0),
            "uncertain_letters_count": page_res.get("uncertain_letters_count", 0),
            "typical_letters_count": page_res.get("typical_letters_count", 0),
            "elevated_letters_percentage": page_res.get("elevated_letters_percentage", 0.0),
            "uncertain_letters_percentage": page_res.get("uncertain_letters_percentage", 0.0),
            "mean_letter_risk": page_res.get("mean_letter_risk", 0.0),
            "crop_results": page_res.get("crop_results", []),
            "annotated_boxes_image": page_res.get("annotated_boxes_image", Image.new("RGB", (100, 100))),
            "full_page_ig_overlay": page_res.get("full_page_ig_overlay", Image.new("RGB", (100, 100))),
            "raw_attribution_map": page_res.get("raw_attribution_map", np.zeros((100, 100))),
        }



# Quick CLI test
if __name__ == "__main__":
    print(f"[ScreeningEngine CLI] Testing engine initialization...")
    engine = DyslexiaScreeningEngine(backbone="convnext_tiny")
    print(f"Loaded successfully: {len(engine.page_ensemble)} page models ({engine.backbone}).")
