import time
from typing import Dict, Any, List, Optional
import uuid

class ProjectManagerService:
    """Service managing folders, project workspaces, shared settings, comments, and version histories"""
    
    def __init__(self):
        # In-memory database structures
        self.projects = {
            "default_project": {
                "id": "default_project",
                "name": "Urban Planning ROI Gandhi Nagar",
                "folder_id": "root",
                "owner": "admin@geoquery.ai",
                "shared_with": ["manager@geoquery.ai"],
                "versions": [
                    {"version_id": "v1", "timestamp": time.time() - 3600, "name": "Initial Site Boundary Draft", "metrics": {}}
                ],
                "comments": [
                    {"comment_id": "c1", "user": "manager@geoquery.ai", "text": "Can we inspect the NDVI vegetation index for crop stress?", "timestamp": time.time() - 1800}
                ]
            }
        }
        self.folders = {
            "root": {"id": "root", "name": "Workspaces Root", "parent_id": None},
            "f1": {"id": "f1", "name": "Infrastructure Feasibility Studies", "parent_id": "root"},
            "f2": {"id": "f2", "name": "Agricultural Crop Assessments", "parent_id": "root"}
        }

    def create_folder(self, name: str, parent_id: str = "root") -> Dict[str, Any]:
        folder_id = f"folder_{uuid.uuid4().hex[:6]}"
        new_folder = {"id": folder_id, "name": name, "parent_id": parent_id}
        self.folders[folder_id] = new_folder
        return new_folder

    def create_project(self, name: str, folder_id: str = "root", owner: str = "admin@geoquery.ai") -> Dict[str, Any]:
        project_id = f"proj_{uuid.uuid4().hex[:6]}"
        new_project = {
            "id": project_id,
            "name": name,
            "folder_id": folder_id,
            "owner": owner,
            "shared_with": [],
            "versions": [
                {"version_id": "v1", "timestamp": time.time(), "name": "Workspace Initialized", "metrics": {}}
            ],
            "comments": []
        }
        self.projects[project_id] = new_project
        return new_project

    def share_project(self, project_id: str, share_email: str) -> bool:
        project = self.projects.get(project_id)
        if project:
            if share_email not in project["shared_with"]:
                project["shared_with"].append(share_email)
            return True
        return False

    def add_comment(self, project_id: str, user_email: str, comment_text: str) -> Optional[Dict[str, Any]]:
        project = self.projects.get(project_id)
        if project:
            new_comment = {
                "comment_id": f"comment_{uuid.uuid4().hex[:6]}",
                "user": user_email,
                "text": comment_text,
                "timestamp": time.time()
            }
            project["comments"].append(new_comment)
            return new_comment
        return None

    def commit_version(self, project_id: str, version_name: str, metrics: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        project = self.projects.get(project_id)
        if project:
            v_idx = len(project["versions"]) + 1
            new_ver = {
                "version_id": f"v{v_idx}",
                "timestamp": time.time(),
                "name": version_name,
                "metrics": metrics
            }
            project["versions"].append(new_ver)
            return new_ver
        return None

    def get_project_tree(self, user_email: str) -> Dict[str, Any]:
        """Compile folder tree hierarchy for active user"""
        user_projects = []
        for p_id, p in self.projects.items():
            if p["owner"] == user_email or user_email in p["shared_with"]:
                user_projects.append(p)
                
        return {
            "folders": list(self.folders.values()),
            "projects": user_projects
        }

project_manager_service = ProjectManagerService()
