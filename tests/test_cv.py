import unittest
import numpy as np
import cv2
import sys
import os

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from cv_engine.cv_processor import CVProcessor

class TestCVProcessor(unittest.TestCase):
    def setUp(self):
        # Create a mock grayscale and color image
        self.gray_img = np.random.randint(0, 256, (100, 100), dtype=np.uint8)
        self.color_img = np.random.randint(0, 256, (100, 100, 3), dtype=np.uint8)

    def test_noise_removal(self):
        smoothed_g = CVProcessor.remove_noise(self.gray_img, method="gaussian", kernel_size=3)
        self.assertEqual(smoothed_g.shape, (100, 100))
        
        smoothed_m = CVProcessor.remove_noise(self.gray_img, method="median", kernel_size=3)
        self.assertEqual(smoothed_m.shape, (100, 100))
        
        smoothed_b = CVProcessor.remove_noise(self.color_img, method="bilateral", kernel_size=3)
        self.assertEqual(smoothed_b.shape, (100, 100, 3))

    def test_contrast_enhancement(self):
        enhanced_clahe = CVProcessor.enhance_contrast(self.gray_img, method="clahe")
        self.assertEqual(enhanced_clahe.shape, (100, 100))
        
        enhanced_eq = CVProcessor.enhance_contrast(self.color_img, method="equalize")
        self.assertEqual(enhanced_eq.shape, (100, 100, 3))

    def test_normalization(self):
        norm = CVProcessor.normalize(self.color_img, target_size=(224, 224))
        self.assertEqual(norm.shape, (224, 224, 3))
        self.assertTrue(norm.dtype == np.float32)
        self.assertTrue(np.max(norm) <= 1.0)
        self.assertTrue(np.min(norm) >= 0.0)

    def test_augmentation(self):
        flipped = CVProcessor.apply_augmentation(self.color_img, ['flip_h', 'flip_v'])
        self.assertEqual(flipped.shape, (100, 100, 3))

if __name__ == '__main__':
    unittest.main()
