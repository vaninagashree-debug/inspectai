# VisionGuard AI - Developer Guide

Welcome to the VisionGuard AI developer guide. This document provides setup guidelines, programming styles, and instruction on how to extend the platform.

---

## 1. Development Guidelines

To maintain code health and reliability, developers must adhere to the following principles:

1. **Keep Configurations Dynamic**: Never introduce hardcoded categories, thresholds, or system variables. Always fetch parameters from the database or discover classes dynamically from the filesystem structure.
2. **SOLID Conformity**: Keep operations decoupled. Avoid bundling OpenCV calculations with API routers or mixing database schemas with PyTorch backpropagation.
3. **Asynchronous Databases**: Database interaction in FastAPI routers must use async execution (`select()`, `await db.commit()`) to prevent route bottlenecks during training runs.
4. **Offline Resilience**: Do not import any cloud-hosted API dependencies (OpenAI, Gemini, Azure). Ensure all image processes run locally.

---

## 2. Extending the CV/ML Engines

### 2.1 Adding a Preprocessing Filter
To introduce a new image filter (e.g. Sobel edge detection):
1. Add the mathematical routine to `CVProcessor` inside `cv_engine/cv_processor.py`.
2. Add a matching toggle trigger key to the preprocess config parameters.

### 2.2 Adding a New Deep Learning Model Type
To introduce a new architecture (e.g., Vision Transformers for classification):
1. Define the network in `ml_engine/models.py`, inheriting from `torch.nn.Module`. Make sure the output layer maps to a dynamic `num_classes` parameter.
2. Update the `get_model` selector in `ml_engine/trainer.py` to route to your new class.
3. Hook the final convolutional layer or projection query inside the `get_last_conv_layer` method to preserve Grad-CAM capabilities.
