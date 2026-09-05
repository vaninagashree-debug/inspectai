import unittest
import torch
import numpy as np
import sys
import os

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from ml_engine.models import DynamicClassifier, DynamicDetector, DynamicSegmenter, DynamicAnomalyDetector
from ml_engine.explainer import Explainer

class TestMLComponents(unittest.TestCase):
    def setUp(self):
        # Sample tensor representing standard preprocessed image batch (batch_size=2, channels=3, H=224, W=224)
        self.sample_batch = torch.randn(2, 3, 224, 224)

    def test_dynamic_classifier(self):
        # Initialize with 5 classes
        model = DynamicClassifier(num_classes=5)
        out = model(self.sample_batch)
        self.assertEqual(out.shape, (2, 5))
        
        # Test hook retrieval
        conv = model.get_last_conv_layer()
        self.assertIsNotNone(conv)

    def test_dynamic_detector(self):
        # Initialize with 3 classes
        model = DynamicDetector(num_classes=3)
        classes, boxes, conf = model(self.sample_batch)
        self.assertEqual(classes.shape, (2, 3))
        self.assertEqual(boxes.shape, (2, 4))
        self.assertEqual(conf.shape, (2, 1))

    def test_dynamic_segmenter(self):
        # Initialize with 4 classes
        model = DynamicSegmenter(num_classes=4)
        out = model(self.sample_batch)
        self.assertEqual(out.shape, (2, 4, 224, 224))

    def test_dynamic_anomaly_detector(self):
        model = DynamicAnomalyDetector()
        out = model(self.sample_batch)
        self.assertEqual(out.shape, (2, 3, 224, 224))

    def test_grad_cam(self):
        model = DynamicClassifier(num_classes=2)
        inp = torch.randn(1, 3, 224, 224, requires_grad=True)
        conv_layer = model.get_last_conv_layer()
        
        cam = Explainer.generate_grad_cam(model, inp, target_class=1, last_conv_layer=conv_layer)
        # Spatial dimensions should match final layer feature map or be resized
        self.assertTrue(len(cam.shape) == 2)
        self.assertTrue(np.max(cam) <= 1.0)
        self.assertTrue(np.min(cam) >= 0.0)

    def test_perturbation_map(self):
        model = DynamicClassifier(num_classes=3)
        inp = torch.randn(1, 3, 224, 224)
        
        pert = Explainer.generate_perturbation_map(model, inp, target_class=0, grid_size=4)
        self.assertEqual(pert.shape, (4, 4))
        self.assertTrue(np.max(pert) <= 1.0)
        self.assertTrue(np.min(pert) >= 0.0)

if __name__ == '__main__':
    unittest.main()
