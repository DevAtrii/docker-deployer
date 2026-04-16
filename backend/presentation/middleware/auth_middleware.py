from functools import wraps
from flask import request, jsonify
from domain.use_cases.AuthUseCases import AuthUseCases

def token_required(auth_use_cases: AuthUseCases):
    def decorator(f):
        @wraps(f)
        def decorated(*args, **kwargs):
            token = None
            if 'Authorization' in request.headers:
                parts = request.headers['Authorization'].split()
                if len(parts) == 2 and parts[0] == 'Bearer':
                    token = parts[1]
            if not token:
                return jsonify({'message': 'Token missing'}), 401
            try:
                data = auth_use_cases.verify_token(token)
                request.user_id = data['user_id']
                request.user_role = data['role']
            except Exception as e:
                return jsonify({'message': str(e)}), 401

            return f(*args, **kwargs)
        return decorated
    return decorator

def admin_required():
    def decorator(f):
        @wraps(f)
        def decorated(*args, **kwargs):
            if getattr(request, 'user_role', None) != 'admin':
                return jsonify({'message': 'Admin privileges required'}), 403
            return f(*args, **kwargs)
        return decorated
    return decorator
