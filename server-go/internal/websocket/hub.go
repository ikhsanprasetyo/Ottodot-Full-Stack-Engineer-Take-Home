package websocket

import (
	"encoding/json"
	"net/http"
	"sync"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
	"github.com/yourusername/kpi-backend/pkg/logger"
	"go.uber.org/zap"
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		return true // Allow CORS for demo static export
	},
}

type EventMessage struct {
	Type    string      `json:"type"` // "SEAT_UPDATE" or "ROSTER_UPDATE"
	Payload interface{} `json:"payload"`
}

type Hub struct {
	clients   map[*websocket.Conn]bool
	broadcast chan EventMessage
	mutex     sync.RWMutex
}

var GlobalHub = NewHub()

func NewHub() *Hub {
	h := &Hub{
		clients:   make(map[*websocket.Conn]bool),
		broadcast: make(chan EventMessage, 256),
	}
	go h.run()
	return h
}

func (h *Hub) run() {
	for msg := range h.broadcast {
		h.mutex.RLock()
		data, err := json.Marshal(msg)
		if err != nil {
			h.mutex.RUnlock()
			continue
		}

		for client := range h.clients {
			if err := client.WriteMessage(websocket.TextMessage, data); err != nil {
				logger.Log.Warn("WebSocket write failed, closing connection", zap.Error(err))
				client.Close()
				delete(h.clients, client)
			}
		}
		h.mutex.RUnlock()
	}
}

func (h *Hub) Broadcast(eventType string, payload interface{}) {
	h.broadcast <- EventMessage{
		Type:    eventType,
		Payload: payload,
	}
}

func HandleWebSocket(c *gin.Context) {
	conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		logger.Log.Error("Failed to upgrade WebSocket connection", zap.Error(err))
		return
	}

	GlobalHub.mutex.Lock()
	GlobalHub.clients[conn] = true
	GlobalHub.mutex.Unlock()

	logger.Log.Info("New WebSocket client connected")

	// Read loop to keep connection alive until disconnect
	defer func() {
		GlobalHub.mutex.Lock()
		delete(GlobalHub.clients, conn)
		GlobalHub.mutex.Unlock()
		conn.Close()
		logger.Log.Info("WebSocket client disconnected")
	}()

	for {
		_, _, err := conn.ReadMessage()
		if err != nil {
			break
		}
	}
}
