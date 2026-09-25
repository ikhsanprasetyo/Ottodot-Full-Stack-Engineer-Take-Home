package websocket

import (
	"context"
	"encoding/json"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/gorilla/websocket"
	"github.com/yourusername/kpi-backend/internal/repositories"
	"github.com/yourusername/kpi-backend/pkg/logger"
	"go.uber.org/zap"
)

const (
	// pongWait adalah batas waktu tunggu pong dari client
	pongWait = 60 * time.Second
	// pingPeriod adalah interval server mengirim ping ke client (harus < pongWait)
	pingPeriod = (pongWait * 9) / 10
	// maxMessageSize batas ukuran pesan dari client
	maxMessageSize = 512
)

// Message represents a WebSocket message
type Message struct {
	Type    string `json:"type"`
	Payload any    `json:"payload"`
}

// Client represents a connected WebSocket client
type Client struct {
	Hub    *Hub
	Conn   *websocket.Conn
	Send   chan []byte
	UserID uuid.UUID
}

// Hub manages the set of active clients and broadcasts messages
type Hub struct {
	clients    map[*Client]bool
	broadcast  chan []byte
	register   chan *Client
	unregister chan *Client
	mu         sync.Mutex
	userRepo   *repositories.UserRepository
	userConns  map[uuid.UUID]int // map[UserID]connectionCount
}

func NewHub(userRepo *repositories.UserRepository) *Hub {
	return &Hub{
		broadcast:  make(chan []byte),
		register:   make(chan *Client),
		unregister: make(chan *Client),
		clients:    make(map[*Client]bool),
		userConns:  make(map[uuid.UUID]int),
		userRepo:   userRepo,
	}
}

func (h *Hub) Run() {
	for {
		select {
		case client := <-h.register:
			h.mu.Lock()
			h.clients[client] = true

			var count int
			if client.UserID != uuid.Nil {
				h.userConns[client.UserID]++
				count = h.userConns[client.UserID]
			}
			h.mu.Unlock()

			if client.UserID != uuid.Nil {
				logger.Log.Info("WebSocket: Client registered",
					zap.String("userId", client.UserID.String()),
					zap.Int("activeConns", count))

				if count == 1 {
					go func(uid uuid.UUID) {
						logger.Log.Info("WebSocket: First connection, marking user as ONLINE", zap.String("userId", uid.String()))
						err := h.userRepo.SetOnlineStatus(context.Background(), uid, true)
						if err != nil {
							logger.Log.Error("Failed to update status on register", zap.Error(err))
						}
						h.Broadcast("user_status", gin.H{"userId": uid, "status": "online", "lastSeenAt": time.Now()})
					}(client.UserID)
				}
			}

		case client := <-h.unregister:
			h.mu.Lock()
			var count int
			userWasSet := false
			if _, ok := h.clients[client]; ok {
				delete(h.clients, client)
				close(client.Send)

				if client.UserID != uuid.Nil {
					h.userConns[client.UserID]--
					count = h.userConns[client.UserID]
					if count < 0 {
						h.userConns[client.UserID] = 0
						count = 0
					}
					userWasSet = true
				}
			}
			h.mu.Unlock()

			if userWasSet {
				logger.Log.Info("WebSocket: Client unregistered",
					zap.String("userId", client.UserID.String()),
					zap.Int("activeConns", count))

				if count == 0 {
					go func(uid uuid.UUID) {
						logger.Log.Info("WebSocket: Last connection closed, marking user as OFFLINE", zap.String("userId", uid.String()))
						err := h.userRepo.SetOnlineStatus(context.Background(), uid, false)
						if err != nil {
							logger.Log.Error("Failed to update status on unregister", zap.Error(err))
						}
						h.Broadcast("user_status", gin.H{"userId": uid, "status": "offline", "lastSeenAt": time.Now()})
					}(client.UserID)
				}
			}
		case message := <-h.broadcast:
			h.mu.Lock()
			logger.Log.Info("WebSocket: Sending broadcast to all clients", 
				zap.Int("clients_count", len(h.clients)))
			for client := range h.clients {
				select {
				case client.Send <- message:
					logger.Log.Debug("WebSocket: Sent message successfully to client", zap.String("userId", client.UserID.String()))
				default:
					logger.Log.Warn("WebSocket: Client send channel blocked, closing client", zap.String("userId", client.UserID.String()))
					close(client.Send)
					delete(h.clients, client)
				}
			}
			h.mu.Unlock()
		}
	}
}

// Broadcast sends a message to all connected clients
func (h *Hub) Broadcast(msgType string, payload any) {
	msg := Message{
		Type:    msgType,
		Payload: payload,
	}
	b, err := json.Marshal(msg)
	if err != nil {
		logger.Log.Error("WebSocket Broadcast: Failed to marshal message", zap.Error(err))
		return
	}
	
	h.mu.Lock()
	clientCount := len(h.clients)
	h.mu.Unlock()
	
	logger.Log.Info("WebSocket Broadcast called", 
		zap.String("type", msgType), 
		zap.Any("payload", payload),
		zap.Int("clients_count", clientCount))
		
	h.broadcast <- b
}

func (c *Client) ReadPump() {
	defer func() {
		c.Hub.unregister <- c
		c.Conn.Close()
	}()

	// Batasi ukuran pesan dan set deadline pong
	c.Conn.SetReadLimit(maxMessageSize)
	c.Conn.SetReadDeadline(time.Now().Add(pongWait))
	c.Conn.SetPongHandler(func(string) error {
		// Setiap kali pong diterima, perpanjang deadline
		c.Conn.SetReadDeadline(time.Now().Add(pongWait))
		return nil
	})

	for {
		_, _, err := c.Conn.ReadMessage()
		if err != nil {
			break
		}
	}
}

func (c *Client) WritePump() {
	// Ticker untuk mengirim ping secara berkala
	ticker := time.NewTicker(pingPeriod)
	defer func() {
		ticker.Stop()
		c.Conn.Close()
	}()
	for {
		select {
		case message, ok := <-c.Send:
			c.Conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
			if !ok {
				c.Conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}
			w, err := c.Conn.NextWriter(websocket.TextMessage)
			if err != nil {
				return
			}
			w.Write(message)

			// Kirim pesan antrian sekaligus dalam satu frame
			n := len(c.Send)
			for i := 0; i < n; i++ {
				w.Write([]byte{'\n'})
				w.Write(<-c.Send)
			}

			if err := w.Close(); err != nil {
				return
			}

		case <-ticker.C:
			// Kirim ping ke client untuk menjaga koneksi tetap hidup
			c.Conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
			if err := c.Conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}
