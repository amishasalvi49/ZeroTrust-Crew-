from flask import Flask, jsonify, request
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import URL
from werkzeug.security import generate_password_hash
from werkzeug.security import check_password_hash
from datetime import datetime
from sqlalchemy import or_
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity
import os
from dotenv import load_dotenv

load_dotenv()


app = Flask(__name__)
CORS(app)

db_url = URL.create(
    drivername="mysql+pymysql",
    username=os.environ.get("DB_USER"),
    password=os.environ.get("DB_PASSWORD"),
    host=os.environ.get("DB_HOST"),
    port=int(os.environ.get("DB_PORT", 3306)),
    database=os.environ.get("DB_NAME")
)

app.config["SQLALCHEMY_DATABASE_URI"] = db_url
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
app.config["JWT_SECRET_KEY"] = os.environ.get("JWT_SECRET_KEY")
app.config["JWT_ACCESS_TOKEN_EXPIRES"] = int(os.environ.get("JWT_ACCESS_TOKEN_EXPIRES", 900))

jwt = JWTManager(app)

db = SQLAlchemy(app)


class User(db.Model):
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(150), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    phone = db.Column(db.String(20))
    role = db.Column(db.String(20), default="citizen")
    created_at = db.Column(
        db.DateTime,
        server_default=db.func.now()
    )

def admin_required(f):
    from functools import wraps

    @wraps(f)
    def decorated_function(*args, **kwargs):
        data = request.get_json()
        email = data.get("email")

        user = User.query.filter_by(email=email).first()

        if not user or user.role != "admin":
            return jsonify({"error": "Admin access required"}), 403

        return f(*args, **kwargs)

    return decorated_function

@app.route("/api/admin/users", methods=["GET", "POST"])
def get_all_users():
    if request.method == "GET":
        email = request.args.get("email")
    else:
        data = request.get_json()
        email = data.get("email")

    user = User.query.filter_by(email=email).first()

    if not user or user.role != "admin":
        return jsonify({"error": "Admin access required"}), 403

    users = User.query.all()

    user_list = []

    for u in users:
        user_list.append({
            "id": u.id,
            "name": u.name,
            "email": u.email,
            "role": u.role,
            "created_at": u.created_at.strftime("%Y-%m-%d %H:%M:%S")
        })

    return jsonify({"users": user_list}), 200

@app.route("/api/admin/users/<int:user_id>/role", methods=["PUT"])
@jwt_required()
def update_user_role(user_id):
    current_email = get_jwt_identity()
    admin = User.query.filter_by(email=current_email).first()

    if not admin or admin.role != "admin":
        return jsonify({"error": "Admin access required"}), 403

    data = request.get_json()
    new_role = data.get("role")

    if new_role not in ["citizen", "volunteer", "admin"]:
        return jsonify({"error": "Invalid role"}), 400

    user = User.query.get(user_id)

    if not user:
        return jsonify({"error": "User not found"}), 404

    user.role = new_role
    db.session.commit()

    return jsonify({"message": "Role updated successfully"}), 200


    data = request.get_json()
    email = data.get("email")

    admin = User.query.filter_by(email=email).first()

    if not admin or admin.role != "admin":
        return jsonify({"error": "Admin access required"}), 403

    user = User.query.get(user_id)

    if not user:
        return jsonify({"error": "User not found"}), 404

    db.session.delete(user)
    db.session.commit()

    return jsonify({"message": "User deleted successfully"}), 200

@app.route("/api/admin/users/<int:user_id>", methods=["DELETE"])
@jwt_required()
def delete_user(user_id):
    current_email = get_jwt_identity()
    admin = User.query.filter_by(email=current_email).first()

    if not admin or admin.role != "admin":
        return jsonify({"error": "Admin access required"}), 403

    user = User.query.get(user_id)

    if not user:
        return jsonify({"error": "User not found"}), 404

    db.session.delete(user)
    db.session.commit()

    return jsonify({"message": "User deleted successfully"}), 200

class Report(db.Model):
    __tablename__ = "reports"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    disaster_type = db.Column(db.String(50), nullable=False)
    location = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text, nullable=False)
    status = db.Column(db.String(20), default="pending")
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    priority = db.Column(db.String(20), default="medium")


@app.route("/")
def home():
    return jsonify({"message": "DisasterMesh backend is running"})


@app.route("/api/signup", methods=["POST"])
def signup():
    data = request.get_json()

    if not data:
        return jsonify({"error": "Invalid request"}), 400

    name = data.get("name")
    email = data.get("email")
    password = data.get("password")
    phone = data.get("phone", "")
    role = data.get("role", "citizen")

    if not name or not email or not password:
        return jsonify({"error": "Name, email and password are required"}), 400

    if User.query.filter_by(email=email).first():
        return jsonify({"error": "Email already registered"}), 409

    user = User(
        name=name,
        email=email,
        password_hash=generate_password_hash(password),
        phone=phone,
        role=role
    )

    db.session.add(user)
    db.session.commit()

    return jsonify({"message": "Signup successful"}), 201

@app.route("/api/login", methods=["POST"])
def login():
    data = request.get_json()

    if not data:
        return jsonify({"error": "Invalid request"}), 400

    email = data.get("email")
    password = data.get("password")

    if not email or not password:
        return jsonify({"error": "Email and password are required"}), 400

    user = User.query.filter_by(email=email).first()

    if not user or not check_password_hash(user.password_hash, password):
        return jsonify({"error": "Invalid email or password"}), 401

    access_token = create_access_token(identity=user.email)
    return jsonify({
        "message": "Login successful",
        "access_token": access_token,
        "user": {
            "id": user.id,
            "name": user.name,
            "email": user.email,
            "role": user.role
        }
    }), 200

@app.route("/api/reports", methods=["POST"])
def create_report():
    data = request.get_json()

    if not data:
        return jsonify({"error": "Invalid request"}), 400

    user_id = data.get("user_id")
    disaster_type = data.get("disaster_type")
    location = data.get("location")
    description = data.get("description")

    if not user_id or not disaster_type or not location or not description:
        return jsonify({"error": "All fields are required"}), 400

    report = Report(
        user_id=user_id,
        disaster_type=disaster_type,
        location=location,
        description=description,
        priority=data.get("priority", "medium")
    )

    db.session.add(report)
    db.session.commit()

    return jsonify({"message": "Report submitted successfully"}), 201


@app.route("/api/reports", methods=["GET"])
@jwt_required()
def get_reports():
    email = request.args.get("email")
    disaster_type = request.args.get("disaster_type")
    status = request.args.get("status")
    search = request.args.get("search")

    user = User.query.filter_by(email=email).first()

    if not user:
        return jsonify({"error": "User not found"}), 404

    query = Report.query.filter_by(user_id=user.id)

    if user.role == "admin":
        query = Report.query

    if disaster_type:
        query = query.filter_by(disaster_type=disaster_type)

    if status:
        query = query.filter_by(status=status)
    
    priority = request.args.get("priority")
    if priority:
       query = query.filter_by(priority=priority)

    if search:
        query = query.filter(
            or_(
                Report.location.ilike(f"%{search}%"),
                Report.description.ilike(f"%{search}%")
            )
        )

    reports = query.order_by(Report.created_at.desc()).all()

    report_list = []

    for report in reports:
        user = User.query.get(report.user_id)

        report_list.append({
    "id": report.id,
    "user_id": report.user_id,
    "user_name": user.name if user else "Unknown",
    "disaster_type": report.disaster_type,
    "location": report.location,
    "description": report.description,
    "priority": report.priority,
    "status": report.status,
    "created_at": report.created_at.strftime("%Y-%m-%d %H:%M:%S")
})
    return jsonify({
    "reports": report_list,
    "current_role": user.role
}), 200

    return jsonify({"reports": report_list}), 200


@app.route("/api/stats", methods=["GET"])
def get_stats():
    total = Report.query.count()
    pending = Report.query.filter_by(status="pending").count()
    in_progress = Report.query.filter_by(status="in_progress").count()
    resolved = Report.query.filter_by(status="resolved").count()

    return jsonify({
        "total": total,
        "pending": pending,
        "in_progress": in_progress,
        "resolved": resolved
    }), 200

@app.route("/api/reports/<int:report_id>/status", methods=["PUT"])
def update_report_status(report_id):
    data = request.get_json()

    if not data:
        return jsonify({"error": "Invalid request"}), 400

    status = data.get("status")

    if status not in ["pending", "in_progress", "resolved"]:
        return jsonify({"error": "Invalid status"}), 400

    report = Report.query.get(report_id)

    if not report:
        return jsonify({"error": "Report not found"}), 404

    report.status = status
    db.session.commit()

    return jsonify({"message": "Status updated successfully"}), 200

@app.route("/api/reports/<int:report_id>", methods=["PUT"])
def update_report(report_id):
    data = request.get_json()

    if not data:
        return jsonify({"error": "Invalid request"}), 400

    email = data.get("email")
    location = data.get("location")
    description = data.get("description")
    priority = data.get("priority")

    user = User.query.filter_by(email=email).first()

    if not user:
        return jsonify({"error": "User not found"}), 404

    report = Report.query.get(report_id)

    if not report:
        return jsonify({"error": "Report not found"}), 404

    if report.user_id != user.id and user.role != "admin":
        return jsonify({"error": "Not allowed"}), 403

    if location:
        report.location = location

    if description:
        report.description = description

    if priority in ["low", "medium", "high", "critical"]:
        report.priority = priority

    db.session.commit()

    return jsonify({"message": "Report updated successfully"}), 200

@app.route("/api/reports/<int:report_id>", methods=["GET"])
def get_report_details(report_id):
    report = Report.query.get(report_id)

    if not report:
        return jsonify({"error": "Report not found"}), 404

    user = User.query.get(report.user_id)

    return jsonify({
        "id": report.id,
        "user_id": report.user_id,
        "user_name": user.name if user else "Unknown",
        "disaster_type": report.disaster_type,
        "location": report.location,
        "description": report.description,
        "priority": report.priority,
        "status": report.status,
        "created_at": report.created_at.strftime("%Y-%m-%d %H:%M:%S")
    }), 200

@app.route("/api/reports/<int:report_id>", methods=["DELETE"])
def delete_report(report_id):
    data = request.get_json()
    email = data.get("email")

    user = User.query.filter_by(email=email).first()

    if not user or user.role != "admin":
        return jsonify({"error": "Admin access required"}), 403

    report = Report.query.get(report_id)

    if not report:
        return jsonify({"error": "Report not found"}), 404

    db.session.delete(report)
    db.session.commit()

    return jsonify({"message": "Report deleted successfully"}), 200

@app.route("/api/logout", methods=["POST"])
def logout():
    return jsonify({"message": "Logged out successfully"}), 200

if __name__ == "__main__":
    app.run(debug=True)