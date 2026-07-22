from fastapi import APIRouter, HTTPException, UploadFile, File, Form, Header
from pydantic import BaseModel, Field
from typing import Dict, Any, List, Optional
from services.auth import auth_service
from services.project_manager import project_manager_service
from services.file_validator import file_validator_service
from services.workflow_engine import workflow_engine_service
import logging

logger = logging.getLogger(__name__)
router = APIRouter(tags=["enterprise"])

# -----------------
# Request schemas
# -----------------

class LoginRequest(BaseModel):
    email: str
    password: str

class OAuthRequest(BaseModel):
    provider: str
    code: str

class FolderCreateRequest(BaseModel):
    name: str
    parent_id: str = "root"

class ProjectCreateRequest(BaseModel):
    name: str
    folder_id: str = "root"
    owner: str

class ShareProjectRequest(BaseModel):
    project_id: str
    share_email: str

class CommentRequest(BaseModel):
    project_id: str
    user_email: str
    text: str

class CommitVersionRequest(BaseModel):
    project_id: str
    name: str
    metrics: Dict[str, Any]

class ExecuteWorkflowRequest(BaseModel):
    pipeline_id: str
    geometry: Dict[str, Any]

class SaveWorkflowRequest(BaseModel):
    template_id: str
    name: str
    nodes: List[Dict[str, Any]]

# -----------------
# Auth routes
# -----------------

@router.post("/api/auth/login")
async def login(request: LoginRequest):
    result = auth_service.login_user(request.email, request.password)
    if not result:
        raise HTTPException(status_code=401, detail="Invalid credentials. Verify your email and password.")
    return result

@router.post("/api/auth/oauth")
async def oauth(request: OAuthRequest):
    result = auth_service.oauth_login(request.provider, request.code)
    if not result:
        raise HTTPException(status_code=401, detail="OAuth validation failed.")
    return result

@router.get("/api/auth/audit-logs")
async def get_audit_logs(authorization: Optional[str] = Header(None)):
    if not authorization or not auth_service.verify_role_permission(authorization, ["Admin", "Manager"]):
        raise HTTPException(status_code=403, detail="Forbidden. Admin or Manager role required.")
    return auth_service.audit_logs

# -----------------
# Projects routes
# -----------------

@router.get("/api/projects/tree")
async def get_projects_tree(email: str):
    return project_manager_service.get_project_tree(email)

@router.post("/api/projects/folder")
async def create_folder(request: FolderCreateRequest):
    return project_manager_service.create_folder(request.name, request.parent_id)

@router.post("/api/projects/create")
async def create_project(request: ProjectCreateRequest):
    return project_manager_service.create_project(request.name, request.folder_id, request.owner)

@router.post("/api/projects/share")
async def share_project(request: ShareProjectRequest):
    success = project_manager_service.share_project(request.project_id, request.share_email)
    if not success:
        raise HTTPException(status_code=404, detail="Project not found.")
    auth_service.log_audit(request.share_email, "SHARE_PROJECT", request.project_id)
    return {"status": "success", "message": f"Project shared with {request.share_email}"}

@router.post("/api/projects/comment")
async def add_comment(request: CommentRequest):
    comment = project_manager_service.add_comment(request.project_id, request.user_email, request.text)
    if not comment:
        raise HTTPException(status_code=404, detail="Project not found.")
    return comment

@router.post("/api/projects/commit-version")
async def commit_version(request: CommitVersionRequest):
    version = project_manager_service.commit_version(request.project_id, request.name, request.metrics)
    if not version:
        raise HTTPException(status_code=404, detail="Project not found.")
    return version

# -----------------
# File Ingestion
# -----------------

@router.post("/api/gis/validate-file")
async def validate_file(
    file: UploadFile = File(...)
):
    try:
        content = await file.read()
        logger.info(f"Validating spatial file upload: {file.filename}")
        result = file_validator_service.validate_and_parse_file(file.filename, content)
        return result
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        logger.error(f"File ingestion error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# -----------------
# Workflow routes
# -----------------

@router.get("/api/workflows/templates")
async def get_workflow_templates():
    return workflow_engine_service.get_templates()

@router.post("/api/workflows/run")
async def run_workflow(request: ExecuteWorkflowRequest):
    try:
        return workflow_engine_service.execute_pipeline(request.pipeline_id, request.geometry)
    except ValueError as ve:
        raise HTTPException(status_code=404, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/api/workflows/save")
async def save_workflow(request: SaveWorkflowRequest):
    return workflow_engine_service.save_template(request.template_id, request.name, request.nodes)

# -----------------
# Enterprise Dashboard
# -----------------

@router.get("/api/enterprise/dashboard")
async def get_enterprise_dashboard(authorization: Optional[str] = Header(None)):
    # Standard role validation for cost dashboard
    if authorization and not auth_service.verify_role_permission(authorization, ["Admin", "Manager"]):
         raise HTTPException(status_code=403, detail="Forbidden. Access restricted to Admin or Manager roles.")
         
    # Mock aggregation for enterprise statistics
    return {
        "summary": {
            "total_projects": len(project_manager_service.projects),
            "active_users": len(auth_service.users),
            "processed_queries": 456,
            "system_health": "OPTIMAL",
            "cpu_load_pct": 34.5,
            "memory_usage_gb": 4.8
        },
        "costs_usd": {
            "total_monthly": 124.50,
            "gee_compute": 42.10,
            "groq_llm": 12.40,
            "vector_store_hosting": 70.00
        },
        "ai_usage": {
            "total_tokens_consumed": 1845000,
            "prompt_tokens": 1240000,
            "completion_tokens": 605000,
            "avg_latency_ms": 420
        },
        "monthly_growth": [
            {"month": "Feb", "projects": 1, "queries": 15, "cost": 10.0},
            {"month": "Mar", "projects": 2, "queries": 54, "cost": 22.4},
            {"month": "Apr", "projects": 4, "queries": 120, "cost": 48.0},
            {"month": "May", "projects": 8, "queries": 280, "cost": 85.5},
            {"month": "Jun", "projects": 12, "queries": 456, "cost": 124.5}
        ]
    }
