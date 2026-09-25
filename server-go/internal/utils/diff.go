package utils

import (
	"reflect"

	"github.com/yourusername/kpi-backend/internal/models"
)

// DiffStructs compares two structs of the same type and returns a list of changes.
// It specifically handles nested pillars for KPI evaluations by using a prefix.
func DiffStructs(oldObj, newObj any, prefix string) []models.Change {
	var changes []models.Change

	vOld := reflect.ValueOf(oldObj)
	vNew := reflect.ValueOf(newObj)

	// If pointers, get the underlying values
	if vOld.Kind() == reflect.Ptr {
		if vOld.IsNil() && vNew.IsNil() {
			return changes
		}
		
		// If one is nil, we create a zero value of the element type for comparison
		if vOld.IsNil() {
			vOld = reflect.New(vNew.Type().Elem()).Elem()
		} else {
			vOld = vOld.Elem()
		}

		if vNew.IsNil() {
			vNew = reflect.New(vOld.Type()).Elem()
		} else {
			vNew = vNew.Elem()
		}
	}

	if vOld.Kind() != reflect.Struct || vNew.Kind() != reflect.Struct {
		return changes
	}

	typeOld := vOld.Type()

	for i := 0; i < vOld.NumField(); i++ {
		field := typeOld.Field(i)
		
		// Skip unexported fields or specific internal fields
		if !field.IsExported() || field.Name == "EvaluationID" || field.Name == "ID" || 
		   field.Name == "CreatedAt" || field.Name == "UpdatedAt" || field.Name == "DeletedAt" {
			continue
		}

		valOld := vOld.Field(i).Interface()
		valNew := vNew.Field(i).Interface()

		// Deep equality check for values
		if !reflect.DeepEqual(valOld, valNew) {
			jsonTag := field.Tag.Get("json")
			if jsonTag == "" || jsonTag == "-" {
				continue
			}
			// Remove omitempty from tag
			fieldName := jsonTag
			// Simple string split for json tag name
			if commaIdx := findComma(jsonTag); commaIdx != -1 {
				fieldName = jsonTag[:commaIdx]
			}

			changes = append(changes, models.Change{
				Field:    prefix,
				SubField: fieldName,
				OldValue: valOld,
				NewValue: valNew,
			})
		}
	}

	return changes
}

func findComma(s string) int {
	for i := 0; i < len(s); i++ {
		if s[i] == ',' {
			return i
		}
	}
	return -1
}
