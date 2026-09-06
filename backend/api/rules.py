from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List

from backend.db.database import get_db
from backend.db.models import QualityRule, InspectionParameter, AlertRule, SystemSetting
from backend.db.schemas import (
    QualityRuleCreate, QualityRuleResponse,
    InspectionParameterBase, InspectionParameterResponse,
    AlertRuleCreate, AlertRuleResponse,
    SystemSettingBase, SystemSettingResponse
)
from backend.api.auth import check_role

router = APIRouter(prefix="/api/rules", tags=["Rules & Configurations"])

# --- QUALITY RULES ENDPOINTS ---

@router.post("/quality", response_model=QualityRuleResponse)
async def create_quality_rule(
    rule_in: QualityRuleCreate,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(check_role(["Admin", "Engineer"]))
):
    db_rule = QualityRule(**rule_in.model_dump())
    db.add(db_rule)
    await db.commit()
    await db.refresh(db_rule)
    return db_rule


@router.get("/quality", response_model=List[QualityRuleResponse])
async def list_quality_rules(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(QualityRule))
    return result.scalars().all()


@router.put("/quality/{rule_id}", response_model=QualityRuleResponse)
async def update_quality_rule(
    rule_id: int,
    rule_in: QualityRuleCreate,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(check_role(["Admin", "Engineer"]))
):
    result = await db.execute(select(QualityRule).filter(QualityRule.id == rule_id))
    db_rule = result.scalars().first()
    if not db_rule:
        raise HTTPException(status_code=404, detail="Rule not found")
        
    for key, val in rule_in.model_dump().items():
        setattr(db_rule, key, val)
        
    await db.commit()
    await db.refresh(db_rule)
    return db_rule


@router.delete("/quality/{rule_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_quality_rule(
    rule_id: int,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(check_role(["Admin"]))
):
    result = await db.execute(select(QualityRule).filter(QualityRule.id == rule_id))
    db_rule = result.scalars().first()
    if not db_rule:
        raise HTTPException(status_code=404, detail="Rule not found")
        
    await db.delete(db_rule)
    await db.commit()
    return None


# --- INSPECTION PARAMETERS ENDPOINTS ---

@router.post("/parameters", response_model=InspectionParameterResponse)
async def create_inspection_parameter(
    param_in: InspectionParameterBase,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(check_role(["Admin", "Engineer"]))
):
    # Check if duplicate name
    res = await db.execute(select(InspectionParameter).filter(InspectionParameter.name == param_in.name))
    if res.scalars().first():
        raise HTTPException(status_code=400, detail="Parameter name already exists")
        
    db_param = InspectionParameter(**param_in.model_dump())
    db.add(db_param)
    await db.commit()
    await db.refresh(db_param)
    return db_param


@router.get("/parameters", response_model=List[InspectionParameterResponse])
async def list_inspection_parameters(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(InspectionParameter))
    return result.scalars().all()


@router.put("/parameters/{param_id}", response_model=InspectionParameterResponse)
async def update_inspection_parameter(
    param_id: int,
    param_in: InspectionParameterBase,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(check_role(["Admin", "Engineer"]))
):
    result = await db.execute(select(InspectionParameter).filter(InspectionParameter.id == param_id))
    db_param = result.scalars().first()
    if not db_param:
        raise HTTPException(status_code=404, detail="Parameter not found")
        
    for key, val in param_in.model_dump().items():
        setattr(db_param, key, val)
        
    await db.commit()
    await db.refresh(db_param)
    return db_param


# --- ALERT RULES ENDPOINTS ---

@router.post("/alerts", response_model=AlertRuleResponse)
async def create_alert_rule(
    alert_in: AlertRuleCreate,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(check_role(["Admin", "Engineer", "Manager"]))
):
    db_alert = AlertRule(**alert_in.model_dump())
    db.add(db_alert)
    await db.commit()
    await db.refresh(db_alert)
    return db_alert


@router.get("/alerts", response_model=List[AlertRuleResponse])
async def list_alert_rules(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(AlertRule))
    return result.scalars().all()


@router.put("/alerts/{alert_id}", response_model=AlertRuleResponse)
async def update_alert_rule(
    alert_id: int,
    alert_in: AlertRuleCreate,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(check_role(["Admin", "Engineer", "Manager"]))
):
    result = await db.execute(select(AlertRule).filter(AlertRule.id == alert_id))
    db_alert = result.scalars().first()
    if not db_alert:
        raise HTTPException(status_code=404, detail="Alert rule not found")
        
    for key, val in alert_in.model_dump().items():
        setattr(db_alert, key, val)
        
    await db.commit()
    await db.refresh(db_alert)
    return db_alert


# --- SYSTEM SETTINGS ENDPOINTS ---

@router.post("/settings", response_model=SystemSettingResponse)
async def create_system_setting(
    setting_in: SystemSettingBase,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(check_role(["Admin"]))
):
    res = await db.execute(select(SystemSetting).filter(SystemSetting.key == setting_in.key))
    if res.scalars().first():
         raise HTTPException(status_code=400, detail="Setting key already exists")
         
    db_setting = SystemSetting(**setting_in.model_dump())
    db.add(db_setting)
    await db.commit()
    await db.refresh(db_setting)
    return db_setting


@router.get("/settings", response_model=List[SystemSettingResponse])
async def list_system_settings(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(SystemSetting))
    return result.scalars().all()


@router.put("/settings/{setting_id}", response_model=SystemSettingResponse)
async def update_system_setting(
    setting_id: int,
    setting_in: SystemSettingBase,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(check_role(["Admin"]))
):
    result = await db.execute(select(SystemSetting).filter(SystemSetting.id == setting_id))
    db_setting = result.scalars().first()
    if not db_setting:
        raise HTTPException(status_code=404, detail="System setting not found")
        
    for key, val in setting_in.model_dump().items():
        setattr(db_setting, key, val)
        
    await db.commit()
    await db.refresh(db_setting)
    return db_setting
