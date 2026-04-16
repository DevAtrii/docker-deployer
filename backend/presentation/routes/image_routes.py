from flask import Blueprint, request, jsonify
from domain.use_cases.ImageUseCases import ImageUseCases
from presentation.middleware.auth_middleware import token_required
from dataclasses import asdict

def get_image_routes(image_use_cases: ImageUseCases, auth_use_cases) -> Blueprint:
    bp = Blueprint('images', __name__)

    @bp.route('/', methods=['GET'])
    @token_required(auth_use_cases)
    def list_images():
        try:
            images = image_use_cases.list_images(request.user_id)
            return jsonify([asdict(i) for i in images]), 200
        except Exception as e:
            return jsonify({'message': str(e)}), 400

    @bp.route('/pull', methods=['POST'])
    @token_required(auth_use_cases)
    def pull_image():
        data = request.json
        try:
            task_id = image_use_cases.pull_image_async(
                request.user_id,
                data['image_name'],
                token_alias=data.get('token_alias')
            )
            return jsonify({'task_id': task_id, 'message': 'Pull started'}), 202
        except Exception as e:
            return jsonify({'message': str(e)}), 400

    @bp.route('/pull/<task_id>', methods=['GET'])
    @token_required(auth_use_cases)
    def get_pull_status(task_id):
        try:
            status = image_use_cases.get_pull_status(task_id)
            return jsonify(status), 200
        except Exception as e:
            return jsonify({'message': str(e)}), 404

    @bp.route('/', methods=['DELETE'])
    @token_required(auth_use_cases)
    def remove_image():
        image_name = request.args.get('image_name')
        try:
            image_use_cases.remove_image(request.user_id, image_name)
            return jsonify({'message': 'Image untracked successfully'}), 200
        except Exception as e:
            return jsonify({'message': str(e)}), 400

    # ── DockerHub token management ────────────────────────────────────────────

    @bp.route('/tokens', methods=['GET'])
    @token_required(auth_use_cases)
    def list_tokens():
        try:
            aliases = image_use_cases.list_token_aliases(request.user_id)
            detailed = image_use_cases.list_tokens_detailed(request.user_id)
            return jsonify({
                'aliases': aliases,
                'tokens_detailed': detailed
            }), 200
        except Exception as e:
            return jsonify({'message': str(e)}), 400

    @bp.route('/tokens', methods=['POST'])
    @token_required(auth_use_cases)
    def add_token():
        data = request.json
        try:
            image_use_cases.add_token(
                request.user_id, 
                data['alias'], 
                data['token'], 
                data['username'],
                registry=data.get('registry')
            )
            return jsonify({'message': 'Token saved.'}), 201
        except Exception as e:
            return jsonify({'message': str(e)}), 400

    @bp.route('/tokens/<alias>', methods=['PUT'])
    @token_required(auth_use_cases)
    def update_token(alias: str):
        data = request.json
        try:
            image_use_cases.update_token(
                request.user_id,
                alias,
                data['username'],
                registry=data.get('registry'),
                token=data.get('token')
            )
            return jsonify({'message': 'Token updated.'}), 200
        except Exception as e:
            return jsonify({'message': str(e)}), 400

    @bp.route('/tokens/<alias>/test', methods=['POST'])
    @token_required(auth_use_cases)
    def test_token(alias: str):
        try:
            image_use_cases.test_token_login(request.user_id, alias)
            return jsonify({'message': 'Login successful!'}), 200
        except Exception as e:
            return jsonify({'message': str(e)}), 401

    @bp.route('/tokens/<alias>', methods=['DELETE'])
    @token_required(auth_use_cases)
    def delete_token(alias: str):
        try:
            image_use_cases.delete_token(request.user_id, alias)
            return jsonify({'message': 'Token deleted.'}), 200
        except Exception as e:
            return jsonify({'message': str(e)}), 400

    return bp
