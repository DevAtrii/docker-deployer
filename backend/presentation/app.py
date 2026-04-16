import os
from flask import Flask
from flask_cors import CORS
from dotenv import load_dotenv

from data.repositories.json_user_repository import JSONUserRepository
from data.repositories.docker_repository import DockerSDKRepository
from data.repositories.local_file_repository import LocalFileRepository

from domain.use_cases.AuthUseCases import AuthUseCases
from domain.use_cases.ContainerUseCases import ContainerUseCases
from domain.use_cases.ImageUseCases import ImageUseCases
from domain.use_cases.FileUseCases import FileUseCases

from presentation.routes.auth_routes import get_auth_routes
from presentation.routes.container_routes import get_container_routes
from presentation.routes.file_routes import get_file_routes
from presentation.routes.image_routes import get_image_routes
from presentation.routes.admin_routes import get_admin_routes

def create_app():
    load_dotenv()
    
    app = Flask(__name__)
    
    debug_mode = os.getenv('DEBUG', 'False').lower() == 'true'
    if debug_mode:
        CORS(app, resources={r"/api/*": {"origins": "*"}})
    else:
        CORS(app)
    
    app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'default-secret-key-replace-in-prod')
    data_dir = os.getenv('DEPLOYER_DATA_DIR', './data')

    # Repositories
    user_repo = JSONUserRepository(data_dir)
    docker_repo = DockerSDKRepository(data_dir)
    file_repo = LocalFileRepository(data_dir)

    # Use Cases
    auth_use_cases = AuthUseCases(user_repo, app.config['SECRET_KEY'])
    container_use_cases = ContainerUseCases(docker_repo, user_repo, data_dir=data_dir)
    image_use_cases = ImageUseCases(docker_repo, user_repo)
    file_use_cases = FileUseCases(file_repo)

    # Routes
    app.register_blueprint(get_auth_routes(auth_use_cases), url_prefix='/api/auth')
    app.register_blueprint(get_container_routes(container_use_cases, auth_use_cases), url_prefix='/api/containers')
    app.register_blueprint(get_file_routes(file_use_cases, auth_use_cases), url_prefix='/api/files')
    app.register_blueprint(get_image_routes(image_use_cases, auth_use_cases), url_prefix='/api/images')
    app.register_blueprint(get_admin_routes(user_repo, auth_use_cases, container_use_cases, image_use_cases), url_prefix='/api/admin')

    return app
