const FRIENDS_URL = 'https://functions.poehali.dev/0655d3bd-5fbb-4902-a8c4-045c057c10ef';
const ROOMS_URL = 'https://functions.poehali.dev/29b59065-732e-4940-92f9-c10e932af5c8';

export interface PlayerState {
  playerId: number;
  username: string;
  x: number;
  y: number;
  extra: Record<string, unknown>;
  role: 'host' | 'guest';
}

export interface RoomState {
  status: string;
  mode: string;
  hostId: number;
  guestId: number | null;
  players: PlayerState[];
}

async function post(url: string, body: object) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  try {
    let data = JSON.parse(text);
    // Бэкенд иногда возвращает body как строку — распарсить дважды
    if (typeof data === 'string') data = JSON.parse(data);
    return data;
  } catch {
    return { error: text };
  }
}

// Friends API
export const friendsApi = {
  search: (userId: number, query: string) =>
    post(FRIENDS_URL, { action: 'search', userId, query }),
  add: (userId: number, friendId: number) =>
    post(FRIENDS_URL, { action: 'add', userId, friendId }),
  respond: (userId: number, friendId: number, accept: boolean) =>
    post(FRIENDS_URL, { action: 'respond', userId, friendId, accept }),
  list: (userId: number) =>
    post(FRIENDS_URL, { action: 'list', userId }),
};

// Rooms API
export const roomsApi = {
  create: (userId: number, mode: string) =>
    post(ROOMS_URL, { action: 'create', userId, mode }),
  join: (userId: number, code: string) =>
    post(ROOMS_URL, { action: 'join', userId, code }),
  update: (userId: number, roomId: number, x: number, y: number, extra?: object) =>
    post(ROOMS_URL, { action: 'update', userId, roomId, x, y, extra: extra || {} }),
  state: (userId: number, roomId: number): Promise<RoomState> =>
    post(ROOMS_URL, { action: 'state', userId, roomId }),
  finish: (userId: number, roomId: number) =>
    post(ROOMS_URL, { action: 'finish', userId, roomId }),
};