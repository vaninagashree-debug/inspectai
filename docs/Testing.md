# VisionGuard AI - Quality Assurance & Testing Guide

This document describes how to execute the automated test suites to verify backend, computer vision, and machine learning components.

---

## 1. Prerequisites
Ensure you have activated the virtual environment and installed the requirements:
```bash
.venv\Scripts\activate
pip install pytest httpx
```

---

## 2. Test Architecture

The automated tests are located in the `tests/` directory:
1. `tests/test_cv.py`: Unit tests for OpenCV image modifications (Gaussian blurs, CLAHE contrast adjustments, standardizing pixel normalization, and image flip augmentations).
2. `tests/test_ml.py`: Unit tests for PyTorch models (conformance, forward execution sizing, Grad-CAM attention visualizers, and perturbation analyzers).
3. `tests/test_api.py`: Integration tests for FastAPI (JWT sign-in, role checking, quality rule operations, and summary endpoints).

---

## 3. Execution Commands

### 3.1 Run All Tests
To execute all suites inside the virtual environment:
```bash
pytest -v
```

### 3.2 Run Computer Vision Tests Only
To test OpenCV preprocessing:
```bash
pytest -v tests/test_cv.py
```

### 3.3 Run Model Architecture Tests Only
To test PyTorch dimensions and Grad-CAM:
```bash
pytest -v tests/test_ml.py
```

### 3.4 Run REST API Route Tests Only
To test FastAPI routers and JWT:
```bash
pytest -v tests/test_api.py
```
