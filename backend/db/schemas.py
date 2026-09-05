from pydantic import BaseModel, ConfigDict, Field
from typing import List, Dict, Any, Optional
from datetime import datetime

# --- AUTH SCHEMAS ---

class UserBase(BaseModel):
    username: str
    full_name: Optional[str] = None
    role: str

class UserCreate(UserBase):
    password: str

class UserResponse(UserBase):
    id: int
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

class Token(BaseModel):
    access_token: str
    token_type: str
    role: str
    username: str

class TokenData(BaseModel):
    username: Optional[str] = None
    role: Optional[str] = None

# --- DATASET SCHEMAS ---

class DatasetBase(BaseModel):
    name: str
    task_type: str

class DatasetCreate(DatasetBase):
    pass

class DatasetResponse(DatasetBase):
    id: int
    path: str
    classes: List[str]
    metadata_info: Dict[str, Any]
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

# --- MODEL SCHEMAS ---

class ModelBase(BaseModel):
    name: str
    dataset_id: int
    task_type: str

class ModelResponse(ModelBase):
    id: int
    version: int
    path: str
    metrics: Dict[str, Any]
    status: str
    hyperparameters: Dict[str, Any]
    is_production: bool
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

class ModelProductionUpdate(BaseModel):
    is_production: bool

# --- QUALITY RULE SCHEMAS ---

class QualityRuleBase(BaseModel):
    name: str
    task_type: str
    class_name: str
    operator: str
    threshold: float
    severity: str = "Medium"
    is_active: bool = True

class QualityRuleCreate(QualityRuleBase):
    pass

class QualityRuleResponse(QualityRuleBase):
    id: int
    model_config = ConfigDict(from_attributes=True)

# --- INSPECTION PARAMETER SCHEMAS ---

class InspectionParameterBase(BaseModel):
    name: str
    value: str
    data_type: str = "string"
    description: Optional[str] = None

class InspectionParameterResponse(InspectionParameterBase):
    id: int
    model_config = ConfigDict(from_attributes=True)

# --- INSPECTION SCHEMAS ---

class InspectionResponse(BaseModel):
    id: int
    model_id: Optional[int] = None
    image_path: str
    predictions: Dict[str, Any]
    quality_score: float
    status: str
    severity: str
    inspector_id: Optional[int] = None
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

# --- ALERT RULE SCHEMAS ---

class AlertRuleBase(BaseModel):
    name: str
    metric: str
    operator: str
    threshold: float
    time_window_mins: int = 60
    severity: str = "High"
    is_active: bool = True

class AlertRuleCreate(AlertRuleBase):
    pass

class AlertRuleResponse(AlertRuleBase):
    id: int
    model_config = ConfigDict(from_attributes=True)

# --- SYSTEM SETTING SCHEMAS ---

class SystemSettingBase(BaseModel):
    key: str
    value: str
    group: str = "general"

class SystemSettingResponse(SystemSettingBase):
    id: int
    model_config = ConfigDict(from_attributes=True)

# --- USER PREFERENCE SCHEMAS ---

class UserPreferenceBase(BaseModel):
    preferences: Dict[str, Any]

class UserPreferenceResponse(UserPreferenceBase):
    id: int
    user_id: int
    model_config = ConfigDict(from_attributes=True)
