# VisionGuard AI - Enterprise Image Recognition Platform

VisionGuard AI is a production-grade, enterprise-scale AI-powered Image Recognition Platform built for automated quality inspection (Industry 4.0). Utilizing computer vision, deep learning, explainable AI (XAI), and database-driven dynamic configurations, the platform evaluates manufactured products, classifies defects, locates anomalies, and logs inspection analytics in real time without any hardcoded thresholds or product categories.

---

## Key Features

1. **Zero Hardcoded Design**: Dynamic adaptation to newly uploaded datasets, classes, quality control rules, severity thresholds, and dashboard components. No code modifications are needed when adding new product classes or defect types.
2. **Deep Learning Inspection Models**: Custom PyTorch convolutional neural networks for classification, object detection (regression coordinates), semantic segmentation (UNet masks), and unsupervised anomaly detection (Autoencoder).
3. **Automated ML Pipelines**: Optuna optimization hyperparameter tuning runs asynchronously in background execution threads, matching optimal learning rates and batch sizes to uploaded datasets.
4. **Explainable AI (XAI)**: Visualizes model decisions locally via custom Grad-CAM convolutional attention overlays and perturbation-based grid feature importances.
5. **Real-Time Dashboards & Analytics**: React 19 UI featuring side-by-side dashboard tabs (Executive, Quality, Production, AI Engine, Dynamic Curves, Operations, and Live QC monitoring). Connects to a WebSocket stream and folder monitor worker.
6. **Robust Reporting**: Automated generation and download of single inspection PDF reports, bulk CSV databases, and Excel spreadsheets.
7. **Secure RBAC**: JSON Web Token authentication with user roles (`Admin`, `Engineer`, `Quality Inspector`, `Manager`) checking access constraints.

---

## Workspace Layout

```
.
├── frontend/             # React 19 / TypeScript / Vite / Tailwind UI
├── backend/              # FastAPI Application (API, DB models, authentication)
├── ml_engine/            # PyTorch architectures, dynamic trainer, Optuna, Grad-CAM/Perturbation XAI
├── cv_engine/            # Image validation, OpenCV filters, preprocessing pipeline
├── datasets/             # Uploaded classification, detection, segmentation, anomaly datasets
├── models/               # Registered PyTorch models & training checkpoints (.pt)
├── reports/              # Generated reports (PDF, Excel, CSV)
├── uploads/              # Temporary uploads and folder-monitoring source
├── docs/                 # Software requirements, API, DB layout, deployment, and testing docs
├── tests/                # Automated pytest unit, integration, and endpoint tests
├── docker/               # Dockerfile and Docker Compose configurations
└── requirements.txt      # Python dependency manifest
```

---

## Installation & Running Locally

### Backend & ML Setup

1. **Create Python virtual environment**:
   ```bash
   py -m venv .venv
   ```

2. **Activate environment & Install dependencies**:
   ```bash
   .venv\Scripts\activate
   pip install torch torchvision --index-url https://download.pytorch.org/whl/cpu
   pip install -r requirements.txt
   ```

3. **Start FastAPI application**:
   ```bash
   cd backend
   uvicorn main:app --reload --host 127.0.0.1 --port 8000
   ```

### Frontend Setup

1. **Install node dependencies**:
   ```bash
   cd frontend
   npm install
   ```

2. **Start Vite developer server**:
   ```bash
   npm run dev
   ```
   Open `http://localhost:3000` in the browser.

---

## Seeding Default Credentials

When first run, the SQLite database is automatically created and seeded with default user credentials:

| Username | Password | Role |
| :--- | :--- | :--- |
| `admin` | `admin123` | Admin |
| `engineer` | `engineer123` | Engineer |
| `inspector` | `inspector123` | Quality Inspector |
