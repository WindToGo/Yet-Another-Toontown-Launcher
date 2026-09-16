package ttrapi

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"sync"
	"time"
)

const populationURL = "https://www.toontownrewritten.com/api/population"

// populationCacheTTL controls how often we're actually willing to hit TTR's
// public population API — callers may ask more often than this, but they'll
// get the cached value in between instead of triggering a new request.
const populationCacheTTL = 5 * time.Minute

// Population is TTR's server population, trimmed to what the frontend needs.
type Population struct {
	Total       int            `json:"total"`
	ByDistrict  map[string]int `json:"byDistrict"`
	LastUpdated int64          `json:"lastUpdated"`
}

type populationResponse struct {
	Error                *string        `json:"error"`
	TotalPopulation      int            `json:"totalPopulation"`
	PopulationByDistrict map[string]int `json:"populationByDistrict"`
	LastUpdated          int64          `json:"lastUpdated"`
}

var (
	populationMu     sync.Mutex
	cachedPopulation *Population
	cachedAt         time.Time
)

// GetPopulation returns TTR's current server population. Results are cached
// for populationCacheTTL so frequent callers don't hammer TTR's API.
func GetPopulation() (*Population, error) {
	populationMu.Lock()
	defer populationMu.Unlock()

	if cachedPopulation != nil && time.Since(cachedAt) < populationCacheTTL {
		return cachedPopulation, nil
	}

	req, err := http.NewRequest(http.MethodGet, populationURL, nil)
	if err != nil {
		return nil, err
	}
	// TTR's API docs ask that frequent callers set a descriptive User-Agent.
	req.Header.Set("User-Agent", "YATL (Yet Another Toontown Launcher)")

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	var raw populationResponse
	if err := json.Unmarshal(body, &raw); err != nil {
		return nil, err
	}

	if raw.Error != nil {
		return nil, fmt.Errorf("TTR population API error: %s", *raw.Error)
	}

	pop := &Population{
		Total:       raw.TotalPopulation,
		ByDistrict:  raw.PopulationByDistrict,
		LastUpdated: raw.LastUpdated,
	}

	cachedPopulation = pop
	cachedAt = time.Now()

	return pop, nil
}
