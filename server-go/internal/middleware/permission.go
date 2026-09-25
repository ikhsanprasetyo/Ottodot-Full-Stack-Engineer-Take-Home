package middleware

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/yourusername/kpi-backend/internal/models"
	"github.com/yourusername/kpi-backend/internal/utils"
)

// Permission middleware checks user permissions
func Permission(pageName string, method string) gin.HandlerFunc {
	return func(ctx *gin.Context) {
		// Get user from context (set by JWT middleware)
		userVal, exists := ctx.Get("user")
		if !exists {
			utils.ErrorResponse(ctx, http.StatusUnauthorized, "Unauthorized")
			ctx.Abort()
			return
		}

		user := userVal.(*models.User)

		// Check permission
		if !hasPermission(user, pageName, method) {
			utils.ErrorResponse(ctx, http.StatusForbidden, "Insufficient permissions")
			ctx.Abort()
			return
		}

		ctx.Next()
	}
}

// hasPermission checks if user has permission for page and method
func hasPermission(user *models.User, pageName string, method string) bool {
	// Super admin has all permissions
	if user.Role == "super admin" {
		return true
	}

	// For GORM/JSONB wrapper, we access .Val
	access := user.Access.Val

	switch pageName {
	case "dashboard":
		return checkResourcePermission(access.Dashboard, method)
	case "user":
		return checkResourcePermission(access.User, method)
	case "outlet":
		return checkResourcePermission(access.Outlet, method)
	case "rtu_vendor":
		return checkResourcePermission(access.RTUVendor, method)
	case "rtu_material":
		return checkResourcePermission(access.RTUMaterial, method)
	case "rtu_recipe":
		return checkResourcePermission(access.RTURecipe, method)
	case "rtu_product":
		return checkResourcePermission(access.RTUProduct, method)
	case "rtu_grn":
		return checkResourcePermission(access.RTUGRN, method)
	case "rtu_production":
		return checkResourcePermission(access.RTUProduction, method)
	case "rtu_distribution":
		return checkResourcePermission(access.RTUDistribution, method)
	case "rtu_report":
		return checkResourcePermission(access.RTUReport, method)
	default:
		return false
	}
}

// checkResourcePermission checks standard resource permissions
func checkResourcePermission(resource models.ResourceAccess, method string) bool {
	switch method {
	case "list":
		return resource.List
	case "get":
		return resource.Get
	case "create":
		return resource.Create
	case "update":
		return resource.Update
	case "delete":
		return resource.Delete
	case "restore":
		return resource.Restore
	case "deletePermanently":
		return resource.DeletePermanently
	default:
		return false
	}
}

// RoleMiddleware checks if user has required role
func RoleMiddleware(allowedRoles ...string) gin.HandlerFunc {
	return func(ctx *gin.Context) {
		userVal, exists := ctx.Get("user")
		if !exists {
			utils.ErrorResponse(ctx, http.StatusUnauthorized, "Unauthorized")
			ctx.Abort()
			return
		}

		user := userVal.(*models.User)

		// Check if user role is in allowed roles
		roleAllowed := false
		for _, role := range allowedRoles {
			if user.Role == role {
				roleAllowed = true
				break
			}
		}

		if !roleAllowed {
			utils.ErrorResponse(ctx, http.StatusForbidden, "Insufficient role")
			ctx.Abort()
			return
		}

		ctx.Next()
	}
}
