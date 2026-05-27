"""Управление друзьями: поиск, добавление, список, принятие/отклонение."""
import json
import os
import psycopg2

CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json",
}

S = "t_p22480343_zg_corp_tag_game"


def get_conn():
    return psycopg2.connect(os.environ["DATABASE_URL"])


def resp(code, data):
    return {"statusCode": code, "headers": CORS, "body": json.dumps(data, ensure_ascii=False)}


def handler(event: dict, context) -> dict:
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": CORS, "body": ""}

    body = json.loads(event.get("body") or "{}")
    action = body.get("action")
    user_id = body.get("userId")

    if not user_id:
        return resp(400, {"error": "userId обязателен"})

    conn = get_conn()
    cur = conn.cursor()

    # Поиск пользователей по имени
    if action == "search":
        query = (body.get("query") or "").strip()
        if len(query) < 2:
            cur.close(); conn.close()
            return resp(400, {"error": "Минимум 2 символа"})
        cur.execute(
            f"SELECT id, username FROM {S}.users WHERE lower(username) LIKE lower(%s) AND id != %s LIMIT 10",
            (f"%{query}%", user_id)
        )
        rows = cur.fetchall()
        # Статус дружбы
        result = []
        for uid, uname in rows:
            cur.execute(
                f"SELECT status FROM {S}.friends WHERE (user_id=%s AND friend_id=%s) OR (user_id=%s AND friend_id=%s)",
                (user_id, uid, uid, user_id)
            )
            row = cur.fetchone()
            status = row[0] if row else None
            result.append({"id": uid, "username": uname, "friendStatus": status})
        cur.close(); conn.close()
        return resp(200, {"users": result})

    # Добавить в друзья
    if action == "add":
        friend_id = body.get("friendId")
        if not friend_id or friend_id == user_id:
            cur.close(); conn.close()
            return resp(400, {"error": "Некорректный friendId"})
        cur.execute(f"SELECT id FROM {S}.users WHERE id=%s", (friend_id,))
        if not cur.fetchone():
            cur.close(); conn.close()
            return resp(404, {"error": "Пользователь не найден"})
        cur.execute(
            f"SELECT id, status FROM {S}.friends WHERE user_id=%s AND friend_id=%s",
            (user_id, friend_id)
        )
        existing = cur.fetchone()
        if existing:
            cur.close(); conn.close()
            return resp(409, {"error": "Запрос уже отправлен"})
        cur.execute(
            f"INSERT INTO {S}.friends (user_id, friend_id, status) VALUES (%s, %s, 'pending')",
            (user_id, friend_id)
        )
        conn.commit(); cur.close(); conn.close()
        return resp(200, {"ok": True})

    # Принять/отклонить запрос
    if action == "respond":
        friend_id = body.get("friendId")
        accept = body.get("accept", False)
        if accept:
            cur.execute(
                f"UPDATE {S}.friends SET status='accepted' WHERE user_id=%s AND friend_id=%s",
                (friend_id, user_id)
            )
            # Создать обратную запись
            cur.execute(
                f"INSERT INTO {S}.friends (user_id, friend_id, status) VALUES (%s, %s, 'accepted') ON CONFLICT DO NOTHING",
                (user_id, friend_id)
            )
        else:
            cur.execute(
                f"DELETE FROM {S}.friends WHERE user_id=%s AND friend_id=%s",
                (friend_id, user_id)
            )
        conn.commit(); cur.close(); conn.close()
        return resp(200, {"ok": True})

    # Список друзей и входящих запросов
    if action == "list":
        # Принятые друзья (записи где user_id = я, статус accepted)
        cur.execute(
            f"""
            SELECT u.id, u.username
            FROM {S}.friends f
            JOIN {S}.users u ON u.id = f.friend_id
            WHERE f.user_id = %s AND f.status = 'accepted'
            """,
            (user_id,)
        )
        friends = [{"id": r[0], "username": r[1]} for r in cur.fetchall()]

        # Входящие запросы (кто-то добавил меня, я ещё не принял)
        cur.execute(
            f"""
            SELECT u.id, u.username
            FROM {S}.friends f
            JOIN {S}.users u ON u.id = f.user_id
            WHERE f.friend_id = %s AND f.status = 'pending'
            """,
            (user_id,)
        )
        incoming = [{"id": r[0], "username": r[1]} for r in cur.fetchall()]

        cur.close(); conn.close()
        return resp(200, {"friends": friends, "incoming": incoming})

    cur.close(); conn.close()
    return resp(400, {"error": "Неизвестное действие"})