import uuid
import threading
from typing import List, Dict, Optional
from domain.entities import ContainerInfo
from domain.interfaces import DockerRepository, UserRepository

class ContainerUseCases:
    def __init__(self, docker_repo: DockerRepository, user_repo: UserRepository, data_dir: str = ''):
        self.docker_repo = docker_repo
        self.user_repo = user_repo
        self.data_dir = data_dir
        self.active_redeploys: dict = {}

    def check_docker_connection(self) -> dict:
        return self.docker_repo.check_connection()

    def get_docker_info(self) -> dict:
        return self.docker_repo.docker_info()

    def list_containers(self, user_id: str) -> List[ContainerInfo]:
        return self.docker_repo.list_containers(user_id)

    def deploy_container(self, user_id: str, name: str, image: str,
                         port_mappings: Dict[str, str],
                         volumes: Optional[List[Dict]] = None,
                         mem_limit: Optional[str] = None,
                         memswap_limit: Optional[str] = None,
                         cpu_limit: Optional[float] = None) -> ContainerInfo:
        user = self.user_repo.get_by_id(user_id)
        if not user:
            raise Exception("User not found")
        return self.docker_repo.deploy_container(
            user, name, image, port_mappings,
            volumes=volumes, base_data_dir=self.data_dir,
            mem_limit=mem_limit, memswap_limit=memswap_limit,
            cpu_limit=cpu_limit
        )

    def start_container(self, user_id: str, container_id: str) -> None:
        self.docker_repo.start_container(user_id, container_id)

    def stop_container(self, user_id: str, container_id: str) -> None:
        self.docker_repo.stop_container(user_id, container_id)

    def pause_container(self, user_id: str, container_id: str) -> None:
        self.docker_repo.pause_container(user_id, container_id)

    def resume_container(self, user_id: str, container_id: str) -> None:
        self.docker_repo.resume_container(user_id, container_id)

    def delete_container(self, user_id: str, container_id: str) -> None:
        self.docker_repo.delete_container(user_id, container_id)

    def get_logs(self, user_id: str, container_id: str, limit: int = 100, page: int = 1) -> tuple[str, bool]:
        return self.docker_repo.get_logs(user_id, container_id, limit, page)

    def get_stats(self, user_id: str, container_id: str) -> dict:
        return self.docker_repo.get_stats(user_id, container_id)

    # ── redeploy ───────────────────────────────────────────────────────────────

    def get_redeploy_status(self, task_id: str) -> dict:
        if task_id not in self.active_redeploys:
            raise Exception("Redeploy task not found.")
        return self.active_redeploys[task_id]

    def redeploy_container_async(self, user_id: str, container_id: str) -> str:
        """
        Fire-and-forget redeploy:
        1. Inspect current config
        2. Pull fresh image (streaming)
        3. Stop & remove old container
        4. Redeploy with exact same config
        """
        user = self.user_repo.get_by_id(user_id)
        if not user:
            raise Exception("User not found")

        # Grab config before the background thread starts so errors surface immediately
        config = self.docker_repo.inspect_container_config(user_id, container_id)

        task_id = str(uuid.uuid4())
        self.active_redeploys[task_id] = {
            'status': 'starting',
            'phase': 'Inspecting container config',
            'logs': [f"Redeploying container: {config['name']}",
                     f"Image: {config['image']}"],
            'container_name': config['name'],
            'image': config['image'],
        }

        def worker():
            task = self.active_redeploys[task_id]
            def log(msg: str):
                task['logs'].append(msg)

            try:
                image = config['image']
                name = config['name']
                port_bindings = config['port_bindings']
                volume_binds = config['volume_binds']

                # ── Step 1: pull ──────────────────────────────────────────────
                task['phase'] = 'Pulling latest image'
                task['status'] = 'running'
                log(f"\n[1/3] Pulling {image}...")
                try:
                    for line in self.docker_repo.pull_image_streaming(user, image):
                        status_line = line.get('status', '')
                        if 'id' in line:
                            status_line = f"  {line['id']}: {status_line}"
                        if 'progress' in line:
                            status_line += f" {line['progress']}"
                        if 'errorDetail' in line:
                            raise Exception(line['errorDetail'].get('message', 'Pull error'))
                        log(status_line)
                except Exception as pull_err:
                    raise Exception(f"Pull failed: {pull_err}")

                # ── Step 2: stop & remove old container ───────────────────────
                task['phase'] = 'Removing old container'
                log(f"\n[2/3] Stopping and removing old container...")
                try:
                    self.docker_repo.delete_container(user_id, container_id)
                    log("  Old container removed.")
                except Exception as rm_err:
                    log(f"  Warning during remove: {rm_err}")

                # ── Step 3: redeploy ──────────────────────────────────────────
                task['phase'] = 'Redeploying'
                log(f"\n[3/3] Redeploying {name}...")

                # Convert raw docker bind strings back to volume_binds dict
                raw_binds: dict = {}
                for bind_str in volume_binds:
                    parts = bind_str.split(':')
                    if len(parts) >= 2:
                        mode = parts[2] if len(parts) >= 3 else 'rw'
                        raw_binds[parts[0]] = {'bind': parts[1], 'mode': mode}

                # Determine final CPU limit (use container's specific limit, capped by user's global limit)
                container_cpu_limit = config.get('cpu_limit')
                final_cpu_limit = user.cpu_limit
                if container_cpu_limit is not None:
                    if user.cpu_limit > 0:
                        final_cpu_limit = min(container_cpu_limit, user.cpu_limit)
                    else:
                        final_cpu_limit = container_cpu_limit
                
                nano_cpus = int(final_cpu_limit * 1e9) if final_cpu_limit > 0 else None

                mem_limit = config.get('mem_limit')
                memswap_limit = config.get('memswap_limit')

                c = self.docker_repo.client.containers.run(
                    image,
                    detach=True,
                    name=self.docker_repo._get_prefix(user_id) + name,
                    ports=port_bindings or {},
                    volumes=raw_binds or None,
                    nano_cpus=nano_cpus,
                    mem_limit=mem_limit,
                    memswap_limit=memswap_limit,
                )
                log(f"  Container started: {c.short_id}")
                task['phase'] = 'Done'
                task['status'] = 'completed'
                task['new_container_id'] = c.id

            except Exception as e:
                task['status'] = 'error'
                task['phase'] = 'Failed'
                task['logs'].append(f"\nError: {str(e)}")

        threading.Thread(target=worker, daemon=True).start()
        return task_id

    # ── admin ops ─────────────────────────────────────────────────────────────

    def admin_list_containers(self, user_id: str) -> List[ContainerInfo]:
        return self.docker_repo.admin_list_containers(user_id)

    def admin_stop_container(self, container_id: str) -> None:
        self.docker_repo.admin_stop_container(container_id)

    def admin_pause_container(self, container_id: str) -> None:
        self.docker_repo.admin_pause_container(container_id)

    def admin_remove_container(self, container_id: str) -> None:
        self.docker_repo.admin_remove_container(container_id)
