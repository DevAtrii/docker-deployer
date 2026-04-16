from abc import ABC, abstractmethod
from typing import List, Optional, Dict
from domain.entities import User, ContainerInfo, ImageInfo, FileItem

class UserRepository(ABC):
    @abstractmethod
    def get_by_id(self, user_id: str) -> Optional[User]:
        pass

    @abstractmethod
    def get_by_username(self, username: str) -> Optional[User]:
        pass

    @abstractmethod
    def save(self, user: User) -> None:
        pass
        
    @abstractmethod
    def get_all(self) -> List[User]:
        pass
        
    @abstractmethod
    def delete(self, user_id: str) -> None:
        pass

class DockerRepository(ABC):
    @abstractmethod
    def check_connection(self) -> dict:
        """Returns {'connected': bool, 'error': str|None}"""
        pass

    @abstractmethod
    def list_containers(self, user_id: str) -> List[ContainerInfo]:
        pass
        
    @abstractmethod
    def deploy_container(self, user: User, name: str, image: str, port_mappings: Dict[str, str]) -> ContainerInfo:
        pass
        
    @abstractmethod
    def start_container(self, user_id: str, container_id: str) -> None:
        pass
        
    @abstractmethod
    def stop_container(self, user_id: str, container_id: str) -> None:
        pass
        
    @abstractmethod
    def pause_container(self, user_id: str, container_id: str) -> None:
        pass
        
    @abstractmethod
    def resume_container(self, user_id: str, container_id: str) -> None:
        pass
        
    @abstractmethod
    def delete_container(self, user_id: str, container_id: str) -> None:
        pass
        
    @abstractmethod
    def get_logs(self, user_id: str, container_id: str, limit: int = 100, page: int = 1) -> tuple[str, bool]:
        pass
        
    @abstractmethod
    def get_stats(self, user_id: str, container_id: str) -> dict:
        pass

    @abstractmethod
    def list_images(self, user: User) -> List[ImageInfo]:
        pass
        
    @abstractmethod
    def pull_image_streaming(self, user: User, image_name: str, token_alias: Optional[str] = None):
        """Returns a generator yielding pull progress dicts."""
        pass
        
    @abstractmethod
    def track_user_image(self, user: User, image_name: str) -> None:
        """Mark an image as tracked by the user."""
        pass
        
    @abstractmethod
    def remove_image(self, user: User, image_name: str) -> None:
        pass

    @abstractmethod
    def test_login(self, username: str, token: str, registry: str) -> None:
        """Throws exception if login fails."""
        pass

class FileRepository(ABC):
    @abstractmethod
    def list_files(self, user_id: str, relative_dir: str) -> List[FileItem]:
        pass
        
    @abstractmethod
    def read_file(self, user_id: str, relative_path: str) -> str:
        pass
        
    @abstractmethod
    def write_file(self, user_id: str, relative_path: str, content: str) -> None:
        pass
        
    @abstractmethod
    def delete_file(self, user_id: str, relative_path: str) -> None:
        pass
        
    @abstractmethod
    def create_dir(self, user_id: str, relative_path: str) -> None:
        pass
        
    @abstractmethod
    def delete_dir(self, user_id: str, relative_path: str) -> None:
        pass
