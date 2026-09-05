# Software Requirements Specification (SRS) - VisionGuard AI

This document specifies the software requirements for the VisionGuard AI automated quality control image recognition platform.

---

## 1. Product Scope

VisionGuard AI is a dynamic quality control inspection application. The system analyzes raw images, locates defects, evaluates results against database criteria, logs anomalies, and generates inspection reports. The system must operate fully locally with zero external API calls (offline mode).

---

## 2. User Roles & Personas (RBAC)

The platform supports Role-Based Access Control (RBAC) stored in the database. The system seeds three default roles:

1. **Admin**:
   - Access to all configuration parameters, database deletions, user registrations, and system options.
2. **Engineer**:
   - Access to dataset uploads, starting training runs, adjusting camera parameters, and evaluating model metrics.
3. **Quality Inspector**:
   - Access to run single inspections, view real-time streams, drop files to monitor directories, and download PDF reports.
4. **Manager**:
   - Access to operations summary metrics, yield trends, and exporting bulk Excel/CSV records.

---

## 3. Functional Requirements

### 3.1 Dataset Management
- **ZIP Import**: Users can upload ZIP files of classification, detection, segmentation, and anomaly datasets.
- **Auto-Scanning**: System must extract files, detect directories, count samples, calculate average image dimensions, identify formats, and dynamically extract category classes.
- **Versioning**: Maintain versioned directory folders for iterative model retraining.

### 3.2 Dynamic Machine Learning Pipeline
- **Auto-Detection**: Automatically detect dataset task type and construct the appropriate neural network (Classification, Bounding Box Detector, Segmenter, Autoencoder).
- **Hyperparameter Optimization**: Run Optuna optimization trials asynchronously to find optimal learning rates and batch sizes.
- **Training Loops**: Run epochs with mixed precision, early stopping, and validation logging.
- **Explainable AI**: Generate Grad-CAM attention visual overlay images and perturbation-based tile grid maps.

### 3.3 Dynamic Quality Rules Engine
- **Active Rule Sets**: CRUD interface to specify criteria (e.g. Reject if defect category `dent` confidence is greater than `0.70`).
- **Dynamic Yield Analysis**: Calculate PASS/FAIL and overall yield scores by matching active rules to model predictions.

### 3.4 Live QC Streams & WebSockets
- **WebSocket Channel**: Broadcast new quality logs instantly.
- **Folder Monitor Daemon**: Background thread polling a monitoring directory every 2 seconds, running inspections on newly detected images automatically.

### 3.5 Operational Reporting
- **PDF Export**: Generate single inspection report sheets.
- **Bulk CSV / Excel Export**: Compile log records dynamically.

---

## 4. Non-Functional Requirements

1. **Zero Hardcoded Values**: System must dynamically generate chart filters, dashboard labels, target classes, and inspection parameters directly from the uploaded datasets and quality rules table.
2. **Offline Execution**: Zero network requests to cloud inference APIs (OpenAI, Gemini, Hugging Face). All training and inference must execute locally.
3. **Latency Limits**: Image preprocessing and model inference should execute in under 100ms per image.
4. **Platform Responsiveness**: Interactive charts must render with smooth transitions. Screen views must scale responsively across varying screen widths.
