from flask import Blueprint, render_template, request, jsonify, redirect, url_for, flash
from flask_login import login_required, current_user
from models import Collection, API
from extensions import db
import json

collection_bp = Blueprint('collection', __name__, url_prefix='/collection')

@collection_bp.route('dashboard')
@login_required
def dashboard():
    collections = Collection.query.filter_by(user_id=current_user.id).all()
    return render_template('dashboard.html', collections=collections)

@collection_bp.route('new', methods=['POST'])
@login_required
def create_collection():
    try:
        name = request.form.get('name')
        if not name:
            flash('Collection name is required')
            return redirect(url_for('collection.dashboard'))
            
        collection = Collection(name=name, user_id=current_user.id)
        db.session.add(collection)
        db.session.commit()
        flash('Collection created successfully!', 'success')
    except Exception as e:
        flash(f'Error creating collection: {str(e)}', 'error')
        
    return redirect(url_for('collection.dashboard'))

@collection_bp.route('<int:id>')
@login_required
def view_collection(id):
    collection = Collection.query.get_or_404(id)
    if collection.user_id != current_user.id:
        flash('Access denied', 'error')
        return redirect(url_for('collection.dashboard'))
    
    apis = API.query.filter_by(collection_id=id).all()
    return render_template('collection.html', collection=collection, apis=apis)

@collection_bp.route('<int:id>/delete', methods=['POST'])
@login_required
def delete_collection(id):
    try:
        collection = Collection.query.get_or_404(id)
        if collection.user_id != current_user.id:
            return jsonify({'error': 'Access denied'}), 403
            
        # Delete all APIs in the collection first
        API.query.filter_by(collection_id=id).delete()
        
        # Then delete the collection
        db.session.delete(collection)
        db.session.commit()
        
        flash('Collection deleted successfully', 'success')
        return jsonify({'message': 'Collection deleted successfully'})
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@collection_bp.route('<int:id>/export')
@login_required
def export_collection(id):
    collection = Collection.query.get_or_404(id)
    if collection.user_id != current_user.id:
        return jsonify({'error': 'Access denied'}), 403
    
    # Get all APIs in the collection
    apis = API.query.filter_by(collection_id=id).all()
    
    # Create export data
    export_data = {
        'name': collection.name,
        'apis': [{
            'name': api.name,
            'url': api.url,
            'method': api.method,
            'headers': api.headers,
            'body': api.body
        } for api in apis]
    }
    
    return jsonify(export_data)

@collection_bp.route('import', methods=['POST'])
@login_required
def import_collection():
    if 'collection_file' not in request.files:
        flash('No file uploaded', 'error')
        return redirect(url_for('collection.dashboard'))
    
    file = request.files['collection_file']
    if file.filename == '':
        flash('No file selected', 'error')
        return redirect(url_for('collection.dashboard'))
    
    try:
        content = json.loads(file.read().decode('utf-8'))
        
        # Create new collection
        collection = Collection(
            name=content['name'],
            user_id=current_user.id
        )
        db.session.add(collection)
        db.session.commit()
        
        # Import APIs
        for api_data in content['apis']:
            api = API(
                name=api_data['name'],
                url=api_data['url'],
                method=api_data['method'],
                headers=api_data.get('headers', {}),
                body=api_data.get('body', {}),
                collection_id=collection.id
            )
            db.session.add(api)
        
        db.session.commit()
        flash('Collection imported successfully!', 'success')
        
    except json.JSONDecodeError:
        flash('Invalid JSON format in the uploaded file', 'error')
    except Exception as e:
        flash(f'Error importing collection: {str(e)}', 'error')
    
    return redirect(url_for('collection.dashboard'))

@collection_bp.route('collections')
@login_required
def collections():
    collections = Collection.query.filter_by(user_id=current_user.id).all()
    return render_template('collections.html', collections=collections)
