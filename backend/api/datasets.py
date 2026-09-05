from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
import os
import zipfile
import shutil
import json
from PIL import Image
from typing import List

from db.database import get_db
from db.models import Dataset, ModelRegistry
from db.schemas import DatasetResponse
from api.auth import check_role

router = APIRouter(prefix="/api/datasets", tags=["Datasets"])

DATASETS_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "datasets"))

@router.post("/upload", response_model=DatasetResponse)
async def upload_dataset(
    name: str = Form(...),
    task_type: str = Form(...), # classification, object_detection, segmentation, anomaly_detection
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user = Depends(check_role(["Admin", "Engineer"]))
):
    # Verify name is unique
    result = await db.execute(select(Dataset).filter(Dataset.name == name))
    if result.scalars().first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Dataset with name '{name}' already exists."
        )
        
    # Create target directory
    dataset_path = os.path.join(DATASETS_DIR, name)
    if os.path.exists(dataset_path):
        shutil.rmtree(dataset_path)
    os.makedirs(dataset_path, exist_ok=True)
    
    # Save uploaded zip temporarily
    temp_zip_path = os.path.join(dataset_path, "temp_dataset.zip")
    with open(temp_zip_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    # Extract Zip
    try:
        with zipfile.ZipFile(temp_zip_path, 'r') as zip_ref:
            zip_ref.extractall(dataset_path)
        os.remove(temp_zip_path) # Clean up temp zip
    except Exception as e:
        shutil.rmtree(dataset_path)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid zip file: {str(e)}"
        )

    # Clean macOS / Linux metadata folders if present in Zip
    macos_dir = os.path.join(dataset_path, "__MACOSX")
    if os.path.exists(macos_dir):
        shutil.rmtree(macos_dir)

    # Dynamic Dataset structure analysis
    classes = set()
    formats = set()
    resolutions = []
    image_count = 0
    
    # Analyze files depending on task type
    for root, dirs, files in os.walk(dataset_path):
        for filename in files:
            ext = os.path.splitext(filename)[1].lower()
            if ext in ['.png', '.jpg', '.jpeg', '.webp']:
                image_count += 1
                formats.add(ext[1:])
                img_path = os.path.join(root, filename)
                
                # Get resolution
                try:
                    with Image.open(img_path) as img:
                        w, h = img.size
                        resolutions.append((w, h))
                except Exception:
                    pass
                
                # Extract classes dynamically based on folders
                if task_type == "classification":
                    # Classification folder structure: dataset/train/class_name/img.png
                    rel_path = os.path.relpath(root, dataset_path)
                    parts = rel_path.split(os.sep)
                    if len(parts) >= 2: # train/class_name or val/class_name
                        classes.add(parts[1])
                
                elif task_type == "anomaly_detection":
                    # Anomaly detection: train/normal/img.png or val/anomaly/img.png
                    rel_path = os.path.relpath(root, dataset_path)
                    parts = rel_path.split(os.sep)
                    if len(parts) >= 2:
                        classes.add(parts[1]) # normal, anomaly

    if image_count == 0:
        shutil.rmtree(dataset_path)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No valid images found in the dataset."
        )

    # For object detection, read labels to discover class indexes
    if task_type == "object_detection":
        labels_dir = os.path.join(dataset_path, "labels")
        if os.path.exists(labels_dir):
            for file in os.listdir(labels_dir):
                if file.endswith(".txt"):
                    try:
                        with open(os.path.join(labels_dir, file), "r") as lf:
                            for line in lf:
                                parts = line.strip().split()
                                if len(parts) > 0:
                                    classes.add(f"defect_{parts[0]}")
                    except Exception:
                        pass
        # Fallback if no classes detected
        if len(classes) == 0:
            classes.add("defect_0")

    # For segmentation, find class names (default background and foreground/defects)
    if task_type == "segmentation":
        classes = ["background", "defect"]

    # Calculate average resolution
    avg_w = sum(r[0] for r in resolutions) // len(resolutions) if resolutions else 224
    avg_h = sum(r[1] for r in resolutions) // len(resolutions) if resolutions else 224
    
    classes_list = sorted(list(classes))
    metadata_info = {
        "image_count": image_count,
        "formats": list(formats),
        "resolution": f"{avg_w}x{avg_h}",
        "class_distribution": {}
    }
    
    # Calculate class distribution for classification
    if task_type == "classification":
        for c in classes_list:
            count = 0
            for root, dirs, files in os.walk(dataset_path):
                rel_path = os.path.relpath(root, dataset_path)
                parts = rel_path.split(os.sep)
                if len(parts) >= 2 and parts[1] == c:
                    count += len([f for f in files if os.path.splitext(f)[1].lower() in ['.png', '.jpg', '.jpeg', '.webp']])
            metadata_info["class_distribution"][c] = count

    # Register in DB
    db_dataset = Dataset(
        name=name,
        task_type=task_type,
        path=dataset_path,
        classes=classes_list,
        metadata_info=metadata_info
    )
    db.add(db_dataset)
    await db.commit()
    await db.refresh(db_dataset)
    return db_dataset


@router.get("", response_model=List[DatasetResponse])
async def list_datasets(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Dataset).order_by(Dataset.created_at.desc()))
    return result.scalars().all()


@router.delete("/{dataset_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_dataset(
    dataset_id: int,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(check_role(["Admin"]))
):
    result = await db.execute(select(Dataset).filter(Dataset.id == dataset_id))
    dataset = result.scalars().first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
        
    # Delete folder from disk
    if os.path.exists(dataset.path):
        try:
            shutil.rmtree(dataset.path)
        except Exception:
            pass
            
    await db.delete(dataset)
    await db.commit()
    return None
