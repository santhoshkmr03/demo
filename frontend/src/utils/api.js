import { supabase, isSupabaseConfigured } from './supabase';

const API_BASE = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";
const LOCAL_HISTORY_KEY = 'neurowrite_local_history';

export function getAuthHeaders() {
  const token = localStorage.getItem("neurowrite_token");
  return token
    ? {
        Authorization: `Bearer ${token}`,
      }
    : {};
}

// Login
export async function login(credentials) {
  if (!isSupabaseConfigured() || !supabase) {
    throw new Error("Supabase authentication is required. Configure frontend/.env before signing in.");
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email: credentials.email,
    password: credentials.password,
  });
  if (error) throw new Error(error.message);

  const token = data.session?.access_token;
  if (token) localStorage.setItem("neurowrite_token", token);
  const userObj = {
    name: data.user.user_metadata?.name || credentials.email.split('@')[0].replace('.', ' '),
    email: data.user.email,
  };
  localStorage.setItem("neurowrite_user", JSON.stringify(userObj));
  return { success: true, token, user: userObj };
}

// Register
export async function register(userData) {
  if (!isSupabaseConfigured() || !supabase) {
    throw new Error("Supabase authentication is required. Configure frontend/.env before creating an account.");
  }

  const { data, error } = await supabase.auth.signUp({
    email: userData.email,
    password: userData.password,
    options: {
      data: {
        name: userData.name || (userData.email || '').split('@')[0],
        institution: userData.institution || "NeuroWrite AI",
      },
    },
  });
  if (error) throw new Error(error.message);

  const token = data.session?.access_token;
  if (token) localStorage.setItem("neurowrite_token", token);
  const userObj = {
    name: userData.name || (userData.email || '').split('@')[0],
    email: userData.email,
    institution: userData.institution,
  };
  localStorage.setItem("neurowrite_user", JSON.stringify(userObj));
  return { success: true, token, user: userObj, requiresEmailConfirmation: !data.session };
}

/**
 * Screen one handwriting image.
 *
 * Calls POST /api/v1/screen, the authoritative contract: one page-level risk
 * score, the spread across the five folds, and the explanation overlays.
 * There are no per-class probabilities and no "confidence" value.
 */
export async function screen(file, options = {}) {
  if (!file) {
    throw new Error("No image file selected");
  }

  const {
    backbone = "convnext_tiny",
    inputMode = "page",
    includeOverlays = true,
    signal,
  } = options;

  const formData = new FormData();
  formData.append("file", file);

  const params = new URLSearchParams({
    backbone,
    input_mode: inputMode,
    include_overlay_base64: String(includeOverlays),
  });

  const response = await fetch(`${API_BASE}/api/v1/screen?${params.toString()}`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: formData,
    signal,
  });

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(
      data?.detail || data?.error || `Screening failed (HTTP ${response.status})`
    );
  }

  return data;
}

/**
 * Ask the screening service for the generated PDF report.
 *
 * POST /api/v1/report runs the same inference and streams back a ReportLab PDF.
 * Requires the original image file, so pages that only kept a preview URL must
 * ask the user to re-upload.
 */
export async function generateReport(file, options = {}) {
  if (!file) {
    throw new Error(
      "The original image is no longer available. Re-upload the handwriting sample to generate a PDF report."
    );
  }

  const {
    studentId = "Anonymous Student",
    examinerName = "Educational Specialist",
    backbone = "convnext_tiny",
  } = options;

  const formData = new FormData();
  formData.append("file", file);
  formData.append("student_id", studentId);
  formData.append("examiner_name", examinerName);
  formData.append("backbone", backbone);
  formData.append("input_mode", "page");

  const response = await fetch(`${API_BASE}/api/v1/report`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: formData,
  });

  if (!response.ok) {
    let detail = `Report generation failed (HTTP ${response.status})`;
    try {
      const err = await response.json();
      detail = err?.detail || detail;
    } catch {
      // The body was not JSON; keep the HTTP status message.
    }
    throw new Error(detail);
  }

  const blob = await response.blob();

  // Prefer the filename the server chose, if it exposed one.
  const disposition = response.headers.get("Content-Disposition") || "";
  const match = disposition.match(/filename\*?=(?:UTF-8'')?"?([^";]+)"?/i);
  const filename = match ? decodeURIComponent(match[1]) : "screening-report.pdf";

  return { blob, filename };
}

/**
 * Persist a completed screening.
 *
 * Only real fields are written. When the response does not contain a risk
 * score the record is skipped rather than filled with a fabricated normal
 * result.
 */
export async function saveScreeningRecord(screening) {
  if (!screening) return null;

  const riskScore = Number(screening.risk_score);
  if (!Number.isFinite(riskScore)) {
    console.warn("saveScreeningRecord: missing risk_score, record not saved");
    return null;
  }

  const riskPercentage = Number.isFinite(Number(screening.risk_percentage))
    ? Number(screening.risk_percentage)
    : Math.round(riskScore * 1000) / 10;

  const category = riskScore >= 0.5 ? "Elevated" : "Typical";
  const band = screening.uncertainty_band || null;

  // Store the original image (base64) and model overlays from the screening result
  const originalImageBase64 = screening.original_image_base64 || null;
  const attentionOverlayBase64 = screening.attention_overlay_base64 || null;
  const gradcamOverlayBase64 = screening.gradcam_overlay_base64 || null;
  const igOverlayBase64 = screening.ig_overlay_base64 || null;

  const record = {
    id:
      screening.id ||
      (typeof crypto !== "undefined" && crypto.randomUUID
        ? `NW-${crypto.randomUUID().slice(0, 8).toUpperCase()}`
        : `NW-${Date.now().toString(36).toUpperCase()}`),
    user_id: null,
    date: new Date().toISOString().slice(0, 10),
    subject: screening.filename || "Handwriting sample",
    filename: screening.filename || null,
    category,
    risk_score: riskScore,
    risk_percentage: riskPercentage,
    uncertainty_band: band,
    screening_classification: screening.screening_classification || null,
    per_fold_predictions: screening.per_fold_predictions || null,
    models_in_ensemble: screening.models_in_ensemble || null,
    ink_mass_fraction: screening.ink_mass_fraction ?? null,
    backbone: screening.backbone || null,
    status: category === "Elevated" ? "Flagged" : "Completed",
    // Image and visualization data for history viewing
    original_image_base64: originalImageBase64,
    preview_image_base64: screening.preview_image_base64 || originalImageBase64,
    attention_overlay_base64: attentionOverlayBase64,
    gradcam_overlay_base64: gradcamOverlayBase64,
    ig_overlay_base64: igOverlayBase64,
  };

  if (isSupabaseConfigured() && supabase) {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      record.user_id = sessionData?.session?.user?.id || null;

      const { data, error } = await supabase.from('screenings').upsert([record]);
      if (error) {
        console.warn("Supabase screening upsert note:", error.message);
      } else {
        return data;
      }
    } catch (err) {
      console.warn("Supabase save screening error:", err.message);
    }
  }

  // Local storage fallback for offline persistence
  try {
    const existing = JSON.parse(localStorage.getItem(LOCAL_HISTORY_KEY) || '[]');
    localStorage.setItem(
      LOCAL_HISTORY_KEY,
      JSON.stringify([record, ...existing.slice(0, 29)])
    );
  } catch {
    // Browser storage can be unavailable (private mode) or full.
  }

  return null;
}

/**
 * Screening history.
 *
 * Sources, in order: Supabase (when configured), then screenings saved in this
 * browser. The backend has no history store, so there is no server fallback.
 */
export async function getHistory() {
  if (isSupabaseConfigured() && supabase) {
    try {
      const { data, error } = await supabase
        .from('screenings')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data && data.length > 0) {
        return {
          data: data.map(normalizeRecord),
        };
      }
    } catch (err) {
      console.warn("Supabase getHistory fallback:", err.message);
    }
  }

  try {
    const local = JSON.parse(localStorage.getItem(LOCAL_HISTORY_KEY) || '[]');
    return { data: local.map(normalizeRecord) };
  } catch {
    return { data: [] };
  }
}

function normalizeRecord(item) {
  const riskScore = Number(item.risk_score);
  const category =
    item.category === "Elevated" || item.category === "Reversal"
      ? "Elevated"
      : item.category === "Typical"
      ? "Typical"
      : Number.isFinite(riskScore)
      ? riskScore >= 0.5
        ? "Elevated"
        : "Typical"
      : null;
  return {
    id: item.id,
    date: item.date || item.created_at?.slice(0, 10) || null,
    subject: item.subject || item.filename || "Handwriting sample",
    file: item.filename || item.file || null,
    category,
    riskPercentage: Number.isFinite(Number(item.risk_percentage))
      ? Number(item.risk_percentage)
      : Number.isFinite(riskScore)
      ? Math.round(riskScore * 1000) / 10
      : null,
    riskScore: Number.isFinite(riskScore) ? riskScore : null,
    status: item.status || null,
    screeningClassification: item.screening_classification || null,
    uncertaintyBand: item.uncertainty_band || null,
    perFoldPredictions: item.per_fold_predictions || null,
    modelsInEnsemble: item.models_in_ensemble ?? null,
    inkMassFraction: item.ink_mass_fraction ?? null,
    backbone: item.backbone || null,
    // Image and visualization data for history viewing
    originalImageBase64: item.original_image_base64 || null,
    previewImageBase64: item.preview_image_base64 || item.original_image_base64 || null,
    attentionOverlayBase64: item.attention_overlay_base64 || null,
    gradcamOverlayBase64: item.gradcam_overlay_base64 || null,
    igOverlayBase64: item.ig_overlay_base64 || null,
  };
}
