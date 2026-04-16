import uuid
import threading
from typing import List, Optional
from domain.entities import ImageInfo
from domain.interfaces import DockerRepository, UserRepository

class ImageUseCases:
    def __init__(self, docker_repo: DockerRepository, user_repo: UserRepository):
        self.docker_repo = docker_repo
        self.user_repo = user_repo
        self.active_pulls = {}

    def get_pull_status(self, task_id: str) -> dict:
        if task_id not in self.active_pulls:
            raise Exception("Task not found")
        return self.active_pulls[task_id]

    def list_images(self, user_id: str) -> List[ImageInfo]:
        user = self.user_repo.get_by_id(user_id)
        if not user:
            raise Exception("User not found")
        return self.docker_repo.list_images(user)

    def pull_image_async(self, user_id: str, image_name: str, token_alias: Optional[str] = None) -> str:
        user = self.user_repo.get_by_id(user_id)
        if not user:
            raise Exception("User not found")
            
        task_id = str(uuid.uuid4())
        self.active_pulls[task_id] = {'status': 'pulling', 'logs': [], 'image_name': image_name}
        
        def pull_worker():
            try:
                # Get the generator
                generator = self.docker_repo.pull_image_streaming(user, image_name, token_alias)
                for line in generator:
                    status_line = line.get('status', '')
                    if 'id' in line:
                        status_line = f"{line['id']}: {status_line}"
                    if 'progress' in line:
                        status_line += f" {line['progress']}"
                    if 'errorDetail' in line:
                        status_line = f"Error: {line['errorDetail'].get('message', '')}"
                    self.active_pulls[task_id]['logs'].append(status_line)
                    # keep logs limited to recent 1000 items
                    if len(self.active_pulls[task_id]['logs']) > 1000:
                        self.active_pulls[task_id]['logs'] = self.active_pulls[task_id]['logs'][-1000:]
                
                # Succeeded
                self.docker_repo.track_user_image(user, image_name)
                self.active_pulls[task_id]['status'] = 'completed'
            except Exception as e:
                self.active_pulls[task_id]['status'] = 'error'
                self.active_pulls[task_id]['logs'].append(f"Error: {str(e)}")

        # start pull fire & forget process
        threading.Thread(target=pull_worker, daemon=True).start()
        return task_id

    def remove_image(self, user_id: str, image_name: str) -> None:
        user = self.user_repo.get_by_id(user_id)
        if not user:
            raise Exception("User not found")
        self.docker_repo.remove_image(user, image_name)

    # ── DockerHub Token Management ──────────────────────────────────────────

    def add_token(self, user_id: str, alias: str, token: str, username: str, registry: Optional[str] = None) -> None:
        user = self.user_repo.get_by_id(user_id)
        if not user:
            raise Exception("User not found")
        if any(t['alias'] == alias for t in user.docker_tokens):
            raise Exception(f"Token alias '{alias}' already exists.")
        
        # Default to Docker Hub if no registry is provided
        registry_url = registry if registry else 'https://index.docker.io/v1/'
        
        user.docker_tokens.append({
            'alias': alias, 
            'token': token, 
            'username': username, 
            'registry': registry_url
        })
        self.user_repo.save(user)

    def update_token(self, user_id: str, alias: str, username: str, registry: Optional[str] = None, token: Optional[str] = None) -> None:
        user = self.user_repo.get_by_id(user_id)
        if not user:
            raise Exception("User not found")
        
        # Find existing token
        entry = next((t for t in user.docker_tokens if t['alias'] == alias), None)
        if not entry:
            raise Exception(f"Token alias '{alias}' not found.")
        
        # Update fields
        entry['username'] = username
        entry['registry'] = registry if registry else 'https://index.docker.io/v1/'
        if token:
            entry['token'] = token
            
        self.user_repo.save(user)

    def delete_token(self, user_id: str, alias: str) -> None:
        user = self.user_repo.get_by_id(user_id)
        if not user:
            raise Exception("User not found")
        user.docker_tokens = [t for t in user.docker_tokens if t['alias'] != alias]
        self.user_repo.save(user)

    def list_token_aliases(self, user_id: str) -> List[str]:
        user = self.user_repo.get_by_id(user_id)
        if not user:
            raise Exception("User not found")
        return [t['alias'] for t in user.docker_tokens]
