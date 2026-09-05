import torch
import torch.nn.functional as F
import numpy as np
import cv2
import os

class Explainer:
    """
    Explainable AI (XAI) engine. Provides:
    1. Grad-CAM for visualizing active convolutional layer regions.
    2. Perturbation Analysis (LIME/SHAP style grid importance).
    """

    @staticmethod
    def generate_grad_cam(model: torch.nn.Module, input_tensor: torch.Tensor, target_class: int, last_conv_layer: torch.nn.Module) -> np.ndarray:
        """
        Generates a Grad-CAM heatmap for a target class using the specified convolutional layer.
        """
        model.eval()
        
        # Placeholders for gradients and activations
        gradients = []
        activations = []

        def save_gradient(grad):
            gradients.append(grad)

        def save_activation(module, input, output):
            activations.append(output)

        # Register hooks
        hook_a = last_conv_layer.register_forward_hook(save_activation)
        hook_g = last_conv_layer.register_backward_hook(lambda m, i, o: save_gradient(o[0]))

        try:
            # Forward pass
            outputs = model(input_tensor)
            if isinstance(outputs, tuple):
                # For detector which outputs (class_logits, box_preds, conf_preds)
                outputs = outputs[0]
                
            model.zero_grad()
            
            # Target output score
            score = outputs[0, target_class]
            score.backward()
            
            # Extract features and gradients
            grads_val = gradients[0].cpu().data.numpy()
            features_val = activations[0].cpu().data.numpy()
            
            # Average gradients spatially to get channel weights
            weights = np.mean(grads_val, axis=(2, 3))[0]
            
            # Weighted combination of channels
            cam = np.zeros(features_val.shape[2:], dtype=np.float32)
            for i, w in enumerate(weights):
                cam += w * features_val[0, i, :, :]
                
            # Apply ReLU
            cam = np.maximum(cam, 0)
            
            # Normalize between 0 and 1
            if np.max(cam) > 0:
                cam = cam / np.max(cam)
                
            return cam
        finally:
            # Always remove hooks to prevent memory leaks
            hook_a.remove()
            hook_g.remove()

    @staticmethod
    def generate_perturbation_map(model: torch.nn.Module, input_tensor: torch.Tensor, target_class: int, grid_size: int = 8) -> np.ndarray:
        """
        Computes LIME/SHAP style feature importance by masking spatial regions (perturbations)
        and tracking drops in prediction confidence.
        """
        model.eval()
        
        # Get baseline prediction probability
        with torch.no_grad():
            base_output = model(input_tensor)
            if isinstance(base_output, tuple):
                base_output = base_output[0]
            base_prob = F.softmax(base_output, dim=1)[0, target_class].item()

        _, _, H, W = input_tensor.shape
        cell_h, cell_w = H // grid_size, W // grid_size
        
        importance_grid = np.zeros((grid_size, grid_size), dtype=np.float32)

        for r in range(grid_size):
            for c in range(grid_size):
                # Apply mask to target cell
                perturbed_tensor = input_tensor.clone()
                y_start, y_end = r * cell_h, (r + 1) * cell_h
                x_start, x_end = c * cell_w, (c + 1) * cell_w
                
                # Replace with zero or average value
                perturbed_tensor[:, :, y_start:y_end, x_start:x_end] = 0.0
                
                # Run prediction
                with torch.no_grad():
                    outputs = model(perturbed_tensor)
                    if isinstance(outputs, tuple):
                        outputs = outputs[0]
                    prob = F.softmax(outputs, dim=1)[0, target_class].item()
                    
                # Loss/drop in probability indicates importance
                prob_drop = base_prob - prob
                importance_grid[r, c] = max(prob_drop, 0)

        # Normalize grid
        if np.max(importance_grid) > 0:
            importance_grid = importance_grid / np.max(importance_grid)
            
        return importance_grid

    @classmethod
    def save_explanation_overlays(cls, original_image_path: str, heatmap: np.ndarray, save_path: str, overlay_alpha: float = 0.5):
        """
        Applies cv2 colormap to a heatmap and overlays it on the original image. Saves the result.
        """
        if not os.path.exists(original_image_path):
            raise FileNotFoundError(f"Original image not found at {original_image_path}")
            
        img = cv2.imread(original_image_path)
        H, W, _ = img.shape
        
        # Resize heatmap to match image size
        heatmap_resized = cv2.resize(heatmap, (W, H))
        heatmap_uint8 = np.uint8(255 * heatmap_resized)
        
        # Apply colormap (JET or VIRIDIS)
        color_heatmap = cv2.applyColorMap(heatmap_uint8, cv2.COLORMAP_JET)
        
        # Blend original image and heatmap
        overlay = cv2.addWeighted(img, 1.0 - overlay_alpha, color_heatmap, overlay_alpha, 0)
        
        # Save output
        os.makedirs(os.path.dirname(save_path), exist_ok=True)
        cv2.imwrite(save_path, overlay)
        return save_path
