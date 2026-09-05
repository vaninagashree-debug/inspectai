import cv2
import numpy as np
from PIL import Image
import os
import io

class CVProcessor:
    """
    Handles image validation, noise removal, contrast enhancement, 
    normalization, and data augmentation dynamically based on rules/configurations.
    """
    
    @staticmethod
    def validate_image(image_bytes: bytes) -> dict:
        """
        Validates if uploaded bytes represent a valid image.
        Returns metadata (width, height, format, mode) if valid, raises ValueError otherwise.
        """
        try:
            img = Image.open(io.BytesIO(image_bytes))
            img.verify()
            
            # Re-open because verify() closes the file pointer
            img = Image.open(io.BytesIO(image_bytes))
            return {
                "valid": True,
                "width": img.width,
                "height": img.height,
                "format": img.format,
                "mode": img.mode,
                "channels": len(img.getbands())
            }
        except Exception as e:
            raise ValueError(f"Invalid image file: {str(e)}")

    @staticmethod
    def remove_noise(img: np.ndarray, method: str = "gaussian", kernel_size: int = 5) -> np.ndarray:
        """
        Removes noise from the image using specified method: 'gaussian', 'median', or 'bilateral'.
        """
        if kernel_size % 2 == 0:
            kernel_size += 1  # Kernel sizes must be odd
            
        if method == "gaussian":
            return cv2.GaussianBlur(img, (kernel_size, kernel_size), 0)
        elif method == "median":
            return cv2.medianBlur(img, kernel_size)
        elif method == "bilateral":
            # Bilateral filter needs 3-channel or 1-channel 8-bit image
            d = kernel_size * 2
            return cv2.bilateralFilter(img, d, 75, 75)
        return img

    @staticmethod
    def enhance_contrast(img: np.ndarray, method: str = "clahe", clip_limit: float = 2.0, grid_size: int = 8) -> np.ndarray:
        """
        Enhances image contrast using CLAHE or global histogram equalization.
        Works for both grayscale and color (BGR) images.
        """
        is_color = len(img.shape) == 3 and img.shape[2] == 3
        
        if method == "clahe":
            clahe = cv2.createCLAHE(clipLimit=clip_limit, tileGridSize=(grid_size, grid_size))
            if is_color:
                # Convert to LAB space to equalize only luminosity channel
                lab = cv2.cvtColor(img, cv2.COLOR_BGR2LAB)
                l, a, b = cv2.split(lab)
                cl = clahe.apply(l)
                limg = cv2.merge((cl, a, b))
                return cv2.cvtColor(limg, cv2.COLOR_LAB2BGR)
            else:
                return clahe.apply(img)
                
        elif method == "equalize":
            if is_color:
                ycrcb = cv2.cvtColor(img, cv2.COLOR_BGR2YCrCb)
                y, cr, cb = cv2.split(ycrcb)
                y_eq = cv2.equalizeHist(y)
                yimg = cv2.merge((y_eq, cr, cb))
                return cv2.cvtColor(yimg, cv2.COLOR_YCrCb2BGR)
            else:
                return cv2.equalizeHist(img)
                
        return img

    @staticmethod
    def normalize(img: np.ndarray, target_size: tuple = (224, 224)) -> np.ndarray:
        """
        Resizes and scales pixel values to [0, 1].
        """
        resized = cv2.resize(img, target_size)
        normalized = resized.astype(np.float32) / 255.0
        return normalized

    @classmethod
    def preprocess_image(cls, image_path: str, config: dict) -> np.ndarray:
        """
        Full configurable image preprocessing pipeline.
        
        config keys:
            - target_size: tuple (default (224, 224))
            - noise_method: str ('gaussian', 'median', 'bilateral', or None)
            - noise_kernel: int (default 5)
            - contrast_method: str ('clahe', 'equalize', or None)
            - clahe_clip: float (default 2.0)
            - clahe_grid: int (default 8)
        """
        if not os.path.exists(image_path):
            raise FileNotFoundError(f"Image not found at: {image_path}")
            
        img = cv2.imread(image_path)
        if img is None:
            raise ValueError(f"Could not decode image at: {image_path}")
            
        # 1. Noise removal
        noise_method = config.get("noise_method")
        if noise_method:
            kernel = config.get("noise_kernel", 5)
            img = cls.remove_noise(img, method=noise_method, kernel_size=kernel)
            
        # 2. Contrast enhancement
        contrast_method = config.get("contrast_method")
        if contrast_method:
            clip = config.get("clahe_clip", 2.0)
            grid = config.get("clahe_grid", 8)
            img = cls.enhance_contrast(img, method=contrast_method, clip_limit=clip, grid_size=grid)
            
        # 3. Normalization & resizing
        target_size = config.get("target_size", (224, 224))
        img_norm = cls.normalize(img, target_size=target_size)
        
        return img_norm

    @staticmethod
    def apply_augmentation(img: np.ndarray, actions: list) -> np.ndarray:
        """
        Applies a list of data augmentation actions on an image.
        Supported actions: 'flip_h', 'flip_v', 'rotate_90', 'rotate_180', 'rotate_270', 'brightness'
        """
        augmented = img.copy()
        for action in actions:
            if action == 'flip_h':
                augmented = cv2.flip(augmented, 1)
            elif action == 'flip_v':
                augmented = cv2.flip(augmented, 0)
            elif action == 'rotate_90':
                augmented = cv2.rotate(augmented, cv2.ROTATE_90_CLOCKWISE)
            elif action == 'rotate_180':
                augmented = cv2.rotate(augmented, cv2.ROTATE_180)
            elif action == 'rotate_270':
                augmented = cv2.rotate(augmented, cv2.ROTATE_90_COUNTERCLOCKWISE)
            elif action == 'brightness':
                # Shift brightness randomly
                value = np.random.uniform(0.8, 1.2)
                hsv = cv2.cvtColor(augmented, cv2.COLOR_BGR2HSV)
                hsv = np.array(hsv, dtype=np.float64)
                hsv[:, :, 2] = hsv[:, :, 2] * value
                hsv[:, :, 2][hsv[:, :, 2] > 255] = 255
                hsv = np.array(hsv, dtype=np.uint8)
                augmented = cv2.cvtColor(hsv, cv2.COLOR_HSV2BGR)
        return augmented
