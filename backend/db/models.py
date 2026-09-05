from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey, JSON, Text
from sqlalchemy.orm import relationship
from datetime import datetime
from .database import Base

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String, nullable=True)
    role = Column(String, default="Quality Inspector") # Roles: Admin, Engineer, Quality Inspector, Manager
    created_at = Column(DateTime, default=datetime.utcnow)

    inspections = relationship("Inspection", back_populates="inspector")
    preferences = relationship("UserPreference", back_populates="user", uselist=False)


class Dataset(Base):
    __tablename__ = "datasets"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True, nullable=False)
    task_type = Column(String, nullable=False) # classification, object_detection, segmentation, anomaly_detection
    path = Column(String, nullable=False)
    classes = Column(JSON, default=[]) # list of class names, e.g. ["scratch", "dent"]
    metadata_info = Column(JSON, default={}) # image count, splits, resolutions, etc.
    created_at = Column(DateTime, default=datetime.utcnow)

    models = relationship("ModelRegistry", back_populates="dataset", cascade="all, delete-orphan")


class ModelRegistry(Base):
    __tablename__ = "models"
    
    id = Column(Integer, primary_key=True, index=True)
    dataset_id = Column(Integer, ForeignKey("datasets.id"), nullable=False)
    name = Column(String, nullable=False)
    version = Column(Integer, default=1)
    task_type = Column(String, nullable=False)
    path = Column(String, nullable=False)
    metrics = Column(JSON, default={}) # accuracy, precision, recall, confusion_matrix, curves data
    status = Column(String, default="training") # training, trained, active, error
    hyperparameters = Column(JSON, default={}) # lr, batch_size, epochs, etc.
    is_production = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    dataset = relationship("Dataset", back_populates="models")
    inspections = relationship("Inspection", back_populates="model")


class QualityRule(Base):
    __tablename__ = "quality_rules"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    task_type = Column(String, nullable=False) # classification, object_detection, etc.
    class_name = Column(String, nullable=False) # e.g. "scratch" or "all"
    operator = Column(String, nullable=False) # >, <, ==, >=, <=
    threshold = Column(Float, nullable=False) # confidence or area threshold
    severity = Column(String, default="Medium") # Low, Medium, High, Critical
    is_active = Column(Boolean, default=True)


class InspectionParameter(Base):
    __tablename__ = "inspection_parameters"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True, nullable=False)
    value = Column(String, nullable=False)
    data_type = Column(String, default="string") # float, int, string, bool
    description = Column(Text, nullable=True)


class Inspection(Base):
    __tablename__ = "inspections"
    
    id = Column(Integer, primary_key=True, index=True)
    model_id = Column(Integer, ForeignKey("models.id"), nullable=True)
    image_path = Column(String, nullable=False)
    predictions = Column(JSON, default={}) # Bounding boxes, classes, masks, Grad-CAM output path
    quality_score = Column(Float, default=100.0) # 0 to 100 score of the product
    status = Column(String, nullable=False) # PASS, FAIL
    severity = Column(String, default="None") # None, Low, Medium, High, Critical
    inspector_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    model = relationship("ModelRegistry", back_populates="inspections")
    inspector = relationship("User", back_populates="inspections")


class AlertRule(Base):
    __tablename__ = "alert_rules"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    metric = Column(String, nullable=False) # e.g. "defect_rate", "confidence_drop"
    operator = Column(String, nullable=False) # >, <, etc.
    threshold = Column(Float, nullable=False)
    time_window_mins = Column(Integer, default=60)
    severity = Column(String, default="High")
    is_active = Column(Boolean, default=True)


class SystemSetting(Base):
    __tablename__ = "system_settings"
    
    id = Column(Integer, primary_key=True, index=True)
    key = Column(String, unique=True, index=True, nullable=False)
    value = Column(String, nullable=False)
    group = Column(String, default="general") # general, camera, email, storage


class UserPreference(Base):
    __tablename__ = "user_preferences"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    preferences = Column(JSON, default={}) # theme, notification channels, default_dashboard

    user = relationship("User", back_populates="preferences")
