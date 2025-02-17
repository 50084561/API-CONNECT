from flask import Blueprint, render_template, jsonify, url_for
from flask_login import login_required, current_user
from models import History
from extensions import db

history_bp = Blueprint('history', __name__, url_prefix='/history')

@history_bp.route('')  # Changed from /history
@login_required
def history():
    history_items = History.query.filter_by(user_id=current_user.id).order_by(History.timestamp.desc()).all()
    return render_template('history.html', history=history_items)

@history_bp.route('clear', methods=['POST'])  # Changed from /api/history/clear
@login_required
def clear_history():
    try:
        History.query.filter_by(user_id=current_user.id).delete()
        db.session.commit()
        return jsonify({'success': True})
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)})

@history_bp.route('<int:id>', methods=['DELETE'])  # Changed from /api/history/<int:id>
@login_required
def delete_history_item(id):
    try:
        history_item = History.query.get_or_404(id)
        if history_item.user_id != current_user.id:
            return jsonify({'success': False, 'error': 'Unauthorized'}), 403
        
        db.session.delete(history_item)
        db.session.commit()
        return jsonify({'success': True})
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)})

@history_bp.route('<int:id>/replay')  # Changed from /api/history/<int:id>/replay
@login_required
def replay_history_item(id):
    try:
        history_item = History.query.get_or_404(id)
        if history_item.user_id != current_user.id:
            return jsonify({'success': False, 'error': 'Unauthorized'}), 403
            
        return jsonify({
            'success': True,
            'redirect': url_for('collection.dashboard',  # Fixed: added blueprint prefix
                method=history_item.method,
                url=history_item.url,
                headers=history_item.headers,
                body=history_item.request_body
            )
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})
