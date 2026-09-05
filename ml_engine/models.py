import torch
import torch.nn as nn
import torch.nn.functional as F

class ResBlock(nn.Module):
    """
    Standard Residual block for custom feature extractors.
    """
    def __init__(self, in_channels, out_channels, stride=1):
        super(ResBlock, self).__init__()
        self.conv1 = nn.Conv2d(in_channels, out_channels, kernel_size=3, stride=stride, padding=1, bias=False)
        self.bn1 = nn.BatchNorm2d(out_channels)
        self.conv2 = nn.Conv2d(out_channels, out_channels, kernel_size=3, stride=1, padding=1, bias=False)
        self.bn2 = nn.BatchNorm2d(out_channels)
        
        self.shortcut = nn.Sequential()
        if stride != 1 or in_channels != out_channels:
            self.shortcut = nn.Sequential(
                nn.Conv2d(in_channels, out_channels, kernel_size=1, stride=stride, bias=False),
                nn.BatchNorm2d(out_channels)
            )

    def forward(self, x):
        out = F.relu(self.bn1(self.conv1(x)))
        out = self.bn2(self.conv2(out))
        out += self.shortcut(x)
        out = F.relu(out)
        return out


class DynamicClassifier(nn.Module):
    """
    Dynamic Image Classification Model.
    Can dynamically adapt to any number of output classes.
    """
    def __init__(self, num_classes: int, in_channels: int = 3):
        super(DynamicClassifier, self).__init__()
        self.in_planes = 64
        self.conv1 = nn.Conv2d(in_channels, 64, kernel_size=3, stride=1, padding=1, bias=False)
        self.bn1 = nn.BatchNorm2d(64)
        
        # ResNet-style layers
        self.layer1 = self._make_layer(64, 2, stride=1)
        self.layer2 = self._make_layer(128, 2, stride=2)
        self.layer3 = self._make_layer(256, 2, stride=2)
        self.layer4 = self._make_layer(512, 2, stride=2)
        
        self.avgpool = nn.AdaptiveAvgPool2d((1, 1))
        self.fc = nn.Linear(512, num_classes)

    def _make_layer(self, planes, num_blocks, stride):
        strides = [stride] + [1] * (num_blocks - 1)
        layers = []
        for s in strides:
            layers.append(ResBlock(self.in_planes, planes, s))
            self.in_planes = planes
        return nn.Sequential(*layers)

    def forward(self, x):
        out = F.relu(self.bn1(self.conv1(x)))
        out = self.layer1(out)
        out = self.layer2(out)
        out = self.layer3(out)
        out = self.layer4(out)
        out = self.avgpool(out)
        features = out.view(out.size(0), -1)
        logits = self.fc(features)
        return logits

    def get_last_conv_layer(self):
        """
        Returns the final convolutional layer for Grad-CAM visualization.
        """
        return self.layer4[-1].conv2


class DynamicDetector(nn.Module):
    """
    Dynamic Object Detection Model.
    Predicts bounding boxes (x, y, w, h), objectness score, and class probabilities.
    Input size: (B, 3, H, W)
    Output shape:
        - Bounding Boxes: (B, 4) - simplified single defect detection or
        - For multiple boxes, grid-based predictor (like YOLO).
        To be simple, robust and train fast, we output:
        - class_logits: (B, num_classes)
        - box_coords: (B, 4) -> (x_center, y_center, width, height) relative to [0,1]
        - detection_confidence: (B, 1)
    """
    def __init__(self, num_classes: int, in_channels: int = 3):
        super(DynamicDetector, self).__init__()
        self.in_planes = 32
        self.conv1 = nn.Conv2d(in_channels, 32, kernel_size=3, stride=1, padding=1, bias=False)
        self.bn1 = nn.BatchNorm2d(32)
        
        self.layer1 = self._make_layer(64, 2, stride=2)
        self.layer2 = self._make_layer(128, 2, stride=2)
        self.layer3 = self._make_layer(256, 2, stride=2)
        
        self.avgpool = nn.AdaptiveAvgPool2d((1, 1))
        
        # Heads
        self.class_head = nn.Linear(256, num_classes)
        self.box_head = nn.Sequential(
            nn.Linear(256, 128),
            nn.ReLU(),
            nn.Linear(128, 4),
            nn.Sigmoid()  # Normalise coords between 0 and 1
        )
        self.confidence_head = nn.Sequential(
            nn.Linear(256, 64),
            nn.ReLU(),
            nn.Linear(64, 1),
            nn.Sigmoid()
        )

    def _make_layer(self, planes, num_blocks, stride):
        strides = [stride] + [1] * (num_blocks - 1)
        layers = []
        for s in strides:
            layers.append(ResBlock(self.in_planes, planes, s))
            self.in_planes = planes
        return nn.Sequential(*layers)

    def forward(self, x):
        out = F.relu(self.bn1(self.conv1(x)))
        out = self.layer1(out)
        out = self.layer2(out)
        out = self.layer3(out)
        out = self.avgpool(out)
        features = out.view(out.size(0), -1)
        
        classes = self.class_head(features)
        boxes = self.box_head(features)
        conf = self.confidence_head(features)
        
        return classes, boxes, conf

    def get_last_conv_layer(self):
        return self.layer3[-1].conv2


class DoubleConv(nn.Module):
    """
    Helper for U-Net (Conv -> BN -> ReLU) * 2
    """
    def __init__(self, in_channels, out_channels):
        super().__init__()
        self.double_conv = nn.Sequential(
            nn.Conv2d(in_channels, out_channels, kernel_size=3, padding=1, bias=False),
            nn.BatchNorm2d(out_channels),
            nn.ReLU(inplace=True),
            nn.Conv2d(out_channels, out_channels, kernel_size=3, padding=1, bias=False),
            nn.BatchNorm2d(out_channels),
            nn.ReLU(inplace=True)
        )

    def forward(self, x):
        return self.double_conv(x)


class DynamicSegmenter(nn.Module):
    """
    Dynamic UNet model for semantic segmentation.
    Adapts to num_classes dynamically. Output shape: (B, num_classes, H, W)
    """
    def __init__(self, num_classes: int, in_channels: int = 3):
        super(DynamicSegmenter, self).__init__()
        self.inc = DoubleConv(in_channels, 64)
        self.down1 = nn.Sequential(nn.MaxPool2d(2), DoubleConv(64, 128))
        self.down2 = nn.Sequential(nn.MaxPool2d(2), DoubleConv(128, 256))
        
        self.up1 = nn.ConvTranspose2d(256, 128, kernel_size=2, stride=2)
        self.conv_up1 = DoubleConv(256, 128)
        
        self.up2 = nn.ConvTranspose2d(128, 64, kernel_size=2, stride=2)
        self.conv_up2 = DoubleConv(128, 64)
        
        self.outc = nn.Conv2d(64, num_classes, kernel_size=1)

    def forward(self, x):
        x1 = self.inc(x)
        x2 = self.down1(x1)
        x3 = self.down2(x2)
        
        u1 = self.up1(x3)
        # Handle shape differences if dimensions are not divisible by 4
        diffY = x2.size()[2] - u1.size()[2]
        diffX = x2.size()[3] - u1.size()[3]
        u1 = F.pad(u1, [diffX // 2, diffX - diffX // 2, diffY // 2, diffY - diffY // 2])
        x_concat1 = torch.cat([x2, u1], dim=1)
        x_up1 = self.conv_up1(x_concat1)
        
        u2 = self.up2(x_up1)
        diffY = x1.size()[2] - u2.size()[2]
        diffX = x1.size()[3] - u2.size()[3]
        u2 = F.pad(u2, [diffX // 2, diffX - diffX // 2, diffY // 2, diffY - diffY // 2])
        x_concat2 = torch.cat([x1, u2], dim=1)
        x_up2 = self.conv_up2(x_concat2)
        
        logits = self.outc(x_up2)
        return logits

    def get_last_conv_layer(self):
        return self.conv_up2.double_conv[-3]


class DynamicAnomalyDetector(nn.Module):
    """
    Convolutional Autoencoder for unsupervised anomaly detection.
    Reconstructs input image. Normal images reconstruct perfectly, 
    while anomalies (scratches, cracks) yield high reconstruction error.
    """
    def __init__(self, in_channels: int = 3):
        super(DynamicAnomalyDetector, self).__init__()
        
        # Encoder
        self.encoder = nn.Sequential(
            nn.Conv2d(in_channels, 32, kernel_size=3, stride=2, padding=1),  # B, 32, H/2, W/2
            nn.ReLU(True),
            nn.Conv2d(32, 64, kernel_size=3, stride=2, padding=1),          # B, 64, H/4, W/4
            nn.ReLU(True),
            nn.Conv2d(64, 128, kernel_size=3, stride=2, padding=1),         # B, 128, H/8, W/8
            nn.ReLU(True)
        )
        
        # Decoder
        self.decoder = nn.Sequential(
            nn.ConvTranspose2d(128, 64, kernel_size=3, stride=2, padding=1, output_padding=1), # B, 64, H/4, W/4
            nn.ReLU(True),
            nn.ConvTranspose2d(64, 32, kernel_size=3, stride=2, padding=1, output_padding=1),  # B, 32, H/2, W/2
            nn.ReLU(True),
            nn.ConvTranspose2d(32, in_channels, kernel_size=3, stride=2, padding=1, output_padding=1), # B, in_channels, H, W
            nn.Sigmoid()  # Output pixel range is [0, 1]
        )

    def forward(self, x):
        latent = self.encoder(x)
        reconstruction = self.decoder(latent)
        return reconstruction
