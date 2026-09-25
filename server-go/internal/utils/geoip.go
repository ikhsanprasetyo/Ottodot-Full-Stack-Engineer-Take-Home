package utils

import (
	"encoding/json"
	"fmt"
	"net/http"
	"time"
)

// GeoIP holds the result of an ip-api.com lookup
type GeoIP struct {
	Country     string `json:"country"`
	CountryCode string `json:"countryCode"`
	RegionName  string `json:"regionName"`
	City        string `json:"city"`
	ISP         string `json:"isp"`
	Status      string  `json:"status"`
	Message     string  `json:"message"`
	Query       string  `json:"query"`
	Lat         float64 `json:"lat"`
	Lon         float64 `json:"lon"`
}

var geoIPClient = &http.Client{Timeout: 5 * time.Second}

// GetGeoIP resolves an IP address to city/region/country using ip-api.com.
// Returns a fallback "Local" result for loopback/empty IPs.
func GetGeoIP(ip string) (*GeoIP, error) {
	url := fmt.Sprintf("http://ip-api.com/json/%s", ip)
	if ip == "" || ip == "127.0.0.1" || ip == "::1" {
		// Fallback to the caller's public WAN IP for local testing/development
		url = "http://ip-api.com/json/"
	}

	resp, err := geoIPClient.Get(url)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("ip-api: unexpected status %d", resp.StatusCode)
	}

	var geo GeoIP
	if err := json.NewDecoder(resp.Body).Decode(&geo); err != nil {
		return nil, err
	}
	if geo.Status == "fail" {
		return nil, fmt.Errorf("ip-api error: %s", geo.Message)
	}
	return &geo, nil
}
