from flask import Blueprint, request, jsonify
from dataclasses import asdict
from presentation.middleware.auth_middleware import token_required, admin_required
from domain.interfaces import UserRepository
from domain.use_cases.AuthUseCases import AuthUseCases
from domain.use_cases.ContainerUseCases import ContainerUseCases
from domain.use_cases.ImageUseCases import ImageUseCases

def get_admin_routes(user_repo: UserRepository,
                     auth_use_cases: AuthUseCases,
                     container_use_cases: ContainerUseCases,
                     image_use_cases: ImageUseCases) -> Blueprint:
    bp = Blueprint('admin', __name__)

    # ── Users ─────────────────────────────────────────────────────────────────

    @bp.route('/users', methods=['GET'])
    @token_required(auth_use_cases)
    @admin_required()
    def list_users():
        try:
            return jsonify([u.dict() for u in user_repo.get_all()]), 200
        except Exception as e:
            return jsonify({'message': str(e)}), 400

    @bp.route('/users', methods=['POST'])
    @token_required(auth_use_cases)
    @admin_required()
    def create_user():
        data = request.json
        try:
            user = auth_use_cases.create_user(
                username=data.get('username'),
                password=data.get('password'),
                port_range=data.get('port_range', '12000-13000'),
                storage_limit_mb=int(data.get('storage_limit_mb', 5120)),
                cpu_limit=float(data.get('cpu_limit', 0.0)),
                ram_limit_mb=int(data.get('ram_limit_mb', 1024)),
            )
            return jsonify({'message': 'User created.', 'user': user.dict()}), 201
        except Exception as e:
            return jsonify({'message': str(e)}), 400

    @bp.route('/users/<user_id>', methods=['PATCH'])
    @token_required(auth_use_cases)
    @admin_required()
    def update_user(user_id):
        data = request.json
        try:
            cpu = data.get('cpu_limit')
            ram = data.get('ram_limit_mb')
            user = auth_use_cases.update_user(
                user_id=user_id,
                port_range=data.get('port_range'),
                storage_limit_mb=data.get('storage_limit_mb'),
                cpu_limit=float(cpu) if cpu is not None else None,
                ram_limit_mb=int(ram) if ram is not None else None,
                password=data.get('password'),
            )
            return jsonify({'message': 'User updated.', 'user': user.dict()}), 200
        except Exception as e:
            return jsonify({'message': str(e)}), 400

    @bp.route('/users/<user_id>/impersonate', methods=['POST'])
    @token_required(auth_use_cases)
    @admin_required()
    def impersonate_user(user_id):
        """Return a short-lived JWT for the target user so the admin can act as them."""
        try:
            token, user = auth_use_cases.impersonate(user_id)
            return jsonify({'token': token, 'user': user.dict()}), 200
        except Exception as e:
            return jsonify({'message': str(e)}), 400

    @bp.route('/users/<user_id>', methods=['DELETE'])
    @token_required(auth_use_cases)
    @admin_required()
    def delete_user(user_id):
        try:
            user_repo.delete(user_id)
            return jsonify({'message': 'User deleted.'}), 200
        except Exception as e:
            return jsonify({'message': str(e)}), 400

    # ── Admin container ops ────────────────────────────────────────────────────

    @bp.route('/users/<user_id>/containers', methods=['GET'])
    @token_required(auth_use_cases)
    @admin_required()
    def admin_list_containers(user_id):
        try:
            containers = container_use_cases.admin_list_containers(user_id)
            return jsonify([asdict(c) for c in containers]), 200
        except Exception as e:
            return jsonify({'message': str(e)}), 400

    @bp.route('/containers/<container_id>/stop', methods=['POST'])
    @token_required(auth_use_cases)
    @admin_required()
    def admin_stop(container_id):
        try:
            container_use_cases.admin_stop_container(container_id)
            return jsonify({'message': 'stopped'}), 200
        except Exception as e:
            return jsonify({'message': str(e)}), 400

    @bp.route('/containers/<container_id>/pause', methods=['POST'])
    @token_required(auth_use_cases)
    @admin_required()
    def admin_pause(container_id):
        try:
            container_use_cases.admin_pause_container(container_id)
            return jsonify({'message': 'paused'}), 200
        except Exception as e:
            return jsonify({'message': str(e)}), 400

    @bp.route('/containers/<container_id>', methods=['DELETE'])
    @token_required(auth_use_cases)
    @admin_required()
    def admin_remove(container_id):
        try:
            container_use_cases.admin_remove_container(container_id)
            return jsonify({'message': 'removed'}), 200
        except Exception as e:
            return jsonify({'message': str(e)}), 400

    # ── Admin image/token views ────────────────────────────────────────────────

    @bp.route('/users/<user_id>/images', methods=['GET'])
    @token_required(auth_use_cases)
    @admin_required()
    def admin_list_images(user_id):
        try:
            images = image_use_cases.list_images(user_id)
            return jsonify([asdict(i) for i in images]), 200
        except Exception as e:
            return jsonify({'message': str(e)}), 400

    @bp.route('/users/<user_id>/tokens', methods=['GET'])
    @token_required(auth_use_cases)
    @admin_required()
    def admin_list_tokens(user_id):
        try:
            aliases = image_use_cases.list_token_aliases(user_id)
            return jsonify({'aliases': aliases}), 200
        except Exception as e:
            return jsonify({'message': str(e)}), 400

    # ── Docker info ────────────────────────────────────────────────────────────

    @bp.route('/docker-info', methods=['GET'])
    @token_required(auth_use_cases)
    @admin_required()
    def get_docker_info():
        info = container_use_cases.get_docker_info()
        return jsonify(info), (200 if info.get('connected') else 503)

    return bp
