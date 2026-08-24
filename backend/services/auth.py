from sqlalchemy.orm import Session
from backend.models.user import User


class AuthService:

    @staticmethod
    def authenticate_user(db: Session, email: str, password: str):
        """
        Busca usuario por email y compara password en texto plano.
        Retorna el usuario si es válido, None si no.
        """
        user = db.query(User).filter(User.email == email).first()
        if not user:
            return None
        if user.password != password:
            return None
        if not user.is_active:
            return None
        return user
