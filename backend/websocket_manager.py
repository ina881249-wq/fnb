from fastapi import WebSocket
from typing import Dict, List, Set
import json
import asyncio

class WebSocketManager:
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}
        self.user_outlets: Dict[str, Set[str]] = {}
        self.user_portals: Dict[str, Set[str]] = {}

    async def connect(self, websocket: WebSocket, user_id: str, outlets: list = None, portals: list = None):
        await websocket.accept()
        self.active_connections[user_id] = websocket
        self.user_outlets[user_id] = set(outlets or [])
        self.user_portals[user_id] = set(portals or [])

    def disconnect(self, user_id: str):
        self.active_connections.pop(user_id, None)
        self.user_outlets.pop(user_id, None)
        self.user_portals.pop(user_id, None)

    async def send_to_user(self, user_id: str, message: dict):
        ws = self.active_connections.get(user_id)
        if ws:
            try:
                await ws.send_json(message)
            except Exception:
                self.disconnect(user_id)

    async def broadcast_to_outlet(self, outlet_id: str, message: dict):
        for uid, outlets in self.user_outlets.items():
            if outlet_id in outlets:
                await self.send_to_user(uid, message)

    async def broadcast_to_portal(self, portal: str, message: dict):
        for uid, portals in self.user_portals.items():
            if portal in portals:
                await self.send_to_user(uid, message)

    async def broadcast_all(self, message: dict):
        for uid in list(self.active_connections.keys()):
            await self.send_to_user(uid, message)

ws_manager = WebSocketManager()
