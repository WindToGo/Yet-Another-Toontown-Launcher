package ttrapi

import (
	"fmt"
	"io"
	"net/http"
	"os"
)

type TTRApiCall string

const (
	Toon      TTRApiCall = "toon.json"
	Laff      TTRApiCall = "laff.json"
	Location  TTRApiCall = "location.json"
	Gags      TTRApiCall = "gags.json"
	Tasks     TTRApiCall = "tasks.json"
	Invasion  TTRApiCall = "invasion.json"
	Fish      TTRApiCall = "fish.json"
	Flowers   TTRApiCall = "flowers.json"
	CogSuits  TTRApiCall = "cogsuits.json"
	Golf      TTRApiCall = "golf.json"
	Racing    TTRApiCall = "racing.json"
	Beans     TTRApiCall = "beans.json"
	Rewards   TTRApiCall = "rewards.json"
	Cattlelog TTRApiCall = "cattlelog.json"
)

func (c TTRApiCall) isValid() bool {
	switch c {
	case Toon, Laff, Location, Gags, Tasks, Invasion,
		Fish, Flowers, CogSuits, Golf, Racing, Beans,
		Rewards, Cattlelog:
		return true
	default:
		return false
	}
}

// CallLocalApi calls api on instance running locally
// Returns raw JSON
func CallLocalApi(port int, call TTRApiCall) ([]byte, error) {
	if !call.isValid() {
		return nil, fmt.Errorf("Invalid TTR API Call")
	}
	url := fmt.Sprintf("http://localhost:%d/%s", port, call)

	req, err := http.NewRequest(http.MethodGet, url, nil)
	if err != nil {
		return nil, err
	}

	req.Host = fmt.Sprintf("localhost:%d", port)
	req.Header.Add("Authorization", os.Getenv("TTR_AUTH_HEADER"))
	req.Header.Add("User-Agent", "Yet Another Toontown Launcher")

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	return body, nil
}
