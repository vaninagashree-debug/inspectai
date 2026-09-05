# VisionGuard AI - API Documentation

The VisionGuard AI backend exposes REST API and WebSocket interfaces for client communications. All APIs dynamically load configurations from the active databases and dataset directories.

---

## 1. Authentication (`/api/auth`)

* **POST `/api/auth/register`**
  - Registers a new user with role-based attributes.
  - Body (JSON): `{ "username": "...", "password": "...", "role": "...", "full_name": "..." }`
  - Response: User details object.
* **POST `/api/auth/login`**
  - Validates credentials and returns JWT token.
  - Body (Form Data): `username=...&password=...`
  - Response: `{ "access_token": "...", "token_type": "bearer", "role": "...", "username": "..." }`
* **GET `/api/auth/me`**
  - Fetches the active user profile (Requires Authorization headers).

---

## 2. Dataset Management (`/api/datasets`)

* **POST `/api/datasets/upload`**
  - Uploads a ZIP file and analyzes dataset structure.
  - Form Data: `name=...`, `task_type=...` (classification, object_detection, segmentation, anomaly_detection), `file=@dataset.zip`
  - Response: Dataset metadata, detected categories classes, counts, and sizes.
* **GET `/api/datasets`**
  - Lists all uploaded dataset registry entries.
* **DELETE `/api/datasets/{id}`**
  - Removes a dataset entry and deletes its storage folders from disk.

---

## 3. Model Registry & training (`/api/models`)

* **POST `/api/models/train`**
  - Registers a model and spawns an async background optimization & training task.
  - Query parameters: `dataset_id=...`, `name=...`
* **GET `/api/models`**
  - Lists registered models, versions, and validation metrics (confusion matrix, ROC, PR data).
* **GET `/api/models/progress/{model_id}`**
  - Fetches active training progress (current epoch, loss, accuracy).
* **PUT `/api/models/{id}/production`**
  - Promotes a model version to active production status.
  - Body (JSON): `{ "is_production": true }`

---

## 4. Quality & Alert Rules (`/api/rules`)

* **POST `/api/rules/quality`**
  - Adds a dynamic inspection rule.
  - Body: `{ "name": "...", "task_type": "...", "class_name": "...", "operator": ">", "threshold": 0.8, "severity": "High" }`
* **GET `/api/rules/quality`**
  - Lists active quality criteria rules.
* **PUT `/api/rules/quality/{id}`**
  - Updates rules parameters.
* **DELETE `/api/rules/quality/{id}`**
  - Deletes quality rule.

---

## 5. Inspections & Real-Time Streams (`/api/inspections`)

* **POST `/api/inspections/upload`**
  - Uploads a single frame for visual inspection, running classification, XAI generation, and rule evaluations.
* **POST `/api/inspections/batch`**
  - Uploads a list of image files for batch inspection.
* **GET `/api/inspections`**
  - Lists recent inspection diagnostic records.
* **WS `/api/inspections/ws`**
  - Persistent WebSocket channel. Broadcasts new inspection results as they occur.

---

## 6. Analytics & Exports (`/api/analytics`, `/api/reports`)

* **GET `/api/analytics/summary`**
  - Dynamic overall yields, averages, and severity counts.
* **GET `/api/analytics/trends`**
  - Weekly pass/fail inspection volumes.
* **GET `/api/reports/pdf/{inspection_id}`**
  - Generates and downloads PDF report.
* **GET `/api/reports/excel`**
  - Generates and downloads spreadsheet export.
