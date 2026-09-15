package login

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strings"

	"github.com/rs/zerolog/log"
	"github.com/wailsapp/wails/v3/pkg/application"

	"YATL/src/patcher"
)

const loginURL = "https://www.toontownrewritten.com/api/login?format=json"
const TTRMirrors = "https://www.toontownrewritten.com/api/mirrors"

type TTRResponse struct {
	Success       string `json:"success"`
	Banner        string `json:"banner,omitempty"`
	ResponseToken string `json:"responseToken,omitempty"`
	Gameserver    string `json:"gameserver,omitempty"`
	Cookie        string `json:"cookie,omitempty"`
	Manifest      string `json:"manifest,omitempty"`
	ETA           string `json:"eta,omitempty"`
	Position      string `json:"position,omitempty"`
	QueueToken    string `json:"queueToken,omitempty"`
}

// The goal is to exit this function with TTR_GAMESERVER and TTR_PLAYCOOKIE in env
// ENTRY
//
//	and Patch Manifest returned
func HandleLogin(username string) int {
	password, err := GetPasswordFromUsername(username)
	if err != nil {
		log.Error().Err(err).Msg("Failed to get username from password")
		return -1
	}

	resp, err := loginTTR(username, password)
	if err != nil {
		fmt.Println("Error Logging In: ", err)
		return -1
	}

	switch resp.Success {
	case "true": // Full Seccess -> Get tokens and Download patch manifest
		return handleLoginSuccess(resp)

	case "delayed": // In Queue -> Poll until full success
		_ = resp.QueueToken
	// TODO: Add queue support

	case "partial": // 2fa -> Toon factor authenicate until full success
	// TODO: Add 2fa Supper

	case "false": // Failure -> Give up ig
	// TODO: Add failure support

	default: // Should never see this
	}
	return -1
}

func loginTTR(username string, password string) (*TTRResponse, error) {
	// Create form to send
	form := url.Values{}
	form.Set("username", username)
	form.Set("password", password)

	// Create POST Request
	req, err := http.NewRequest(http.MethodPost, loginURL, bytes.NewBufferString(form.Encode()))

	// Add required Header
	req.Header.Set("Content-type", "application/x-www-form-urlencoded")

	// Send request
	client := &http.Client{}
	resp, err := client.Do(req)

	if err != nil {
		return nil, err
	}

	defer resp.Body.Close()

	// Gather & return response
	body, _ := io.ReadAll(resp.Body)

	var ttrResp TTRResponse
	if err := json.Unmarshal(body, &ttrResp); err != nil {
		return nil, err
	}

	return &ttrResp, nil
}

func TestLoginTTRSuccess(username string, password string) (bool, error) {
	ttrResp, err := loginTTR(username, password)
	if err != nil {
		return false, err
	}

	if ttrResp.Success == "false" {
		return false, nil
	}

	return true, nil
}


func handleLoginSuccess(resp *TTRResponse) int {
	// Prepare mirrors for download & patching
	mirrorResp, err := http.Get(TTRMirrors)
	if err != nil {
		log.Error().
			Str("mirrors", TTRMirrors).
			Err(err).
			Msg("Unable to GET download mirrors from TTR")
	}
	defer mirrorResp.Body.Close()

	var mirrors []string
	json.NewDecoder(mirrorResp.Body).Decode(&mirrors)

	// Until they have more than literally one mirror I'm not adding funcitonality for it
	mirror := mirrors[0]

	patchURL := "https://cdn.toontownrewritten.com" + resp.Manifest

	// Let me know this all worked
	log.Info().
		Str("Game server", resp.Gameserver).
		Str("Play cookie", resp.Cookie).
		Str("Patch manifest URL", patchURL).
		Msg("Login successfull")

	// Handle Patching
	manifestContent, err := downloadPatchManifest(patchURL)
	if err != nil {
		log.Error().Str("Patch manifest URL", patchURL).Err(err).Msg("Failed to download patch manifest")
		return -1
	}

	log.Info().Str("Patch Manifest", manifestContent).Msg("Successfully downloaded patch manifest")
	log.Info().Str("cookie", resp.Cookie).Msg(resp.Cookie)
	log.Info().Str("server", resp.Gameserver).Msg(resp.Gameserver)

	// statusLabel.SetText("Downloading and Verifying files...")

	// Download and install ttr in a seperate goroutine
	done := make(chan error, 1)
	pidChan := make(chan int)
	errChan := make(chan error)

	go func() {
		err := patcher.DownloadAndInstallManifestFiles(mirror, []byte(manifestContent))
		done <- err
	}()

	if err := <-done; err != nil {
		log.Error().Err(err).Msg("Patching failed, aborting launch")
		return -1
	}

	// Now we're ready to try and play
	go func() {
		binary := getBinaryName()
		installDir, err := patcher.GetInstallDirByOS()
		if err != nil {
			log.Error().Err(err).Msg("Failed to get install directory when launching game")
			errChan <- fmt.Errorf("Failed to launch TTR")
			return
		}

		binaryPath := filepath.Join(installDir, binary)

		// Setup command
		gameServerEnv := "TTR_GAMESERVER=" + resp.Gameserver
		playerCookie := "TTR_PLAYCOOKIE=" + resp.Cookie

		ttr := exec.Command(binaryPath)
		ttr.Dir = installDir
		ttr.Env = append(os.Environ(), gameServerEnv, playerCookie)
		ttr.Stdout = os.Stdout
		ttr.Stderr = os.Stderr

		log.Info().Msg("Launching TTR instance...")
		if err := ttr.Start(); err != nil {
			log.Error().Err(err).Msg("Failed to launch TTR")
			errChan <- fmt.Errorf("Failed to launch TTR")
			return
		}

		// Send PID immediately
		pid := ttr.Process.Pid
		pidChan <- ttr.Process.Pid

		// Reap process asynchronously to avoid zombies
		go func(cmd *exec.Cmd, pid int) {
			err := cmd.Wait()
			if err != nil {
				log.Warn().Err(err).Msg("TTR process exited with error")
			} else {
				log.Info().Msg("TTR process exited cleanly")
			}
			// notify frontend to remove PID from state
			app := application.Get()
			app.Event.Emit("common:PID-killed", map[string]int{"pid": pid})
			log.Info().Msg(fmt.Sprintf("PID KILLED: %d", pid))
		}(ttr, pid)
	}()

	// Wait for either PID or error
	select {
	case pid := <-pidChan:
		return pid
	case err := <-errChan:
		log.Error().Err(err).Msg("Failed to launch TTR (at select)")
		return -1
	}
}

// Download manifest. Return error or manifest in string
func downloadPatchManifest(manifestURL string) (string, error) {
	resp, err := http.Get(manifestURL)
	if err != nil {
		return "", fmt.Errorf("Failed to download manifest: %w", err)

	}

	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("unexpected status code: %d", resp.StatusCode)
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", fmt.Errorf("failed to read manifest content: %w", err)
	}

	return string(body), nil
}

// Selects the right binary based on OS and arch
func getBinaryName() string {
	switch runtime.GOOS {
	case "windows":
		if strings.Contains(runtime.GOARCH, "64") {
			return "TTREngine64.exe"
		}
		return "TTREngine.exe"
	case "darwin":
		return "Toontown Rewritten"
	case "linux":
		return "TTREngine"
	default:
		return ""
	}
}
