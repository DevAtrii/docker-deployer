import jwt
import datetime
from werkzeug.security import generate_password_hash, check_password_hash
from domain.entities import User
from domain.interfaces import UserRepository
import uuid

class AuthUseCases:
    def __init__(self, user_repo: UserRepository, secret_key: str):
        self.user_repo = user_repo
        self.secret_key = secret_key

    def is_admin_setup(self) -> bool:
        """Returns True if at least one admin user exists."""
        users = self.user_repo.get_all()
        return any(u.role == 'admin' for u in users)

    def setup_admin(self, username: str, password: str) -> User:
        """Creates the very first admin user. Only callable when no admin exists."""
        if self.is_admin_setup():
            raise Exception("Admin account already exists.")
        if not username or not password:
            raise Exception("Username and password are required.")
        if self.user_repo.get_by_username(username):
            raise Exception("Username already taken.")

        user = User(
            id=str(uuid.uuid4()),
            username=username,
            password_hash=generate_password_hash(password, method='pbkdf2:sha256'),
            role='admin',
            port_range='1024-65535',
            storage_limit_mb=0,  # unlimited
            cpu_limit=0.0,       # unlimited
            ram_limit_mb=0       # unlimited
        )
        self.user_repo.save(user)
        return user

    def create_user(self, username: str, password: str,
                    port_range: str = '12000-13000',
                    storage_limit_mb: int = 5120,
                    cpu_limit: float = 0.0,
                    ram_limit_mb: int = 1024) -> User:
        """Admin-only: create a regular user account."""
        if not username or not password:
            raise Exception("Username and password are required.")
        if self.user_repo.get_by_username(username):
            raise Exception("Username already exists.")

        user = User(
            id=str(uuid.uuid4()),
            username=username,
            password_hash=generate_password_hash(password, method='pbkdf2:sha256'),
            role='user',
            port_range=port_range,
            storage_limit_mb=storage_limit_mb,
            cpu_limit=cpu_limit,
            ram_limit_mb=ram_limit_mb,
        )
        self.user_repo.save(user)
        return user

    def update_user(self, user_id: str, port_range: str = None,
                    storage_limit_mb: int = None, cpu_limit: float = None,
                    ram_limit_mb: int = None,
                    password: str = None) -> User:
        """Admin-only: update a user's settings."""
        user = self.user_repo.get_by_id(user_id)
        if not user:
            raise Exception("User not found.")
        if port_range is not None:
            user.port_range = port_range
        if storage_limit_mb is not None:
            user.storage_limit_mb = storage_limit_mb
        if cpu_limit is not None:
            user.cpu_limit = cpu_limit
        if ram_limit_mb is not None:
            user.ram_limit_mb = ram_limit_mb
        if password:
            user.password_hash = generate_password_hash(password, method='pbkdf2:sha256')
        self.user_repo.save(user)
        return user

    def login(self, username: str, password: str):
        """Returns (token, user) on success."""
        user = self.user_repo.get_by_username(username)
        if not user or not check_password_hash(user.password_hash, password):
            raise Exception("Invalid credentials")

        token = jwt.encode({
            'user_id': user.id,
            'role': user.role,
            'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=24)
        }, self.secret_key, algorithm='HS256')

        return token, user

    def impersonate(self, target_user_id: str) -> tuple:
        """Admin generates a short-lived JWT for another user (impersonation)."""
        user = self.user_repo.get_by_id(target_user_id)
        if not user:
            raise Exception("User not found.")
        if user.role == 'admin':
            raise Exception("Cannot impersonate another admin account.")
        # Shorter TTL for safety: 2h
        token = jwt.encode({
            'user_id': user.id,
            'role': user.role,
            'impersonated': True,
            'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=2)
        }, self.secret_key, algorithm='HS256')
        return token, user

    def get_user_by_id(self, user_id: str) -> User:
        user = self.user_repo.get_by_id(user_id)
        if not user:
            raise Exception("User not found.")
        return user

    def verify_token(self, token: str) -> dict:
        try:
            data = jwt.decode(token, self.secret_key, algorithms=['HS256'])
            return data
        except jwt.ExpiredSignatureError:
            raise Exception("Token expired")
        except jwt.InvalidTokenError:
            raise Exception("Invalid token")
