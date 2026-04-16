import json
import os
from typing import List, Optional
from domain.entities import User
from domain.interfaces import UserRepository

class JSONUserRepository(UserRepository):
    def __init__(self, data_dir: str):
        self.data_dir = data_dir
        self.file_path = os.path.join(data_dir, "users.json")
        self._ensure_file()

    def _ensure_file(self):
        if not os.path.exists(self.data_dir):
            os.makedirs(self.data_dir)
        if not os.path.exists(self.file_path):
            with open(self.file_path, "w") as f:
                json.dump([], f)

    def _read_users(self) -> List[User]:
        with open(self.file_path, "r") as f:
            data = json.load(f)
        return [User(**u) for u in data]

    def _write_users(self, users: List[User]):
        with open(self.file_path, "w") as f:
            json.dump([u.__dict__ for u in users], f, indent=2)

    def get_by_id(self, user_id: str) -> Optional[User]:
        users = self._read_users()
        return next((u for u in users if u.id == user_id), None)

    def get_by_username(self, username: str) -> Optional[User]:
        users = self._read_users()
        return next((u for u in users if u.username == username), None)

    def save(self, user: User) -> None:
        users = self._read_users()
        idx = next((i for i, u in enumerate(users) if u.id == user.id), -1)
        if idx >= 0:
            users[idx] = user
        else:
            users.append(user)
        self._write_users(users)

    def get_all(self) -> List[User]:
        return self._read_users()

    def delete(self, user_id: str) -> None:
        users = self._read_users()
        users = [u for u in users if u.id != user_id]
        self._write_users(users)
