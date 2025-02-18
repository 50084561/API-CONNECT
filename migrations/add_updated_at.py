import os
import sys

# Add the parent directory to sys.path
current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)
sys.path.append(parent_dir)

from extensions import db
from datetime import datetime
from sqlalchemy import text

def upgrade():
    try:
        with db.engine.connect() as conn:
            conn.execute(text("ALTER TABLE collection ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP"))
            conn.execute(text("UPDATE collection SET updated_at = created_at WHERE updated_at IS NULL"))
            conn.commit()
            print("Successfully added updated_at column to collection table")
    except Exception as e:
        print(f"Error during migration: {str(e)}")
        raise

if __name__ == '__main__':
    from app import app
    with app.app_context():
        upgrade()
