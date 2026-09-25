package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// EmployeeBasicInfo represents the nested 'employee' object and master info from 'employees' collection
type EmployeeBasicInfo struct {
	ID           primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	DateIn       *time.Time         `bson:"dateIn" json:"dateIn"`
	DateResign   *time.Time         `bson:"dateResign" json:"dateResign"`
	Status       string             `bson:"status" json:"status"`
	Outlet       string             `bson:"outlet" json:"outlet"`
	Position     string             `bson:"position" json:"position"`
	Region       string             `bson:"region" json:"region"`
	ReasonResign string             `bson:"reasonResign" json:"reasonResign"`

	// Enriched fields from master 'employees' collection
	Sex            string     `bson:"sex,omitempty" json:"sex,omitempty"`
	Education      string     `bson:"education,omitempty" json:"education,omitempty"`
	Religion       string     `bson:"religion,omitempty" json:"religion,omitempty"`
	DatePermanent  *time.Time `bson:"datePermanent,omitempty" json:"datePermanent,omitempty"`
	ProfilePicture string     `bson:"profilePicture,omitempty" json:"profilePicture,omitempty"`
}

// EmployeeRecord represents the elements in attendance lists (absen, late, etc.)
type EmployeeRecord struct {
	ID             primitive.ObjectID `bson:"_id,omitempty" json:"_id,omitempty"`
	EmployeeID     int                `bson:"employeeID" json:"employeeId"`
	Name           string             `bson:"name" json:"name"`
	Outlet         string             `bson:"outlet" json:"outlet"`
	Employee       *EmployeeBasicInfo `bson:"employee" json:"employee"`             // Nested professional/master info
	AttendanceDate *time.Time         `bson:"date,omitempty" json:"attendanceDate"` // Specific date from snapshot entries
	ClockIn        *time.Time         `bson:"clockIn" json:"clockIn"`
	ClockOut       *time.Time         `bson:"clockOut" json:"clockOut"`
	ScheduleIn     *time.Time         `bson:"scheduleIn" json:"scheduleIn"`
	LateInMinutes  int                `bson:"lateInMinutes" json:"lateInMinutes"`
	AttendanceStatus string           `bson:"status" json:"status"`
	Description      string           `bson:"description" json:"description"`
}

// AttendanceSummaryDoc is the nested structure within EmployeeSummary
type AttendanceSummaryDoc struct {
	ListAbsen                    []EmployeeRecord `bson:"listAbsen" json:"listAbsen"`
	ListSakit                    []EmployeeRecord `bson:"listSakit" json:"listSakit"`
	ListIzin                     []EmployeeRecord `bson:"listIzin" json:"listIzin"`
	ListLateInDaysMoreThan5Min   []EmployeeRecord `bson:"listLateInDaysMoreThan5Min" json:"listLateInDaysMoreThan5Min"`
	TotalKaryawanAbsen           int              `bson:"totalKaryawanAbsen" json:"totalKaryawanAbsen"`
	TotalKaryawanSakit           int              `bson:"totalKaryawanSakit" json:"totalKaryawanSakit"`
	TotalKaryawanIzin            int              `bson:"totalKaryawanIzin" json:"totalKaryawanIzin"`
	TotalLateInDaysMoreThan5Min  int              `bson:"totalLateInDaysMoreThan5Min" json:"totalLateInDaysMoreThan5Min"`
}

// EmployeeSummary from 'employeesummaries' collection
type EmployeeSummary struct {
	ID                     primitive.ObjectID   `bson:"_id,omitempty" json:"id"`
	Outlet                 string               `bson:"outlet" json:"outlet"`
	Date                   time.Time            `bson:"date" json:"date"`
	TotalActiveEmployees   int                  `bson:"totalActiveEmployees" json:"totalActiveEmployees"`
	TotalResignedEmployees int                  `bson:"totalResignedEmployees" json:"totalResignedEmployees"`
	TotalNewEmployees      int                  `bson:"totalNewEmployees" json:"totalNewEmployees"`
	AttendanceSummary      AttendanceSummaryDoc `bson:"attendanceSummary" json:"attendanceSummary"`
	Employees              struct {
		Active   []EmployeeRecord `bson:"active" json:"active"`
		Resigned []EmployeeRecord `bson:"resigned" json:"resigned"`
		New      []EmployeeRecord `bson:"new" json:"new"`
	} `bson:"employees" json:"employees"`
}

// HRISOperationsDetails is the flattened response for KPI frontend
type HRISOperationsDetails struct {
	LateEmployees     []EmployeeRecord `json:"lateEmployees"`
	AbsentEmployees   []EmployeeRecord `json:"absentEmployees"`
	IzinEmployees     []EmployeeRecord `json:"izinEmployees"`
	NewEmployees      []EmployeeRecord `json:"newEmployees"`
	ResignedEmployees []EmployeeRecord `json:"resignedEmployees"`
	ActiveEmployees   []EmployeeRecord `json:"activeEmployees"`
	Summary           struct {
		TotalActive   int `json:"totalActive"`
		TotalNew      int `json:"totalNew"`
		TotalResigned int `json:"totalResigned"`
		TotalLate     int `json:"totalLate"`
		TotalAbsent   int `json:"totalAbsent"`
		TotalIzin     int `json:"totalIzin"`
		TotalSakit    int `json:"totalSakit"`
		TotalStartMonth int `json:"totalStartMonth"`
		TotalEndMonth   int `json:"totalEndMonth"`
		TotalShiftPerDay int `json:"totalShiftPerDay"`
	} `json:"summary"`
}
