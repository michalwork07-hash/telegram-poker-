import { io } from 'socket.io-client';

const SERVER = import.meta.env.VITE_SERVER_URL || '';

let socket = null;

export function getSocket(authPayload) {
  if (socket) return socket;
  socket = io(SERVER, {
    auth: authPayload,
    transports: ['websocket'],
    autoConnect: false,
  });
  return socket;
}

export function connectSocket(authPayload) {
  const s = getSocket(authPayload);
  if (!s.connected) s.connect();
  return s;
}
