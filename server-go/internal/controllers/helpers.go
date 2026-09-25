package controllers

import (
	"fmt"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// isDuplicateKeyError checks if the GORM database error is a duplicate key/unique constraint violation.
func isDuplicateKeyError(err error) bool {
	if err == nil {
		return false
	}
	errStr := err.Error()
	return strings.Contains(errStr, "duplicate key") || strings.Contains(errStr, "unique constraint") || strings.Contains(errStr, "23505")
}

// extractConstraintName extracts the quoted constraint name from the PostgreSQL error message.
func extractConstraintName(errStr string) string {
	// Look for text inside double quotes
	firstQuote := strings.Index(errStr, "\"")
	if firstQuote != -1 {
		secondQuote := strings.Index(errStr[firstQuote+1:], "\"")
		if secondQuote != -1 {
			return errStr[firstQuote+1 : firstQuote+1+secondQuote]
		}
	}

	// Try single quotes as fallback
	firstSingleQuote := strings.Index(errStr, "'")
	if firstSingleQuote != -1 {
		secondSingleQuote := strings.Index(errStr[firstSingleQuote+1:], "'")
		if secondSingleQuote != -1 {
			return errStr[firstSingleQuote+1 : firstSingleQuote+1+secondSingleQuote]
		}
	}
	return ""
}

// cleanConstraintName parses the GORM/PostgreSQL constraint name and identifies the table (entity) and column.
func cleanConstraintName(constraint string) (table, column string) {
	cleaned := constraint
	if strings.HasPrefix(cleaned, "idx_") {
		cleaned = strings.TrimPrefix(cleaned, "idx_")
	}
	if strings.HasSuffix(cleaned, "_key") {
		cleaned = strings.TrimSuffix(cleaned, "_key")
	}

	// List of known RTU / database tables and their human-readable Indonesian name
	knownTables := []struct {
		DbName     string
		EntityName string
	}{
		{"rtu_materials", "Material"},
		{"rtu_products", "Produk"},
		{"rtu_vendors", "Vendor"},
		{"rtu_units", "Satuan"},
		{"rtu_categories", "Kategori"},
		{"rtu_banks", "Bank"},
		{"rtu_purchases", "Purchase Order"},
		{"rtu_payments", "Payment"},
		{"rtu_distributions", "Pengiriman"},
		{"rtu_grns", "GRN"},
		{"rtu_invoice_reconciles", "Invoice"},
		{"rtu_recipes", "Resep"},
		{"rtu_production_batches", "Batch Produksi"},
		{"rtu_outlet_stocks", "Stok Cabang"},
		{"rtu_outlet_vendors", "Vendor Cabang"},
		{"users", "User"},
		{"outlets", "Cabang"},
		{"positions", "Jabatan"},
	}

	for _, kt := range knownTables {
		if strings.HasPrefix(cleaned, kt.DbName+"_") {
			table = kt.EntityName
			cleaned = strings.TrimPrefix(cleaned, kt.DbName+"_")
			break
		} else if cleaned == kt.DbName {
			table = kt.EntityName
			cleaned = ""
			break
		}
	}

	column = cleaned
	return table, column
}

// mapColumnName maps GORM snake_case database column names to friendly Indonesian words.
func mapColumnName(colName string) string {
	switch colName {
	case "code":
		return "Kode"
	case "name":
		return "Nama"
	case "username":
		return "Username"
	case "email":
		return "Email"
	case "phone":
		return "Nomor Telepon"
	case "doc_number", "docnumber":
		return "Nomor Dokumen"
	case "batch_number", "batchnumber":
		return "Nomor Batch"
	case "lot_number", "lotnumber":
		return "Nomor Lot"
	case "grn_number", "grnnumber":
		return "Nomor GRN"
	case "invoice_number", "invoicenumber":
		return "Nomor Invoice"
	case "barcode":
		return "Barcode"
	case "label":
		return "Label"
	case "title":
		return "Judul"
	default:
		if colName == "" {
			return ""
		}
		// Convert snake_case to Title Case as fallback
		parts := strings.Split(colName, "_")
		for i, part := range parts {
			if len(part) > 0 {
				parts[i] = strings.ToUpper(part[:1]) + part[1:]
			}
		}
		return strings.Join(parts, " ")
	}
}

// CheckDuplicateError checks if the error is a duplicate key error. If so, it responds with 400 Bad Request
// and a friendly localized error message, returning true to indicate that the error was handled.
func CheckDuplicateError(ctx *gin.Context, err error, entityName string) bool {
	if !isDuplicateKeyError(err) {
		return false
	}

	msg := ""
	errStr := err.Error()
	constraint := extractConstraintName(errStr)

	if constraint != "" {
		table, column := cleanConstraintName(constraint)
		colFriendly := mapColumnName(column)

		if table != "" && colFriendly != "" {
			msg = fmt.Sprintf("%s %s sudah terdaftar", colFriendly, table)
		} else if colFriendly != "" {
			msg = fmt.Sprintf("%s sudah terdaftar", colFriendly)
		}
	}

	// Fallback to simple generic message if parsing failed or returned empty
	if msg == "" {
		// Capitalize entityName first character
		entityTitle := entityName
		if len(entityName) > 0 {
			entityTitle = strings.ToUpper(entityName[:1]) + entityName[1:]
		}
		msg = fmt.Sprintf("Data %s sudah terdaftar", entityTitle)
	}

	ctx.JSON(http.StatusBadRequest, gin.H{
		"success": false,
		"message": msg,
	})
	return true
}

// getUserIDFromContext safely extracts the user ID from gin context supporting both uuid.UUID and string types.
func getUserIDFromContext(ctx *gin.Context) *uuid.UUID {
	val, exists := ctx.Get("userID")
	if !exists || val == nil {
		return nil
	}
	if u, ok := val.(uuid.UUID); ok {
		if u != uuid.Nil {
			return &u
		}
		return nil
	}
	if uStr, ok := val.(string); ok && uStr != "" {
		if u, err := uuid.Parse(uStr); err == nil && u != uuid.Nil {
			return &u
		}
	}
	return nil
}
