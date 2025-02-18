import os

class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'your-secret-key-here'
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL') or \
        'postgresql://postgres:root@localhost/api_connect'
    SQLALCHEMY_TRACK_MODIFICATIONS = False

from flask import Flask
from extensions import db, login_manager
from flask_migrate import Migrate

def configure_app(app):
    app.config.update(
        SQLALCHEMY_DATABASE_URI='postgresql://postgres:root@localhost/api_connect',
        SQLALCHEMY_TRACK_MODIFICATIONS=False,
        MIGRATION_DIRECTORY = 'migrations',
        SECRET_KEY='dev'
    )

def init_extensions(app):
    db.init_app(app)
    migrate = Migrate(app, db)
    login_manager.init_app(app)
    login_manager.login_view = 'auth.login'

def create_app():
    app = Flask(__name__, 
        static_url_path='/static',
        static_folder='static',
        template_folder='templates'  # Add explicit template folder
    )
    
    configure_app(app)
    init_extensions(app)
    
    with app.app_context():
        # Register blueprints
        from routes.auth import auth_bp
        from routes.api import api_bp
        from routes.collection import collection_bp
        from routes.history import history_bp
        
        app.register_blueprint(auth_bp)
        app.register_blueprint(api_bp)
        app.register_blueprint(collection_bp)
        app.register_blueprint(history_bp)
    
    return app
