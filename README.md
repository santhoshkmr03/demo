# NeuroWrite AI: Handwriting-Based Dyslexia & Neuromotor Screening System

> ⚠️ **CRITICAL CLINICAL NOTICE**: This software is strictly an experimental **screening decision-support tool**, **NOT** a diagnostic instrument. It provides automated neuromotor risk estimations based on handwriting morphological patterns and must **NEVER** replace formal clinical evaluations conducted by qualified educational psychologists, pediatricians, or licensed medical specialists.

---

## 🌟 Overview

**NeuroWrite AI** is a deep learning screening system designed to detect subtle handwriting irregularities, character mirroring, and neuromotor reversal patterns associated with dyslexia and dysgraphia. 

The architecture is built on a **5-fold cross-validated ConvNeXt-Tiny + Attention Multiple Instance Learning (MIL)** ensemble with visual explainability:
- **PyTorch Grad-CAM**: Highlights class-activation saliency hotspots across handwriting zones.
- **Integrated Gradients (IG)**: Delivers axiomatic, pixel-level attribution directly along pen strokes.

The system features a **FastAPI** backend powering a modern **React + Tailwind CSS** handwriting screening web app with Supabase PostgreSQL authentication and automated PDF report generation.

---

## 🏗️ System Architecture

```
                    ┌────────────────────────────┐
                    │  Handwriting Image Input   │
                    │  (Full Page / Worksheet)   │
                    └─────────────┬──────────────┘
                                  │
                   [Preprocessing & Padding: 512x512]
                   (Grayscale, Inversion, Rule Removal)
                                  │
                   [Patch Grid Decomposition: 224x224]
                   (Overlapping Patches with Hann Apodization)
                                  │
          ┌───────────────────────┴───────────────────────┐
          │  5-Fold ConvNeXt-Tiny + Attention MIL Ensemble │
          │  Fold 0 │ Fold 1 │ Fold 2 │ Fold 3 │ Fold 4    │
          └───────────────────────┬───────────────────────┘
                                  │
                      [Ensemble Soft-Voting Aggregation]
                                  │
          ┌───────────────────────┼───────────────────────┐
          ▼                       ▼                       ▼
   [Risk Assessment]     [Visual Explainability]    [Dossier Export]
  • Binary screening     • Grad-CAM Heatmap         • ReportLab PDF Report
  • Risk score            • Integrated Gradients    • Screening disclaimer
  • Fold uncertainty      Stroke Pixel Overlay      Student/examiner fields
```

### Key Technical Characteristics
1. **5-Fold Ensemble Soft-Voting**: Aggregates predictions across five independent models and returns fold disagreement as an uncertainty band. The risk score is a screening estimate, not a diagnosis.
2. **Attention Multiple Instance Learning (MIL)**: Weights each handwriting region adaptively according to stroke complexity and morphology.
3. **Dual Explainability**: Ensures transparency by visualizing exactly which stroke inversions and hesitation contours influenced the screening outcome.

---

## 📁 Repository Structure

```
├── frontend/                  # React + Vite handwriting screening UI
│   └── src/
│       ├── components/        # Reusable UI & domain components (Cards, Badges, Dropzone)
│       ├── context/           # Auth, Theme, and Toast React Context providers
│       ├── pages/             # Dashboard, Upload, Processing, Result, History, Report
│       └── utils/             # API client, Supabase config, styling helpers
├── src/                       # Production Python inference engine & REST API
│   ├── api.py                 # FastAPI REST service (/predict, /health, /report, etc.)
│   ├── config.py              # Global hyperparameters, device setup, and paths
│   ├── explain_ig.py          # Integrated Gradients & ink-stroke attribution algorithms
│   ├── model_page.py          # ConvNeXt-Tiny + Attention MIL model architecture
│   ├── preprocess.py          # Image normalization, padding, and rule removal
│   ├── report_generator.py    # ReportLab clinical screening PDF generator
│   └── screening_engine.py    # DyslexiaScreeningEngine production inference wrapper
├── colab/                     # Google Colab training notebooks and generators
├── data/                      # Training data is intentionally excluded from the upload ZIP
├── requirements.txt           # Pinned Python runtime/test dependencies
├── outputs/checkpoints/       # Trained 5-fold ConvNeXt-Tiny checkpoint weights (.pt)
├── supabase/                  # PostgreSQL database schema & Row-Level Security policies
└── tests/                     # PyTest integration and endpoint unit test suite
```

---

## 🚀 Quick Start

### 1. Backend Setup

```bash
# Clone the repository
git clone https://github.com/Tanus/DyslexiaFinal.git
cd DyslexiaFinal

# Install pinned Python dependencies
python -m pip install -r requirements.txt

# Start the FastAPI REST service
uvicorn src.api:app --host 127.0.0.1 --port 8000 --reload
```
API documentation is interactively accessible at `http://127.0.0.1:8000/docs`.

### 2. Frontend Setup

```bash
cd frontend

# Install node dependencies
npm install

# Start the development workstation
npm run dev
```
Open `http://localhost:5173` in your browser. The frontend requires Supabase configuration in
`frontend/.env` for authentication and cross-device history; copy the variable names from
`frontend/.env.example`. The API URL defaults to `http://127.0.0.1:8000` and can be overridden
with `VITE_API_URL`.

### Submission package contents

The upload-ready package includes the application source, tests, Supabase schema/migrations,
the five active ConvNeXt-Tiny checkpoints under `outputs/checkpoints/`, and the training notebooks
under `colab/`. It intentionally excludes raw handwriting datasets, dataset archives, sample/demo
images, `node_modules`, frontend build output, local environment files, generated reports, and
OpenCode/editor state.

The packaged API does not include the old static-token mock login/register endpoints or the curated
sample endpoint. Authentication is handled by Supabase; do not put live Supabase credentials in the
ZIP.

---

## 🧪 Testing & Verification

Run the full PyTest suite to verify REST endpoints, inference accuracy, and explainability generation:
```bash
pytest tests/test_api.py -v
```

Build the production frontend bundle:
```bash
cd frontend
npm run build
```

---

## 🔒 Ethical AI & Clinical Screening Guidelines

- **Screening Only**: This application is strictly an early-warning decision-support tool designed for schools and clinical labs. It must **never** be used as a definitive clinical diagnosis.
- **Privacy & Security**: Handwriting specimens contain sensitive biometric and educational data. All database tables in `supabase/schema.sql` enforce strict Row-Level Security (RLS) policies.
- **Model Transparency**: Explanations via Grad-CAM and Integrated Gradients must always accompany inference outputs to prevent algorithmic bias or blind trust in raw confidence scores.
