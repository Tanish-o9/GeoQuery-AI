import time
import base64
import json
import logging
from typing import Dict, Any, Optional, List

logger = logging.getLogger(__name__)

class AuthService:
    """Service for JWT simulation, OAuth integration, and Role-Based Access Control (RBAC)"""
    
    def __init__(self):
        # In-memory users for demonstration
        self.users = {
            "admin@geoquery.ai": {"email": "admin@geoquery.ai", "role": "Admin", "name": "System Administrator"},
            "manager@geoquery.ai": {"email": "manager@geoquery.ai", "role": "Manager", "name": "GIS Project Lead"},
            "viewer@geoquery.ai": {"email": "viewer@geoquery.ai", "role": "Viewer", "name": "Field Officer"}
        }
        self.audit_logs = []

    def log_audit(self, user_email: str, action: str, resource: str, status: str = "SUCCESS"):
        """Record auditable actions in session log"""
        log_entry = {
            "timestamp": time.time(),
            "user": user_email,
            "action": action,
            "resource": resource,
            "status": status
        }
        self.audit_logs.append(log_entry)
        logger.info(f"AUDIT LOG: User {user_email} performed {action} on {resource} - {status}")

    def create_jwt_token(self, payload: dict) -> str:
        """Encode token using safe base64 simulation"""
        payload["exp"] = time.time() + 3600  # 1 hour expiration
        header = {"alg": "HS256", "typ": "JWT"}
        
        header_b64 = base64.urlsafe_b64encode(json.dumps(header).encode()).decode().rstrip("=")
        payload_b64 = base64.urlsafe_b64encode(json.dumps(payload).encode()).decode().rstrip("=")
        signature = base64.urlsafe_b64encode(f"{header_b64}.{payload_b64}.secret_key".encode()).decode().rstrip("=")
        
        return f"{header_b64}.{payload_b64}.{signature}"

    def decode_jwt_token(self, token: str) -> Optional[dict]:
        """Decode base64 JWT payload"""
        try:
            parts = token.split(".")
            if len(parts) != 3:
                return None
                
            payload_part = parts[1]
            # Add padding back if missing
            padding = len(payload_part) % 4
            if padding:
                payload_part += "=" * (4 - padding)
                
            payload = json.loads(base64.urlsafe_b64decode(payload_part.encode()).decode())
            if payload.get("exp", 0) < time.time():
                logger.warning("Simulated JWT token has expired.")
                return None
            return payload
        except Exception as e:
            logger.error(f"Error decoding simulated JWT token: {str(e)}")
            return None

    def login_user(self, email: str, password: str) -> Optional[Dict[str, Any]]:
        """Verify user credentials and return profile & JWT"""
        user = self.users.get(email.lower())
        if user:
            # For demo, allow simple login
            token = self.create_jwt_token({"email": user["email"], "role": user["role"]})
            self.log_audit(email, "LOGIN", "JWT_AUTHENTICATION")
            return {
                "token": token,
                "role": user["role"],
                "name": user["name"],
                "email": user["email"]
            }
        self.log_audit(email, "LOGIN_FAILED", "JWT_AUTHENTICATION", "FAILED")
        return None

    def oauth_login(self, provider: str, code: str) -> Optional[Dict[str, Any]]:
        """Simulate Google / GitHub OAuth callback exchange"""
        email = f"oauth_{provider.lower()}@geoquery.ai"
        role = "Manager"
        name = f"OAuth {provider.capitalize()} User"
        
        # Save into temp users
        self.users[email] = {"email": email, "role": role, "name": name}
        token = self.create_jwt_token({"email": email, "role": role})
        
        self.log_audit(email, f"OAUTH_{provider.upper()}_LOGIN", "OAUTH_CALLBACK")
        return {
            "token": token,
            "role": role,
            "name": name,
            "email": email
        }

    def verify_role_permission(self, token: str, required_roles: List[str]) -> bool:
        """Enforce RBAC role checking"""
        payload = self.decode_jwt_token(token)
        if not payload:
            return False
        
        user_role = payload.get("role", "Viewer")
        
        # Admin can access everything
        if user_role == "Admin":
            return True
            
        if user_role in required_roles:
            return True
            
        return False

    def verify_email(self, email: str) -> bool:
        """Mark user email as verified"""
        user = self.users.get(email.lower())
        if user:
            user["is_verified"] = True
            self.log_audit(email, "EMAIL_VERIFICATION", "USER_ACCOUNT")
            return True
        return False

    def request_password_reset(self, email: str) -> bool:
        """Trigger password reset dispatch simulation"""
        user = self.users.get(email.lower())
        if user:
            self.log_audit(email, "PASSWORD_RESET_REQUEST", "USER_ACCOUNT")
            return True
        return False

    def verify_mfa_code(self, email: str, code: str) -> bool:
        """Verify MFA code token"""
        user = self.users.get(email.lower())
        if user and code == "123456": # Demo verification code
            self.log_audit(email, "MFA_VALIDATION", "MFA_MODULE")
            return True
        self.log_audit(email, "MFA_FAILED", "MFA_MODULE", "FAILED")
        return False

auth_service = AuthService()
