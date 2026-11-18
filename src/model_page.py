"""Page branch model: ResNet-50 patch encoder + attention MIL pooling."""

import torch
import torch.nn as nn
import torchvision.models as models

from src import config
from src import preprocess


# ── Patch Encoder ─────────────────────────────────────────────────────────────

class PatchEncoder(nn.Module):
    """Encode image patches into feature vectors using a pretrained backbone."""

    def __init__(self, backbone_name=None):
        """Initialise with a pretrained backbone (remove final FC)."""
        super().__init__()
        if backbone_name is None:
            backbone_name = config.BACKBONE

        if backbone_name == "resnet50":
            # Use cached IMAGENET1K_V1 weights if available
            try:
                weights = models.ResNet50_Weights.IMAGENET1K_V1
                base = models.resnet50(weights=weights)
            except Exception:
                base = models.resnet50(weights=models.ResNet50_Weights.DEFAULT)
            self.feature_dim = base.fc.in_features
            self.backbone = nn.Sequential(*list(base.children())[:-1])  # remove FC
        elif backbone_name == "efficientnet_v2_s":
            base = models.efficientnet_v2_s(weights=models.EfficientNet_V2_S_Weights.DEFAULT)
            self.feature_dim = base.classifier[1].in_features
            base.classifier = nn.Identity()
            self.backbone = base
        elif backbone_name == "convnext_tiny":
            base = models.convnext_tiny(weights=models.ConvNeXt_Tiny_Weights.DEFAULT)
            self.feature_dim = base.classifier[2].in_features
            base.classifier = nn.Identity()
            self.backbone = base
        else:
            raise ValueError(f"Unknown backbone: {backbone_name}")

        # Adapt first conv for single-channel input → replicate to 3 channels
        self.channel_expand = nn.Conv2d(1, 3, kernel_size=1, bias=False)
        nn.init.constant_(self.channel_expand.weight, 1.0 / 3.0)

    def forward(self, x):
        """Forward pass: (B, 1, 224, 224) → (B, feature_dim)."""
        x = self.channel_expand(x)          # (B, 3, 224, 224)
        features = self.backbone(x)         # (B, feature_dim, 1, 1) or (B, feature_dim)
        features = features.view(features.size(0), -1)  # (B, feature_dim)
        return features


# ── Attention MIL Pooling ─────────────────────────────────────────────────────

class AttentionMIL(nn.Module):
    """Attention-based multiple-instance learning pooling (Ilse et al., 2018)."""

    def __init__(self, feature_dim, attention_dim=None):
        """Initialise attention MLP."""
        super().__init__()
        if attention_dim is None:
            attention_dim = config.PAGE_ATTENTION_DIM
        self.attention = nn.Sequential(
            nn.Linear(feature_dim, attention_dim),
            nn.Tanh(),
            nn.Linear(attention_dim, 1),
        )

    def forward(self, features):
        """Pool instance features via attention. (N, D) → (D,), (N,) weights."""
        attn_logits = self.attention(features)       # (N, 1)
        attn_weights = torch.softmax(attn_logits, dim=0)  # (N, 1)
        embedding = (attn_weights * features).sum(dim=0)   # (D,)
        return embedding, attn_weights.squeeze(1)          # (D,), (N,)


# ── Full Page Model ───────────────────────────────────────────────────────────

class PageModel(nn.Module):
    """Full page-level model: patches → encoder → attention pooling → logit."""

    def __init__(self, backbone_name=None, attention_dim=None):
        """Initialise page model components."""
        super().__init__()
        self.encoder = PatchEncoder(backbone_name)
        self.pooling = AttentionMIL(self.encoder.feature_dim, attention_dim)
        self.head = nn.Linear(self.encoder.feature_dim, 1)

    def forward(self, page_tensor):
        """Forward: page tensor (1, H, W) → (logit, attention_weights)."""
        patches = preprocess.extract_patches(page_tensor)  # (N, 1, P, P)
        device = next(self.parameters()).device
        patches = patches.to(device)
        features = self.encoder(patches)                     # (N, D)
        embedding, attn_weights = self.pooling(features)     # (D,), (N,)
        logit = self.head(embedding)                         # (1,)
        return logit, attn_weights


def create_page_model(backbone_name=None):
    """Instantiate a PageModel and move to config.DEVICE."""
    model = PageModel(backbone_name=backbone_name)
    model = model.to(config.DEVICE)
    n_params = sum(p.numel() for p in model.parameters())
    n_train = sum(p.numel() for p in model.parameters() if p.requires_grad)
    print(f"PageModel created: {n_params:,} params ({n_train:,} trainable) on {config.DEVICE}")
    return model
