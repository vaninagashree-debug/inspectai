from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func
from datetime import datetime, timedelta, timezone
import os

from backend.db.database import get_db
from backend.db.models import Inspection, ModelRegistry, Dataset

router = APIRouter(prefix="/api/analytics", tags=["Analytics"])

@router.get("/summary")
async def get_analytics_summary(db: AsyncSession = Depends(get_db)):
    """
    Computes overall summary statistics dynamically.
    """
    # Total Inspected
    res_total = await db.execute(select(func.count(Inspection.id)))
    total_inspected = res_total.scalar() or 0
    
    # Pass vs Fail
    res_pass = await db.execute(select(func.count(Inspection.id)).filter(Inspection.status == "PASS"))
    total_pass = res_pass.scalar() or 0
    
    res_fail = await db.execute(select(func.count(Inspection.id)).filter(Inspection.status == "FAIL"))
    total_fail = res_fail.scalar() or 0
    
    yield_rate = (total_pass / total_inspected * 100.0) if total_inspected > 0 else 100.0
    
    # Average Score
    res_avg = await db.execute(select(func.avg(Inspection.quality_score)))
    average_score = res_avg.scalar() or 100.0
    
    # Active Models Count
    res_models = await db.execute(select(func.count(ModelRegistry.id)).filter(ModelRegistry.status == "active"))
    active_models_count = res_models.scalar() or 0
    
    # Active Datasets Count
    res_datasets = await db.execute(select(func.count(Dataset.id)))
    active_datasets_count = res_datasets.scalar() or 0
    
    # Defect Distribution
    res_defects = await db.execute(
        select(Inspection.predictions)
        .filter(Inspection.status == "FAIL")
    )
    defect_records = res_defects.scalars().all()
    
    defect_counts = {}
    for pred in defect_records:
        if isinstance(pred, dict):
            cls_name = pred.get("class", pred.get("defect_detected", "Unknown Defect"))
            defect_counts[cls_name] = defect_counts.get(cls_name, 0) + 1

    # Severity Distribution
    res_severity = await db.execute(
        select(Inspection.severity, func.count(Inspection.id))
        .group_by(Inspection.severity)
    )
    severity_counts = {"Low": 0, "Medium": 0, "High": 0, "Critical": 0}
    for sev, count in res_severity.all():
        if sev and sev in severity_counts:
            severity_counts[sev] = count
        elif sev and sev != "None":
            severity_counts[sev] = count

    return {
        "total_inspected": total_inspected,
        "pass_count": total_pass,
        "fail_count": total_fail,
        "yield_rate": round(yield_rate, 2),
        "average_score": round(average_score, 1),
        "active_models": active_models_count,
        "active_datasets": active_datasets_count,
        "defect_distribution": defect_counts,
        "severity_distribution": severity_counts
    }


@router.get("/trends")
async def get_trends(days: int = 7, db: AsyncSession = Depends(get_db)):
    """
    Computes daily pass/fail yields over the last N days.
    """
    now_utc = datetime.now(timezone.utc)
    start_date = now_utc - timedelta(days=days)
    
    # SQLite grouping by date
    # strftime('%Y-%m-%d', created_at)
    stmt = (
        select(
            func.strftime("%Y-%m-%d", Inspection.created_at).label("day"),
            Inspection.status,
            func.count(Inspection.id)
        )
        .filter(Inspection.created_at >= start_date)
        .group_by("day", Inspection.status)
        .order_by("day")
    )
    
    res = await db.execute(stmt)
    
    # Reorganise database results into React-chart-friendly format
    trend_dict = {}
    for day, status, count in res.all():
        if day not in trend_dict:
            trend_dict[day] = {"date": day, "pass": 0, "fail": 0, "total": 0}
        if status == "PASS":
            trend_dict[day]["pass"] = count
        else:
            trend_dict[day]["fail"] = count
        trend_dict[day]["total"] += count
        
    # Sort and fill missing days
    trends = sorted(list(trend_dict.values()), key=lambda x: x["date"])
    
    # If no inspection logs yet, generate default structure representing empty logs
    if len(trends) == 0:
        for i in range(days):
            date_str = (now_utc - timedelta(days=days-1-i)).strftime("%Y-%m-%d")
            trends.append({"date": date_str, "pass": 0, "fail": 0, "total": 0})
            
    return trends
