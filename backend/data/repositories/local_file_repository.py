import os
import shutil
from typing import List
from domain.entities import FileItem
from domain.interfaces import FileRepository

class LocalFileRepository(FileRepository):
    def __init__(self, base_data_dir: str):
        self.base_data_dir = base_data_dir

    def _get_user_dir(self, user_id: str) -> str:
        d = os.path.join(self.base_data_dir, user_id)
        if not os.path.exists(d):
            os.makedirs(d)
        return d

    def _resolve_path(self, user_id: str, relative_path: str) -> str:
        user_dir = os.path.abspath(self._get_user_dir(user_id))
        target_path = os.path.abspath(os.path.join(user_dir, relative_path.lstrip('/')))
        if not target_path.startswith(user_dir):
            raise Exception("Access denied: Invalid path")
        return target_path

    def list_files(self, user_id: str, relative_dir: str) -> List[FileItem]:
        target_dir = self._resolve_path(user_id, relative_dir)
        if not os.path.isdir(target_dir):
            raise Exception("Directory not found")
        
        items = []
        for name in os.listdir(target_dir):
            full_path = os.path.join(target_dir, name)
            stat = os.stat(full_path)
            items.append(FileItem(
                name=name,
                path=os.path.relpath(full_path, self._get_user_dir(user_id)),
                is_dir=os.path.isdir(full_path),
                size=stat.st_size,
                last_modified=stat.st_mtime
            ))
        return items

    def read_file(self, user_id: str, relative_path: str) -> str:
        target_path = self._resolve_path(user_id, relative_path)
        if not os.path.isfile(target_path):
            raise Exception("File not found")
        # Ensure it's a plaintext/json/env
        if not any(target_path.endswith(ext) for ext in ['.txt', '.log', '.json', '.env', '.md', '.yml', '.yaml']):
            # It's an extra layer of safety, but we'll allow reading as string if decodable
            pass
            
        with open(target_path, 'r', encoding='utf-8') as f:
            return f.read()

    def write_file(self, user_id: str, relative_path: str, content: str) -> None:
        target_path = self._resolve_path(user_id, relative_path)
        with open(target_path, 'w', encoding='utf-8') as f:
            f.write(content)

    def delete_file(self, user_id: str, relative_path: str) -> None:
        target_path = self._resolve_path(user_id, relative_path)
        if os.path.isfile(target_path):
            os.remove(target_path)

    def create_dir(self, user_id: str, relative_path: str) -> None:
        target_path = self._resolve_path(user_id, relative_path)
        os.makedirs(target_path, exist_ok=True)

    def delete_dir(self, user_id: str, relative_path: str) -> None:
        target_path = self._resolve_path(user_id, relative_path)
        if os.path.isdir(target_path):
            shutil.rmtree(target_path)
