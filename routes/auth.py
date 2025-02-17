from flask import Blueprint, render_template, request, redirect, url_for, flash
from flask_login import login_user, logout_user, login_required
from models import User
from extensions import db

auth_bp = Blueprint('auth', __name__)  # Remove url_prefix to fix routing

@auth_bp.route('/login', methods=['GET', 'POST'])  # Fix route path
def login():
    if request.method == 'POST':
        try:
            username = request.form.get('username')
            password = request.form.get('password')
            
            if not username or not password:
                flash('Username and password are required', 'error')
                return render_template('auth/login.html')
                
            user = User.query.filter_by(username=username).first()
            if user and user.check_password(password):
                login_user(user)
                return redirect(url_for('collection.dashboard'))
            flash('Invalid username or password', 'error')
        except Exception as e:
            flash(f'Login error: {str(e)}', 'error')
    return render_template('auth/login.html')

@auth_bp.route('/register', methods=['GET', 'POST'])  # Fix route path
def register():
    if request.method == 'POST':
        try:
            username = request.form.get('username')
            email = request.form.get('email')
            password = request.form.get('password')
            
            if not username or not email or not password:
                flash('All fields are required', 'error')
                return render_template('auth/register.html')
            
            # Fix syntax in user existence checks
            if User.query.filter_by(username=username).first():
                flash('Username already exists', 'error')
                return render_template('auth/register.html')
            
            if User.query.filter_by(email=email).first():  # Fix email query
                flash('Email already registered', 'error')
                return render_template('auth/register.html')

            user = User(username=username, email=email)
            user.set_password(password)
            db.session.add(user)
            db.session.commit()
            flash('Registration successful! Please login.', 'success')
            return redirect(url_for('auth.login'))
        except Exception as e:
            db.session.rollback()
            flash(f'Registration error: {str(e)}', 'error')
    return render_template('auth/register.html')

@auth_bp.route('/logout')  # Fix route path
@login_required
def logout():
    try:
        logout_user()
        flash('You have been logged out successfully', 'info')
    except Exception as e:
        flash(f'Logout error: {str(e)}', 'error')
    return redirect(url_for('auth.login'))
