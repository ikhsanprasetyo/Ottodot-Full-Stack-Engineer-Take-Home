package security

import (
	"golang.org/x/crypto/bcrypt"
)

// HashPassword generates bcrypt hash of password
func HashPassword(password string) (string, error) {
	// Cost 10 matches Node.js bcrypt.genSalt(10)
	bytes, err := bcrypt.GenerateFromPassword([]byte(password), 10)
	if err != nil {
		return "", err
	}
	return string(bytes), nil
}

// CheckPasswordHash compares password with hash
func CheckPasswordHash(password, hash string) bool {
	err := bcrypt.CompareHashAndPassword([]byte(hash), []byte(password))
	return err == nil
}
