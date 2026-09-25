package data

import "strings"

type ProductTypeMeta struct {
	Label       string   `json:"label"`
	Description string   `json:"description"`
	Includes    []string `json:"includes"`
}

var ProductTypeGroups = map[string]ProductTypeMeta{
	"": {
		Label: "Semua Produk",
		Description: "Mencakup seluruh produk yang dijual (makanan, minuman, dan tambahan)",
		Includes: []string{
			"main course",
			"snacks",
			"dessert",
			"shirataki",
			"frozen",
			"noodle type",
			"addons",
			"coffee",
			"non coffee",
			"combo",
			"promo",
		},
	},
	"all food": {
		Label: "Semua Makanan",
		Description: "Mencakup seluruh produk makanan yang dijual langsung ke pelanggan",
		Includes: []string{
			"main course",
			"snacks",
			"dessert",
			"shirataki",
			"frozen",
			"noodle type",
			"addons",
		},
	},
	"all drinks": {
		Label: "Semua Minuman",
		Description: "Mencakup seluruh produk minuman yang dijual langsung ke pelanggan",
		Includes: []string{"coffee", "non coffee"},
	},
	"all snacks": {
		Label: "Semua Snack",
		Description: "Mencakup seluruh produk snack yang dijual langsung ke pelanggan",
		Includes: []string{"snacks", "dessert", "frozen"},
	},
	"coffee": {
		Label: "Coffee",
		Description: "Minuman berbasis kopi arabica",
		Includes: []string{"coffee"},
	},
	"non coffee": {
		Label: "Non Coffee",
		Description: "Minuman selain kopi",
		Includes: []string{"non coffee"},
	},
	"main food": {
		Label: "Makanan Utama",
		Description: "Menu utama yang menjadi produk inti penjualan",
		Includes: []string{"main course", "shirataki"},
	},
	"main course": {
		Label: "Main Course",
		Description: "Menu makanan utama",
		Includes: []string{"main course", "shirataki"},
	},
	"shirataki": {
		Label: "Shirataki",
		Description: "Produk mie shirataki yang dijual langsung ke pelanggan",
		Includes: []string{"shirataki"},
	},
	"snacks": {
		Label: "Snacks",
		Description: "Makanan ringan",
		Includes: []string{"snacks"},
	},
	"dessert": {
		Label: "Dessert",
		Description: "Menu penutup",
		Includes: []string{"dessert"},
	},
	"extras": {
		Label: "Tambahan & Promo",
		Description: "Item tambahan, paket combo, dan produk promo",
		Includes: []string{"addons", "combo", "promo"},
	},
	"promo": {
		Label: "Promo",
		Description: "Produk voucher untuk pelanggan",
		Includes: []string{"promo"},
	},
	"inventory": {
		Label: "Bahan Baku & Stok",
		Description: "Produk untuk produksi, bukan dijual langsung",
		Includes: []string{"material", "frozen"},
	},
	"material": {
		Label: "Material",
		Description: "Bahan baku produksi",
		Includes: []string{"material"},
	},
	"frozen": {
		Label: "Frozen Item",
		Description: "Produk beku yang dijual langsung ke pelanggan",
		Includes: []string{"frozen"},
	},
	"noodle type": {
		Label: "Tipe Mie",
		Description: "Jenis mie yang digunakan sebagai variasi menu",
		Includes: []string{"noodle type"},
	},
	"combo": {
		Label: "Combo",
		Description: "Produk yang terdiri dari beberapa produk",
		Includes: []string{"combo"},
	},
	"addons": {
		Label:       "Tambahan",
		Description: "Produk tambahan yang ditambahkan ke menu utama",
		Includes:    []string{"addons"},
	},
	"other": {
		Label: "Lainnya",
		Description: "Produk yang tidak termasuk kategori utama",
		Includes: []string{"other"},
	},
}

// ResolveProductTypes resolves filter string to array of product categories
func ResolveProductTypes(filter string) []string {
	if filter == "" {
		return nil
	}
	filter = strings.ToLower(filter)
	if meta, exists := ProductTypeGroups[filter]; exists {
		return meta.Includes
	}
	return []string{filter}
}

// GetProductTypeExplanation returns explanation for UI based on filter
// If not found, returns nil-equivalent empty struct or basic explanation
func GetProductTypeExplanation(filter string) *ProductTypeMeta {
	filter = strings.ToLower(filter) // key in map is lowercase
	if meta, exists := ProductTypeGroups[filter]; exists {
		return &meta
	}
	// Fallback explanation if needed, or return nil
	// For now, mirroring JS logic which returns null if not found
	// But in Go we might return a default explanation or nil
	return &ProductTypeMeta{
		Label:       "Unknown",
		Description: "Showing products for " + filter,
		Includes:    []string{filter},
	}
}
