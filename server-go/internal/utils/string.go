package utils

import (
	"regexp"
	"strings"
)

// EscapeRegex escapes special regex characters
// Equivalent to Node.js: str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
func EscapeRegex(s string) string {
	// Escape special regex characters
	specialChars := []string{".", "*", "+", "?", "^", "$", "{", "}", "(", ")", "|", "[", "]", "\\"}
	result := s
	for _, char := range specialChars {
		result = strings.ReplaceAll(result, char, "\\"+char)
	}
	return result
}

// StringIncludes checks if string contains search (case-insensitive)
func StringIncludes(str, search string) bool {
	if str == "" || search == "" {
		return false
	}
	return strings.Contains(strings.ToLower(str), strings.ToLower(search))
}

// Capitalize capitalizes first letter of string
func Capitalize(s string) string {
	if s == "" {
		return s
	}
	return strings.ToUpper(s[:1]) + strings.ToLower(s[1:])
}

// CapitalizeEachWord capitalizes first letter of each word
func CapitalizeEachWord(s string) string {
	if s == "" {
		return s
	}
	
	words := strings.Split(s, " ")
	for i, word := range words {
		if word != "" {
			words[i] = Capitalize(word)
		}
	}
	return strings.Join(words, " ")
}

// IsSame checks if two strings are equal
func IsSame(str1, str2 string) bool {
	return str1 == str2
}

// IsValidString checks if string is not empty and not just whitespace
func IsValidString(s string) bool {
	return s != "" && strings.TrimSpace(s) != ""
}

// NormalizeURL removes trailing slash from URL
func NormalizeURL(url string) string {
	return strings.TrimSuffix(url, "/")
}

// CreateRegexPattern creates regex pattern from string with optional flags
func CreateRegexPattern(pattern string, caseInsensitive bool) *regexp.Regexp {
	if caseInsensitive {
		pattern = "(?i)" + pattern
	}
	re, err := regexp.Compile(pattern)
	if err != nil {
		return nil
	}
	return re
}
