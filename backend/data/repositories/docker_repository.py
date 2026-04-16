import docker
import json
import os
from typing import List, Dict, Optional
from domain.entities import ContainerInfo, ImageInfo, User
from domain.interfaces import DockerRepository

# Common Docker socket paths on macOS (Desktop) and Linux
_SOCKET_CANDIDATES = [
    'unix:///var/run/docker.sock',
    os.path.expanduser('~/.docker/run/docker.sock'),
    os.path.expanduser('~/.docker/desktop/run/docker.sock'),
]

def _find_docker_client():
    """Try multiple socket paths to connect. Raise descriptive error if none work."""
    docker_host = os.environ.get('DOCKER_HOST')
    if docker_host:
        return docker.DockerClient(base_url=docker_host)

    for sock in _SOCKET_CANDIDATES:
        path = sock[len('unix://'):] if sock.startswith('unix://') else sock
        if os.path.exists(path):
            try:
                client = docker.DockerClient(base_url=f'unix://{path}')
                client.ping()
                return client
            except Exception:
                continue

    raise Exception(
        "Cannot connect to the Docker daemon. "
        "Make sure Docker Desktop is running, or set the DOCKER_HOST environment variable."
    )


class DockerSDKRepository(DockerRepository):
    def __init__(self, data_dir: str):
        self._client = None
        self.images_record_file = os.path.join(data_dir, "images.json")
        if not os.path.exists(self.images_record_file):
            with open(self.images_record_file, "w") as f:
                json.dump({}, f)

    @property
    def client(self):
        if self._client is None:
            self._client = _find_docker_client()
        return self._client

    # ── connection ────────────────────────────────────────────────────────────

    def check_connection(self) -> dict:
        try:
            self.client.ping()
            info = self.client.info()
            return {
                'connected': True,
                'error': None,
                'version': info.get('ServerVersion', 'unknown'),
            }
        except Exception as e:
            self._client = None
            return {'connected': False, 'error': str(e)}

    def docker_info(self) -> dict:
        """Return rich Docker daemon info for the dashboard."""
        try:
            info = self.client.info()
            version = self.client.version()
            all_containers = self.client.containers.list(all=True)
            running = [c for c in all_containers if c.status == 'running']
            return {
                'connected': True,
                'server_version': info.get('ServerVersion', 'N/A'),
                'api_version': version.get('ApiVersion', 'N/A'),
                'os': info.get('OperatingSystem', 'N/A'),
                'arch': info.get('Architecture', 'N/A'),
                'total_memory_mb': round(info.get('MemTotal', 0) / 1024 / 1024),
                'cpus': info.get('NCPU', 0),
                'total_containers': info.get('Containers', 0),
                'running_containers': info.get('ContainersRunning', 0),
                'paused_containers': info.get('ContainersPaused', 0),
                'stopped_containers': info.get('ContainersStopped', 0),
                'total_images': info.get('Images', 0),
                'storage_driver': info.get('Driver', 'N/A'),
            }
        except Exception as e:
            self._client = None
            return {'connected': False, 'error': str(e)}

    # ── helpers ───────────────────────────────────────────────────────────────

    def _get_prefix(self, user_id: str) -> str:
        return f"dd_{user_id}_"

    def _get_user_images(self, user_id: str) -> List[str]:
        with open(self.images_record_file, "r") as f:
            return json.load(f).get(user_id, [])

    def _add_user_image(self, user_id: str, image_name: str):
        with open(self.images_record_file, "r") as f:
            data = json.load(f)
        data.setdefault(user_id, [])
        if image_name not in data[user_id]:
            data[user_id].append(image_name)
        with open(self.images_record_file, "w") as f:
            json.dump(data, f)

    def _remove_user_image(self, user_id: str, image_name: str):
        with open(self.images_record_file, "r") as f:
            data = json.load(f)
        if user_id in data and image_name in data[user_id]:
            data[user_id].remove(image_name)
        with open(self.images_record_file, "w") as f:
            json.dump(data, f)

    def _get_container(self, user_id: str, container_id: str):
        container = self.client.containers.get(container_id)
        if not container.name.startswith(self._get_prefix(user_id)):
            raise Exception("Access denied: Not your container")
        return container

    def _parse_container(self, c, user_id: str) -> ContainerInfo:
        prefix = self._get_prefix(user_id)
        display_name = c.name[len(prefix):] if c.name.startswith(prefix) else c.name
        ports = {}
        for container_port, host_bindings in c.attrs['NetworkSettings']['Ports'].items():
            if host_bindings:
                for b in host_bindings:
                    ports[container_port] = b['HostPort']
        return ContainerInfo(
            id=c.id,
            name=display_name,
            status=c.status,
            image=c.image.tags[0] if c.image.tags else c.attrs['Config']['Image'],
            ports=ports,
            created=c.attrs['Created']
        )

    # ── containers ────────────────────────────────────────────────────────────

    def list_containers(self, user_id: str) -> List[ContainerInfo]:
        prefix = self._get_prefix(user_id)
        return [
            self._parse_container(c, user_id)
            for c in self.client.containers.list(all=True)
            if c.name.startswith(prefix)
        ]

    def deploy_container(self, user: User, name: str, image: str,
                         port_mappings: Dict[str, str],
                         volumes: Optional[List[Dict]] = None,
                         base_data_dir: Optional[str] = None,
                         mem_limit: Optional[str] = None,
                         memswap_limit: Optional[str] = None,
                         cpu_limit: Optional[float] = None) -> ContainerInfo:
        """
        volumes: list of {host_path: str, container_path: str, mode: 'ro'|'rw'}
        host_path is relative to user's storage dir; we resolve & validate it.
        """
        prefix = self._get_prefix(user.id)
        container_name = f"{prefix}{name}"

        # Validate port range
        if port_mappings:
            allowed_start, allowed_end = map(int, user.port_range.split('-'))
            for _, host_port in port_mappings.items():
                if not (allowed_start <= int(host_port) <= allowed_end):
                    raise Exception(f"Port {host_port} is outside your allowed range {user.port_range}")

        # Validate & resolve volume mounts
        volume_binds = {}
        if volumes and base_data_dir:
            user_dir = os.path.abspath(os.path.join(base_data_dir, user.id))
            for v in volumes:
                raw_host = v.get('host_path', '').lstrip('/')
                container_path = v.get('container_path', '')
                mode = v.get('mode', 'rw')
                if not raw_host or not container_path:
                    continue
                abs_host = os.path.abspath(os.path.join(user_dir, raw_host))
                # Security: must be within user dir and must exist
                if not abs_host.startswith(user_dir):
                    raise Exception(f"Volume path '{raw_host}' is outside your storage directory.")
                if not os.path.exists(abs_host):
                    raise Exception(f"Volume path '{raw_host}' does not exist in your storage.")
                volume_binds[abs_host] = {'bind': container_path, 'mode': mode}

        # Memory limit validation
        mem_limit_bytes = 0
        if mem_limit:
            if mem_limit.endswith('m'):
                mem_limit_bytes = int(mem_limit[:-1])
            elif mem_limit.endswith('g'):
                mem_limit_bytes = int(mem_limit[:-1]) * 1024
            
            if user.ram_limit_mb > 0 and mem_limit_bytes > user.ram_limit_mb:
                raise Exception(f"Memory limit {mem_limit} exceeds your allowed limit of {user.ram_limit_mb} MB")

        # CPU limit validation
        final_cpu_limit = user.cpu_limit
        if cpu_limit is not None:
            if user.cpu_limit > 0 and cpu_limit > user.cpu_limit:
                raise Exception(f"CPU limit {cpu_limit} vCPUs exceeds your allowed limit of {user.cpu_limit} vCPUs")
            final_cpu_limit = cpu_limit

        c = self.client.containers.run(
            image,
            detach=True,
            name=container_name,
            ports=port_mappings or {},
            volumes=volume_binds or None,
            # Enforce CPU limit: nano_cpus = cores * 1e9; 0 = unlimited
            nano_cpus=int(final_cpu_limit * 1e9) if final_cpu_limit > 0 else (0 or None),
            mem_limit=mem_limit,
            memswap_limit=memswap_limit,
        )
        for cont in self.list_containers(user.id):
            if cont.id == c.id:
                return cont
        return self.list_containers(user.id)[-1]

    def start_container(self, user_id: str, container_id: str) -> None:
        self._get_container(user_id, container_id).start()

    def stop_container(self, user_id: str, container_id: str) -> None:
        self._get_container(user_id, container_id).stop()

    def pause_container(self, user_id: str, container_id: str) -> None:
        self._get_container(user_id, container_id).pause()

    def resume_container(self, user_id: str, container_id: str) -> None:
        self._get_container(user_id, container_id).unpause()

    def delete_container(self, user_id: str, container_id: str) -> None:
        c = self._get_container(user_id, container_id)
        c.stop(timeout=1)
        c.remove(force=True)

    def inspect_container_config(self, user_id: str, container_id: str) -> dict:
        """Extract image, ports, volumes, and name from a live container for redeploy."""
        c = self._get_container(user_id, container_id)
        attrs = c.attrs

        # image tag
        image = (c.image.tags[0] if c.image.tags else attrs['Config']['Image'])

        # port bindings: {container_port/proto: host_port}
        port_bindings = {}
        raw_bindings = (attrs.get('HostConfig') or {}).get('PortBindings') or {}
        for cp, hbs in raw_bindings.items():
            if hbs:
                port_bindings[cp] = hbs[0]['HostPort']

        # volume binds: keep as raw docker bind strings e.g. ["/host/path:/ctr/path:rw"]
        volume_binds = (attrs.get('HostConfig') or {}).get('Binds') or []

        # strip prefix from name
        prefix = self._get_prefix(user_id)
        short_name = c.name.removeprefix('/')
        if short_name.startswith(prefix):
            short_name = short_name[len(prefix):]

        host_config = attrs.get('HostConfig') or {}
        # Convert bytes back to m/g for easier re-deployment if they exist
        mem_limit_bytes = host_config.get('Memory', 0)
        memswap_bytes = host_config.get('MemorySwap', 0)
        
        mem_limit = f"{mem_limit_bytes // (1024*1024)}m" if mem_limit_bytes > 0 else None
        memswap_limit = f"{memswap_bytes // (1024*1024)}m" if memswap_bytes > 0 else None

        cpu_nano = host_config.get('NanoCpus', 0)
        cpu_limit = float(cpu_nano) / 1e9 if cpu_nano > 0 else None

        return {
            'image': image,
            'name': short_name,
            'port_bindings': port_bindings,
            'volume_binds': volume_binds,
            'mem_limit': mem_limit,
            'memswap_limit': memswap_limit,
            'cpu_limit': cpu_limit,
        }

    def get_logs(self, user_id: str, container_id: str, limit: int = 100, page: int = 1) -> tuple[str, bool]:
        c = self._get_container(user_id, container_id)
        if str(limit).lower() == 'all':
             return c.logs().decode('utf-8', errors='replace'), False
        
        # Request one extra line to see if there's more for the next page
        fetch_tail = (limit * page) + 1
        raw_logs = c.logs(tail=fetch_tail).decode('utf-8', errors='replace')
        lines = raw_logs.splitlines()
        
        has_more = len(lines) > (limit * page)
        
        # If we have the extra line, skip it for the current page slice
        # If has_more is true, lines[0] is the extra line from the previous page's perspective
        if has_more:
            # We have 101 lines. We want the last 100 for the current page?
            # Wait, if Page 1 (limit 100) -> fetch 101. We want lines[1:].
            # If Page 2 (limit 100) -> fetch 201. We want lines[1:101].
            current_page_lines = lines[1:limit+1]
        else:
            # We got fewer lines than requested, so we have everything from the start up to limit*page
            # We want the oldest 'limit' lines of this bunch.
            # e.g. total 150 lines. Page 2 (limit 100) fetches 201. Gets 150.
            # We want lines 0 to 50.
            # Page 1 fetches 101. Gets 150? No, tail=101 gets last 101.
            # This is getting confusing. Let's simplify.
            
            # If has_more is False, it means lines contains ALL logs from the start of the container
            # up to the point where page 1 ends.
            # If page=1, it's just the last 100 (or fewer).
            # If page=2, it's the logs from 0 to 100.
            current_page_lines = lines[:limit]

        return "\n".join(current_page_lines), has_more

    def get_stats(self, user_id: str, container_id: str) -> dict:
        return self._get_container(user_id, container_id).stats(stream=False)

    # ── admin ops (bypass user prefix check) ─────────────────────────────────

    def admin_list_containers(self, user_id: str) -> List[ContainerInfo]:
        """Admin: list containers belonging to a specific user."""
        return self.list_containers(user_id)

    def admin_stop_container(self, container_id: str) -> None:
        self.client.containers.get(container_id).stop()

    def admin_pause_container(self, container_id: str) -> None:
        self.client.containers.get(container_id).pause()

    def admin_remove_container(self, container_id: str) -> None:
        c = self.client.containers.get(container_id)
        c.stop(timeout=1)
        c.remove(force=True)

    # ── images ────────────────────────────────────────────────────────────────

    def list_images(self, user: User) -> List[ImageInfo]:
        result = []
        for img_name in self._get_user_images(user.id):
            try:
                img_obj = self.client.images.get(img_name)
                result.append(ImageInfo(
                    id=img_obj.id,
                    tags=img_obj.tags,
                    size=img_obj.attrs['Size'],
                    created=img_obj.attrs['Created']
                ))
            except docker.errors.ImageNotFound:
                self._remove_user_image(user.id, img_name)
        return result

    def pull_image_streaming(self, user: User, image_name: str, token_alias: Optional[str] = None):
        auth_config = None
        if token_alias:
            entry = next((t for t in user.docker_tokens if t.get('alias') == token_alias), None)
            if not entry:
                raise Exception(f"Token alias '{token_alias}' not found.")
            auth_config = {'username': entry.get('username'), 'password': entry['token']}
        elif user.docker_hub_token:
            auth_config = {'username': user.username, 'password': user.docker_hub_token}

        # Returns a generator yielding JSON dict objects representing progress
        return self.client.api.pull(image_name, stream=True, decode=True, auth_config=auth_config)

    def track_user_image(self, user: User, image_name: str) -> None:
        self._add_user_image(user.id, image_name)

    def remove_image(self, user: User, image_name: str) -> None:
        self._remove_user_image(user.id, image_name)
