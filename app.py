from flask import Flask, render_template, request, jsonify, redirect, url_for, flash
from extensions import db, login_manager
from flask_login import login_user, logout_user, login_required, current_user
from werkzeug.exceptions import BadRequest
from dotenv import load_dotenv
import requests
import os
from flask_migrate import Migrate  # Add this line
import yaml
import json
from datetime import datetime  # Add this import
from werkzeug.utils import secure_filename

# Initialize Flask app
app = Flask(__name__, 
    static_url_path='/static',
    static_folder='static'
)

# Database configuration
app.config.update(
    SQLALCHEMY_DATABASE_URI='postgresql://postgres:root@localhost/api_connect',
    SQLALCHEMY_TRACK_MODIFICATIONS=False,
    SECRET_KEY='dev'
)

# Initialize extensions
db.init_app(app)
migrate = Migrate(app, db)  # Add this line
login_manager.init_app(app)
login_manager.login_view = 'login'

# Import models after extensions initialization
from models import User, Collection, API, History, ImportedAPI

@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        user = User.query.filter_by(username=request.form['username']).first()
        if user and user.check_password(request.form['password']):
            login_user(user)
            return redirect(url_for('dashboard'))
        flash('Invalid username or password')
    return render_template('auth/login.html')

@app.route('/register', methods=['GET', 'POST'])
def register():
    if request.method == 'POST':
        user = User(
            username=request.form['username'],
            email=request.form['email']
        )
        user.set_password(request.form['password'])
        db.session.add(user)
        db.session.commit()
        return redirect(url_for('login'))
    return render_template('auth/register.html')

@app.route('/dashboard')
@login_required
def dashboard():
    collections = Collection.query.filter_by(user_id=current_user.id).all()
    return render_template('dashboard.html', collections=collections)

@app.route('/collection/new', methods=['POST'])
@login_required
def create_collection():
    try:
        name = request.form.get('name')
        if not name:
            flash('Collection name is required')
            return redirect(url_for('dashboard'))
            
        collection = Collection(name=name, user_id=current_user.id)
        db.session.add(collection)
        db.session.commit()
        flash('Collection created successfully!', 'success')
    except Exception as e:
        flash(f'Error importing API: {str(e)}', 'error')
        flash('Error creating collection', 'error')
        
    return redirect(url_for('dashboard'))

@app.route('/collection/<int:id>')
@login_required
def view_collection(id):
    collection = Collection.query.get_or_404(id)
    if collection.user_id != current_user.id:
        flash('Access denied', 'error')
        return redirect(url_for('dashboard'))
    
    return render_template('collection.html', collection=collection)

@app.route('/collection/<int:id>/delete', methods=['POST'])
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

@app.route('/collection/<int:id>/export')
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

@app.route('/import_collection', methods=['POST'])
@login_required
def import_collection():
    if 'collection_file' not in request.files:
        flash('No file uploaded', 'error')
        return redirect(url_for('dashboard'))
    
    file = request.files['collection_file']
    if file.filename == '':
        flash('No file selected', 'error')
        return redirect(url_for('dashboard'))
    
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
                headers=api_data['headers'],
                body=api_data['body'],
                collection_id=collection.id
            )
            db.session.add(api)
        
        db.session.commit()
        flash('Collection imported successfully!', 'success')
        
    except Exception as e:
        flash(f'Error importing collection: {str(e)}', 'error')
    
    return redirect(url_for('dashboard'))

@app.route('/')
def index():
    if not current_user.is_authenticated:
        return redirect(url_for('login'))
    return redirect(url_for('dashboard'))

@app.route('/logout')
@login_required
def logout():
    logout_user()
    return redirect(url_for('login'))

@app.route('/history')
@login_required
def history():
    history_items = History.query.filter_by(user_id=current_user.id).order_by(History.timestamp.desc()).all()
    return render_template('history.html', history=history_items)

@app.route('/test-api', methods=['POST'])
@login_required
def test_api():
    try:
        data = request.get_json()
        
        if not data.get('url'):
            raise BadRequest('URL is required')

        # Forward the request to the target API
        response = requests.request(
            method=data.get('method', 'GET'),
            url=data['url'],
            headers=data.get('headers', {}),
            json=data.get('body') if data.get('body') else None
        )

        # Save to history
        history_entry = History(
            url=data['url'],
            method=data.get('method', 'GET'),
            headers=data.get('headers', {}),
            request_body=data.get('body'),
            response_body=response.json() if response.text else None,
            status_code=response.status_code,
            user_id=current_user.id
        )
        db.session.add(history_entry)
        db.session.commit()

        return jsonify({
            'status': response.status_code,
            'statusText': response.reason,
            'headers': dict(response.headers),
            'body': response.json() if response.text else None
        })

    except requests.exceptions.RequestException as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/save', methods=['POST'])
@login_required
def save_request():
    try:
        data = request.get_json()
        
        api_request = API(
            name=data['name'],
            url=data['url'],
            method=data['method'],
            headers=data['headers'],
            body=data['body'],
            collection_id=data['collection_id']
        )
        
        db.session.add(api_request)
        db.session.commit()
        
        return jsonify({'message': 'Request saved successfully'}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 400

@app.route('/api/<int:id>')
@login_required
def get_request(id):
    api = API.query.get_or_404(id)
    if api.collection.user_id != current_user.id:
        return jsonify({'error': 'Access denied'}), 403
        
    return jsonify({
        'url': api.url,
        'method': api.method,
        'headers': api.headers,
        'body': api.body
    })

@app.route('/api/<int:id>/delete', methods=['POST'])
@login_required
def delete_request(id):
    api = API.query.get_or_404(id)
    if api.collection.user_id != current_user.id:
        return jsonify({'error': 'Access denied'}), 403
        
    db.session.delete(api)
    db.session.commit()
    return jsonify({'message': 'Request deleted'})

@app.route('/import_api', methods=['POST'])
@login_required
def import_api():
    try:
        collection_id = request.form.get('collection_id')
        if collection_id == '':
            collection_id = None

        # Handle single API import
        if request.form.get('api_name') and request.form.get('api_url'):
            if not collection_id:
                # Create new collection
                collection = Collection(
                    name=f"Imported API {datetime.now().strftime('%Y-%m-%d %H:%M')}",
                    user_id=current_user.id
                )
                db.session.add(collection)
                db.session.commit()
                collection_id = collection.id

            # Create single API
            api = API(
                name=request.form.get('api_name'),
                url=request.form.get('api_url'),
                method=request.form.get('api_method', 'GET'),
                headers={},
                body={},
                collection_id=collection_id
            )
            db.session.add(api)
            db.session.commit()
            
            flash('API imported successfully!', 'success')
            return redirect(url_for('view_collection', id=collection_id))

        # Handle file import
        elif 'api_file' in request.files and request.files['api_file'].filename:
            file = request.files['api_file']
            content = file.read().decode('utf-8')
            
            # Determine file format and parse content
            if file.filename.endswith('.json'):
                spec = json.loads(content)
                format_type = 'json'
            elif file.filename.endswith(('.yaml', '.yml')):
                spec = yaml.safe_load(content)
                format_type = 'yaml'
            else:
                flash('Unsupported file format. Please use JSON or YAML', 'error')
                return redirect(url_for('dashboard'))

            # Create ImportedAPI record
            imported_api = ImportedAPI(
                name=file.filename,
                specification=spec,
                format_type=format_type,
                user_id=current_user.id,
                collection_id=collection_id
            )
            
            db.session.add(imported_api)
            db.session.commit()

            # Process the imported specification
            collection_id = process_imported_api(imported_api)
            
            flash('API specification imported successfully!', 'success')
            return redirect(url_for('view_collection', id=collection_id))
        
        else:
            flash('No API data provided', 'error')
            return redirect(url_for('dashboard'))

    except json.JSONDecodeError:
        flash('Invalid JSON format in the uploaded file', 'error')
    except yaml.YAMLError:
        flash('Invalid YAML format in the uploaded file', 'error')
    except Exception as e:
        flash(f'Error importing API: {str(e)}', 'error')
    
    return redirect(url_for('dashboard'))

def process_imported_api(imported_api):
    """Process imported API specification and create API entries"""
    spec = imported_api.specification
    collection_id = imported_api.collection_id
    
    # Create new collection if none specified
    if not collection_id:
        collection = Collection(
            name=f"Imported {imported_api.name}",
            user_id=current_user.id
        )
        db.session.add(collection)
        db.session.commit()
        collection_id = collection.id

    # Handle OpenAPI/Swagger format
    if 'paths' in spec:
        for path, methods in spec['paths'].items():
            for method, details in methods.items():
                if method.upper() in ['GET', 'POST', 'PUT', 'DELETE', 'PATCH']:
                    api = API(
                        name=details.get('summary', path),
                        url=path,
                        method=method.upper(),
                        headers={},
                        body=details.get('requestBody', {}),
                        collection_id=collection_id
                    )
                    db.session.add(api)
    
    # Handle Postman Collection format
    elif 'item' in spec:
        def process_items(items, collection_id):
            for item in items:
                if 'request' in item:
                    req = item['request']
                    api = API(
                        name=item.get('name', ''),
                        url=req.get('url', {}).get('raw', '') if isinstance(req.get('url'), dict) else req.get('url', ''),
                        method=req.get('method', 'GET'),
                        headers={h['key']: h['value'] for h in req.get('header', []) if h.get('key')},
                        body=req.get('body', {}),
                        collection_id=collection_id
                    )
                    db.session.add(api)
                if 'item' in item:
                    process_items(item['item'], collection_id)
        
        process_items(spec['item'], collection_id)
    
    db.session.commit()
    return collection_id

@app.route('/export_api', methods=['POST'])
@login_required
def export_api():
    collection_id = request.form.get('collection_id')
    export_format = request.form.get('format', 'openapi')
    
    collection = Collection.query.get_or_404(collection_id)
    if collection.user_id != current_user.id:
        return jsonify({'error': 'Access denied'}), 403
    
    apis = API.query.filter_by(collection_id=collection_id).all()
    
    if export_format == 'openapi':
        spec = {
            "openapi": "3.0.0",
            "info": {
                "title": collection.name,
                "version": "1.0.0"
            },
            "paths": {}
        }
        
        for api in apis:
            if api.url not in spec['paths']:
                spec['paths'][api.url] = {}
            
            spec['paths'][api.url][api.method.lower()] = {
                "summary": api.name,
                "requestBody": api.body if api.method in ['POST', 'PUT', 'PATCH'] else None
            }
    else:
        spec = {
            "info": {
                "name": collection.name,
                "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
            },
            "item": [{
                "name": api.name,
                "request": {
                    "method": api.method,
                    "url": api.url,
                    "header": [{"key": k, "value": v} for k, v in api.headers.items()],
                    "body": api.body if api.method in ['POST', 'PUT', 'PATCH'] else None
                }
            } for api in apis]
        }
    
    response = jsonify(spec)
    filename = f"{collection.name.lower().replace(' ', '_')}_{export_format}.json"
    response.headers.set('Content-Disposition', f'attachment; filename={filename}')
    return response

@app.route('/export-api-template')
def export_api_template():
    template = {
        "info": {
            "name": "API Name",
            "description": "API Description"
        },
        "paths": {
            "/example/path": {
                "get": {
                    "summary": "Example GET endpoint",
                    "description": "Description of what this endpoint does",
                    "parameters": [
                        {
                            "name": "param1",
                            "in": "query",
                            "description": "Description of parameter",
                            "required": True,
                            "schema": {
                                "type": "string"
                            }
                        }
                    ]
                },
                "post": {
                    "summary": "Example POST endpoint",
                    "description": "Description of what this endpoint does",
                    "requestBody": {
                        "required": True,
                        "content": {
                            "application/json": {
                                "schema": {
                                    "type": "object",
                                    "properties": {
                                        "field1": {
                                            "type": "string",
                                            "description": "Description of field1"
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
    
    response = jsonify(template)
    response.headers.set('Content-Disposition', 'attachment; filename=api-template.json')
    return response

if __name__ == '__main__':
    app.run(debug=True)
