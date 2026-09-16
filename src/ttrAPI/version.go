package ttrapi

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"runtime"
	"sync"
	"time"
)

const patchManifestURL = "https://cdn.toontownrewritten.com/content/patchmanifest.txt"

// versionCacheTTL mirrors populationCacheTTL — the manifest only changes
// when TTR ships a patch, so there's no need to refetch on every call.
const versionCacheTTL = 30 * time.Minute

type manifestEntry struct {
	Hash string `json:"hash"`
}

// engineFileByPlatform maps a platform identifier to the manifest entry TTR
// ships as its main game executable for that platform. TTR's patch manifest
// has no explicit version field, so this file's hash is the closest thing to
// a version string it exposes — it changes with every patch.
var engineFileByPlatform = map[string]string{
	"win64":  "TTREngine64.exe",
	"win32":  "TTREngine.exe",
	"darwin": "Toontown Rewritten",
	"linux":  "TTREngine",
}

func platformKey() string {
	if runtime.GOOS == "windows" {
		if runtime.GOARCH == "386" {
			return "win32"
		}
		return "win64"
	}
	return runtime.GOOS
}

var (
	versionMu       sync.Mutex
	cachedVersion   string
	versionCachedAt time.Time
)

// GetTTRVersion returns a short identifier for the currently-deployed TTR
// client build, derived from the main engine executable's hash in TTR's
// public patch manifest (TTR doesn't publish a semantic version number, so
// this is the closest stand-in — it changes with every patch TTR ships).
func GetTTRVersion() (string, error) {
	versionMu.Lock()
	defer versionMu.Unlock()

	if cachedVersion != "" && time.Since(versionCachedAt) < versionCacheTTL {
		return cachedVersion, nil
	}

	platform := platformKey()
	engineFile, ok := engineFileByPlatform[platform]
	if !ok {
		return "", fmt.Errorf("no known engine file for platform %q", platform)
	}

	req, err := http.NewRequest(http.MethodGet, patchManifestURL, nil)
	if err != nil {
		return "", err
	}
	// TTR's API docs ask that frequent callers set a descriptive User-Agent.
	req.Header.Set("User-Agent", "YATL (Yet Another Toontown Launcher)")

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", err
	}

	var manifest map[string]manifestEntry
	if err := json.Unmarshal(body, &manifest); err != nil {
		return "", fmt.Errorf("failed to parse patch manifest: %w", err)
	}

	entry, ok := manifest[engineFile]
	if !ok || len(entry.Hash) < 8 {
		return "", fmt.Errorf("engine file %q not found in patch manifest", engineFile)
	}

	version := entry.Hash[:8]
	cachedVersion = version
	versionCachedAt = time.Now()

	return version, nil
}
