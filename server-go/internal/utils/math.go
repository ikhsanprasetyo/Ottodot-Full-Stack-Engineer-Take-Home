package utils

import "math"

// SafeNumber converts interface{} to float64, defaulting to 0 on error
func SafeNumber(value interface{}) float64 {
	switch v := value.(type) {
	case float64:
		if math.IsNaN(v) || math.IsInf(v, 0) {
			return 0
		}
		return v
	case float32:
		if math.IsNaN(float64(v)) || math.IsInf(float64(v), 0) {
			return 0
		}
		return float64(v)
	case int:
		return float64(v)
	case int32:
		return float64(v)
	case int64:
		return float64(v)
	default:
		return 0
	}
}

// SafeRatio calculates ratio with division by zero protection
// Returns 0 if denominator is 0
func SafeRatio(numerator, denominator float64, decimals ...int) float64 {
	if denominator == 0 {
		return 0
	}

	ratio := numerator / denominator
	
	// Apply rounding if decimals specified
	if len(decimals) > 0 && decimals[0] > 0 {
		multiplier := math.Pow(10, float64(decimals[0]))
		return math.Round(ratio*multiplier) / multiplier
	}

	return ratio
}

// Max returns the maximum of two integers
func Max(a, b int) int {
	if a > b {
		return a
	}
	return b
}

// Min returns the minimum of two integers
func Min(a, b int) int {
	if a < b {
		return a
	}
	return b
}

// IsValidNumber checks if a number is valid (not NaN, not Inf)
func IsValidNumber(value float64) bool {
	return !math.IsNaN(value) && !math.IsInf(value, 0)
}

// FixNaN replaces NaN with 0
func FixNaN(num float64) float64 {
	if !IsValidNumber(num) {
		return 0
	}
	return num
}

// Round rounds number to specified decimal places
func Round(num float64, decimalPlaces int) float64 {
	if !IsValidNumber(num) {
		return num
	}
	
	if decimalPlaces == 0 {
		return FixNaN(math.Round(num))
	}
	
	multiplier := math.Pow(10, float64(decimalPlaces))
	roundedNum := math.Round(num*multiplier) / multiplier
	return roundedNum
}

// MaxFloat64 returns the maximum of two float64 values
func MaxFloat64(a, b float64) float64 {
	if a > b {
		return a
	}
	return b
}

// MinFloat64 returns the minimum of two float64 values
func MinFloat64(a, b float64) float64 {
	if a < b {
		return a
	}
	return b
}
