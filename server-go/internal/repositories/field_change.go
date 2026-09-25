package repositories

import (
	"encoding/json"
	"fmt"

	"github.com/yourusername/kpi-backend/internal/models"
)

type FieldChange struct {
	Field string `json:"field"`
	Old   string `json:"old"`
	New   string `json:"new"`
}

func compareMaterialChanges(old, new *models.RTUMaterial) string {
	var changes []FieldChange

	if old.Name != new.Name {
		changes = append(changes, FieldChange{Field: "Nama Bahan", Old: old.Name, New: new.Name})
	}
	if old.Code != new.Code {
		changes = append(changes, FieldChange{Field: "Kode Bahan", Old: old.Code, New: new.Code})
	}
	if old.Category != new.Category {
		changes = append(changes, FieldChange{Field: "Kategori", Old: old.Category, New: new.Category})
	}
	if old.Unit != new.Unit {
		changes = append(changes, FieldChange{Field: "Satuan Utama", Old: old.Unit, New: new.Unit})
	}
	if old.Brand != new.Brand {
		changes = append(changes, FieldChange{Field: "Merek", Old: old.Brand, New: new.Brand})
	}
	if old.MinStock != new.MinStock {
		changes = append(changes, FieldChange{
			Field: "Stok Minimum",
			Old:   fmt.Sprintf("%.2f %s", old.MinStock, old.Unit),
			New:   fmt.Sprintf("%.2f %s", new.MinStock, new.Unit),
		})
	}
	if old.CurrentPrice != new.CurrentPrice {
		changes = append(changes, FieldChange{
			Field: "Harga Dasar",
			Old:   fmt.Sprintf("Rp %.2f", old.CurrentPrice),
			New:   fmt.Sprintf("Rp %.2f", new.CurrentPrice),
		})
	}
	if old.VendorID != nil && new.VendorID != nil && *old.VendorID != *new.VendorID {
		changes = append(changes, FieldChange{
			Field: "Vendor/Supplier ID",
			Old:   old.VendorID.String(),
			New:   new.VendorID.String(),
		})
	} else if (old.VendorID == nil && new.VendorID != nil) || (old.VendorID != nil && new.VendorID == nil) {
		oldV := "-"
		if old.VendorID != nil {
			oldV = old.VendorID.String()
		}
		newV := "-"
		if new.VendorID != nil {
			newV = new.VendorID.String()
		}
		changes = append(changes, FieldChange{Field: "Vendor/Supplier", Old: oldV, New: newV})
	}

	if len(changes) == 0 {
		return "Data bahan baku diperbarui"
	}

	bytes, err := json.Marshal(changes)
	if err != nil {
		return "Data bahan baku diperbarui"
	}
	return string(bytes)
}

func compareProductChanges(old, new *models.RTUProduct) string {
	var changes []FieldChange

	if old.Name != new.Name {
		changes = append(changes, FieldChange{Field: "Nama Produk", Old: old.Name, New: new.Name})
	}
	if old.Code != new.Code {
		changes = append(changes, FieldChange{Field: "Kode Produk", Old: old.Code, New: new.Code})
	}
	if old.Category != new.Category {
		changes = append(changes, FieldChange{Field: "Kategori", Old: old.Category, New: new.Category})
	}
	if old.OutputUnit != new.OutputUnit {
		changes = append(changes, FieldChange{Field: "Satuan Output", Old: old.OutputUnit, New: new.OutputUnit})
	}
	if old.CurrentPrice != new.CurrentPrice {
		changes = append(changes, FieldChange{
			Field: "Harga Satuan (HPP)",
			Old:   fmt.Sprintf("Rp %.2f", old.CurrentPrice),
			New:   fmt.Sprintf("Rp %.2f", new.CurrentPrice),
		})
	}

	if len(changes) == 0 {
		return "Data produk diperbarui"
	}

	bytes, err := json.Marshal(changes)
	if err != nil {
		return "Data produk diperbarui"
	}
	return string(bytes)
}

func compareVendorChanges(old, new *models.RTUVendor) string {
	var changes []FieldChange

	if old.Name != new.Name {
		changes = append(changes, FieldChange{Field: "Nama Vendor", Old: old.Name, New: new.Name})
	}
	if old.Code != new.Code {
		changes = append(changes, FieldChange{Field: "Kode Vendor", Old: old.Code, New: new.Code})
	}
	if old.Category != new.Category {
		changes = append(changes, FieldChange{Field: "Kategori", Old: old.Category, New: new.Category})
	}
	if old.PaymentTermDays != new.PaymentTermDays {
		changes = append(changes, FieldChange{
			Field: "Termin Pembayaran",
			Old:   fmt.Sprintf("%d Hari", old.PaymentTermDays),
			New:   fmt.Sprintf("%d Hari", new.PaymentTermDays),
		})
	}
	var oldNotes, newNotes string
	if old.Notes != nil {
		oldNotes = *old.Notes
	}
	if new.Notes != nil {
		newNotes = *new.Notes
	}
	if oldNotes != newNotes {
		changes = append(changes, FieldChange{Field: "Catatan", Old: oldNotes, New: newNotes})
	}
	if old.IsActive != new.IsActive {
		oldSt := "Non-Aktif"
		if old.IsActive {
			oldSt = "Aktif"
		}
		newSt := "Non-Aktif"
		if new.IsActive {
			newSt = "Aktif"
		}
		changes = append(changes, FieldChange{Field: "Status Keaktifan", Old: oldSt, New: newSt})
	}

	if len(changes) == 0 {
		return "Data vendor diperbarui"
	}

	bytes, err := json.Marshal(changes)
	if err != nil {
		return "Data vendor diperbarui"
	}
	return string(bytes)
}

func ComparePurchaseChanges(old, new *models.RTUPurchase) string {
	var changes []FieldChange

	if old.Status != new.Status {
		changes = append(changes, FieldChange{Field: "Status Document", Old: string(old.Status), New: string(new.Status)})
	}
	if old.PaymentType != new.PaymentType && new.PaymentType != "" {
		changes = append(changes, FieldChange{Field: "Tipe Pembayaran", Old: old.PaymentType, New: new.PaymentType})
	}
	if old.DPAmount != new.DPAmount {
		changes = append(changes, FieldChange{Field: "Nominal DP", Old: fmt.Sprintf("Rp %.2f", old.DPAmount), New: fmt.Sprintf("Rp %.2f", new.DPAmount)})
	}
	if old.TaxPercent != new.TaxPercent {
		changes = append(changes, FieldChange{Field: "PPN Tax", Old: fmt.Sprintf("%.2f%%", old.TaxPercent), New: fmt.Sprintf("%.2f%%", new.TaxPercent)})
	}
	if old.ShippingFee != new.ShippingFee {
		changes = append(changes, FieldChange{Field: "Ongkos Kirim", Old: fmt.Sprintf("Rp %.2f", old.ShippingFee), New: fmt.Sprintf("Rp %.2f", new.ShippingFee)})
	}
	if old.Notes != new.Notes {
		changes = append(changes, FieldChange{Field: "Catatan", Old: old.Notes, New: new.Notes})
	}

	if len(changes) == 0 {
		return "Data Purchase Order diperbarui"
	}

	bytes, err := json.Marshal(changes)
	if err != nil {
		return "Data Purchase Order diperbarui"
	}
	return string(bytes)
}

func CompareGRNChanges(old, new *models.RTUGRN) string {
	var changes []FieldChange

	if old.Status != new.Status {
		changes = append(changes, FieldChange{Field: "Status Document", Old: old.Status, New: new.Status})
	}
	if old.PaymentType != new.PaymentType && new.PaymentType != "" {
		changes = append(changes, FieldChange{Field: "Tipe Pembayaran", Old: old.PaymentType, New: new.PaymentType})
	}
	if old.DPAmount != new.DPAmount {
		changes = append(changes, FieldChange{Field: "Nominal DP", Old: fmt.Sprintf("Rp %.2f", old.DPAmount), New: fmt.Sprintf("Rp %.2f", new.DPAmount)})
	}
	if old.TaxPercent != new.TaxPercent {
		changes = append(changes, FieldChange{Field: "PPN Tax", Old: fmt.Sprintf("%.2f%%", old.TaxPercent), New: fmt.Sprintf("%.2f%%", new.TaxPercent)})
	}
	if old.ShippingFee != new.ShippingFee {
		changes = append(changes, FieldChange{Field: "Ongkos Kirim", Old: fmt.Sprintf("Rp %.2f", old.ShippingFee), New: fmt.Sprintf("Rp %.2f", new.ShippingFee)})
	}
	if old.TotalAmount != new.TotalAmount {
		changes = append(changes, FieldChange{Field: "Total Nominal", Old: fmt.Sprintf("Rp %.2f", old.TotalAmount), New: fmt.Sprintf("Rp %.2f", new.TotalAmount)})
	}
	if old.Notes != nil && new.Notes != nil && *old.Notes != *new.Notes {
		changes = append(changes, FieldChange{Field: "Catatan", Old: *old.Notes, New: *new.Notes})
	}

	if len(changes) == 0 {
		return "Data Goods Receipt Note diperbarui"
	}

	bytes, err := json.Marshal(changes)
	if err != nil {
		return "Data Goods Receipt Note diperbarui"
	}
	return string(bytes)
}

func CompareInvoiceChanges(old, new *models.RTUInvoiceReconcile) string {
	var changes []FieldChange

	if old.Status != new.Status {
		changes = append(changes, FieldChange{Field: "Status Document", Old: old.Status, New: new.Status})
	}
	if old.TaxPercent != new.TaxPercent {
		changes = append(changes, FieldChange{Field: "PPN Tax", Old: fmt.Sprintf("%.2f%%", old.TaxPercent), New: fmt.Sprintf("%.2f%%", new.TaxPercent)})
	}
	if old.ShippingFee != new.ShippingFee {
		changes = append(changes, FieldChange{Field: "Ongkos Kirim", Old: fmt.Sprintf("Rp %.2f", old.ShippingFee), New: fmt.Sprintf("Rp %.2f", new.ShippingFee)})
	}
	if old.TotalAmount != new.TotalAmount {
		changes = append(changes, FieldChange{Field: "Total Nominal", Old: fmt.Sprintf("Rp %.2f", old.TotalAmount), New: fmt.Sprintf("Rp %.2f", new.TotalAmount)})
	}
	if old.Notes != new.Notes {
		changes = append(changes, FieldChange{Field: "Catatan", Old: old.Notes, New: new.Notes})
	}

	if len(changes) == 0 {
		return "Data Invoice Reconcile diperbarui"
	}

	bytes, err := json.Marshal(changes)
	if err != nil {
		return "Data Invoice Reconcile diperbarui"
	}
	return string(bytes)
}

func ComparePaymentChanges(old, new *models.RTUPayment) string {
	var changes []FieldChange

	if old.Status != new.Status {
		changes = append(changes, FieldChange{Field: "Status Document", Old: string(old.Status), New: string(new.Status)})
	}
	if old.Amount != new.Amount {
		changes = append(changes, FieldChange{Field: "Nominal Pembayaran", Old: fmt.Sprintf("Rp %.2f", old.Amount), New: fmt.Sprintf("Rp %.2f", new.Amount)})
	}
	if old.Method != new.Method {
		changes = append(changes, FieldChange{Field: "Metode Pembayaran", Old: string(old.Method), New: string(new.Method)})
	}
	if old.BankName != new.BankName {
		changes = append(changes, FieldChange{Field: "Bank Tujuan", Old: old.BankName, New: new.BankName})
	}
	if old.BankAccount != new.BankAccount {
		changes = append(changes, FieldChange{Field: "No. Rekening", Old: old.BankAccount, New: new.BankAccount})
	}
	if old.Notes != new.Notes {
		changes = append(changes, FieldChange{Field: "Catatan", Old: old.Notes, New: new.Notes})
	}

	if len(changes) == 0 {
		return "Data Pembayaran diperbarui"
	}

	bytes, err := json.Marshal(changes)
	if err != nil {
		return "Data Pembayaran diperbarui"
	}
	return string(bytes)
}

func CompareProductionBatchChanges(old, new *models.RTUProductionBatch) string {
	var changes []FieldChange

	if old.Status != new.Status {
		changes = append(changes, FieldChange{Field: "Status Batch", Old: string(old.Status), New: string(new.Status)})
	}
	if old.ActualQty != new.ActualQty {
		unit := ""
		if new.Product != nil && new.Product.OutputUnit != "" {
			unit = " " + new.Product.OutputUnit
		} else if old.Product != nil && old.Product.OutputUnit != "" {
			unit = " " + old.Product.OutputUnit
		}
		changes = append(changes, FieldChange{
			Field: "Hasil Produksi",
			Old:   fmt.Sprintf("%.2f%s", old.ActualQty, unit),
			New:   fmt.Sprintf("%.2f%s", new.ActualQty, unit),
		})
	}
	if !old.PlannedDate.Equal(new.PlannedDate) && !new.PlannedDate.IsZero() {
		changes = append(changes, FieldChange{
			Field: "Tanggal Rencana",
			Old:   old.PlannedDate.Format("02 Jan 2006"),
			New:   new.PlannedDate.Format("02 Jan 2006"),
		})
	}
	if old.TotalCost != new.TotalCost {
		changes = append(changes, FieldChange{
			Field: "Total Biaya Produksi",
			Old:   fmt.Sprintf("Rp %.2f", old.TotalCost),
			New:   fmt.Sprintf("Rp %.2f", new.TotalCost),
		})
	}
	var oldNotes, newNotes string
	if old.Notes != nil {
		oldNotes = *old.Notes
	}
	if new.Notes != nil {
		newNotes = *new.Notes
	}
	if oldNotes != newNotes {
		changes = append(changes, FieldChange{Field: "Catatan", Old: oldNotes, New: newNotes})
	}

	if len(changes) == 0 {
		return "Data batch produksi diperbarui"
	}

	bytes, err := json.Marshal(changes)
	if err != nil {
		return "Data batch produksi diperbarui"
	}
	return string(bytes)
}

func CompareDistributionChanges(old, new *models.RTUDistribution) string {
	var changes []FieldChange

	if old.Status != new.Status {
		changes = append(changes, FieldChange{Field: "Status Distribusi", Old: string(old.Status), New: string(new.Status)})
	}
	if old.Type != new.Type {
		changes = append(changes, FieldChange{Field: "Tipe Distribusi", Old: string(old.Type), New: string(new.Type)})
	}
	if old.Notes != new.Notes {
		changes = append(changes, FieldChange{Field: "Catatan", Old: old.Notes, New: new.Notes})
	}
	if old.ShipmentDate != nil && new.ShipmentDate != nil && !old.ShipmentDate.Equal(*new.ShipmentDate) {
		changes = append(changes, FieldChange{
			Field: "Tanggal Pengiriman",
			Old:   old.ShipmentDate.Format("02 Jan 2006"),
			New:   new.ShipmentDate.Format("02 Jan 2006"),
		})
	}
	if old.ReceivedDate != nil && new.ReceivedDate != nil && !old.ReceivedDate.Equal(*new.ReceivedDate) {
		changes = append(changes, FieldChange{
			Field: "Tanggal Penerimaan",
			Old:   old.ReceivedDate.Format("02 Jan 2006"),
			New:   new.ReceivedDate.Format("02 Jan 2006"),
		})
	}

	if len(changes) == 0 {
		return "Data pengiriman/distribusi diperbarui"
	}

	bytes, err := json.Marshal(changes)
	if err != nil {
		return "Data pengiriman/distribusi diperbarui"
	}
	return string(bytes)
}

