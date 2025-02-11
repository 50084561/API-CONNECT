from extensions import db
from flask_login import UserMixin
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime

class User(UserMixin, db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(256))
    collections = db.relationship('Collection', backref='owner', lazy=True)
    
    def set_password(self, password):
        self.password_hash = generate_password_hash(password)
        
    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

class Collection(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    apis = db.relationship('API', backref='collection', lazy=True, cascade='all, delete-orphan')
    
    def to_dict(self):
        return {
            'name': self.name,
            'created_at': self.created_at.isoformat(),
            'apis': [api.to_dict() for api in self.apis]
        }
    
    @staticmethod
    def from_dict(data, user_id):
        collection = Collection(
            name=data['name'],
            user_id=user_id
        )
        if 'apis' in data:
            collection.apis = [API.from_dict(api_data, collection) for api_data in data['apis']]
        return collection

class API(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    url = db.Column(db.Text, nullable=False)
    method = db.Column(db.String(10), nullable=False)
    headers = db.Column(db.JSON)
    body = db.Column(db.JSON)
    collection_id = db.Column(db.Integer, db.ForeignKey('collection.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        return {
            'name': self.name,
            'url': self.url,
            'method': self.method,
            'headers': self.headers,
            'body': self.body,
            'created_at': self.created_at.isoformat()
        }
    
    @staticmethod
    def from_dict(data, collection):
        return API(
            name=data['name'],
            url=data['url'],
            method=data['method'],
            headers=data.get('headers'),
            body=data.get('body'),
            collection=collection
        )

class ImportedAPI(db.Model):
    __tablename__ = 'imported_apis'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(200), nullable=False)
    specification = db.Column(db.JSON, nullable=False)
    format_type = db.Column(db.String(10), nullable=False)  # 'json' or 'yaml'
    import_date = db.Column(db.DateTime, default=datetime.utcnow)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    collection_id = db.Column(db.Integer, db.ForeignKey('collection.id'), nullable=True)

    user = db.relationship('User', backref=db.backref('imported_apis', lazy=True))
    collection = db.relationship('Collection', backref=db.backref('imported_apis', lazy=True))

class History(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    url = db.Column(db.String(500), nullable=False)
    method = db.Column(db.String(10), nullable=False)
    headers = db.Column(db.JSON)
    request_body = db.Column(db.JSON)
    response_body = db.Column(db.JSON)
    status_code = db.Column(db.Integer)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    
    user = db.relationship('User', backref=db.backref('history', lazy=True))
