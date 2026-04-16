from flask import Blueprint, request, jsonify
from domain.use_cases.FileUseCases import FileUseCases
from presentation.middleware.auth_middleware import token_required
from dataclasses import asdict

def get_file_routes(file_use_cases: FileUseCases, auth_use_cases) -> Blueprint:
    bp = Blueprint('files', __name__)

    @bp.route('/list', methods=['GET'])
    @token_required(auth_use_cases)
    def list_files():
        path = request.args.get('path', '')
        try:
            items = file_use_cases.list_files(request.user_id, path)
            return jsonify([asdict(i) for i in items]), 200
        except Exception as e:
            return jsonify({'message': str(e)}), 400

    @bp.route('/read', methods=['GET'])
    @token_required(auth_use_cases)
    def read_file():
        path = request.args.get('path', '')
        try:
            content = file_use_cases.read_file(request.user_id, path)
            return jsonify({'content': content}), 200
        except Exception as e:
            return jsonify({'message': str(e)}), 400

    @bp.route('/write', methods=['POST'])
    @token_required(auth_use_cases)
    def write_file():
        data = request.json
        try:
            file_use_cases.write_file(request.user_id, data['path'], data['content'])
            return jsonify({'message': 'File written'}), 200
        except Exception as e:
            return jsonify({'message': str(e)}), 400

    @bp.route('/delete', methods=['DELETE'])
    @token_required(auth_use_cases)
    def delete_file():
        path = request.args.get('path', '')
        try:
            file_use_cases.delete_file(request.user_id, path)
            return jsonify({'message': 'File deleted'}), 200
        except Exception as e:
            return jsonify({'message': str(e)}), 400

    @bp.route('/dir/create', methods=['POST'])
    @token_required(auth_use_cases)
    def create_dir():
        data = request.json
        try:
            file_use_cases.create_dir(request.user_id, data['path'])
            return jsonify({'message': 'Directory created'}), 200
        except Exception as e:
            return jsonify({'message': str(e)}), 400

    @bp.route('/dir/delete', methods=['DELETE'])
    @token_required(auth_use_cases)
    def delete_dir():
        path = request.args.get('path', '')
        try:
            file_use_cases.delete_dir(request.user_id, path)
            return jsonify({'message': 'Directory deleted'}), 200
        except Exception as e:
            return jsonify({'message': str(e)}), 400

    return bp
