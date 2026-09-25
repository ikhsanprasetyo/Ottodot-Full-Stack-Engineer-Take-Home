package models

import (
	"database/sql/driver"
	"encoding/json"
	"fmt"
	"time"

	"github.com/google/uuid"
)

// ─── JSONB helper types ──────────────────────────────────────────────────────

// JSONB is a generic helper for JSONB columns in PostgreSQL
type JSONB[T any] struct {
	Val T
}

func (j JSONB[T]) Value() (driver.Value, error) {
	b, err := json.Marshal(j.Val)
	if err != nil {
		return nil, err
	}
	// Return nil if the value is empty/null to store as NULL in DB
	if string(b) == "null" {
		return nil, nil
	}
	return string(b), nil
}

func (j *JSONB[T]) Scan(src any) error {
	if src == nil {
		return nil
	}
	var b []byte
	switch v := src.(type) {
	case []byte:
		b = v
	case string:
		b = []byte(v)
	default:
		return fmt.Errorf("unsupported type: %T", src)
	}
	return json.Unmarshal(b, &j.Val)
}

func (j JSONB[T]) MarshalJSON() ([]byte, error) {
	return json.Marshal(j.Val)
}

func (j *JSONB[T]) UnmarshalJSON(b []byte) error {
	return json.Unmarshal(b, &j.Val)
}

// ─── User model ──────────────────────────────────────────────────────────────

type User struct {
	ID             uuid.UUID  `gorm:"type:uuid;primaryKey;default:gen_random_uuid();index:idx_users_id_deleted" json:"_id"`
	Name           string     `gorm:"not null"                                        json:"name"`
	Email          string     `gorm:"uniqueIndex;not null"                            json:"email"`
	Password       string     `gorm:"not null"                                        json:"-"`
	Username       string     `gorm:"uniqueIndex;not null"                            json:"username"`
	Role           string     `gorm:"default:'user'"                                  json:"role"`
	Phone          *string    `                                                       json:"phone,omitempty"`
	ProfilePicture *string    `                                                       json:"profilePicture,omitempty"`

	// Foreign Keys
	OutletID   *uuid.UUID `gorm:"type:uuid;index"  json:"outlet,omitempty"`
	PositionID *uuid.UUID `gorm:"type:uuid;index"  json:"position,omitempty"`

	// Associations (populated on demand)
	Outlet   *Outlet       `gorm:"foreignKey:OutletID"   json:"outletDoc,omitempty"`
	Position *Position     `gorm:"foreignKey:PositionID" json:"positionDoc,omitempty"`
	Activity *UserActivity `gorm:"foreignKey:UserID;references:ID" json:"activity,omitempty"`

	// Auth (Deprecated: use Activity instead for high-frequency data)
	LastLoginAt          *time.Time `json:"lastLoginAt,omitempty"`
	LastSeenAt           *time.Time `json:"lastSeenAt,omitempty"`
	ResetPasswordToken   *string    `json:"-"`
	ResetPasswordExpires *time.Time `json:"-"`
	RefreshToken         *string    `json:"-"`
	AccessTokenExpiresAt *time.Time `json:"accessTokenExpiresAt,omitempty"`
	TokenVersion         int        `gorm:"default:0" json:"-"`

	// Activity (stored as JSONB)
	LastLogins JSONBLoginHistoryList `gorm:"type:jsonb;default:'[]'" json:"lastLogins"`
	LiveLogin  JSONBLiveLogin        `gorm:"type:jsonb"              json:"liveLogin,omitempty"`
	OnlineDuration int           `gorm:"default:0"               json:"onlineDuration"`
	TodayOnlineDuration int      `gorm:"default:0"               json:"todayOnlineDuration"`

	// Computed/flat location fields — populated manually in Go after query (not DB columns)
	LastDisplayName *string `gorm:"-" json:"lastDisplayName,omitempty"`
	LastCity        *string `gorm:"-" json:"lastCity,omitempty"`
	LastState       *string `gorm:"-" json:"lastState,omitempty"`
	LastCountry     *string `gorm:"-" json:"lastCountry,omitempty"`

	// Permissions (stored as JSONB)
	Access           JSONBAccess   `gorm:"type:jsonb;not null;default:'{}'" json:"access"`
	InventoryAccess  bool          `gorm:"default:false"                    json:"inventoryAccess"`
	OutletAccess     JSONBUUIDList `gorm:"type:jsonb;default:'[]'"          json:"outletAccess,omitempty"`
	OutletAccessMode string        `gorm:"default:'single'"                 json:"outletAccessMode"`
	RoleApproval     string        `gorm:"default:'no'"                     json:"roleApproval"`

	// AI Settings
	GeminiAPIKey *string `gorm:"type:text"                                       json:"geminiApiKey,omitempty"`
	GeminiModel  string  `gorm:"type:varchar(100);default:'gemini-3.5-flash-lite'" json:"geminiModel,omitempty"`

	// Soft delete
	IsDeleted bool       `gorm:"default:false;index;index:idx_users_id_deleted" json:"isDeleted"`
	DeletedAt *time.Time `                           json:"deletedAt,omitempty"`
	UpdatedBy *uuid.UUID `gorm:"type:uuid"           json:"updatedBy,omitempty"`

	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`
}

func (User) TableName() string { return "users" }

// ─── JSONB wrapper aliases ───────────────────────────────────────────────────

type JSONBLoginHistoryList = JSONB[[]LoginHistory]
type JSONBLiveLogin = JSONB[*LiveLogin]
type JSONBAccess = JSONB[Access]
type JSONBUUIDList = JSONB[[]uuid.UUID]

// ─── UserPopulated is returned with preloaded relations ──────────────────────
// Use GORM Preload instead of aggregation pipeline
type UserPopulated = User // alias – use Preload("Outlet", "Position") in repo

// ─── Supporting structs (stored as JSONB values) ──────────────────────────────

type LoginHistory struct {
	LoginAt  time.Time   `json:"loginAt"`
	IP       string      `json:"ip"`
	Location *Location   `json:"location,omitempty"`
	Device   *DeviceInfo `json:"device,omitempty"`
}

type LiveLogin struct {
	IP         string      `json:"ip"`
	Location   *Location   `json:"location,omitempty"`
	Device     *DeviceInfo `json:"device,omitempty"`
	LastSeenAt *time.Time  `json:"lastSeenAt,omitempty"`
	IsOnline   bool        `json:"isOnline"`
}

type Location struct {
	Country          *string  `json:"country,omitempty"`
	Region           *string  `json:"region,omitempty"`
	City             *string  `json:"city,omitempty"`
	Latitude         *float64 `json:"latitude,omitempty"`
	Longitude        *float64 `json:"longitude,omitempty"`
	Accuracy         *float64 `json:"accuracy,omitempty"`
	Timestamp        *int64   `json:"timestamp,omitempty"`
	Altitude         *float64 `json:"altitude,omitempty"`
	AltitudeAccuracy *float64 `json:"altitudeAccuracy,omitempty"`
	Heading          *float64 `json:"heading,omitempty"`
	Speed            *float64 `json:"speed,omitempty"`
	Address          *Address `json:"address,omitempty"`
	Type             *string  `json:"type,omitempty"`
	AddressType      *string  `json:"addresstype,omitempty"`
	DisplayName      *string  `json:"display_name,omitempty"`
	Source           *string  `json:"source,omitempty"`
	IsGPS            *bool    `json:"isGps,omitempty"`
}

type Address struct {
	Suburb       *string `json:"suburb,omitempty"`
	CityDistrict *string `json:"city_district,omitempty"`
	City         *string `json:"city,omitempty"`
	Town         *string `json:"town,omitempty"`
	Village      *string `json:"village,omitempty"`
	County       *string `json:"county,omitempty"`
	Country      *string `json:"country,omitempty"`
	CountryCode  *string `json:"country_code,omitempty"`
	Postcode     *string `json:"postcode,omitempty"`
	Region       *string `json:"region,omitempty"`
	State        *string `json:"state,omitempty"`
}

type DeviceInfo struct {
	Browser *BrowserInfo `json:"browser,omitempty"`
	Engine  *EngineInfo  `json:"engine,omitempty"`
	OS      *OSInfo      `json:"os,omitempty"`
	Device  interface{}  `json:"device,omitempty"`
	CPU     *CPU         `json:"cpu,omitempty"`
	UA      string       `json:"ua"`
}

type BrowserInfo struct {
	Name    *string `json:"name,omitempty"`
	Version *string `json:"version,omitempty"`
	Major   *string `json:"major,omitempty"`
}

type EngineInfo struct {
	Name    *string `json:"name,omitempty"`
	Version *string `json:"version,omitempty"`
}

type OSInfo struct {
	Name    *string `json:"name,omitempty"`
	Version *string `json:"version,omitempty"`
}

type Device struct {
	Model  *string `json:"model,omitempty"`
	Type   *string `json:"type,omitempty"`
	Vendor *string `json:"vendor,omitempty"`
}

type CPU struct {
	Architecture *string `json:"architecture,omitempty"`
}

// ─── Permission types (stored as JSONB in users.access column) ───────────────

type Access struct {
	Dashboard       ResourceAccess `json:"dashboard"`
	User            ResourceAccess `json:"user"`
	Outlet          ResourceAccess `json:"outlet"`
	RTUVendor       ResourceAccess `json:"rtu_vendor"`
	RTUMaterial     ResourceAccess `json:"rtu_material"`
	RTURecipe       ResourceAccess `json:"rtu_recipe"`
	RTUProduct      ResourceAccess `json:"rtu_product"`
	RTUGRN          ResourceAccess `json:"rtu_grn"`
	RTUProduction   ResourceAccess `json:"rtu_production"`
	RTUDistribution ResourceAccess `json:"rtu_distribution"`
	RTUPurchase     ResourceAccess `json:"rtu_purchase"`
	RTUReport       ResourceAccess `json:"rtu_report"`
	RTULedger       ResourceAccess `json:"rtu_ledger"`
	RTUInvoice      ResourceAccess `json:"rtu_invoice"`
	RTUPayment      ResourceAccess `json:"rtu_payment"`
	RTUCategory     ResourceAccess `json:"rtu_category"`
	RTUUnit         ResourceAccess `json:"rtu_unit"`
	RTUSettings     ResourceAccess `json:"rtu_settings"`
}

type ResourceAccess struct {
	List              bool `json:"list"`
	Get               bool `json:"get"`
	Create            bool `json:"create"`
	Update            bool `json:"update"`
	Delete            bool `json:"delete"`
	Restore           bool `json:"restore"`
	DeletePermanently bool `json:"deletePermanently"`
}

type DTFCAccess struct {
	ResourceAccess
	Approval string `json:"approval"` // "all", "outlet", "no"
}
