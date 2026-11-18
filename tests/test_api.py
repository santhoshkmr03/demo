"""Unit and integration tests for the Dyslexia Screening REST API."""

import io
import sys
from pathlib import Path
import pytest
from fastapi.testclient import TestClient
from PIL import Image

# Ensure project root is in path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from src.api import app

client = TestClient(app)


def test_root_endpoint():
    """Verify root documentation and disclaimer metadata."""
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "online"
    assert "SCREENING" in data["disclaimer"]


def test_health_endpoint():
    """Verify healthcheck and compute availability."""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "convnext_tiny" in data["supported_backbones"]
    assert "resnet50" in data["supported_backbones"]


def test_screen_endpoint_with_image():
    """Verify /api/v1/screen returns expected schema and non-null risk scores."""
    # Create a simple synthetic handwriting test image in-memory
    img = Image.new("RGB", (256, 256), color=(255, 255, 255))
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    buf.seek(0)

    response = client.post(
        "/api/v1/screen?backbone=convnext_tiny&input_mode=page",
        files={"file": ("test_page.png", buf.getvalue(), "image/png")},
    )
    assert response.status_code == 200
    data = response.json()

    assert "risk_score" in data
    assert 0.0 <= data["risk_score"] <= 1.0
    assert "uncertainty_band" in data
    assert len(data["per_fold_predictions"]) == 5
    assert "SCREENING" in data["disclaimer"]
    assert data["backbone"] == "convnext_tiny"


def test_report_endpoint_returns_pdf():
    """Verify /api/v1/report returns a valid downloadable PDF byte stream."""
    img = Image.new("RGB", (256, 256), color=(255, 255, 255))
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    buf.seek(0)

    response = client.post(
        "/api/v1/report",
        data={
            "student_id": "TEST-STUDENT-001",
            "examiner_name": "Dr. Verification",
            "backbone": "convnext_tiny",
            "input_mode": "page",
        },
        files={"file": ("test_page.png", buf.getvalue(), "image/png")},
    )
    assert response.status_code == 200
    assert response.headers["content-type"] == "application/pdf"
    assert response.content.startswith(b"%PDF")
    assert len(response.content) > 1000


def test_screen_fullpage_letters_ig_endpoint():
    """Verify /api/v1/screen-letters-ig segments letters and returns full-page IG overlays."""
    import numpy as np
    # Draw simple ink patterns on white background
    img_arr = np.ones((120, 240, 3), dtype=np.uint8) * 255
    # Letter 1
    img_arr[30:70, 30:50] = 0
    # Letter 2
    img_arr[30:70, 80:100] = 0
    # Letter 3
    img_arr[30:70, 130:150] = 0

    img = Image.fromarray(img_arr)
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    buf.seek(0)

    response = client.post(
        "/api/v1/screen-letters-ig?max_crops=10",
        files={"file": ("test_page_letters.png", buf.getvalue(), "image/png")},
    )
    assert response.status_code == 200
    data = response.json()

    assert "total_letters_detected" in data
    assert data["total_letters_detected"] >= 1
    assert "crops" in data
    assert "full_page_ig_overlay_base64" in data
    assert data["full_page_ig_overlay_base64"].startswith("data:image/png;base64,")
    assert "annotated_boxes_base64" in data
    assert "SCREENING" in data["disclaimer"]


def test_neurowrite_predict_endpoint():
    """Verify Neurowrite frontend /predict endpoint runs ConvNeXt ensemble + IG & GradCAM."""
    img = Image.new("RGB", (256, 256), color=(255, 255, 255))
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    buf.seek(0)

    response = client.post(
        "/predict",
        files={"file": ("test_specimen.png", buf.getvalue(), "image/png")},
    )
    assert response.status_code == 200
    data = response.json()

    assert "id" in data
    assert "category" in data
    assert "confidence" in data
    assert "probabilities" in data
    assert "Normal" in data["probabilities"]
    assert "Reversal" in data["probabilities"]
    assert "risk_score" in data
    assert "SCREENING" in data["disclaimer"]


