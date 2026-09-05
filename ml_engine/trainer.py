import os
import time
import json
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import Dataset, DataLoader
import numpy as np
from PIL import Image
import optuna
import cv2

# Import custom architectures
from .models import DynamicClassifier, DynamicDetector, DynamicSegmenter, DynamicAnomalyDetector
from cv_engine.cv_processor import CVProcessor

# Device configuration
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

# --- CUSTOM DATASETS ---

class ClassificationDataset(Dataset):
    def __init__(self, root_dir, class_to_idx, target_size=(224, 224), augment=False, preprocess_config=None):
        self.root_dir = root_dir
        self.target_size = target_size
        self.augment = augment
        self.preprocess_config = preprocess_config or {}
        self.class_to_idx = class_to_idx
        
        self.samples = []
        for class_name, idx in class_to_idx.items():
            class_path = os.path.join(root_dir, class_name)
            if os.path.isdir(class_path):
                for img_name in os.listdir(class_path):
                    if img_name.lower().endswith(('.png', '.jpg', '.jpeg', '.webp')):
                        self.samples.append((os.path.join(class_path, img_name), idx))

    def __len__(self):
        return len(self.samples)

    def __getitem__(self, idx):
        img_path, label = self.samples[idx]
        try:
            # Load & Preprocess
            img = CVProcessor.preprocess_image(img_path, self.preprocess_config)
            
            # Apply Augmentation
            if self.augment:
                img = CVProcessor.apply_augmentation(img, ['flip_h', 'brightness'])
                
            # Convert to PyTorch Tensor: shape (C, H, W)
            img_tensor = torch.from_numpy(img).permute(2, 0, 1).float()
            return img_tensor, label
        except Exception as e:
            # Fallback for corrupted images
            return torch.zeros((3, self.target_size[0], self.target_size[1])), label


class DetectionDataset(Dataset):
    def __init__(self, images_dir, labels_dir, class_to_idx, target_size=(224, 224), augment=False, preprocess_config=None):
        self.images_dir = images_dir
        self.labels_dir = labels_dir
        self.class_to_idx = class_to_idx
        self.target_size = target_size
        self.augment = augment
        self.preprocess_config = preprocess_config or {}
        
        self.image_files = [f for f in os.listdir(images_dir) if f.lower().endswith(('.png', '.jpg', '.jpeg', '.webp'))]

    def __len__(self):
        return len(self.image_files)

    def __getitem__(self, idx):
        img_name = self.image_files[idx]
        img_path = os.path.join(self.images_dir, img_name)
        
        # Determine label file (replace extension with .txt)
        base_name = os.path.splitext(img_name)[0]
        label_path = os.path.join(self.labels_dir, f"{base_name}.txt")
        
        # Load & Preprocess Image
        img = CVProcessor.preprocess_image(img_path, self.preprocess_config)
        img_tensor = torch.from_numpy(img).permute(2, 0, 1).float()
        
        # Standard default bounding box (full image, background class)
        box = torch.tensor([0.0, 0.0, 1.0, 1.0])
        label = 0
        conf = 0.0 # Bounding box is background unless label exists
        
        if os.path.exists(label_path):
            try:
                with open(label_path, 'r') as f:
                    lines = f.readlines()
                    if len(lines) > 0:
                        parts = lines[0].strip().split()
                        if len(parts) >= 5:
                            # YOLO format: class_idx, x_center, y_center, width, height
                            label = int(parts[0])
                            box = torch.tensor([float(parts[1]), float(parts[2]), float(parts[3]), float(parts[4])])
                            conf = 1.0
            except Exception:
                pass
                
        return img_tensor, (label, box, conf)


class SegmentationDataset(Dataset):
    def __init__(self, images_dir, masks_dir, num_classes, target_size=(224, 224), augment=False, preprocess_config=None):
        self.images_dir = images_dir
        self.masks_dir = masks_dir
        self.num_classes = num_classes
        self.target_size = target_size
        self.augment = augment
        self.preprocess_config = preprocess_config or {}
        
        self.image_files = [f for f in os.listdir(images_dir) if f.lower().endswith(('.png', '.jpg', '.jpeg', '.webp'))]

    def __len__(self):
        return len(self.image_files)

    def __getitem__(self, idx):
        img_name = self.image_files[idx]
        img_path = os.path.join(self.images_dir, img_name)
        
        # Preprocess Image
        img = CVProcessor.preprocess_image(img_path, self.preprocess_config)
        img_tensor = torch.from_numpy(img).permute(2, 0, 1).float()
        
        # Look for corresponding mask image
        base_name = os.path.splitext(img_name)[0]
        mask_path = None
        for ext in ['.png', '.jpg', '.jpeg', '.webp']:
            test_path = os.path.join(self.masks_dir, f"{base_name}{ext}")
            if os.path.exists(test_path):
                mask_path = test_path
                break
                
        # Generate segmentation mask
        if mask_path:
            mask_img = cv2.imread(mask_path, cv2.IMREAD_GRAYSCALE)
            mask_img = cv2.resize(mask_img, self.target_size, interpolation=cv2.INTER_NEAREST)
            # Clip mask values to fit within num_classes-1
            mask_img[mask_img >= self.num_classes] = self.num_classes - 1
            mask_tensor = torch.from_numpy(mask_img).long()
        else:
            mask_tensor = torch.zeros(self.target_size, dtype=torch.long)
            
        return img_tensor, mask_tensor


class AnomalyDataset(Dataset):
    """
    For unsupervised training: load only normal images for training/validation.
    """
    def __init__(self, root_dir, target_size=(224, 224), augment=False, preprocess_config=None):
        self.root_dir = root_dir
        self.target_size = target_size
        self.augment = augment
        self.preprocess_config = preprocess_config or {}
        
        self.samples = []
        if os.path.exists(root_dir):
            for img_name in os.listdir(root_dir):
                if img_name.lower().endswith(('.png', '.jpg', '.jpeg', '.webp')):
                    self.samples.append(os.path.join(root_dir, img_name))

    def __len__(self):
        return len(self.samples)

    def __getitem__(self, idx):
        img_path = self.samples[idx]
        try:
            img = CVProcessor.preprocess_image(img_path, self.preprocess_config)
            if self.augment:
                img = CVProcessor.apply_augmentation(img, ['flip_h', 'flip_v'])
            img_tensor = torch.from_numpy(img).permute(2, 0, 1).float()
            return img_tensor, img_tensor # target is the image itself (autoencoder)
        except Exception:
            return torch.zeros((3, self.target_size[0], self.target_size[1])), torch.zeros((3, self.target_size[0], self.target_size[1]))


# --- DYNAMIC TRAINER WITH OPTUNA ---

class DynamicTrainer:
    def __init__(self, dataset_path: str, task_type: str, model_save_path: str, classes: list, preprocess_config: dict = None):
        self.dataset_path = dataset_path
        self.task_type = task_type
        self.model_save_path = model_save_path
        self.classes = classes
        self.num_classes = len(classes)
        self.preprocess_config = preprocess_config or {
            "target_size": (224, 224),
            "noise_method": "gaussian",
            "contrast_method": "clahe"
        }
        
        self.class_to_idx = {cls: idx for idx, cls in enumerate(classes)}

    def prepare_data_loaders(self, batch_size=16, split_ratio=0.8):
        """
        Loads datasets and creates training and validation DataLoaders.
        """
        # Create standard folders based on dataset structure
        if self.task_type == "classification":
            train_dir = os.path.join(self.dataset_path, "train")
            val_dir = os.path.join(self.dataset_path, "val")
            
            # Check if validation directory exists, otherwise do random split on train directory
            if not os.path.exists(val_dir):
                full_dataset = ClassificationDataset(train_dir, self.class_to_idx, augment=True, preprocess_config=self.preprocess_config)
                train_size = int(split_ratio * len(full_dataset))
                val_size = len(full_dataset) - train_size
                train_dataset, val_dataset = torch.utils.data.random_split(full_dataset, [train_size, val_size])
            else:
                train_dataset = ClassificationDataset(train_dir, self.class_to_idx, augment=True, preprocess_config=self.preprocess_config)
                val_dataset = ClassificationDataset(val_dir, self.class_to_idx, augment=False, preprocess_config=self.preprocess_config)

        elif self.task_type == "object_detection":
            images_dir = os.path.join(self.dataset_path, "images")
            labels_dir = os.path.join(self.dataset_path, "labels")
            
            full_dataset = DetectionDataset(images_dir, labels_dir, self.class_to_idx, augment=True, preprocess_config=self.preprocess_config)
            train_size = int(split_ratio * len(full_dataset))
            val_size = len(full_dataset) - train_size
            train_dataset, val_dataset = torch.utils.data.random_split(full_dataset, [train_size, val_size])

        elif self.task_type == "segmentation":
            images_dir = os.path.join(self.dataset_path, "images")
            masks_dir = os.path.join(self.dataset_path, "masks")
            
            full_dataset = SegmentationDataset(images_dir, masks_dir, self.num_classes, augment=True, preprocess_config=self.preprocess_config)
            train_size = int(split_ratio * len(full_dataset))
            val_size = len(full_dataset) - train_size
            train_dataset, val_dataset = torch.utils.data.random_split(full_dataset, [train_size, val_size])

        elif self.task_type == "anomaly_detection":
            train_dir = os.path.join(self.dataset_path, "train", "normal")
            val_dir = os.path.join(self.dataset_path, "val", "normal")
            
            if not os.path.exists(val_dir):
                full_dataset = AnomalyDataset(train_dir, augment=True, preprocess_config=self.preprocess_config)
                train_size = int(split_ratio * len(full_dataset))
                val_size = len(full_dataset) - train_size
                train_dataset, val_dataset = torch.utils.data.random_split(full_dataset, [train_size, val_size])
            else:
                train_dataset = AnomalyDataset(train_dir, augment=True, preprocess_config=self.preprocess_config)
                val_dataset = AnomalyDataset(val_dir, augment=False, preprocess_config=self.preprocess_config)
        else:
            raise ValueError(f"Unknown task type: {self.task_type}")

        train_loader = DataLoader(train_dataset, batch_size=batch_size, shuffle=True, drop_last=True)
        val_loader = DataLoader(val_dataset, batch_size=batch_size, shuffle=False)
        
        return train_loader, val_loader

    def get_model(self):
        """
        Dynamically initializes the model depending on task type.
        """
        if self.task_type == "classification":
            return DynamicClassifier(num_classes=self.num_classes)
        elif self.task_type == "object_detection":
            return DynamicDetector(num_classes=self.num_classes)
        elif self.task_type == "segmentation":
            return DynamicSegmenter(num_classes=self.num_classes)
        elif self.task_type == "anomaly_detection":
            return DynamicAnomalyDetector()
        else:
            raise ValueError(f"Unknown task type: {self.task_type}")

    def compute_loss(self, model, batch, criterion):
        """
        Helper to compute loss dynamically based on task type.
        """
        if self.task_type == "classification":
            inputs, labels = batch
            inputs, labels = inputs.to(device), labels.to(device)
            outputs = model(inputs)
            loss = criterion(outputs, labels)
            return loss, outputs, labels

        elif self.task_type == "object_detection":
            inputs, (labels, boxes, confs) = batch
            inputs = inputs.to(device)
            labels = labels.to(device)
            boxes = boxes.to(device)
            confs = confs.to(device)
            
            class_logits, box_preds, conf_preds = model(inputs)
            
            # Loss definitions
            cls_loss = criterion(class_logits, labels)
            box_loss = F.mse_loss(box_preds, boxes, reduction='none').mean(dim=1)
            box_loss = (box_loss * confs).mean() # Apply loss only where objects exist
            conf_loss = F.binary_cross_entropy(conf_preds.squeeze(), confs, reduction='mean')
            
            total_loss = cls_loss + 2.0 * box_loss + 1.0 * conf_loss
            return total_loss, class_logits, labels

        elif self.task_type == "segmentation":
            inputs, masks = batch
            inputs, masks = inputs.to(device), masks.to(device)
            outputs = model(inputs)
            loss = criterion(outputs, masks)
            return loss, outputs, masks

        elif self.task_type == "anomaly_detection":
            inputs, targets = batch
            inputs, targets = inputs.to(device), targets.to(device)
            reconstruction = model(inputs)
            loss = criterion(reconstruction, targets)
            return loss, reconstruction, targets

    def run_training_loop(self, lr=1e-3, batch_size=16, epochs=5, on_epoch_callback=None):
        """
        Standard PyTorch training execution.
        """
        train_loader, val_loader = self.prepare_data_loaders(batch_size=batch_size)
        model = self.get_model().to(device)
        
        # Optimizers & Loss criterion definitions
        optimizer = optim.Adam(model.parameters(), lr=lr)
        scheduler = optim.lr_scheduler.ReduceLROnPlateau(optimizer, mode='min', factor=0.5, patience=2)
        
        if self.task_type == "classification":
            criterion = nn.CrossEntropyLoss()
        elif self.task_type == "object_detection":
            criterion = nn.CrossEntropyLoss() # Class loss component
        elif self.task_type == "segmentation":
            criterion = nn.CrossEntropyLoss()
        elif self.task_type == "anomaly_detection":
            criterion = nn.MSELoss()
            
        best_val_loss = float('inf')
        history = {"train_loss": [], "val_loss": [], "val_accuracy": []}
        
        scaler = torch.amp.GradScaler('cuda') if torch.cuda.is_available() else None
        
        for epoch in range(epochs):
            model.train()
            train_loss = 0.0
            
            for batch in train_loader:
                optimizer.zero_grad()
                
                if scaler:
                    with torch.amp.autocast('cuda'):
                        loss, _, _ = self.compute_loss(model, batch, criterion)
                    scaler.scale(loss).backward()
                    scaler.step(optimizer)
                    scaler.update()
                else:
                    loss, _, _ = self.compute_loss(model, batch, criterion)
                    loss.backward()
                    optimizer.step()
                    
                train_loss += loss.item() * train_loader.batch_size
                
            train_loss /= len(train_loader.dataset)
            
            # Validation
            model.eval()
            val_loss = 0.0
            correct = 0
            total = 0
            
            with torch.no_grad():
                for batch in val_loader:
                    loss, outputs, targets = self.compute_loss(model, batch, criterion)
                    val_loss += loss.item() * val_loader.batch_size
                    
                    if self.task_type == "classification":
                        _, predicted = torch.max(outputs, 1)
                        total += targets.size(0)
                        correct += (predicted == targets).sum().item()
                    elif self.task_type == "segmentation":
                        # Pixel-wise accuracy
                        _, predicted = torch.max(outputs, 1)
                        total += targets.numel()
                        correct += (predicted == targets).sum().item()
                    elif self.task_type == "object_detection":
                        _, predicted = torch.max(outputs, 1)
                        total += targets.size(0)
                        correct += (predicted == targets).sum().item()
                        
            val_loss /= len(val_loader.dataset)
            scheduler.step(val_loss)
            
            val_acc = (correct / total) if total > 0 else (1.0 - val_loss)
            
            history["train_loss"].append(train_loss)
            history["val_loss"].append(val_loss)
            history["val_accuracy"].append(val_acc)
            
            print(f"Epoch {epoch+1}/{epochs} | Train Loss: {train_loss:.4f} | Val Loss: {val_loss:.4f} | Accuracy: {val_acc:.4f}")
            
            if on_epoch_callback:
                on_epoch_callback(epoch + 1, train_loss, val_loss, val_acc)
                
            # Early Stopping and Checkpointing
            if val_loss < best_val_loss:
                best_val_loss = val_loss
                os.makedirs(os.path.dirname(self.model_save_path), exist_ok=True)
                torch.save(model.state_dict(), self.model_save_path)
                
        return model, history

    def optimize_hyperparameters(self, n_trials=3):
        """
        Uses Optuna to find best Learning Rate and Batch Size.
        """
        def objective(trial):
            lr = trial.suggest_float("lr", 1e-4, 1e-2, log=True)
            batch_size = trial.suggest_categorical("batch_size", [8, 16, 32])
            
            try:
                _, history = self.run_training_loop(lr=lr, batch_size=batch_size, epochs=2)
                return min(history["val_loss"])
            except Exception as e:
                # Return high loss if configuration failed
                return 999.0

        study = optuna.create_study(direction="minimize")
        study.optimize(objective, n_trials=n_trials)
        return study.best_params
