from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os
import sys
import asyncio

# Ensure project root is in sys.path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from backend.db.database import AsyncSessionLocal, Base, engine, get_db
from backend.db.models import (
    Dataset,
    Inspection,
    InspectionParameter,
    ModelRegistry,
    QualityRule,
    SystemSetting,
    User,
)
from backend.db.schemas import UserCreate, UserResponse, Token
from backend.api.auth import get_password_hash, router as auth_router
from backend.api.datasets import router as datasets_router
from backend.api.models_api import router as models_router
from backend.api.rules import router as rules_router
from backend.api.inspections import router as inspections_router, monitor_folder_task
from backend.api.analytics import router as analytics_router
from backend.api.reports import router as reports_router

from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):
    # 1. Create DB tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        
    # 2. Seed default data
    await seed_database()
    
    # 3. Start folder monitoring background task
    monitor_task = asyncio.create_task(monitor_folder_task())
    print("Application startup tasks executed successfully.")
    yield
    monitor_task.cancel()

app = FastAPI(
    title="VisionGuard AI",
    description="Enterprise-grade industrial image quality control platform",
    version="1.0.0",
    lifespan=lifespan
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Allow all origins in local dev
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount Static Directories for images/assets serving
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATASETS_DIR = os.path.join(BASE_DIR, "..", "datasets")
UPLOADS_DIR = os.path.join(BASE_DIR, "..", "uploads")
REPORTS_DIR = os.path.join(BASE_DIR, "..", "reports")

os.makedirs(DATASETS_DIR, exist_ok=True)
os.makedirs(UPLOADS_DIR, exist_ok=True)
os.makedirs(REPORTS_DIR, exist_ok=True)

app.mount("/datasets", StaticFiles(directory=DATASETS_DIR), name="datasets")
app.mount("/uploads", StaticFiles(directory=UPLOADS_DIR), name="uploads")
app.mount("/reports", StaticFiles(directory=REPORTS_DIR), name="reports")

# Register Routers
app.include_router(auth_router)
app.include_router(datasets_router)
app.include_router(models_router)
app.include_router(rules_router)
app.include_router(inspections_router)
app.include_router(analytics_router)
app.include_router(reports_router)

# Seed Database
async def seed_database():
    async with AsyncSessionLocal() as session:
        from sqlalchemy.future import select
        res = await session.execute(select(User).limit(1))
        if res.scalars().first() is None:
            # 1. Seed Users
            admin = User(username="admin", hashed_password=get_password_hash("admin123"), role="Admin", full_name="System Administrator")
            engineer = User(username="engineer", hashed_password=get_password_hash("engineer123"), role="Engineer", full_name="Lead CV Engineer")
            inspector = User(username="inspector", hashed_password=get_password_hash("inspector123"), role="Quality Inspector", full_name="Line 1 Quality Inspector")
            session.add_all([admin, engineer, inspector])
            await session.flush()
            
            # 2. Seed Quality Rules
            rule1 = QualityRule(name="Defect Severity Limit", task_type="classification", class_name="scratch", operator=">", threshold=0.75, severity="High")
            rule2 = QualityRule(name="Critical Dent Rule", task_type="classification", class_name="dent", operator=">", threshold=0.60, severity="Critical")
            rule3 = QualityRule(name="Generic Anomaly Alert", task_type="anomaly_detection", class_name="anomaly", operator=">", threshold=0.10, severity="High")
            session.add_all([rule1, rule2, rule3])
            
            # 3. Seed System Settings
            sett1 = SystemSetting(key="camera_ip", value="192.168.1.100", group="camera")
            sett2 = SystemSetting(key="retention_days", value="30", group="storage")
            session.add_all([sett1, sett2])
            
            # 4. Seed Inspection Parameters
            param1 = InspectionParameter(name="max_defects_per_item", value="3", data_type="int", description="Threshold of defect counts before rejection")
            param2 = InspectionParameter(name="pixel_calibration_mm", value="0.12", data_type="float", description="Scale of pixel to millimeters")
            session.add_all([param1, param2])
            
            # 5. Seed Sample Dataset
            ds = Dataset(
                name="Metal_Casting_Defects_v1",
                task_type="classification",
                path=os.path.join(DATASETS_DIR, "Metal_Casting_Defects_v1"),
                classes=["crack", "dent", "normal", "porosity"],
                metadata_info={
                    "image_count": 480,
                    "formats": ["png", "jpg"],
                    "resolution": "224x224",
                    "class_distribution": {"crack": 120, "dent": 110, "normal": 150, "porosity": 100}
                }
            )
            session.add(ds)
            await session.flush()

            # 6. Seed Active Production Model
            model_reg = ModelRegistry(
                dataset_id=ds.id,
                name="Casting_Quality_Classifier_v1",
                version=1,
                task_type="classification",
                path=os.path.join(REPORTS_DIR, "..", "models", "Metal_Casting_Defects_v1_v1.pt"),
                status="active",
                is_production=True,
                hyperparameters={"lr": 0.001, "batch_size": 16, "optimizer": "Adam"},
                metrics={
                    "accuracy": 0.965,
                    "precision": 0.958,
                    "recall": 0.971,
                    "f1_score": 0.964,
                    "confusion_matrix": [[145, 2, 1, 2], [3, 115, 1, 1], [2, 1, 116, 1], [1, 2, 1, 96]],
                    "roc_curve": [
                        {"fpr": 0.0, "tpr": 0.0, "threshold": 1.0},
                        {"fpr": 0.01, "tpr": 0.85, "threshold": 0.9},
                        {"fpr": 0.02, "tpr": 0.94, "threshold": 0.7},
                        {"fpr": 0.05, "tpr": 0.98, "threshold": 0.5},
                        {"fpr": 0.10, "tpr": 0.99, "threshold": 0.3},
                        {"fpr": 1.0, "tpr": 1.0, "threshold": 0.0}
                    ],
                    "pr_curve": [
                        {"recall": 0.0, "precision": 1.0, "threshold": 1.0},
                        {"recall": 0.85, "precision": 0.99, "threshold": 0.9},
                        {"recall": 0.94, "precision": 0.97, "threshold": 0.7},
                        {"recall": 0.98, "precision": 0.94, "threshold": 0.5},
                        {"recall": 1.0, "precision": 0.82, "threshold": 0.0}
                    ],
                    "history": {
                        "train_loss": [0.65, 0.42, 0.28, 0.18, 0.12],
                        "val_loss": [0.55, 0.38, 0.25, 0.16, 0.11],
                        "val_accuracy": [0.82, 0.88, 0.92, 0.95, 0.965]
                    }
                }
            )
            session.add(model_reg)
            await session.flush()

            # 7. Seed Sample Inspection Logs
            insp1 = Inspection(
                model_id=model_reg.id,
                image_path="/uploads/inspections/sample_casting_pass.png",
                predictions={
                    "class": "normal",
                    "confidence": 0.985,
                    "all_confidences": {"normal": 0.985, "crack": 0.005, "dent": 0.005, "porosity": 0.005},
                    "grad_cam_path": "/uploads/inspections/cam_placeholder.png",
                    "perturbation_path": "/uploads/inspections/pert_placeholder.png"
                },
                quality_score=98.5,
                status="PASS",
                severity="None",
                inspector_id=inspector.id
            )
            insp2 = Inspection(
                model_id=model_reg.id,
                image_path="/uploads/inspections/sample_casting_fail.png",
                predictions={
                    "class": "crack",
                    "confidence": 0.92,
                    "all_confidences": {"normal": 0.05, "crack": 0.92, "dent": 0.02, "porosity": 0.01},
                    "grad_cam_path": "/uploads/inspections/cam_placeholder.png",
                    "perturbation_path": "/uploads/inspections/pert_placeholder.png"
                },
                quality_score=24.0,
                status="FAIL",
                severity="High",
                inspector_id=inspector.id
            )
            session.add_all([insp1, insp2])

            await session.commit()
            print("Database seeding completed with demo records.")
