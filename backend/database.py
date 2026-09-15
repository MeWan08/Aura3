import sqlite3
import json
import os

DB_FILE = os.path.join(os.path.dirname(__file__), "database.db")

def init_db():
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS startups (
            id TEXT PRIMARY KEY,
            data TEXT NOT NULL
        )
    """)
    conn.commit()
    conn.close()

def save_startup(startup_id: str, data: dict):
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO startups (id, data) VALUES (?, ?) ON CONFLICT(id) DO UPDATE SET data=excluded.data",
        (startup_id, json.dumps(data))
    )
    conn.commit()
    conn.close()

def get_startup(startup_id: str) -> dict:
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute("SELECT data FROM startups WHERE id = ?", (startup_id,))
    row = cursor.fetchone()
    conn.close()
    if row:
        return json.loads(row[0])
    return None

def get_all_startups() -> list:
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute("SELECT data FROM startups")
    rows = cursor.fetchall()
    conn.close()
    
    startups = []
    for row in rows:
        startups.append(json.loads(row[0]))
    return startups
