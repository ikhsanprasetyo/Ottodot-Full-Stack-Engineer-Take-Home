package controllers

import (
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/yourusername/kpi-backend/pkg/logger"
	"go.uber.org/zap"
)

// UploadImage handles uploading product and material images
func UploadImage(ctx *gin.Context) {
	// Limit request body size to prevent huge uploads (safety boundary)
	// 500KB file + metadata headers -> 600KB max request body limit is safe
	ctx.Request.Body = http.MaxBytesReader(ctx.Writer, ctx.Request.Body, 600*1024)

	file, header, err := ctx.Request.FormFile("image")
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "Failed to parse image file: " + err.Error()})
		return
	}
	defer file.Close()

	// 1. Validate File Size (Maximum 500KB)
	const maxFileSize = 500 * 1024 // 512,000 bytes
	if header.Size > maxFileSize {
		ctx.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": fmt.Sprintf("File size is too large (%.2f KB). Maximum limit is 500 KB.", float64(header.Size)/1024),
		})
		return
	}

	// 2. Validate MIME Type and Extension
	ext := strings.ToLower(filepath.Ext(header.Filename))
	allowedExtensions := map[string]bool{
		".jpg":  true,
		".jpeg": true,
		".png":  true,
		".webp": true,
		".gif":  true,
	}
	if !allowedExtensions[ext] {
		ctx.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "Unsupported file format. Allowed formats: JPG, JPEG, PNG, WEBP, GIF."})
		return
	}

	contentType := header.Header.Get("Content-Type")
	if !strings.HasPrefix(contentType, "image/") {
		ctx.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "File is not a valid image type."})
		return
	}

	// 3. Ensure upload directory exists
	uploadDir := "./uploads"
	if err := os.MkdirAll(uploadDir, 0755); err != nil {
		logger.Log.Error("Failed to create upload directory", zap.Error(err))
		ctx.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Failed to initialize storage on server"})
		return
	}
	// Explicitly force directory permission to 0755 to override OS umask
	_ = os.Chmod(uploadDir, 0755)

	// 4. Generate unique name using UUID to avoid filename collisions
	uniqueFilename := uuid.New().String() + ext
	targetFilePath := filepath.Join(uploadDir, uniqueFilename)

	// 5. Save the file to server filesystem
	if err := ctx.SaveUploadedFile(header, targetFilePath); err != nil {
		logger.Log.Error("Failed to save uploaded file", zap.Error(err))
		ctx.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Failed to save file on server"})
		return
	}
	// Explicitly force file permission to 0644 so Nginx can read and serve it
	_ = os.Chmod(targetFilePath, 0644)

	// 6. Return relative url
	relativeURL := "/uploads/" + uniqueFilename
	ctx.JSON(http.StatusOK, gin.H{
		"success": true,
		"url":     relativeURL,
	})
}

// DeleteImage handles deleting an uploaded image from the server filesystem
func DeleteImage(ctx *gin.Context) {
	imageURL := ctx.Query("url")
	if imageURL == "" {
		ctx.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "Missing image URL parameter"})
		return
	}

	deleteLocalFile(imageURL)

	ctx.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Image deletion triggered",
	})
}

// deleteLocalFile is a package-private utility to delete files inside the uploads directory safely
func deleteLocalFile(imageURL string) {
	if imageURL == "" {
		return
	}

	// 1. Sanitize the path to prevent directory traversal
	// Expected url: "/uploads/filename.jpg" or "/uploads/some-uuid.jpg"
	filename := filepath.Base(imageURL)

	// Ensure the filename is valid and not empty or "." or "/" or ".."
	if filename == "" || filename == "." || filename == ".." || filename == "/" {
		return
	}

	// Double check that it contains a valid image extension to be extra safe
	ext := strings.ToLower(filepath.Ext(filename))
	allowedExtensions := map[string]bool{
		".jpg":  true,
		".jpeg": true,
		".png":  true,
		".webp": true,
		".gif":  true,
	}
	if !allowedExtensions[ext] {
		return
	}

	// 2. Build the target file path
	uploadDir := "./uploads"
	targetFilePath := filepath.Clean(filepath.Join(uploadDir, filename))

	// Ensure the targetFilePath is indeed inside the uploadDir to prevent directory traversal
	absUploadDir, err1 := filepath.Abs(uploadDir)
	absTargetFile, err2 := filepath.Abs(targetFilePath)
	if err1 != nil || err2 != nil || !strings.HasPrefix(absTargetFile, absUploadDir) {
		return
	}

	// 3. Check if file exists and delete it
	if _, err := os.Stat(targetFilePath); err == nil {
		if err := os.Remove(targetFilePath); err != nil {
			logger.Log.Error("Failed to delete file", zap.String("path", targetFilePath), zap.Error(err))
		}
	}
}
