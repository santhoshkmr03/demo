"""Integrated Gradients and ink-stroke attribution utilities for runtime inference."""

import numpy as np
import torch
from src import config


def integrated_gradients(model, input_tensor, baseline=None, steps=50, device=None):
    """Compute Integrated Gradients attribution (no captum dependency)."""
    if device is None:
        device = config.DEVICE
    if baseline is None:
        baseline = torch.zeros_like(input_tensor)

    input_tensor = input_tensor.to(device)
    baseline = baseline.to(device)

    # Interpolate between baseline and input
    scaled_inputs = []
    for alpha in np.linspace(0.0, 1.0, steps + 1):
        scaled = baseline + alpha * (input_tensor - baseline)
        scaled_inputs.append(scaled)

    # Compute gradients at each interpolation point
    grads = []
    model.eval()
    for scaled in scaled_inputs:
        scaled = scaled.detach().requires_grad_(True)
        output = model(scaled.unsqueeze(0))  # (1, 1) logit
        if isinstance(output, tuple):
            output = output[0]
        output = output.squeeze()
        output.backward()
        grads.append(scaled.grad.detach().cpu())

    # Average gradients and multiply by (input - baseline)
    avg_grad = torch.stack(grads).mean(dim=0)
    diff = (input_tensor - baseline).cpu()
    attribution = avg_grad * diff
    return attribution  # same shape as input


def compute_ink_mask(image_array, threshold=None):
    """Create binary mask of ink pixels using adaptive luminance thresholding."""
    if threshold is None:
        mu = np.mean(image_array)
        std = np.std(image_array)
        threshold = max(mu - 0.5 * std, 0.2)
    mask = (image_array < threshold).astype(np.float32)
    if mask.sum() == 0:
        mask = (image_array < np.percentile(image_array, 25)).astype(np.float32)
    return mask


def compute_ink_mass_fraction(attribution_map, ink_mask):
    """Compute fraction of attribution mass falling on ink pixels."""
    attr = np.abs(attribution_map)
    total_mass = attr.sum()
    if total_mass < 1e-10:
        return 0.0
    ink_mass = (attr * ink_mask).sum()
    return float(ink_mass / total_mass)
