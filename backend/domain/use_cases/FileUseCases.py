from typing import List
from domain.entities import FileItem
from domain.interfaces import FileRepository

class FileUseCases:
    def __init__(self, file_repo: FileRepository):
        self.file_repo = file_repo

    def list_files(self, user_id: str, relative_dir: str) -> List[FileItem]:
        return self.file_repo.list_files(user_id, relative_dir)

    def read_file(self, user_id: str, relative_path: str) -> str:
        return self.file_repo.read_file(user_id, relative_path)

    def write_file(self, user_id: str, relative_path: str, content: str) -> None:
        self.file_repo.write_file(user_id, relative_path, content)

    def delete_file(self, user_id: str, relative_path: str) -> None:
        self.file_repo.delete_file(user_id, relative_path)

    def create_dir(self, user_id: str, relative_path: str) -> None:
        self.file_repo.create_dir(user_id, relative_path)

    def delete_dir(self, user_id: str, relative_path: str) -> None:
        self.file_repo.delete_dir(user_id, relative_path)
