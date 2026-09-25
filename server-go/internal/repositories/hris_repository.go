package repositories

import (
	"context"
	"regexp"
	"time"

	"github.com/yourusername/kpi-backend/internal/models"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

type HRISRepository interface {
	GetHRISOperationsDetails(ctx context.Context, outletName string, month, year int) (*models.HRISOperationsDetails, error)
}

type hrisRepository struct {
	db *mongo.Database
}

func NewHRISRepository(db *mongo.Database) HRISRepository {
	return &hrisRepository{db: db}
}

func (r *hrisRepository) GetHRISOperationsDetails(ctx context.Context, outletName string, month, year int) (*models.HRISOperationsDetails, error) {
	currentMonth := time.Date(year, time.Month(month), 25, 23, 59, 59, 0, time.Local)
	prevMonth := currentMonth.AddDate(0, -1, 0)
	startDate := time.Date(prevMonth.Year(), prevMonth.Month(), 26, 0, 0, 0, 0, time.Local)
	endDate := currentMonth

	details := &models.HRISOperationsDetails{
		LateEmployees:     []models.EmployeeRecord{},
		AbsentEmployees:   []models.EmployeeRecord{},
		IzinEmployees:     []models.EmployeeRecord{},
		NewEmployees:      []models.EmployeeRecord{},
		ResignedEmployees: []models.EmployeeRecord{},
	}

	collSummary := r.db.Collection("employeesummaries")
	collEmployees := r.db.Collection("employees")
	filter := bson.M{
		"outlet": bson.M{"$regex": "^" + outletName + "$", "$options": "i"},
		"date":   bson.M{"$gte": startDate, "$lte": endDate},
	}

	var summary models.EmployeeSummary
	err := collSummary.FindOne(ctx, filter).Decode(&summary)
	
	if err != nil {
		if err == mongo.ErrNoDocuments {
			latestFilter := bson.M{"outlet": bson.M{"$regex": "^" + outletName + "$", "$options": "i"}}
			if latestErr := collSummary.FindOne(ctx, latestFilter, options.FindOne().SetSort(bson.M{"date": -1})).Decode(&summary); latestErr != nil {
				return details, nil
			}
		} else {
			return nil, err
		}
	}

	// 1. Collect all Unique Employee IDs for Enrichment
	idMap := make(map[int]bool)
	allLists := [][]models.EmployeeRecord{
		summary.AttendanceSummary.ListAbsen,
		summary.AttendanceSummary.ListLateInDaysMoreThan5Min,
		summary.AttendanceSummary.ListIzin,
		summary.AttendanceSummary.ListSakit,
		summary.Employees.New,
		summary.Employees.Resigned,
		summary.Employees.Active,
	}
	for _, list := range allLists {
		for _, rec := range list {
			if rec.EmployeeID > 0 {
				idMap[rec.EmployeeID] = true
			}
		}
	}

	ids := make([]int, 0, len(idMap))
	for id := range idMap {
		ids = append(ids, id)
	}

	// 2. Fetch Master Data (Safe Fields Only)
	masterMap := make(map[int]*models.EmployeeBasicInfo)
	if len(ids) > 0 {
		cursor, err := collEmployees.Find(ctx, bson.M{"employeeID": bson.M{"$in": ids}}, options.Find().SetProjection(bson.M{
			"employeeID": 1, "sex": 1, "education": 1, "region": 1, "religion": 1, 
			"dateIn": 1, "dateResign": 1, "datePermanent": 1, "status": 1, "position": 1,
			"profilePicture": 1, "reasonResign": 1,
		}))
		if err == nil {
			var masters []struct {
				EmployeeID int `bson:"employeeID"`
				models.EmployeeBasicInfo `bson:",inline"`
			}
			if err := cursor.All(ctx, &masters); err == nil {
				for i := range masters {
					masterMap[masters[i].EmployeeID] = &masters[i].EmployeeBasicInfo
				}
			}
		}
	}

	// 3. Map & Validate (with Fallback)
	fallbackMap := make(map[string]*models.EmployeeBasicInfo)

	enrich := func(recs []models.EmployeeRecord) []models.EmployeeRecord {
		valid := make([]models.EmployeeRecord, 0)
		for _, r := range recs {
			if r.Name == "" {
				continue
			}

			var master *models.EmployeeBasicInfo
			var found bool

			// Try 1: ID Match
			if m, ok := masterMap[r.EmployeeID]; ok {
				master = m
				found = true
			}

			// Try 2: Cache Match (Fallback from previous lookups in same request)
			if !found {
				if m, ok := fallbackMap[r.Name]; ok {
					master = m
					found = true
				}
			}

			// Try 3: DB Fallback Search by Name (Case-insensitive)
			if !found {
				var fallback struct {
					models.EmployeeBasicInfo `bson:",inline"`
				}
				err := collEmployees.FindOne(ctx, bson.M{
					"name": bson.M{"$regex": "^" + regexp.QuoteMeta(r.Name) + "$", "$options": "i"},
				}).Decode(&fallback)

				if err == nil {
					master = &fallback.EmployeeBasicInfo
					fallbackMap[r.Name] = master
					found = true
				}
			}

			// Merge master info if found
			if found {
				if r.Employee == nil {
					r.Employee = master
				} else {
					// Overlay master data onto existing professional info
					r.Employee.Sex = master.Sex
					r.Employee.Education = master.Education
					r.Employee.Religion = master.Religion
					r.Employee.Region = master.Region
					r.Employee.DateIn = master.DateIn
					r.Employee.DateResign = master.DateResign
					r.Employee.DatePermanent = master.DatePermanent
					r.Employee.ProfilePicture = master.ProfilePicture
					r.Employee.ReasonResign = master.ReasonResign
					if r.Employee.Position == "" {
						r.Employee.Position = master.Position
					}
					if r.Employee.Status == "" {
						r.Employee.Status = master.Status
					}
				}
			}
			valid = append(valid, r)
		}
		return valid
	}

	details.AbsentEmployees = enrich(summary.AttendanceSummary.ListAbsen)
	details.LateEmployees = enrich(summary.AttendanceSummary.ListLateInDaysMoreThan5Min)
	details.IzinEmployees = append(enrich(summary.AttendanceSummary.ListIzin), enrich(summary.AttendanceSummary.ListSakit)...)
	details.NewEmployees = enrich(summary.Employees.New)
	details.ResignedEmployees = enrich(summary.Employees.Resigned)

	// Filter Active list to exclude New employees
	enrichedActive := enrich(summary.Employees.Active)
	newIDs := make(map[int]bool)
	for _, n := range details.NewEmployees {
		newIDs[n.EmployeeID] = true
	}

	details.ActiveEmployees = make([]models.EmployeeRecord, 0)
	for _, a := range enrichedActive {
		if !newIDs[a.EmployeeID] {
			details.ActiveEmployees = append(details.ActiveEmployees, a)
		}
	}

	// Summary totals (Restoring all counts)
	details.Summary.TotalNew = len(details.NewEmployees)
	details.Summary.TotalResigned = len(details.ResignedEmployees)
	details.Summary.TotalLate = len(details.LateEmployees)
	details.Summary.TotalAbsent = len(details.AbsentEmployees)
	details.Summary.TotalIzin = len(summary.AttendanceSummary.ListIzin)
	details.Summary.TotalSakit = len(summary.AttendanceSummary.ListSakit)

	// "Header Table" Logic:
	// Awal Bulan = Tab Active + Tab Keluar
	details.Summary.TotalStartMonth = len(details.ActiveEmployees) + len(details.ResignedEmployees)
	
	// Akhir Bulan = Tab Active + Tab Baru
	details.Summary.TotalEndMonth = len(details.ActiveEmployees) + len(details.NewEmployees)

	return details, nil
}
