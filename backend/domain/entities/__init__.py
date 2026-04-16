from dataclasses import dataclass, field
from typing import List, Optional, Dict

@dataclass
class DockerToken:
    alias: str
    token: str  # stored server-side, never returned to frontend

@dataclass
class User:
    id: str
    username: str
    password_hash: str
    role: str  # 'admin' or 'user'
    port_range: str  # e.g. "12000-13000"
    storage_limit_mb: int = 0   # 0 = unlimited
    cpu_limit: float = 0.0      # CPU cores, 0.0 = unlimited
    ram_limit_mb: int = 0       # 0 = unlimited
    docker_hub_token: Optional[str] = None  # legacy compat
    docker_tokens: List[dict] = field(default_factory=list)  # [{alias, token, username}]

    def dict(self):
        return {
            "id": self.id,
            "username": self.username,
            "role": self.role,
            "port_range": self.port_range,
            "storage_limit_mb": self.storage_limit_mb,
            "cpu_limit": self.cpu_limit,
            "ram_limit_mb": self.ram_limit_mb,
            "token_aliases": [t["alias"] for t in self.docker_tokens],
            "tokens_detailed": [{"alias": t["alias"], "username": t.get("username")} for t in self.docker_tokens],
        }

@dataclass
class ContainerInfo:
    id: str
    name: str
    status: str
    image: str
    ports: Dict[str, str]
    created: str

@dataclass
class ImageInfo:
    id: str
    tags: List[str]
    size: int
    created: str

@dataclass
class FileItem:
    name: str
    path: str
    is_dir: bool
    size: int
    last_modified: float
