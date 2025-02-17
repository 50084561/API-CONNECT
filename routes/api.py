from flask import Blueprint, request, jsonify, url_for
from flask_login import login_required, current_user
from models import API, History, Collection, ImportedAPI
from extensions import db
import requests
from werkzeug.exceptions import BadRequest
from datetime import datetime
import json
import yaml

api_bp = Blueprint('api', __name__, url_prefix='/api')

@api_bp.route('test', methods=['POST'])  # Changed from /test-api
@login_required
def test_api():
    try:
        data = request.get_json()
        
        if not data.get('url'):
            raise BadRequest('URL is required')

        response = requests.request(
            method=data.get('method', 'GET'),
            url=data['url'],
            headers=data.get('headers', {}),
            json=data.get('body') if data.get('body') else None
        )

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

@api_bp.route('save', methods=['POST'])
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

@api_bp.route('/<int:id>')
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

@api_bp.route('/<int:id>/delete', methods=['POST'])
@login_required
def delete_request(id):
    api = API.query.get_or_404(id)
    if api.collection.user_id != current_user.id:
        return jsonify({'error': 'Access denied'}), 403
        
    db.session.delete(api)
    db.session.commit()
    return jsonify({'message': 'Request deleted'})

@api_bp.route('/import_api', methods=['POST'])
@login_required
def import_api():
    try:
        collection_id = request.form.get('collection_id')
        if collection_id == '':
            collection_id = None

        if request.form.get('api_name') and request.form.get('api_url'):
            if not collection_id:
                collection = Collection(
                    name=f"Imported API {datetime.now().strftime('%Y-%m-%d %H:%M')}",
                    user_id=current_user.id
                )
                db.session.add(collection)
                db.session.commit()
                collection_id = collection.id

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
            
            return jsonify({'success': True, 'collection_id': collection_id})

        elif 'api_file' in request.files and request.files['api_file'].filename:
            file = request.files['api_file']
            content = file.read().decode('utf-8')
            
            if file.filename.endswith('.json'):
                spec = json.loads(content)
                format_type = 'json'
            elif file.filename.endswith(('.yaml', '.yml')):
                spec = yaml.safe_load(content)
                format_type = 'yaml'
            else:
                return jsonify({'error': 'Unsupported file format'}), 400

            imported_api = ImportedAPI(
                name=file.filename,
                specification=spec,
                format_type=format_type,
                user_id=current_user.id,
                collection_id=collection_id
            )
            
            db.session.add(imported_api)
            db.session.commit()

            collection_id = process_imported_api(imported_api)
            return jsonify({'success': True, 'collection_id': collection_id})
        
        else:
            return jsonify({'error': 'No API data provided'}), 400

    except Exception as e:
        return jsonify({'error': str(e)}), 400

@api_bp.route('/export_api', methods=['POST'])
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

@api_bp.route('template')  # Changed from /export-api-template
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
                }
            }
        }
    }
    
    response = jsonify(template)
    response.headers.set('Content-Disposition', 'attachment; filename=api-template.json')
    return response

def process_imported_api(imported_api):
    """Process imported API specification and create API entries"""
    spec = imported_api.specification
    collection_id = imported_api.collection_id
    
    if not collection_id:
        collection = Collection(
            name=f"Imported {imported_api.name}",
            user_id=current_user.id
        )
        db.session.add(collection)
        db.session.commit()
        collection_id = collection.id

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
