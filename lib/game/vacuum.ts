export const VACUUM_HEAD_SCALE = 1.6;
export const VACUUM_HEAD_OFFSET_Y = 1.2;
export const VACUUM_HEAD_SOCKET_OFFSET = {
  x: 0,
  y: 5.1,
} as const;
export const VACUUM_SUCTION_OFFSET_FROM_SOCKET_Y = -3.2;

export function getVacuumHeadSocket(x: number, y: number) {
  const scaledSocketOffset = {
    x: VACUUM_HEAD_SOCKET_OFFSET.x * VACUUM_HEAD_SCALE,
    y: VACUUM_HEAD_SOCKET_OFFSET.y * VACUUM_HEAD_SCALE,
  };
  const socket = {
    x: x + VACUUM_HEAD_SOCKET_OFFSET.x,
    y: y + VACUUM_HEAD_SOCKET_OFFSET.y + VACUUM_HEAD_OFFSET_Y,
  };

  return {
    socket,
    headRenderCenter: {
      x: socket.x - scaledSocketOffset.x,
      y: socket.y - scaledSocketOffset.y,
    },
  };
}

export function getVacuumSuctionPoint(x: number, y: number) {
  const { socket } = getVacuumHeadSocket(x, y);

  return {
    x: socket.x,
    y: socket.y + VACUUM_SUCTION_OFFSET_FROM_SOCKET_Y,
  };
}
