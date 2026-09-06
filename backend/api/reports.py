from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from datetime import datetime
import pandas as pd
import os
import io

from backend.db.database import get_db
from backend.db.models import Inspection
from backend.api.auth import check_role

from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors

router = APIRouter(prefix="/api/reports", tags=["Reporting"])

REPORTS_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "reports"))
os.makedirs(REPORTS_DIR, exist_ok=True)

async def fetch_inspections_data(db: AsyncSession, start_date: str = None, end_date: str = None, status: str = None):
    stmt = select(Inspection).order_by(Inspection.created_at.desc())
    
    if status:
        stmt = stmt.filter(Inspection.status == status)
        
    res = await db.execute(stmt)
    inspections = res.scalars().all()
    
    data = []
    for insp in inspections:
        pred = insp.predictions
        pred_class = pred.get("class", pred.get("defect_detected", "unknown"))
        conf = pred.get("confidence", 0.0)
        
        data.append({
            "Inspection ID": insp.id,
            "Timestamp": insp.created_at.strftime("%Y-%m-%d %H:%M:%S"),
            "Model ID": insp.model_id or "N/A",
            "Image Path": insp.image_path,
            "Quality Score": insp.quality_score,
            "Prediction Class": pred_class,
            "Confidence": f"{conf:.2f}",
            "Status": insp.status,
            "Severity": insp.severity
        })
        
    return data


@router.get("/csv")
async def export_csv(
    status: str = None,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(check_role(["Admin", "Engineer", "Manager"]))
):
    data = await fetch_inspections_data(db, status=status)
    if not data:
        raise HTTPException(status_code=404, detail="No inspections logs found to export.")
        
    df = pd.DataFrame(data)
    csv_filename = f"Inspection_Report_{int(datetime.utcnow().timestamp())}.csv"
    csv_path = os.path.join(REPORTS_DIR, csv_filename)
    
    df.to_csv(csv_path, index=False)
    return FileResponse(csv_path, media_type="text/csv", filename=csv_filename)


@router.get("/excel")
async def export_excel(
    status: str = None,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(check_role(["Admin", "Engineer", "Manager"]))
):
    data = await fetch_inspections_data(db, status=status)
    if not data:
        raise HTTPException(status_code=404, detail="No inspections logs found to export.")
        
    df = pd.DataFrame(data)
    excel_filename = f"Inspection_Report_{int(datetime.utcnow().timestamp())}.xlsx"
    excel_path = os.path.join(REPORTS_DIR, excel_filename)
    
    df.to_excel(excel_path, index=False, engine='openpyxl')
    return FileResponse(
        excel_path, 
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", 
        filename=excel_filename
    )


from backend.api.auth import check_role, get_current_user

@router.get("/pdf/{inspection_id}")
async def export_pdf_single(
    inspection_id: int,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Generates a single comprehensive quality inspection report in PDF.
    """
    result = await db.execute(select(Inspection).filter(Inspection.id == inspection_id))
    insp = result.scalars().first()
    if not insp:
        raise HTTPException(status_code=404, detail="Inspection not found")
        
    pdf_filename = f"Quality_Report_Inspection_{inspection_id}.pdf"
    pdf_path = os.path.join(REPORTS_DIR, pdf_filename)
    
    doc = SimpleDocTemplate(pdf_path, pagesize=letter)
    story = []
    
    styles = getSampleStyleSheet()
    
    # Custom Styles
    title_style = ParagraphStyle(
        'TitleStyle',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=24,
        textColor=colors.HexColor('#0F172A'),
        spaceAfter=15
    )
    
    meta_style = ParagraphStyle(
        'MetaStyle',
        parent=styles['Normal'],
        fontSize=10,
        textColor=colors.HexColor('#64748B'),
        spaceAfter=25
    )
    
    header_style = ParagraphStyle(
        'HeaderStyle',
        parent=styles['Heading2'],
        fontSize=14,
        textColor=colors.HexColor('#1E293B'),
        spaceAfter=10
    )
    
    body_style = ParagraphStyle(
        'BodyStyle',
        parent=styles['Normal'],
        fontSize=10,
        textColor=colors.HexColor('#334155'),
        spaceAfter=6
    )

    # 1. Header
    story.append(Paragraph("VisionGuard AI Quality Report", title_style))
    story.append(Paragraph(f"Generated on {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S')} UTC | Inspection Record #{insp.id}", meta_style))
    story.append(Spacer(1, 10))
    
    # 2. Main Parameters Table
    pred = insp.predictions
    pred_class = pred.get("class", pred.get("defect_detected", "unknown"))
    conf = pred.get("confidence", 0.0)
    
    data = [
        [Paragraph("<b>Attribute</b>", body_style), Paragraph("<b>Details</b>", body_style)],
        [Paragraph("Inspection ID", body_style), Paragraph(str(insp.id), body_style)],
        [Paragraph("Date & Time", body_style), Paragraph(insp.created_at.strftime("%Y-%m-%d %H:%M:%S"), body_style)],
        [Paragraph("Status", body_style), Paragraph(f"<font color='{'green' if insp.status == 'PASS' else 'red'}'><b>{insp.status}</b></font>", body_style)],
        [Paragraph("Quality Score", body_style), Paragraph(f"<b>{insp.quality_score:.1f}%</b>", body_style)],
        [Paragraph("Classification / Defect Type", body_style), Paragraph(pred_class, body_style)],
        [Paragraph("Confidence Score", body_style), Paragraph(f"{conf * 100:.1f}%", body_style)],
        [Paragraph("Severity", body_style), Paragraph(insp.severity, body_style)],
        [Paragraph("Associated Model Version", body_style), Paragraph(str(insp.model_id or "N/A"), body_style)]
    ]
    
    table = Table(data, colWidths=[200, 300])
    table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (1, 0), colors.HexColor('#F1F5F9')),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#CBD5E1')),
    ]))
    
    story.append(Paragraph("Quality Check Specifications", header_style))
    story.append(table)
    story.append(Spacer(1, 20))
    
    # 3. Decision/Recommendations Section
    story.append(Paragraph("Inspection Decisions & Action Items", header_style))
    if insp.status == "PASS":
        decision_text = "<b>Recommendation:</b> PASS. The product meets all configured quality thresholds. No action required. Suitable for shipment."
    else:
        decision_text = f"<b>Recommendation:</b> REJECT / HOLD. The product has failed the automated inspection due to a <b>{pred_class}</b> defect detected with high severity ({insp.severity}). Route to manual verification line or discard."
        
    story.append(Paragraph(decision_text, body_style))
    
    # Build Document
    doc.build(story)
    
    return FileResponse(pdf_path, media_type="application/pdf", filename=pdf_filename)
