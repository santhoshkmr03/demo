"""FastAPI REST Service for Handwriting-Based Dyslexia & Dysgraphia Screening.

⚠️ SCREENING TOOL ONLY: This API provides an automated experimental screening
assessment, NOT a diagnostic instrument. It provides risk estimations based on
handwriting neuromotor patterns and must NEVER replace formal clinical evaluation
by qualified educational psychologists or medical specialists.
"""

from __future__ import annotations

import base64
import io
import os
import sys
from pathlib import Path
from typing import Any, Dict, Optional

# Add project root to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from fastapi import FastAPI, File, Form, HTTPException, Query, UploadFile, status
import uuid
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, Response
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from PIL import Image
import torch

from src import config
from src.report_generator import generate_screening_pdf
from src.screening_engine import DISCLAIMER_TEXT, DyslexiaScreeningEngine

app = FastAPI(
    title="Dyslexia Handwriting Screening REST API",
    description=(
        "Standardized REST API for handwriting-based neuromotor risk screening for "
        "dyslexia and dysgraphia. Built on 5-fold cross-validated deep ensembles "
        "(ConvNeXt-Tiny & ResNet-50 + Attention Multiple Instance Learning).\n\n"
        f"**CLINICAL NOTICE:** {DISCLAIMER_TEXT}"
    ),
    version="1.0.0",
)

# Restrict CORS to the documented local development frontend.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Engine Cache (lazy singleton)
_ENGINES: Dict[str, DyslexiaScreeningEngine] = {}


def get_engine_instance(backbone: str = "convnext_tiny") -> DyslexiaScreeningEngine:
    """Retrieve or initialize the singleton screening engine for the specified backbone."""
    backbone = backbone.lower()
    if backbone not in ("convnext_tiny", "resnet50"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported backbone: '{backbone}'. Must be 'convnext_tiny' or 'resnet50'.",
        )
    if backbone not in _ENGINES:
        _ENGINES[backbone] = DyslexiaScreeningEngine(backbone=backbone)
    return _ENGINES[backbone]


@app.get("/", tags=["General"])
def root_info() -> Dict[str, Any]:
    """Root info endpoint providing service metadata and disclaimer."""
    return {
        "service": "Dyslexia Handwriting Screening REST API",
        "version": "1.0.0",
        "status": "online",
        "documentation": "/docs",
        "disclaimer": DISCLAIMER_TEXT,
    }


@app.get("/health", tags=["General"])
def health_check() -> Dict[str, Any]:
    """Health check endpoint reporting GPU/CPU compute capability and available models."""
    cuda_available = torch.cuda.is_available()
    device_name = torch.cuda.get_device_name(0) if cuda_available else "CPU (Host)"
    return {
        "status": "healthy",
        "compute_device": device_name,
        "cuda_available": cuda_available,
        "supported_backbones": ["convnext_tiny", "resnet50"],
        "screening_disclaimer": DISCLAIMER_TEXT,
    }


@app.post("/api/v1/screen", tags=["Screening"])
async def screen_handwriting(
    file: UploadFile = File(..., description="Handwriting image file (PNG, JPG, JPEG)"),
    backbone: str = Query("convnext_tiny", description="Neural backbone ('convnext_tiny' or 'resnet50')"),
    input_mode: str = Query("page", description="Analysis mode: 'page' (Full-page / sentence handwriting specimen)"),
    include_overlay_base64: bool = Query(True, description="Whether to include the attention heatmap base64 data"),
) -> Dict[str, Any]:
    """Screen an uploaded handwriting image for dyslexia/dysgraphia neuromotor signals.

    Returns risk probability, uncertainty band (spread across 5-fold ensemble),
    screening classification, and attention overlay heatmap.
    """
    if file.content_type not in ("image/png", "image/jpeg", "image/jpg", "image/bmp", "image/webp", "application/octet-stream"):
        # Still attempt reading via PIL in case content_type header was generic
        pass

    try:
        contents = await file.read()
        pil_img = Image.open(io.BytesIO(contents)).convert("RGB")
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid image file uploaded: {e}",
        )

    engine = get_engine_instance(backbone=backbone)

    try:
        raw_res = engine.predict_page(pil_img)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Inference failure: {e}",
        )

    # Clean response for JSON serialization
    response_data: Dict[str, Any] = {
        "disclaimer": raw_res["disclaimer"],
        "input_type": raw_res["input_type"],
        "backbone": raw_res.get("backbone", backbone),
        "risk_score": round(float(raw_res["risk_score"]), 4),
        "risk_percentage": round(float(raw_res["risk_percentage"]), 2),
        "risk_category": raw_res["risk_category"],
        "screening_classification": raw_res["screening_classification"],
        "uncertainty_band": raw_res["uncertainty_band"],
        "per_fold_predictions": raw_res["per_fold_predictions"],
        "models_in_ensemble": raw_res["models_in_ensemble"],
        "ink_mass_fraction": raw_res.get("ink_mass_fraction"),
    }

    # Encode attention overlay if requested
    if include_overlay_base64 and "attention_overlay" in raw_res:
        overlay = raw_res["attention_overlay"]
        if isinstance(overlay, Image.Image):
            buf = io.BytesIO()
            overlay.save(buf, format="PNG")
            b64_str = base64.b64encode(buf.getvalue()).decode("utf-8")
            response_data["attention_overlay_base64"] = f"data:image/png;base64,{b64_str}"

    # Encode Integrated Gradients stroke overlay
    if "full_page_ig_overlay" in raw_res:
        overlay = raw_res["full_page_ig_overlay"]
        if isinstance(overlay, Image.Image):
            buf = io.BytesIO()
            overlay.save(buf, format="PNG")
            b64_str = base64.b64encode(buf.getvalue()).decode("utf-8")
            response_data["ig_overlay_base64"] = f"data:image/png;base64,{b64_str}"

    # Encode Grad-CAM class activation mapping overlay
    if "gradcam_overlay" in raw_res:
        overlay = raw_res["gradcam_overlay"]
        if isinstance(overlay, Image.Image):
            buf = io.BytesIO()
            overlay.save(buf, format="PNG")
            b64_str = base64.b64encode(buf.getvalue()).decode("utf-8")
            response_data["gradcam_overlay_base64"] = f"data:image/png;base64,{b64_str}"

    return response_data


# ─────────────────────────────────────────────────────────────────────────────
# Neurowrite AI Compatibility Endpoints (Powering frontend_)
# ─────────────────────────────────────────────────────────────────────────────

@app.post("/predict", tags=["Neurowrite Frontend"])
async def predict_compatibility(
    file: UploadFile = File(..., description="Handwriting image file (PNG, JPG, JPEG)"),
) -> Dict[str, Any]:
    """Compatibility endpoint for Neurowrite AI frontend (runs 5-fold ConvNeXt-Tiny ensemble + IG & GradCAM)."""
    try:
        contents = await file.read()
        pil_img = Image.open(io.BytesIO(contents)).convert("RGB")
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid image file: {e}",
        )

    engine = get_engine_instance(backbone="convnext_tiny")
    raw_res = engine.predict_page(pil_img)
    risk_score = float(raw_res["risk_score"])
    is_at_risk = risk_score >= 0.50

    # Encode Integrated Gradients stroke overlay
    ig_b64 = None
    if "full_page_ig_overlay" in raw_res:
        overlay = raw_res["full_page_ig_overlay"]
        if isinstance(overlay, Image.Image):
            buf = io.BytesIO()
            overlay.save(buf, format="PNG")
            ig_b64 = f"data:image/png;base64,{base64.b64encode(buf.getvalue()).decode('utf-8')}"

    # Encode Grad-CAM class activation mapping overlay
    gradcam_b64 = None
    if "gradcam_overlay" in raw_res:
        overlay = raw_res["gradcam_overlay"]
        if isinstance(overlay, Image.Image):
            buf = io.BytesIO()
            overlay.save(buf, format="PNG")
            gradcam_b64 = f"data:image/png;base64,{base64.b64encode(buf.getvalue()).decode('utf-8')}"

    attention_b64 = None
    if "attention_overlay" in raw_res:
        overlay = raw_res["attention_overlay"]
        if isinstance(overlay, Image.Image):
            buf = io.BytesIO()
            overlay.save(buf, format="PNG")
            attention_b64 = f"data:image/png;base64,{base64.b64encode(buf.getvalue()).decode('utf-8')}"
        elif hasattr(overlay, "__array__"):
            import numpy as np
            pil_over = Image.fromarray(overlay.astype(np.uint8))
            buf = io.BytesIO()
            pil_over.save(buf, format="PNG")
            attention_b64 = f"data:image/png;base64,{base64.b64encode(buf.getvalue()).decode('utf-8')}"

    spec_id = f"NW-{uuid.uuid4().hex[:6].upper()}"
    category = "Reversal" if is_at_risk else "Normal"
    conf = round(risk_score * 100, 1) if is_at_risk else round((1.0 - risk_score) * 100, 1)

    return {
        "id": spec_id,
        "category": category,
        "class_name": category,
        "confidence": conf,
        "probabilities": {
            "Normal": round((1.0 - risk_score) * 100, 1),
            "Reversal": round(risk_score * 100, 1),
            "Corrected": round(min(risk_score, 1.0 - risk_score) * 20, 1),
        },
        "risk_score": risk_score,
        "risk_percentage": round(risk_score * 100, 1),
        "screening_classification": raw_res.get(
            "screening_classification",
            "Elevated Risk Pattern" if is_at_risk else "Typical Handwriting Pattern",
        ),
        "uncertainty_band": raw_res.get("uncertainty_band"),
        "ig_overlay_base64": ig_b64,
        "gradcam_overlay_base64": gradcam_b64 or attention_b64,
        "attention_overlay_base64": attention_b64,
        "filename": file.filename or "specimen.png",
        "disclaimer": DISCLAIMER_TEXT,
    }


@app.post("/api/v1/report", tags=["Screening"])
async def generate_screening_report(
    file: UploadFile = File(..., description="Handwriting image file (PNG, JPG, JPEG)"),
    student_id: str = Form("Anonymous Student", description="Student identifier for report"),
    examiner_name: str = Form("Clinical Specialist", description="Examiner or institution name"),
    backbone: str = Form("convnext_tiny", description="Neural backbone ('convnext_tiny' or 'resnet50')"),
    input_mode: str = Form("page", description="Analysis mode: 'page' (Full-page / sentence handwriting specimen)"),
) -> Response:
    """Screen an image and immediately return a downloadable clinical PDF report."""
    try:
        contents = await file.read()
        pil_img = Image.open(io.BytesIO(contents)).convert("RGB")
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid image file uploaded: {e}",
        )

    engine = get_engine_instance(backbone=backbone)

    try:
        raw_res = engine.predict_page(pil_img)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Inference failure: {e}",
        )

    pdf_bytes = generate_screening_pdf(
        result=raw_res,
        original_image=pil_img,
        student_id=student_id,
        examiner_name=examiner_name,
    )

    filename = f"Screening_Report_{student_id.replace(' ', '_')}.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@app.post("/api/v1/screen-letters-ig", tags=["Screening"])
async def screen_fullpage_letters_ig(
    file: UploadFile = File(..., description="Full-page handwriting image (PNG, JPG, JPEG)"),
    max_crops: int = Query(60, description="Maximum character crops to segment and analyze"),
    include_images_base64: bool = Query(True, description="Whether to include full-page IG and box overlays as base64"),
) -> Dict[str, Any]:
    """Segment individual character strokes using OpenCV contours,
    compute Integrated Gradients directly from the PageModel ensemble, and composite a full-page IG stroke overlay.
    """
    try:
        contents = await file.read()
        pil_img = Image.open(io.BytesIO(contents)).convert("RGB")
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid image file uploaded: {e}",
        )

    engine = get_engine_instance(backbone="convnext_tiny")

    try:
        raw_res = engine.segment_and_screen_letters_ig(pil_img, max_crops=max_crops)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Letter-level IG pipeline failure: {e}",
        )

    crops_summary = [
        {
            "index": c["index"],
            "box": c["box"],
            "risk_probability": c["risk_probability"],
            "is_elevated": c["is_elevated"],
        }
        for c in raw_res["crop_results"]
    ]

    response_data: Dict[str, Any] = {
        "disclaimer": raw_res["disclaimer"],
        "total_letters_detected": raw_res["total_letters_detected"],
        "elevated_letters_count": raw_res["elevated_letters_count"],
        "elevated_letters_percentage": raw_res["elevated_letters_percentage"],
        "mean_letter_risk": raw_res["mean_letter_risk"],
        "crops": crops_summary,
    }

    if include_images_base64:
        buf_ig = io.BytesIO()
        raw_res["full_page_ig_overlay"].save(buf_ig, format="PNG")
        response_data["full_page_ig_overlay_base64"] = (
            f"data:image/png;base64,{base64.b64encode(buf_ig.getvalue()).decode('utf-8')}"
        )

        buf_box = io.BytesIO()
        raw_res["annotated_boxes_image"].save(buf_box, format="PNG")
        response_data["annotated_boxes_base64"] = (
            f"data:image/png;base64,{base64.b64encode(buf_box.getvalue()).decode('utf-8')}"
        )

    return response_data


# Mount static sample assets
samples_dir = Path(__file__).resolve().parent.parent / "data" / "samples"
if samples_dir.exists():
    app.mount("/data/samples", StaticFiles(directory=str(samples_dir)), name="samples")

# Mount compiled JS frontend if dist exists
frontend_dist = Path(__file__).resolve().parent.parent / "frontend" / "dist"
if frontend_dist.exists():
    app.mount("/ui", StaticFiles(directory=str(frontend_dist), html=True), name="ui")

