"""Мультиплеер: создание комнат, вход, синхронизация позиций игроков."""
import json
import os
import random
import string
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


def gen_code():
    return "".join(random.choices(string.ascii_uppercase + string.digits, k=6))


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

    # Создать комнату
    if action == "create":
        mode = body.get("mode", "chase")
        code = gen_code()
        # Убедимся что код уникален
        for _ in range(5):
            cur.execute(f"SELECT id FROM {S}.rooms WHERE code=%s", (code,))
            if not cur.fetchone():
                break
            code = gen_code()
        cur.execute(
            f"INSERT INTO {S}.rooms (code, host_id, mode, status) VALUES (%s, %s, %s, 'waiting') RETURNING id",
            (code, user_id, mode)
        )
        room_id = cur.fetchone()[0]
        # Начальное состояние хоста
        cur.execute(
            f"INSERT INTO {S}.room_state (room_id, player_id, x, y) VALUES (%s, %s, 100, 300)",
            (room_id, user_id)
        )
        conn.commit(); cur.close(); conn.close()
        return resp(200, {"ok": True, "roomId": room_id, "code": code, "role": "host"})

    # Войти в комнату по коду
    if action == "join":
        code = (body.get("code") or "").strip().upper()
        cur.execute(f"SELECT id, host_id, guest_id, mode, status FROM {S}.rooms WHERE code=%s", (code,))
        row = cur.fetchone()
        if not row:
            cur.close(); conn.close()
            return resp(404, {"error": "Комната не найдена"})
        room_id, host_id, guest_id, mode, status = row
        if status == "finished":
            cur.close(); conn.close()
            return resp(410, {"error": "Игра уже завершена"})
        # Если это хост — просто вернуть данные
        if host_id == user_id:
            cur.close(); conn.close()
            return resp(200, {"ok": True, "roomId": room_id, "mode": mode, "role": "host", "status": status})
        # Если гость уже есть и это не он
        if guest_id and guest_id != user_id:
            cur.close(); conn.close()
            return resp(409, {"error": "Комната уже занята"})
        # Присоединиться гостем
        if not guest_id:
            cur.execute(
                f"UPDATE {S}.rooms SET guest_id=%s, status='playing' WHERE id=%s",
                (user_id, room_id)
            )
            cur.execute(
                f"INSERT INTO {S}.room_state (room_id, player_id, x, y) VALUES (%s, %s, 600, 300) ON CONFLICT DO NOTHING",
                (room_id, user_id)
            )
            conn.commit()
        cur.close(); conn.close()
        return resp(200, {"ok": True, "roomId": room_id, "mode": mode, "role": "guest", "status": "playing"})

    # Обновить позицию
    if action == "update":
        room_id = body.get("roomId")
        x = body.get("x", 0)
        y = body.get("y", 0)
        extra = body.get("extra", {})
        cur.execute(
            f"""
            INSERT INTO {S}.room_state (room_id, player_id, x, y, extra, updated_at)
            VALUES (%s, %s, %s, %s, %s, NOW())
            ON CONFLICT (room_id, player_id) DO UPDATE
            SET x=EXCLUDED.x, y=EXCLUDED.y, extra=EXCLUDED.extra, updated_at=NOW()
            """,
            (room_id, user_id, x, y, json.dumps(extra))
        )
        conn.commit(); cur.close(); conn.close()
        return resp(200, {"ok": True})

    # Получить состояние комнаты
    if action == "state":
        room_id = body.get("roomId")
        cur.execute(
            f"SELECT host_id, guest_id, mode, status FROM {S}.rooms WHERE id=%s",
            (room_id,)
        )
        room = cur.fetchone()
        if not room:
            cur.close(); conn.close()
            return resp(404, {"error": "Комната не найдена"})
        host_id, guest_id, mode, status = room
        cur.execute(
            f"""
            SELECT rs.player_id, u.username, rs.x, rs.y, rs.extra
            FROM {S}.room_state rs
            JOIN {S}.users u ON u.id = rs.player_id
            WHERE rs.room_id = %s
            """,
            (room_id,)
        )
        players = []
        for pid, uname, x, y, extra in cur.fetchall():
            role = "host" if pid == host_id else "guest"
            players.append({"playerId": pid, "username": uname, "x": x, "y": y, "extra": extra or {}, "role": role})
        cur.close(); conn.close()
        return resp(200, {
            "status": status,
            "mode": mode,
            "hostId": host_id,
            "guestId": guest_id,
            "players": players
        })

    # Завершить игру
    if action == "finish":
        room_id = body.get("roomId")
        cur.execute(f"UPDATE {S}.rooms SET status='finished' WHERE id=%s", (room_id,))
        conn.commit(); cur.close(); conn.close()
        return resp(200, {"ok": True})

    cur.close(); conn.close()
    return resp(400, {"error": "Неизвестное действие"})