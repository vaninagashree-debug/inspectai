# VisionGuard AI - Database Documentation

This document describes the SQLAlchemy declarative models and SQLite schema mappings for the VisionGuard AI platform.

---

## 1. Database Table Schemas

### 1.1 `users` Table
Stores authentication details and user roles (RBAC).

| Field | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | INTEGER | Primary Key, Index | Unique Identifier |
| `username` | VARCHAR | Unique, Index, Nullable=False | User login ID |
| `hashed_password` | VARCHAR | Nullable=False | Bcrypt encrypted credentials |
| `full_name` | VARCHAR | Nullable=True | User screen name |
| `role` | VARCHAR | Default="Quality Inspector" | Admin, Engineer, Quality Inspector, Manager |
| `created_at` | DATETIME | Default=UtcNow | Row insertion time |

### 1.2 `datasets` Table
Registers uploaded image sets.

| Field | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | INTEGER | Primary Key, Index | Unique Identifier |
| `name` | VARCHAR | Unique, Index, Nullable=False | Dataset visual name |
| `task_type` | VARCHAR | Nullable=False | classification, object_detection, etc. |
| `path` | VARCHAR | Nullable=False | Absolute directory path on disk |
| `classes` | JSON | Default=[] | List of categories discovered |
| `metadata_info` | JSON | Default={} | Image counts, splits, dimensions |
| `created_at` | DATETIME | Default=UtcNow | Upload timestamp |

### 1.3 `models` Table
Tracks training metrics and weight storage versions.

| Field | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | INTEGER | Primary Key, Index | Unique Identifier |
| `dataset_id` | INTEGER | Foreign Key (`datasets.id`) | Origin dataset reference |
| `name` | VARCHAR | Nullable=False | Model name |
| `version` | INTEGER | Default=1 | Auto-incrementing version number |
| `task_type` | VARCHAR | Nullable=False | Copy of dataset task type |
| `path` | VARCHAR | Nullable=False | Target weights storage path (`.pt`) |
| `metrics` | JSON | Default={} | Acc, Precision, Recall, curves curves |
| `status` | VARCHAR | Default="training" | training, optimizing, active, error |
| `hyperparameters`| JSON | Default={} | Batches, learning rate, trials parameters |
| `is_production` | BOOLEAN | Default=False | Active production inference model flag |
| `created_at` | DATETIME | Default=UtcNow | Creation time |

### 1.4 `quality_rules` Table
Parameters for PASS/FAIL decisions.

| Field | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | INTEGER | Primary Key, Index | Unique Identifier |
| `name` | VARCHAR | Nullable=False | Quality check label |
| `task_type` | VARCHAR | Nullable=False | classification, object_detection, etc. |
| `class_name` | VARCHAR | Nullable=False | Targets specific class or "all" |
| `operator` | VARCHAR | Nullable=False | `>`, `<`, `==`, `>=`, `<=` |
| `threshold` | FLOAT | Nullable=False | Minimum metric limit |
| `severity` | VARCHAR | Default="Medium" | Low, Medium, High, Critical |
| `is_active` | BOOLEAN | Default=True | Enabled flag |

### 1.5 `inspections` Table
Real-time inspection logs.

| Field | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | INTEGER | Primary Key, Index | Unique Identifier |
| `model_id` | INTEGER | Foreign Key (`models.id`) | Evaluator model reference |
| `image_path` | VARCHAR | Nullable=False | Log image file path on server |
| `predictions` | JSON | Default={} | Outputs, coords, XAI map references |
| `quality_score` | FLOAT | Default=100.0 | Calculated score (0.0 to 100.0) |
| `status` | VARCHAR | Nullable=False | PASS, FAIL |
| `severity` | VARCHAR | Default="None" | Rule severity triggered |
| `inspector_id` | INTEGER | Foreign Key (`users.id`) | Submitting user ID |
| `created_at` | DATETIME | Default=UtcNow | Execution time |

---

## 2. Seeded Configurations

Default rules, user profiles, system preferences, and camera specifications are automatically injected on backend application startup.
