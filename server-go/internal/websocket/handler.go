package websocket

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/gorilla/websocket"
	"github.com/yourusername/kpi-backend/pkg/logger"
	"go.uber.org/zap"
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		return true // In production, replace with actual origin check
	},
}

// ServeWs handles websocket requests from the peer.
func ServeWs(hub *Hub, ctx *gin.Context) {
	userID, exists := ctx.Get("userID")
	var uid uuid.UUID
	if exists {
		if val, ok := userID.(uuid.UUID); ok {
			uid = val
		}
	}

	logger.Log.Info("WebSocket upgrade request received", 
		zap.String("remote_addr", ctx.Request.RemoteAddr),
		zap.String("origin", ctx.Request.Header.Get("Origin")),
		zap.String("userId", uid.String()),
	)

	conn, err := upgrader.Upgrade(ctx.Writer, ctx.Request, nil)
	if err != nil {
		logger.Log.Error("Failed to upgrade websocket", zap.Error(err))
		return
	}
	client := &Client{Hub: hub, Conn: conn, Send: make(chan []byte, 256), UserID: uid}
	client.Hub.register <- client

	// Allow collection of memory referenced by the caller by doing all work in
	// new goroutines.
	go client.WritePump()
	go client.ReadPump()
}
