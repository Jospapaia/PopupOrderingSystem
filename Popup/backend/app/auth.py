import os
from fastapi import HTTPException, Security
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

_bearer = HTTPBearer(auto_error=False)


def require_admin(credentials: HTTPAuthorizationCredentials = Security(_bearer)) -> None:
    admin_password = os.environ.get("ADMIN_PASSWORD")
    if not admin_password:
        raise HTTPException(status_code=503, detail="שגיאת תצורת שרת — צור קשר עם מנהל המערכת")
    if credentials is None or credentials.credentials != admin_password:
        raise HTTPException(status_code=401, detail="Unauthorized")
