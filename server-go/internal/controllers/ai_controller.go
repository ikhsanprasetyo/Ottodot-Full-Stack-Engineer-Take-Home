package controllers

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/yourusername/kpi-backend/internal/config"
	"github.com/yourusername/kpi-backend/internal/models"
)

type AIController struct{}

func NewAIController() *AIController {
	return &AIController{}
}

type MessagePayload struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type AIChatRequest struct {
	SessionID     string                 `json:"sessionId,omitempty"`
	Messages      []MessagePayload       `json:"messages"`
	RTUContext    map[string]interface{} `json:"rtuContext"`
	CustomAPIKey  string                 `json:"customApiKey"`
	SelectedModel string                 `json:"selectedModel"`
}

type GeminiPart struct {
	Text string `json:"text"`
}

type GeminiContent struct {
	Role  string       `json:"role"`
	Parts []GeminiPart `json:"parts"`
}

type GeminiSystemInstruction struct {
	Parts []GeminiPart `json:"parts"`
}

type GeminiGenerationConfig struct {
	Temperature     float64 `json:"temperature"`
	MaxOutputTokens int     `json:"maxOutputTokens"`
}

type GeminiRequest struct {
	Contents          []GeminiContent         `json:"contents"`
	SystemInstruction GeminiSystemInstruction `json:"systemInstruction"`
	GenerationConfig  GeminiGenerationConfig  `json:"generationConfig"`
}

type GeminiCandidate struct {
	Content GeminiContent `json:"content"`
}

type GeminiResponse struct {
	Candidates []GeminiCandidate `json:"candidates"`
	Error      *struct {
		Message string `json:"message"`
	} `json:"error,omitempty"`
}

func isOutletAllowed(itemMap map[string]interface{}, hasFullOutletAccess bool, allowedOutletMap map[uuid.UUID]bool) bool {
	if hasFullOutletAccess {
		return true
	}
	var outletIDStr string
	if oid, ok := itemMap["outletId"].(string); ok && oid != "" {
		outletIDStr = oid
	} else if oid, ok := itemMap["buyerId"].(string); ok && oid != "" {
		outletIDStr = oid
	} else if oid, ok := itemMap["sellerId"].(string); ok && oid != "" {
		outletIDStr = oid
	} else if oid, ok := itemMap["outlet_id"].(string); ok && oid != "" {
		outletIDStr = oid
	} else if oMap, ok := itemMap["outlet"].(map[string]interface{}); ok {
		if oid, ok := oMap["id"].(string); ok && oid != "" {
			outletIDStr = oid
		} else if oid, ok := oMap["_id"].(string); ok && oid != "" {
			outletIDStr = oid
		}
	}
	if outletIDStr != "" {
		if uid, err := uuid.Parse(outletIDStr); err == nil {
			return allowedOutletMap[uid]
		}
	}
	return true
}

func cleanSubObject(subMap map[string]interface{}) map[string]interface{} {
	cleaned := make(map[string]interface{})
	for k, v := range subMap {
		lowerK := strings.ToLower(k)
		if lowerK == "_id" || lowerK == "id" || lowerK == "createdat" || lowerK == "updatedat" ||
			lowerK == "deletedat" || lowerK == "isdeleted" || lowerK == "createdby" || lowerK == "updatedby" {
			continue
		}
		cleaned[k] = v
	}
	return cleaned
}

type GeminiModelInfo struct {
	Name                       string   `json:"name"`
	DisplayName                string   `json:"displayName"`
	SupportedGenerationMethods []string `json:"supportedGenerationMethods"`
}

type GeminiListModelsResponse struct {
	Models []GeminiModelInfo `json:"models"`
}

func fetchAvailableGeminiModels(apiKey string) []string {
	url := fmt.Sprintf("https://generativelanguage.googleapis.com/v1beta/models?key=%s", apiKey)
	resp, err := http.Get(url)
	if err != nil {
		return nil
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil
	}

	var listResp GeminiListModelsResponse
	if err := json.Unmarshal(body, &listResp); err != nil {
		return nil
	}

	var flashModels []string
	var otherModels []string

	for _, m := range listResp.Models {
		canGenerate := false
		for _, method := range m.SupportedGenerationMethods {
			if method == "generateContent" {
				canGenerate = true
				break
			}
		}

		if canGenerate {
			name := m.Name
			lowerName := strings.ToLower(name)
			if strings.Contains(lowerName, "flash") {
				flashModels = append(flashModels, name)
			} else {
				otherModels = append(otherModels, name)
			}
		}
	}

	return append(flashModels, otherModels...)
}

func (ctrl *AIController) Chat(c *gin.Context) {
	var req AIChatRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request payload: " + err.Error()})
		return
	}

	userVal, exists := c.Get("user")
	var currentUser *models.User
	if exists && userVal != nil {
		if u, ok := userVal.(*models.User); ok {
			currentUser = u
		}
	}

	// Persist/Sync user AI settings in PostgreSQL per user ID
	if currentUser != nil {
		updates := make(map[string]interface{})
		if req.CustomAPIKey != "" && (currentUser.GeminiAPIKey == nil || *currentUser.GeminiAPIKey != req.CustomAPIKey) {
			updates["gemini_api_key"] = req.CustomAPIKey
			apiKeyStr := req.CustomAPIKey
			currentUser.GeminiAPIKey = &apiKeyStr
		}
		if req.SelectedModel != "" && currentUser.GeminiModel != req.SelectedModel {
			updates["gemini_model"] = req.SelectedModel
			currentUser.GeminiModel = req.SelectedModel
		}
		if len(updates) > 0 {
			config.DB.Model(currentUser).Updates(updates)
		}

		// Fallback to database user settings if request fields are blank
		if req.CustomAPIKey == "" && currentUser.GeminiAPIKey != nil && *currentUser.GeminiAPIKey != "" {
			req.CustomAPIKey = *currentUser.GeminiAPIKey
		}
		if req.SelectedModel == "" && currentUser.GeminiModel != "" {
			req.SelectedModel = currentUser.GeminiModel
		}
	}

	apiKey := req.CustomAPIKey
	if apiKey == "" {
		apiKey = config.AppConfig.GeminiAPIKey
	}

	if apiKey == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "GEMINI_API_KEY tidak ditemukan di database maupun di server-go .env."})
		return
	}

	// 1. Determine User Permissions for RTU Modules & Outlet Access
	hasVendor := false
	hasMaterial := false
	hasRecipe := false
	hasProduct := false
	hasGRN := false
	hasProduction := false
	hasDistribution := false
	hasPurchase := false
	hasReport := false
	hasInvoice := false
	hasPayment := false

	allowedOutletMap := make(map[uuid.UUID]bool)
	hasFullOutletAccess := false

	if exists && userVal != nil {
		if user, ok := userVal.(*models.User); ok {
			roleLower := strings.ToLower(strings.TrimSpace(user.Role))
			modeLower := strings.ToLower(strings.TrimSpace(user.OutletAccessMode))

			if roleLower == "super admin" || roleLower == "admin" {
				hasVendor = true
				hasMaterial = true
				hasRecipe = true
				hasProduct = true
				hasGRN = true
				hasProduction = true
				hasDistribution = true
				hasPurchase = true
				hasReport = true
				hasInvoice = true
				hasPayment = true
				hasFullOutletAccess = true
			} else {
				access := user.Access.Val
				hasVendor = access.RTUVendor.List || access.RTUVendor.Get
				hasMaterial = access.RTUMaterial.List || access.RTUMaterial.Get
				hasRecipe = access.RTURecipe.List || access.RTURecipe.Get
				hasProduct = access.RTUProduct.List || access.RTUProduct.Get
				hasGRN = access.RTUGRN.List || access.RTUGRN.Get
				hasProduction = access.RTUProduction.List || access.RTUProduction.Get
				hasDistribution = access.RTUDistribution.List || access.RTUDistribution.Get
				hasPurchase = access.RTUPurchase.List || access.RTUPurchase.Get
				hasReport = access.RTUReport.List || access.RTUReport.Get
				hasInvoice = access.RTUInvoice.List || access.RTUInvoice.Get
				hasPayment = access.RTUPayment.List || access.RTUPayment.Get

				if modeLower == "all" || modeLower == "" {
					hasFullOutletAccess = true
				} else {
					if user.OutletID != nil {
						allowedOutletMap[*user.OutletID] = true
					}
					for _, id := range user.OutletAccess.Val {
						allowedOutletMap[id] = true
					}
				}
			}
		}
	} else {
		hasVendor = true
		hasMaterial = true
		hasRecipe = true
		hasProduct = true
		hasGRN = true
		hasProduction = true
		hasDistribution = true
		hasPurchase = true
		hasReport = true
		hasInvoice = true
		hasPayment = true
		hasFullOutletAccess = true
	}

	var allowedModules []string
	var forbiddenModules []string

	checkMod := func(name string, allowed bool) {
		if allowed {
			allowedModules = append(allowedModules, name)
		} else {
			forbiddenModules = append(forbiddenModules, name)
		}
	}

	checkMod("Vendor & Supplier", hasVendor)
	checkMod("Bahan Baku & Stok (Material)", hasMaterial)
	checkMod("Resep & Formula (Recipe)", hasRecipe)
	checkMod("Produk Master", hasProduct)
	checkMod("Penerimaan Barang (GRN)", hasGRN)
	checkMod("Produksi & HPP Job Costing", hasProduction)
	checkMod("Distribusi Antar Cabang", hasDistribution)
	checkMod("Purchase Order (PO)", hasPurchase)
	checkMod("Invoice Reconcile", hasInvoice)
	checkMod("Pembayaran Tagihan (Payment)", hasPayment)
	checkMod("Laporan Analytics", hasReport)

	// Fetch all active outlets from DB
	var allOutlets []models.Outlet
	config.DB.Where("is_deleted = ?", false).Find(&allOutlets)

	var allowedOutletNames []string
	var forbiddenOutletNames []string

	for _, o := range allOutlets {
		displayName := o.Name
		if o.Label != "" {
			displayName = fmt.Sprintf("%s (%s)", o.Name, o.Label)
		}
		if hasFullOutletAccess || allowedOutletMap[o.ID] {
			allowedOutletNames = append(allowedOutletNames, displayName)
		} else {
			forbiddenOutletNames = append(forbiddenOutletNames, displayName)
		}
	}

	allowedModulesStr := strings.Join(allowedModules, ", ")
	if allowedModulesStr == "" {
		allowedModulesStr = "Tidak ada modul RTU"
	}
	forbiddenModulesStr := strings.Join(forbiddenModules, ", ")
	if forbiddenModulesStr == "" {
		forbiddenModulesStr = "Tidak ada (Pengguna memiliki akses penuh ke seluruh modul RTU)"
	}

	allowedOutletsStr := strings.Join(allowedOutletNames, ", ")
	if allowedOutletsStr == "" {
		allowedOutletsStr = "Tidak ada outlet (Akses outlet belum dikonfigurasi)"
	}
	forbiddenOutletsStr := strings.Join(forbiddenOutletNames, ", ")
	if forbiddenOutletsStr == "" {
		forbiddenOutletsStr = "Tidak ada (Pengguna memiliki akses ke seluruh outlet Sinar Utama)"
	}

	rtuContextBytes, _ := json.Marshal(req.RTUContext)
	contextText := string(rtuContextBytes)

	// Build Live PostgreSQL Database Snapshot for AI Context
	var liveDBBuilder strings.Builder

	if hasMaterial {
		var materials []models.RTUMaterial
		if err := config.DB.Preload("Vendor").Where("is_deleted = ?", false).Order("name ASC").Limit(150).Find(&materials).Error; err == nil && len(materials) > 0 {
			liveDBBuilder.WriteString("\n=== DATA STOK & HARGA MASTER MATERIAL (LIVE POSTGRESQL DATABASE) ===\n")
			for _, m := range materials {
				vendorName := "Vendor Eksternal / General"
				if m.Vendor != nil {
					vendorName = m.Vendor.Name
				}
				liveDBBuilder.WriteString(fmt.Sprintf("- Kode: %s | Nama: %s | Kategori: %s | Unit: %s | Harga Master: Rp %.2f | Stok Total: %.2f | Min Stok: %.2f | Vendor: %s\n",
					m.Code, m.Name, m.Category, m.Unit, m.CurrentPrice, m.CurrentStock, m.MinStock, vendorName))
			}
		}

		var outletStocks []models.RTUOutletMaterialStock
		if err := config.DB.Preload("Material").Preload("Outlet").Order("updated_at DESC").Limit(150).Find(&outletStocks).Error; err == nil && len(outletStocks) > 0 {
			liveDBBuilder.WriteString("\n=== RINCIAN STOK MATERIAL PER OUTLET (LIVE POSTGRESQL DATABASE) ===\n")
			for _, s := range outletStocks {
				if s.Material != nil && s.Outlet != nil {
					if hasFullOutletAccess || allowedOutletMap[s.OutletID] {
						liveDBBuilder.WriteString(fmt.Sprintf("- Outlet: %s | Material: %s (%s) | Stok Saat Ini: %.2f %s | Min Stok: %.2f | Harga Unit: Rp %.2f\n",
							s.Outlet.Name, s.Material.Name, s.Material.Code, s.CurrentStock, s.Material.Unit, s.MinStock, s.CurrentPrice))
					}
				}
			}
		}
	}

	if hasPurchase {
		var purchases []models.RTUPurchase
		if err := config.DB.Preload("Buyer").Preload("Seller").Preload("Vendor").Where("is_deleted = ?", false).Order("created_at DESC").Limit(30).Find(&purchases).Error; err == nil && len(purchases) > 0 {
			liveDBBuilder.WriteString("\n=== RIWAYAT TRANSAKSI PURCHASE ORDER (PO) TERBARU (LIVE POSTGRESQL DATABASE) ===\n")
			for _, p := range purchases {
				buyerName := "-"
				if p.Buyer != nil {
					buyerName = p.Buyer.Name
				}
				sellerName := "-"
				if p.Seller != nil {
					sellerName = p.Seller.Name
				} else if p.Vendor != nil {
					sellerName = p.Vendor.Name
				}
				if hasFullOutletAccess || allowedOutletMap[p.BuyerID] {
					liveDBBuilder.WriteString(fmt.Sprintf("- Doc No: %s | Pembeli/Outlet: %s | Penjual/Vendor: %s | Tipe: %s | Status: %s | Catatan: %s | Tanggal: %s\n",
						p.DocNumber, buyerName, sellerName, p.Type, p.Status, p.Notes, p.CreatedAt.Format("2006-01-02 15:04")))
				}
			}
		}
	}

	if hasProduction {
		var batches []models.RTUProductionBatch
		if err := config.DB.Preload("Product").Preload("Outlet").Where("is_deleted = ?", false).Order("created_at DESC").Limit(30).Find(&batches).Error; err == nil && len(batches) > 0 {
			liveDBBuilder.WriteString("\n=== RIWAYAT BATCH PRODUKSI TERBARU (LIVE POSTGRESQL DATABASE) ===\n")
			for _, b := range batches {
				prodName := "-"
				if b.Product != nil {
					prodName = b.Product.Name
				}
				outletName := "-"
				if b.Outlet != nil {
					outletName = b.Outlet.Name
				}
				if hasFullOutletAccess || allowedOutletMap[b.OutletID] {
					liveDBBuilder.WriteString(fmt.Sprintf("- Batch No: %s | Outlet: %s | Produk: %s | Qty Aktual: %.2f | Total Cost: Rp %.2f | Status: %s | Tanggal: %s\n",
						b.BatchNumber, outletName, prodName, b.ActualQty, b.TotalCost, b.Status, b.CreatedAt.Format("2006-01-02 15:04")))
				}
			}
		}
	}

	contextText = contextText + "\n" + liveDBBuilder.String()
	if len(contextText) > 150000 {
		contextText = contextText[:150000] + "\n... [Data konteks disesuaikan untuk efisiensi token]"
	}

	systemPrompt := fmt.Sprintf(`
Anda adalah "AI RTU Analyst Sinar Utama", seorang Pakar Analisis Data Operasional F&B, Supply Chain Specialist, dan Konsultan Eksekutif Senior (World-Class Data Analyst & Business Intelligence Specialist) untuk jaringan restoran Sinar Utama.

ATURAN UTAMA INTEGRASI DATABASE POSTGRESQL (REAL-TIME DATA ACCESS):
- DATA STOK MATERIAL, HARGA MASTER, OUTLET STOK, PO, DAN PRODUKSI TELAH TERHUBUNG LANGSUNG SECARA OTOMATIS DARI DATABASE POSTGRESQL DI BAWAH INI.
- PENGGUNA TIDAK WAJIB MELAMPIRKAN FILE ATU DATA STOK ATAU MATERIAL.
- JANGAN PERNAH MENYATAKAN "Anda belum melampirkan data stok" ATAU "Pengguna wajib mengunggah file data", KARENA ANDA SUDAH MEMILIKI AKSES LANGSUNG KE SELURUH DATA POSTGRESQL RTU SINAR UTAMA DI BAWAH INI!
- Jika pengguna meminta audit, deteksi anomali, atau analisis stok/harga/produksi, GUNAKAN LANGSUNG DATA REAL-TIME POSTGRESQL YANG TERSEDIA DI BAWAH INI DENGAN SEGERA & PRESISI 100%%.

ATURAN HAK AKSES PENGGUNA (HAK AKSES RIGID & EKSKLUSIF):
- Pengguna yang sedang berbicara memiliki HAK AKSES TERBATAS pada modul & outlet berikut:
  * MODUL TERBUKA (DAPAT DIAKSES): %s
  * MODUL TERKUNCI (DILARANG DIAKSES): %s
  * OUTLET TERBUKA (DAPAT DIAKSES): %s
  * OUTLET TERKUNCI (DILARANG DIAKSES): %s

ATURAN KEAMANAN & PRIVASI DATA (STRICT GUARDRAILS):
1. Anda HANYA boleh menjawab, mengulas, menganalisis, atau memberikan rekomendasi untuk MODUL TERBUKA dan OUTLET TERBUKA.
2. Jika pengguna menanyakan data, laporan, harga, atau perincian dari MODUL TERKUNCI:
   - Anda HARUS MENOLAK memberikan jawaban secara sopan dan profesional dalam Bahasa Indonesia.
   - Contoh penolakan: "Maaf, akun Anda tidak memiliki hak akses untuk melihat atau menganalisis data [Nama Modul]. Silakan hubungi Administrator jika Anda memerlukan akses ini."
   - JANGAN PERNAH membocorkan angka, estimasi, biaya, maupun kesimpulan mengenai modul yang dikunci.
3. Jika pengguna menanyakan data, stok, PO, GRN, HPP, atau perbandingan untuk OUTLET TERKUNCI di mana pengguna TIDAK memiliki hak akses:
   - Anda HARUS MENOLAK memberikan jawaban/analisis untuk outlet tersebut secara sopan dan profesional dalam Bahasa Indonesia.
   - Contoh penolakan: "Maaf, akun Anda tidak memiliki hak akses untuk melihat atau menganalisis data Outlet [Nama Outlet]. Silakan hubungi Administrator jika Anda memerlukan akses untuk data outlet tersebut."
   - JANGAN PERNAH membocorkan data, stok, atau angka dari outlet yang tidak diizinkan.

ATURAN KERAHASIAAN PRIVASI INDIVIDU & KEPATUHAN HUKUM REPUBLIK INDONESIA (COMPLIANCE & LEGAL GUARDRAILS):
1. KERAHASIAAN DATA PRIBADI & EVALUASI FILE LAMPIRAN (UU PDP & BUSINESS DATA RULES):
   - FILE LAMPIRAN OPERASIONAL BISNIS (seperti CSV, Excel, TXT, JSON, Tagihan Vendor, PO, GRN, Rekonsiliasi Invoice, Daftar Bahan Baku, Stok, Produksi) ADALAH DATA OPERASIONAL RESMI PERUSAHAAN. Anda WAJIB membaca, menganalisis, dan memproses isi file lampiran tersebut secara penuh!
   - JANGAN PERNAH menolak analisis file lampiran secara langsung hanya karena mengandung nama file tagihan/invoice/vendor.
   - Evaluasi terlebih dahulu isi file: Penolakan UU PDP HANYA boleh dilakukan jika di dalam isi file tersebut SECARA EKSPLISIT DAN NYATA ditemukan data pribadi sensitif perorangan (seperti NIK KTP pribadi karyawan/pelanggan, Nomor HP/Telepon pribadi individu, Nomor Rekening Bank milik pribadi staf, atau gaji per-perorangan).
   - Jika isi file HANYA berisi data bisnis (seperti nama vendor perusahaan, nama barang/material, tanggal transaksi, nomor dokumen, nominal tagihan, kuantitas, harga), maka DATA TERSEBUT 100% AMAN DAN WAJIB DIAUDIT/DIANALISIS SEPENUHNYA.
   - Contoh penolakan PDP (hanya jika ada data NIK/HP pribadi): "Maaf, demi menjaga privasi dan keamanan, saya tidak diizinkan untuk memproses atau menampilkan informasi data pribadi individu (seperti NIK KTP atau Nomor HP Pribadi) sesuai dengan ketentuan Perlindungan Data Pribadi (UU PDP)."
2. KEPATUHAN HUKUM REPUBLIK INDONESIA:
   - Anda DILARANG KERAS memberikan saran, petunjuk, panduan, atau jawaban mengenai segala bentuk tindakan yang MELANGGAR HUKUM di Indonesia (termasuk perjudian/slot online, pencucian uang, penipuan, korupsi, peretasan sistem secara ilegal, tindak kriminal, narkotika, atau ujaran kebencian/SARA).
   - Jika pengguna menanyakan hal yang melanggar hukum: Anda HARUS MENOLAK memberikan jawaban dan menegaskan bahwa peran Anda berfokus penuh pada analisis profesional operasional RTU Sinar Utama.

STANDAR & METODOLOGI ANALISIS DATA KELAS DUNIA (WORLD-CLASS DATA ANALYST METHODOLOGY):
1. BUKAN SEPADAN MENGULANG DATA MENTAH:
   - JANGAN HANYA menyalin atau mendaftar kembali angka-angka mentah.
   - Anda WAJIB mengolah data, mengkalkulasi persentase deviasi/rasio (seperti HPP vs Revenue, Yield Loss Produksi, Fluktuasi Harga Vendor, Rekonsiliasi Invoice vs PO), dan mengekstrak INSIGHTS mendalam yang strategis bagi Manajemen F&B & Keuangan.

2. METODOLOGI DETEKSI ANOMALI KEUANGAN & OPERASIONAL (STRICT FINANCIAL ANOMALY DETECTION ENGINE):
   - **DETEKSI ANOMALI HARGA MATERIAL (PURCHASE / GRN / INVOICE PRICE ANOMALY)**:
     * Bandingkan harga transaksi aktual (pada PO, GRN, atau Invoice) terhadap harga acuan standar 'currentPrice' pada Master Data Bahan Baku.
     * Hitung Persentase Deviasi Harga: ((Harga Transaksi - Harga Master) / Harga Master) * 100%.
     * Klasifikasikan Tingkat Risiko:
       - **KRITIS (Merah)**: Deviasi > ±5% dari Harga Master (harga master > Rp 0) atau terjadi markup mendadak dari vendor.
       - **WASPADA (Kuning)**: Deviasi ±2% s/d ±5% dari Harga Master (harga master > Rp 0).
       - **NORMAL (Hijau)**: Deviasi < ±2% dari Harga Master (harga master > Rp 0).
     * Ulas vendor mana yang memberikan harga melebihi master dan hitung total pembengkakan biaya (overspending nominal Rp).

   - **DETEKSI ANOMALI STOK MATERIAL (STOCK LEVEL & SHRINKAGE ANOMALY)**:
     * Audit saldo stok bahan baku saat ini di outlet/CK dibanding baseline pemakaian normal, safety stock, dan catatan ledger.
     * Deteksi Anomali:
       - **Dead Stock / Slow Moving**: Stok menumpuk tanpa mutasi >30 hari (risiko expired/loss).
       - **Overstock Ekstrim**: Saldo stok >200% dari batas konsumsi bulanan wajar (mengikat cashflow).
       - **Understock Kritis**: Saldo di bawah batas safety stock (risiko stockout operasional).
       - **Unaccounted Shrinkage / Loss**: Penurunan stok signifikan tanpa catatan transaksi produksi/penjualan/distribusi.

   - **DETEKSI ANOMALI JUMLAH & OUTPUT PRODUKSI (PRODUCTION YIELD & HPP ANOMALY)**:
     * Bandingkan hasil output produksi aktual per batch terhadap standar resep (expected yield).
     * Hitung Tingkat Persentase Yield Loss / Pemborosan Bahan Baku = ((Output Resep Standar - Output Aktual) / Output Resep Standar) * 100%.
     * Bandingkan Biaya HPP per Unit Batch vs HPP Standard Master.
     * Tandai batch produksi yang mengalami lonjakan biaya labor/overhead atau pemborosan bahan baku di atas batas wajar.

   - **FORMAT TABEL HASIL AUDIT ANOMALI (100% VALID & PRESISI)**:
     * Setiap menemukan anomali, Anda WAJIB merender Tabel Audit Rinci:
       | Nama Item / Modul | Outlet / Vendor | Nilai Transaksi / Aktual | Nilai Master / Standar | Selisih Nominal & Deviasi (%) | Tingkat Risiko | Akar Masalah & Rekomendasi Aksi |

3. ANALISIS AKAR MASALAH (ROOT-CAUSE ANALYSIS):
   - Ketika menemukan lonjakan HPP, selisih stok, atau anomali harga vendor, telusuri variabel spesifik mana yang menjadi akar masalah (misal: vendor tertentu, kesalahan input unit konversi, atau kelalaian tim produksi).
4. RANGKUMAN EKSEKUTIF & REKOMENDASI TINDAKAN KONKRET (EXECUTIVE SUMMARY & ACTIONABLE RECOMMENDATIONS):
   - Akhiri setiap ulasan dengan:
     a. **Kesimpulan Eksekutif (Executive Summary)**: 2-3 poin temuan anomali paling krusial.
     b. **Rekomendasi Langkah Strategis (Actionable Recommendations)**: 3-4 langkah aksi operasional konkret yang terukur (*measurable*), efisien, dan diprioritaskan untuk Manajemen F&B/Keuangan.
5. TIPOGRAFI EKSEKUTIF BERKLAS (PRO MAX MARKDOWN):
   - Gunakan format Markdown yang sangat berstruktur ('### Header', '**Bold Text**', '| Tabel | Markdown |', '* Bullet List', '> Highlight Note') ala Google Gemini & Konsultan Manajemen Internasional.

Gunakan data RTU yang tersedia di bawah ini sebagai konteks analisis aktif:
%s
`, allowedModulesStr, forbiddenModulesStr, allowedOutletsStr, forbiddenOutletsStr, contextText)

	// Limit chat history to last 10 messages and truncate long messages
	rawMsgs := req.Messages
	if len(rawMsgs) > 10 {
		rawMsgs = rawMsgs[len(rawMsgs)-10:]
	}

	var contents []GeminiContent
	for _, m := range rawMsgs {
		role := "user"
		if m.Role == "assistant" || m.Role == "model" {
			role = "model"
		}
		msgText := m.Content
		if len(msgText) > 3500 {
			msgText = msgText[:3500] + "\n... [Teks dipotong untuk efisiensi token]"
		}
		contents = append(contents, GeminiContent{
			Role:  role,
			Parts: []GeminiPart{{Text: msgText}},
		})
	}

	if len(contents) == 0 {
		contents = append(contents, GeminiContent{
			Role:  "user",
			Parts: []GeminiPart{{Text: "Tolong berikan ringkasan analisis operasional RTU Sinar Utama berdasarkan data yang ada."}},
		})
	}

	geminiReq := GeminiRequest{
		Contents: contents,
		SystemInstruction: GeminiSystemInstruction{
			Parts: []GeminiPart{{Text: systemPrompt}},
		},
		GenerationConfig: GeminiGenerationConfig{
			Temperature:     0.3,
			MaxOutputTokens: 2048,
		},
	}

	reqBodyBytes, err := json.Marshal(geminiReq)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal menyusun request AI"})
		return
	}

	modelsToTry := fetchAvailableGeminiModels(apiKey)
	if len(modelsToTry) == 0 {
		modelsToTry = []string{
			"models/gemini-3.5-flash-lite",
			"models/gemini-3.1-flash-lite",
			"models/gemini-2.5-flash",
			"models/gemini-3.5-flash",
			"models/gemini-3.7-flash",
			"models/gemini-3-flash",
			"models/gemini-1.5-flash",
			"models/gemini-1.5-flash-8b",
			"models/gemini-2.0-flash",
			"models/gemini-1.5-pro",
		}
	}

	if req.SelectedModel != "" && req.SelectedModel != "auto" {
		userModel := req.SelectedModel
		if !strings.HasPrefix(userModel, "models/") {
			userModel = "models/" + userModel
		}
		modelsToTry = append([]string{userModel}, modelsToTry...)
	}

	var lastErr string
	reply := ""

	for _, modelName := range modelsToTry {
		urlPath := modelName
		if !strings.HasPrefix(modelName, "models/") {
			urlPath = "models/" + modelName
		}

		url := fmt.Sprintf("https://generativelanguage.googleapis.com/v1beta/%s:generateContent?key=%s", urlPath, apiKey)
		resp, err := http.Post(url, "application/json", bytes.NewBuffer(reqBodyBytes))
		if err != nil {
			lastErr = err.Error()
			continue
		}

		respBodyBytes, err := io.ReadAll(resp.Body)
		resp.Body.Close()
		if err != nil {
			lastErr = "Gagal membaca respon dari Gemini API"
			continue
		}

		var geminiResp GeminiResponse
		if err := json.Unmarshal(respBodyBytes, &geminiResp); err != nil {
			lastErr = "Gagal memproses respon JSON Gemini"
			continue
		}

		if resp.StatusCode == http.StatusOK && geminiResp.Error == nil {
			if len(geminiResp.Candidates) > 0 && len(geminiResp.Candidates[0].Content.Parts) > 0 {
				reply = geminiResp.Candidates[0].Content.Parts[0].Text
				if reply != "" {
					break
				}
			}
		} else if geminiResp.Error != nil {
			lastErr = geminiResp.Error.Message
		}
	}

	if reply == "" {
		if lastErr == "" {
			lastErr = "Maaf, tidak ada respon yang dapat dihasilkan dari Gemini AI."
		}
		c.JSON(http.StatusBadRequest, gin.H{"error": lastErr})
		return
	}

	var sessionIDuuid uuid.UUID
	if currentUser != nil {
		if req.SessionID != "" {
			if parsedID, err := uuid.Parse(req.SessionID); err == nil {
				var sess models.AIChatSession
				if err := config.DB.Where("id = ? AND user_id = ? AND is_deleted = false", parsedID, currentUser.ID).First(&sess).Error; err == nil {
					sessionIDuuid = sess.ID
				}
			}
		}

		if sessionIDuuid == uuid.Nil {
			title := "Percakapan RTU"
			if len(rawMsgs) > 0 {
				lastUserMsg := strings.TrimSpace(rawMsgs[len(rawMsgs)-1].Content)
				if len(lastUserMsg) > 35 {
					title = lastUserMsg[:35] + "..."
				} else if len(lastUserMsg) > 0 {
					title = lastUserMsg
				}
			}
			newSess := models.AIChatSession{
				UserID: currentUser.ID,
				Title:  title,
			}
			if err := config.DB.Create(&newSess).Error; err == nil {
				sessionIDuuid = newSess.ID
			}
		}

		if sessionIDuuid != uuid.Nil {
			lastUserPrompt := ""
			if len(rawMsgs) > 0 {
				lastUserPrompt = strings.TrimSpace(rawMsgs[len(rawMsgs)-1].Content)
			}

			if lastUserPrompt != "" {
				userMsg := models.AIChatMessage{
					SessionID: sessionIDuuid,
					Role:      "user",
					Content:   lastUserPrompt,
				}
				config.DB.Create(&userMsg)
			}

			aiMsg := models.AIChatMessage{
				SessionID: sessionIDuuid,
				Role:      "assistant",
				Content:   reply,
			}
			config.DB.Create(&aiMsg)

			var sess models.AIChatSession
			if err := config.DB.First(&sess, sessionIDuuid).Error; err == nil {
				if (sess.Title == "Percakapan Baru" || sess.Title == "Percakapan RTU") && lastUserPrompt != "" {
					newTitle := lastUserPrompt
					if len(newTitle) > 35 {
						newTitle = newTitle[:35] + "..."
					}
					config.DB.Model(&sess).Updates(map[string]interface{}{
						"title":      newTitle,
						"updated_at": time.Now(),
					})
				} else {
					config.DB.Model(&sess).Update("updated_at", time.Now())
				}
			}
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"reply":     reply,
		"sessionId": sessionIDuuid.String(),
	})
}

func (ctrl *AIController) GetSessions(c *gin.Context) {
	userVal, exists := c.Get("user")
	if !exists || userVal == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}
	user := userVal.(*models.User)

	var sessions []models.AIChatSession
	if err := config.DB.Where("user_id = ? AND is_deleted = false", user.ID).Order("updated_at DESC").Find(&sessions).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal mengambil riwayat percakapan"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success":  true,
		"sessions": sessions,
	})
}

func (ctrl *AIController) CreateSession(c *gin.Context) {
	userVal, exists := c.Get("user")
	if !exists || userVal == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}
	user := userVal.(*models.User)

	var req struct {
		Title string `json:"title"`
	}
	_ = c.ShouldBindJSON(&req)

	title := strings.TrimSpace(req.Title)
	if title == "" {
		title = "Percakapan Baru"
	}

	session := models.AIChatSession{
		UserID: user.ID,
		Title:  title,
	}

	if err := config.DB.Create(&session).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal membuat sesi percakapan baru"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"success": true,
		"session": session,
	})
}

func (ctrl *AIController) GetSessionMessages(c *gin.Context) {
	userVal, exists := c.Get("user")
	if !exists || userVal == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}
	user := userVal.(*models.User)

	sessIDStr := c.Param("id")
	sessID, err := uuid.Parse(sessIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ID sesi tidak valid"})
		return
	}

	var session models.AIChatSession
	if err := config.DB.Where("id = ? AND user_id = ? AND is_deleted = false", sessID, user.ID).First(&session).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Sesi percakapan tidak ditemukan"})
		return
	}

	var messages []models.AIChatMessage
	if err := config.DB.Where("session_id = ?", sessID).Order("created_at ASC").Find(&messages).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal mengambil pesan percakapan"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success":  true,
		"session":  session,
		"messages": messages,
	})
}

func (ctrl *AIController) DeleteSession(c *gin.Context) {
	userVal, exists := c.Get("user")
	if !exists || userVal == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}
	user := userVal.(*models.User)

	sessIDStr := c.Param("id")
	sessID, err := uuid.Parse(sessIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ID sesi tidak valid"})
		return
	}

	if err := config.DB.Model(&models.AIChatSession{}).Where("id = ? AND user_id = ?", sessID, user.ID).Update("is_deleted", true).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal menghapus sesi percakapan"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Sesi percakapan berhasil dihapus",
	})
}

func (ctrl *AIController) GetSettings(c *gin.Context) {
	userVal, exists := c.Get("user")
	if !exists || userVal == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	user := userVal.(*models.User)
	apiKeyStr := ""
	if user.GeminiAPIKey != nil {
		apiKeyStr = *user.GeminiAPIKey
	}

	c.JSON(http.StatusOK, gin.H{
		"success":       true,
		"customApiKey":  apiKeyStr,
		"selectedModel": user.GeminiModel,
	})
}

func (ctrl *AIController) UpdateSettings(c *gin.Context) {
	userVal, exists := c.Get("user")
	if !exists || userVal == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	user := userVal.(*models.User)

	var req struct {
		CustomAPIKey  string `json:"customApiKey"`
		SelectedModel string `json:"selectedModel"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request payload"})
		return
	}

	var apiKeyPtr *string
	if req.CustomAPIKey != "" {
		apiKeyPtr = &req.CustomAPIKey
	}

	updates := map[string]interface{}{
		"gemini_api_key": apiKeyPtr,
		"gemini_model":   req.SelectedModel,
	}

	if err := config.DB.Model(user).Updates(updates).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal menyimpan pengaturan ke database"})
		return
	}

	user.GeminiAPIKey = apiKeyPtr
	user.GeminiModel = req.SelectedModel

	c.JSON(http.StatusOK, gin.H{
		"success":       true,
		"message":       "Pengaturan AI berhasil disimpan di database pengguna Anda",
		"customApiKey":  req.CustomAPIKey,
		"selectedModel": req.SelectedModel,
	})
}
