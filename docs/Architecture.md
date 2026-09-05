# VisionGuard AI - Technical Architecture Document

VisionGuard AI is designed using **SOLID Principles, Domain-Driven Design (DDD), Clean Architecture, Repository Pattern**, and modern enterprise software practices. This document details the software architecture, component relationships, and execution flow.

---

## 1. Architectural Layers

The codebase is strictly separated into independent modular components to ensure loose coupling and testability:

```
+-------------------------------------------------------------+
|                     React 19 Frontend                       |
|           (Presentation Layer / Recharts Charts)            |
+------------------------------+------------------------------+
                               | (HTTP / WebSocket)
+------------------------------v------------------------------+
|                     FastAPI Web Server                      |
|                  (Controller / API Router)                  |
+------------------------------+------------------------------+
                               | (SQLAlchemy Core)
+------------------------------v------------------------------+
|                  Database & Config Registry                 |
|             (Infrastructure / SQLite / Postgres)            |
+------------------------------+------------------------------+
                               | (Dynamic Invocations)
+------------------------------v------------------------------+
|       CV Engine              |         ML Engine            |
|  (OpenCV Preprocessing)      |   (PyTorch training & XAI)   |
+------------------------------+------------------------------+
```

### Component Details
* **Frontend**: Renders responsive dark-mode widgets. Dynamically generates list and card components by querying backend metadata. Renders canvas overlays and XAI heatmaps.
* **Backend**: Acts as the orchestrator. Validates incoming requests via Pydantic v2 schemas, handles authentication using JWT, checks role constraints (RBAC), triggers background training workers, and serves reports.
* **CV Engine**: Runs image validations, noise reductions, and color enhancements. Fully parameterized via database rules.
* **ML Engine**: Houses PyTorch models and optimization components. Adapts layer boundaries to target outputs. Computes saliency maps for local model validation.

---

## 2. SOLID Design Principles Implementation

* **Single Responsibility Principle (SRP)**:
  - `CVProcessor` is solely responsible for OpenCV image math.
  - `Explainer` focuses on backpropagation hooks and saliency maps.
  - API routers isolate dataset parsing from rules CRUD.
* **Open/Closed Principle (OCP)**:
  - The model training and inference layer is open for extension. Adding a new task type (e.g. keypoint detection) requires subclassing dataset loaders and mapping a new model head, without altering the underlying training engine or API routes.
* **Liskov Substitution Principle (LSP)**:
  - All dynamic PyTorch neural network architectures inherit from `torch.nn.Module`, ensuring they can be swapped dynamically inside the training execution loop.
* **Interface Segregation Principle (ISP)**:
  - Frontend queries decoupled endpoints (`/api/analytics/summary`, `/api/analytics/trends`) to fetch only necessary widget objects, minimizing overhead.
* **Dependency Inversion Principle (DIP)**:
  - Controllers rely on abstract SQLAlchemy session boundaries (`get_db`) rather than concrete SQLite file configurations.

---

## 3. Communication Patterns

* **HTTP REST**: Used for synchronous operations (User authentication, rules CRUD, dataset uploads, model promotion).
* **WebSockets**: Establishes a persistent bi-directional channel between Client and Server. As the monitoring daemon polls and detects new images, results are pushed instantly to all dashboards.
* **Asynchronous Threads**: Optuna tuning and training execution run in a separate background thread. The state is recorded in memory and queried by the frontend without blocking main API processing.
