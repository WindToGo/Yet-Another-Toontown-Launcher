package services

import (
	"YATL/src/portfinder"
	"YATL/src/ttrAPI"
	"encoding/json"
	"fmt"
	"time"
)

type APIService struct{}

type toonResponse struct {
	Name    string `json:"name"`
	Species string `json:"species"`
	HeadColor string `json:"headColor"`
	Style   string `json:"style"`
}

func (g *APIService) GetToonName(port int) (string, error) {
	data, err := ttrapi.CallLocalApi(port, ttrapi.Toon)
	if err != nil {
		return "", fmt.Errorf("failed to call toon API: %w", err)
	}

	var toon toonResponse
	if err := json.Unmarshal(data, &toon); err != nil {
		return "", fmt.Errorf("failed to parse toon response: %w", err)
	}

	return toon.Name, nil
}


func (g *APIService) GetPortFromPID(pid int) (int, error) {
	var ttrCandidatePorts = []int{1547, 1548, 1549, 1550, 1551, 1552}
	const (
		maxAttempts = 10
		retryDelay  = 500 * time.Millisecond
	)

	var lastErr error
	for range maxAttempts {
		port, err := portfinder.PortForPID(pid, ttrCandidatePorts)
		if err == nil {
			return port, nil
		}
		lastErr = err
		time.Sleep(retryDelay)
	}

	return -1, fmt.Errorf("no port found for pid %d after %d attempts: %w", pid, maxAttempts, lastErr)
}

func (g *APIService) GetFishData(port int) ([]byte, error) {
	data, err := ttrapi.CallLocalApi(port, ttrapi.Fish)

	if err != nil {
		return nil, fmt.Errorf("failed to parse toon response: %w", err)
	}

	return data, nil
}
