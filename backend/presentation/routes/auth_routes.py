from flask import Blueprint, request, jsonify
from domain.use_cases.AuthUseCases import AuthUseCases
from presentation.middleware.auth_middleware import token_required

def get_auth_routes(auth_use_cases: AuthUseCases) -> Blueprint:
    bp = Blueprint('auth', __name__)

    @bp.route('/status', methods=['GET'])
    def status():
        """Check if admin account has been set up. Used by frontend to decide routing."""
        is_setup = auth_use_cases.is_admin_setup()
        return jsonify({'admin_setup': is_setup}), 200

    @bp.route('/setup', methods=['POST'])
    def setup():
        """One-time endpoint to create the first admin account. Fails if admin already exists."""
        if auth_use_cases.is_admin_setup():
            return jsonify({'message': 'Admin account already exists. Please log in.'}), 403
        data = request.json
        try:
            user = auth_use_cases.setup_admin(
                data.get('username'),
                data.get('password')
            )
            return jsonify({'message': 'Admin account created successfully.', 'user': user.dict()}), 201
        except Exception as e:
            return jsonify({'message': str(e)}), 400

    @bp.route('/login', methods=['POST'])
    def login():
        data = request.json
        try:
            token, user = auth_use_cases.login(data.get('username'), data.get('password'))
            return jsonify({'token': token, 'user': user.dict()}), 200
        except Exception as e:
            return jsonify({'message': str(e)}), 401
            
    @bp.route('/me', methods=['GET'])
    @token_required(auth_use_cases)
    def me():
        try:
            user = auth_use_cases.get_user_by_id(request.user_id)
            return jsonify(user.dict()), 200
        except Exception as e:
            return jsonify({'message': str(e)}), 400

    return bp
