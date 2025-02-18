from flask import redirect, url_for, flash
from config import create_app
from extensions import db, login_manager
from models import User
from sqlalchemy import inspect
from flask_login import current_user
import logging

# Configure logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

app = create_app()

@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))

def check_db_tables():
    with app.app_context():
        inspector = inspect(db.engine)
        existing_tables = inspector.get_table_names()
        required_tables = ['user', 'collection', 'api', 'imported_apis', 'history']
        
        if not all(table in existing_tables for table in required_tables):
            db.create_all()
            return False
        return True

# Initialize database tables
check_db_tables()

# @app.errorhandler(Exception)
# def handle_error(error):
#     logger.error(f'Unhandled error: {error}', exc_info=True)
#     flash('An unexpected error occurred', 'error')
#     return redirect(url_for('auth.login'))

@app.route('/')
def index():
    if not current_user.is_authenticated:
        return redirect(url_for('auth.login'))
    return redirect(url_for('collection.dashboard'))

# Add error handlers for common HTTP errors
@app.errorhandler(404)
def not_found_error(error):
    flash('The requested page was not found.', 'error')
    return redirect(url_for('auth.login'))

@app.errorhandler(500)
def internal_error(error):
    db.session.rollback()
    flash('An internal error occurred.', 'error')
    return redirect(url_for('auth.login'))

if __name__ == '__main__':
    app.run(debug=True)
