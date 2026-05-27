"""Регистрация и вход в аккаунт ZG Corp."""
import json
import os
import hashlib
import secrets
import psycopg2


def get_conn():
    return psycopg2.connect(os.environ["DATABASE_URL"])


def hash_password(password: str, salt: str) -> str:
    return hashlib.sha256(f"{salt}{password}".encode()).hexdigest()


CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
}


def handler(event: dict, context) -> dict:
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": CORS, "body": ""}

    body = json.loads(event.get("body") or "{}")
    action = body.get("action")  # "register" | "login"
    username = (body.get("username") or "").strip()[:32]
    password = body.get("password") or ""

    if not username or not password:
        return {"statusCode": 400, "headers": CORS,
                "body": json.dumps({"error": "Заполни имя и пароль"})}

    if len(username) < 3:
        return {"statusCode": 400, "headers": CORS,
                "body": json.dumps({"error": "Имя минимум 3 символа"})}

    if len(password) < 4:
        return {"statusCode": 400, "headers": CORS,
                "body": json.dumps({"error": "Пароль минимум 4 символа"})}

    conn = get_conn()
    cur = conn.cursor()

    if action == "register":
        cur.execute(
            "SELECT id FROM t_p22480343_zg_corp_tag_game.users WHERE username = %s",
            (username,)
        )
        if cur.fetchone():
            cur.close(); conn.close()
            return {"statusCode": 409, "headers": CORS,
                    "body": json.dumps({"error": "Имя уже занято"})}

        salt = secrets.token_hex(16)
        pw_hash = hash_password(password, salt)
        full_hash = f"{salt}:{pw_hash}"

        cur.execute(
            "INSERT INTO t_p22480343_zg_corp_tag_game.users (username, password_hash) VALUES (%s, %s) RETURNING id",
            (username, full_hash)
        )
        user_id = cur.fetchone()[0]
        conn.commit()
        cur.close(); conn.close()

        token = secrets.token_hex(32)
        return {"statusCode": 200, "headers": CORS,
                "body": json.dumps({"ok": True, "userId": user_id, "username": username, "token": token})}

    elif action == "login":
        cur.execute(
            "SELECT id, password_hash FROM t_p22480343_zg_corp_tag_game.users WHERE username = %s",
            (username,)
        )
        row = cur.fetchone()
        cur.close(); conn.close()

        if not row:
            return {"statusCode": 401, "headers": CORS,
                    "body": json.dumps({"error": "Неверное имя или пароль"})}

        user_id, full_hash = row
        salt, stored = full_hash.split(":", 1)
        if hash_password(password, salt) != stored:
            return {"statusCode": 401, "headers": CORS,
                    "body": json.dumps({"error": "Неверное имя или пароль"})}

        token = secrets.token_hex(32)
        return {"statusCode": 200, "headers": CORS,
                "body": json.dumps({"ok": True, "userId": user_id, "username": username, "token": token})}

    return {"statusCode": 400, "headers": CORS,
            "body": json.dumps({"error": "Неизвестное действие"})}
