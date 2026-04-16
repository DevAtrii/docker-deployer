from flask import Blueprint, request, jsonify, Response
from domain.use_cases.ContainerUseCases import ContainerUseCases
from presentation.middleware.auth_middleware import token_required
from dataclasses import asdict

def get_container_routes(container_use_cases: ContainerUseCases, auth_use_cases) -> Blueprint:
    bp = Blueprint('containers', __name__)

    @bp.route('/status', methods=['GET'])
    @token_required(auth_use_cases)
    def docker_status():
        """Check Docker daemon connectivity."""
        status = container_use_cases.check_docker_connection()
        return jsonify(status), (200 if status['connected'] else 503)

    @bp.route('/docker-info', methods=['GET'])
    @token_required(auth_use_cases)
    def docker_info():
        """Return rich Docker daemon info for the dashboard."""
        info = container_use_cases.get_docker_info()
        return jsonify(info), (200 if info.get('connected') else 503)

    @bp.route('/', methods=['GET'])
    @token_required(auth_use_cases)
    def list_containers():
        try:
            containers = container_use_cases.list_containers(request.user_id)
            return jsonify([asdict(c) for c in containers]), 200
        except Exception as e:
            return jsonify({'message': str(e)}), 400

    @bp.route('/deploy', methods=['POST'])
    @token_required(auth_use_cases)
    def deploy_container():
        data = request.json
        try:
            c = container_use_cases.deploy_container(
                request.user_id,
                data['name'],
                data['image'],
                data.get('port_mappings', {}),
                volumes=data.get('volumes', []),
                mem_limit=data.get('mem_limit'),
                memswap_limit=data.get('memswap_limit'),
                cpu_limit=data.get('cpu_limit'),
            )
            return jsonify(asdict(c)), 201
        except Exception as e:
            return jsonify({'message': str(e)}), 400

    @bp.route('/<container_id>/start', methods=['POST'])
    @token_required(auth_use_cases)
    def start_container(container_id):
        try:
            container_use_cases.start_container(request.user_id, container_id)
            return jsonify({'message': 'started'}), 200
        except Exception as e:
            return jsonify({'message': str(e)}), 400

    @bp.route('/<container_id>/stop', methods=['POST'])
    @token_required(auth_use_cases)
    def stop_container(container_id):
        try:
            container_use_cases.stop_container(request.user_id, container_id)
            return jsonify({'message': 'stopped'}), 200
        except Exception as e:
            return jsonify({'message': str(e)}), 400

    @bp.route('/<container_id>/pause', methods=['POST'])
    @token_required(auth_use_cases)
    def pause_container(container_id):
        try:
            container_use_cases.pause_container(request.user_id, container_id)
            return jsonify({'message': 'paused'}), 200
        except Exception as e:
            return jsonify({'message': str(e)}), 400

    @bp.route('/<container_id>/resume', methods=['POST'])
    @token_required(auth_use_cases)
    def resume_container(container_id):
        try:
            container_use_cases.resume_container(request.user_id, container_id)
            return jsonify({'message': 'resumed'}), 200
        except Exception as e:
            return jsonify({'message': str(e)}), 400

    @bp.route('/<container_id>', methods=['DELETE'])
    @token_required(auth_use_cases)
    def delete_container(container_id):
        try:
            container_use_cases.delete_container(request.user_id, container_id)
            return jsonify({'message': 'deleted'}), 200
        except Exception as e:
            return jsonify({'message': str(e)}), 400

    @bp.route('/<container_id>/logs', methods=['GET'])
    @token_required(auth_use_cases)
    def get_logs(container_id):
        try:
            limit = int(request.args.get('limit', 100))
            page = int(request.args.get('page', 1))
            logs = container_use_cases.get_logs(request.user_id, container_id, limit, page)
            return jsonify({'logs': logs}), 200
        except Exception as e:
            return jsonify({'message': str(e)}), 400

    @bp.route('/<container_id>/logs/export', methods=['GET'])
    @token_required(auth_use_cases)
    def export_logs(container_id):
        try:
            logs = container_use_cases.get_logs(request.user_id, container_id, limit='all')
            filename = f"container_{container_id}_logs.txt"
            return Response(
                logs,
                mimetype="text/plain",
                headers={"Content-disposition": f"attachment; filename={filename}"}
            )
        except Exception as e:
            return jsonify({'message': str(e)}), 400

    @bp.route('/<container_id>/stats', methods=['GET'])
    @token_required(auth_use_cases)
    def get_stats(container_id):
        try:
            stats = container_use_cases.get_stats(request.user_id, container_id)
            return jsonify(stats), 200
        except Exception as e:
            return jsonify({'message': str(e)}), 400

    @bp.route('/<container_id>/redeploy', methods=['POST'])
    @token_required(auth_use_cases)
    def redeploy_container(container_id):
        """Fire-and-forget: pull fresh image + stop + remove + redeploy same config."""
        try:
            task_id = container_use_cases.redeploy_container_async(request.user_id, container_id)
            return jsonify({'task_id': task_id, 'message': 'Redeploy started'}), 202
        except Exception as e:
            return jsonify({'message': str(e)}), 400

    @bp.route('/redeploy-status/<task_id>', methods=['GET'])
    @token_required(auth_use_cases)
    def get_redeploy_status(task_id):
        try:
            status = container_use_cases.get_redeploy_status(task_id)
            return jsonify(status), 200
        except Exception as e:
            return jsonify({'message': str(e)}), 404

    return bp
