import os
import time
import mysql.connector
from flask import Flask, request, jsonify, render_template_string, redirect

app = Flask(__name__)

DB_CONFIG = {
    "host": os.getenv("DB_HOST", "localhost"),
    "user": os.getenv("DB_USER", "root"),
    "password": os.getenv("DB_PASSWORD", ""),
    "database": os.getenv("DB_NAME", "appdb"),
}


def get_conn(retries=10, delay=3):
    """DB container start hone me time lagta hai, isliye retry."""
    for i in range(retries):
        try:
            return mysql.connector.connect(**DB_CONFIG)
        except mysql.connector.Error as e:
            print(f"DB not ready ({i + 1}/{retries}): {e}", flush=True)
            time.sleep(delay)
    raise RuntimeError("Could not connect to DB")


def init_db():
    conn = get_conn()
    cur = conn.cursor()
    cur.execute(
        """CREATE TABLE IF NOT EXISTS messages (
            id INT AUTO_INCREMENT PRIMARY KEY,
            text VARCHAR(255) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )"""
    )
    conn.commit()
    cur.close()
    conn.close()


PAGE = """
<h2>Flask + MySQL (two-tier)</h2>
<form method="post" action="/add">
  <input name="text" placeholder="message likho" required>
  <button>Save</button>
</form>
<ul>{% for m in messages %}<li>{{ m[1] }} <small>({{ m[2] }})</small></li>{% endfor %}</ul>
"""


@app.route("/")
def index():
    conn = get_conn()
    cur = conn.cursor()
    cur.execute("SELECT id, text, created_at FROM messages ORDER BY id DESC")
    rows = cur.fetchall()
    cur.close()
    conn.close()
    return render_template_string(PAGE, messages=rows)


@app.route("/add", methods=["POST"])
def add():
    text = request.form.get("text") or (request.get_json(silent=True) or {}).get("text")
    if not text:
        return jsonify(error="text required"), 400
    conn = get_conn()
    cur = conn.cursor()
    cur.execute("INSERT INTO messages (text) VALUES (%s)", (text,))
    conn.commit()
    cur.close()
    conn.close()
    return redirect("/")


@app.route("/api/messages")
def api_messages():
    conn = get_conn()
    cur = conn.cursor(dictionary=True)
    cur.execute("SELECT id, text, created_at FROM messages ORDER BY id DESC")
    rows = cur.fetchall()
    cur.close()
    conn.close()
    return jsonify(rows)


@app.route("/health")
def health():
    return jsonify(status="ok")


if __name__ == "__main__":
    init_db()
    app.run(host="0.0.0.0", port=5000)
