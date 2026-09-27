import json
import logging
from typing import List, Dict, Any
from fastapi import WebSocket

logger = logging.getLogger("queuecare.websocket")

class WebSocketManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        logger.info(f"WebSocket connected. Total active connections: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
            logger.info(f"WebSocket disconnected. Remaining connections: {len(self.active_connections)}")

    async def broadcast(self, message_type: str, data: Dict[str, Any]):
        message = {
            "type": message_type,
            "data": data,
            "timestamp": data.get("timestamp") or str(logging.Formatter().formatTime(logging.LogRecord("", 0, "", 0, "", (), None)))
        }
        payload = json.dumps(message, default=str)
        dead_connections = []
        for connection in self.active_connections:
            try:
                await connection.send_text(payload)
            except Exception as e:
                logger.warning(f"Error broadcasting to client: {e}")
                dead_connections.append(connection)

        for dead in dead_connections:
            self.disconnect(dead)

ws_manager = WebSocketManager()
