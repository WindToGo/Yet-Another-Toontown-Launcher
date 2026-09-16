package patcher

import (
	"archive/zip"
	"compress/bzip2"
	"crypto/sha1"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"sync"
	"time"

	"slices"

	"github.com/rs/zerolog/log"
)

type PatchInfo struct {
	DL       string            `json:"dl"`
	Hash     string            `json:"hash"`
	CompHash string            `json:"compHash"`
	Patches  map[string]string `json:"patches"`
	Only     []string          `json:"only"`
}

type PatchManifest map[string]PatchInfo

// PatchEventType identifies what a PatchEvent is reporting.
type PatchEventType string

const (
	// PatchEventStarted fires once, after we know how many files need
	// downloading (files already up to date are never included).
	PatchEventStarted PatchEventType = "started"
	// PatchEventFileProgress fires repeatedly per file as bytes come in.
	PatchEventFileProgress PatchEventType = "file-progress"
	// PatchEventFileComplete fires once a file has downloaded successfully.
	PatchEventFileComplete PatchEventType = "file-complete"
	// PatchEventFileError fires if a single file fails to download.
	PatchEventFileError PatchEventType = "file-error"
	// PatchEventComplete fires once the whole update finished successfully
	// (including when there was nothing to download).
	PatchEventComplete PatchEventType = "complete"
	// PatchEventError fires if the update fails as a whole (a download,
	// decompression, or install step failed).
	PatchEventError PatchEventType = "error"
)

// PatchEvent reports the progress of DownloadAndInstallManifestFiles so a
// caller can surface live status to the user.
type PatchEvent struct {
	Type            PatchEventType `json:"type"`
	File            string         `json:"file,omitempty"`
	BytesDownloaded int64          `json:"bytesDownloaded,omitempty"`
	TotalBytes      int64          `json:"totalBytes,omitempty"`
	TotalFiles      int            `json:"totalFiles,omitempty"`
	Message         string         `json:"message,omitempty"`
}

// ProgressFunc receives patch progress events. Implementations must be safe
// to call from multiple goroutines concurrently.
type ProgressFunc func(PatchEvent)

// progressWriter is an io.Writer that reports bytes written to onProgress,
// throttled so a fast local connection doesn't flood the event channel.
type progressWriter struct {
	file       string
	total      int64
	downloaded int64
	onProgress ProgressFunc
	lastReport time.Time
}

const progressReportInterval = 150 * time.Millisecond

func (pw *progressWriter) Write(p []byte) (int, error) {
	n := len(p)
	pw.downloaded += int64(n)

	now := time.Now()
	if now.Sub(pw.lastReport) >= progressReportInterval {
		pw.lastReport = now
		pw.onProgress(PatchEvent{
			Type:            PatchEventFileProgress,
			File:            pw.file,
			BytesDownloaded: pw.downloaded,
			TotalBytes:      pw.total,
		})
	}

	return n, nil
}

// Manifest Query

// Returns map of Files to be downloaded
func parseManifest(rawManifest []byte) PatchManifest {
	var patchManifest PatchManifest
	err := json.Unmarshal(rawManifest, &patchManifest)
	if err != nil {
		log.Error().
			Str("Manifest", string(rawManifest)).
			Err(err).Msg("Failed to parse manifest")
	}

	return patchManifest
}

func isPatchForOS(operatingSystems []string, platform string) bool {
	return slices.Contains(operatingSystems, platform)
}

// Why is win32 even supported in the year of our lord 2025
func getPlatformString() string {
	goos := runtime.GOOS
	goarch := runtime.GOARCH

	if goos == "windows" {
		switch goarch {
		case "386":
			return "win32"
		case "amd64":
			return "win64"
		}
	}

	return goos
}

// Downloads & Decompression

func downloadFile(baseURL string, filename string, info PatchInfo, tempPath string, onProgress ProgressFunc) error {
	url := fmt.Sprintf("%s/%s", baseURL, info.DL)
	fmt.Println("Downloading ", filename, " from ", url)

	// Get data
	resp, err := http.Get(url)
	if err != nil {
		return fmt.Errorf("error GETing file: %w", err)
	}
	defer resp.Body.Close()

	// Create blank file
	out, err := os.Create(tempPath)
	if err != nil {
		return fmt.Errorf("error creating blank file: %w", err)
	}
	defer out.Close()

	// resp.ContentLength is -1 when the server didn't send one (e.g.
	// chunked encoding); the frontend treats that as "unknown total".
	pw := &progressWriter{file: filename, total: resp.ContentLength, onProgress: onProgress}
	onProgress(PatchEvent{Type: PatchEventFileProgress, File: filename, TotalBytes: resp.ContentLength})

	// Copy data to blank file, reporting progress as it streams in
	_, err = io.Copy(out, io.TeeReader(resp.Body, pw))
	if err != nil {
		return fmt.Errorf("error copying data to file: %w", err)
	}

	// Close before checksum read so all bytes are flushed
	out.Close()

	match, err := compareCheckSum(tempPath, info.CompHash)
	if err != nil {
		return err
	}

	if match {
		return nil
	}

	return fmt.Errorf("checksums do not match for %s", filename)
}

func getSha1sum(filepath string) (string, error) {
	file, err := os.Open(filepath)
	if err != nil {
		return "", fmt.Errorf("file is not installed for sha1 check: %w", err)
	}
	defer file.Close()

	hasher := sha1.New()
	_, err = io.Copy(hasher, file)
	if err != nil {
		return "", err
	}

	return fmt.Sprintf("%x", hasher.Sum(nil)), nil
}

func compareCheckSum(filename string, checkSum string) (bool, error) {
	if _, err := os.Stat(filename); err != nil {
		return false, fmt.Errorf("file %s does not exist: %w", filename, err)
	}

	sha1Sum, err := getSha1sum(filename)
	if err != nil {
		return false, fmt.Errorf("failed to get Sha1Sum of %s: %s", filename, err)
	}

	return sha1Sum == checkSum, nil
}

func isFileInstalled(filename string, checkSum string) (bool, error) {
	installDir, err := GetInstallDirByOS()
	if err != nil {
		return false, fmt.Errorf("could not get install directory: %w", err)
	}

	if _, err = os.Stat(filepath.Join(installDir, filename)); err != nil {
		return false, fmt.Errorf("file does not exist: %w", err)
	}

	match, err := compareCheckSum(filepath.Join(installDir, filename), checkSum)
	if err != nil {
		return false, fmt.Errorf("could not compare checksum: %w", err)
	}

	return match, nil
}

// pendingPatch is a manifest entry that has been confirmed to need
// downloading (wrong OS and already-installed entries are filtered out
// before this point).
type pendingPatch struct {
	name string
	info PatchInfo
}

func DownloadAndInstallManifestFiles(baseURL string, rawManifest []byte, onProgress ProgressFunc) error {
	if onProgress == nil {
		onProgress = func(PatchEvent) {}
	}

	// Create tempFS for work
	tempDir := generateTempDir()
	if tempDir == nil {
		log.Warn().Msg("Failed to access OS tempDir")
		return fmt.Errorf("failed to access OS tempDir")
	}

	// Parse manifest
	patchManifest := parseManifest(rawManifest)
	platform := getPlatformString()

	// Determine which files actually need downloading before reporting
	// anything, so the caller knows the real total up front.
	var pending []pendingPatch
	for patch, info := range patchManifest {
		if !isPatchForOS(info.Only, platform) {
			log.Info().Str("File", patch).Msg("Skipping file")
			continue
		}

		checkSumMatch, err := isFileInstalled(patch, info.Hash)
		if err != nil {
			// Expected on first install or when the file is genuinely absent.
			log.Debug().
				Str("File", patch).
				Err(err).
				Msg("File not installed or checksum mismatch (expected on first install)")
		}

		if checkSumMatch {
			log.Info().Str("File", patch).Msg("File up to date, skipping")
			continue
		}

		pending = append(pending, pendingPatch{name: patch, info: info})
	}

	if len(pending) == 0 {
		onProgress(PatchEvent{Type: PatchEventComplete})
		return nil
	}

	onProgress(PatchEvent{Type: PatchEventStarted, TotalFiles: len(pending)})

	// Download up to maxConcurrentDownloads files at once. wg.Wait() below
	// still blocks until every dispatched download has finished before we
	// touch the results.
	const maxConcurrentDownloads = 6

	filesToInstall := map[string]string{}
	var downloadErrs []string
	var mu sync.Mutex
	var wg sync.WaitGroup
	sem := make(chan struct{}, maxConcurrentDownloads)

	for _, p := range pending {
		wg.Add(1)
		go func() {
			defer wg.Done()

			sem <- struct{}{}
			defer func() { <-sem }()

			err := downloadFile(baseURL, p.name, p.info, filepath.Join(*tempDir, p.name), onProgress)

			mu.Lock()
			defer mu.Unlock()

			if err != nil {
				log.Error().Str("BaseURL", baseURL).
					Str("File", p.name).
					Str("Patch URL", p.info.DL).
					Err(err).
					Msg("Failed to download file")
				// TODO: Retry download
				downloadErrs = append(downloadErrs, p.name)
				onProgress(PatchEvent{Type: PatchEventFileError, File: p.name, Message: err.Error()})
				return
			}

			filesToInstall[p.name] = p.name
			onProgress(PatchEvent{Type: PatchEventFileComplete, File: p.name})
		}()
	}

	// Every download must finish — success or failure — before we decide
	// whether it's safe to install and launch.
	wg.Wait()

	// Block launch if any download failed — don't install a partial update.
	if len(downloadErrs) > 0 {
		message := fmt.Sprintf("failed to download %d file(s): %s", len(downloadErrs), strings.Join(downloadErrs, ", "))
		onProgress(PatchEvent{Type: PatchEventError, Message: message})
		return fmt.Errorf("%s", message)
	}

	log.Info().Msg("Downloads complete")

	// Handle decompression
	var decompErrs []string
	for dest, source := range filesToInstall {
		sourcePath := filepath.Join(*tempDir, source)

		err := decompressFile(sourcePath)
		if err != nil {
			log.Error().
				Str("source", sourcePath).
				Err(err).
				Msg("Failed to decompress file")
			decompErrs = append(decompErrs, source)
			continue
		}

		// Extra zip layer on macOS
		if strings.HasSuffix(dest, ".zip") {
			destDir := strings.TrimSuffix(filepath.Join(*tempDir, dest), ".zip")
			if err := unzipFile(sourcePath, destDir); err != nil {
				log.Error().
					Str("source", sourcePath).
					Str("dest", destDir).
					Err(err).
					Msg("Failed to unzip file")
				decompErrs = append(decompErrs, source)
				continue
			}
		}
	}

	// Block launch if decompression failed for any file.
	if len(decompErrs) > 0 {
		message := fmt.Sprintf("failed to decompress %d file(s): %s", len(decompErrs), strings.Join(decompErrs, ", "))
		onProgress(PatchEvent{Type: PatchEventError, Message: message})
		return fmt.Errorf("%s", message)
	}

	err := installTTR(*tempDir, filesToInstall)
	if err != nil {
		onProgress(PatchEvent{Type: PatchEventError, Message: err.Error()})
		return fmt.Errorf("failed to install TTR: %w", err)
	}

	onProgress(PatchEvent{Type: PatchEventComplete})
	return nil
}

func generateTempDir() *string {
	tempDir := filepath.Join(os.TempDir(), "YATL")

	err := os.MkdirAll(tempDir, os.ModePerm)
	if err != nil {
		log.Warn().
			Str("tempDir", tempDir).
			Err(err).
			Msg("Error creating temporary directory")
		return nil
	}

	return &tempDir
}

// decompressFile decompresses a bzip2 file in-place: it reads sourceFile,
// writes to sourceFile+".tmp", then replaces sourceFile with the result.
func decompressFile(sourceFile string) error {
	src, err := os.Open(sourceFile)
	if err != nil {
		return fmt.Errorf("failed to open bz2 file %s: %w", sourceFile, err)
	}

	tempFile := sourceFile + ".tmp"
	dst, err := os.Create(tempFile)
	if err != nil {
		src.Close()
		return fmt.Errorf("failed to create temp file %s: %w", tempFile, err)
	}

	bz2Reader := bzip2.NewReader(src)
	_, err = io.Copy(dst, bz2Reader)

	// Close before rename — required on Windows to release file handles
	src.Close()
	dst.Close()

	if err != nil {
		os.Remove(tempFile)
		return fmt.Errorf("failed to decompress %s: %w", sourceFile, err)
	}

	os.Remove(sourceFile)
	if err = os.Rename(tempFile, sourceFile); err != nil {
		return fmt.Errorf("failed to rename temp file: %w", err)
	}

	return nil
}

func unzipFile(sourceFile string, destDir string) error {
	zipReader, err := zip.OpenReader(sourceFile)
	if err != nil {
		return fmt.Errorf("unable to open zip reader for file %s: %w", sourceFile, err)
	}
	defer zipReader.Close()

	if err := os.MkdirAll(destDir, 0755); err != nil {
		return fmt.Errorf("failed to create dest dir %s: %w", destDir, err)
	}

	for _, f := range zipReader.File {
		destPath := filepath.Join(destDir, f.Name)

		// Guard against zip slip
		if !strings.HasPrefix(filepath.Clean(destPath), filepath.Clean(destDir)+string(os.PathSeparator)) {
			return fmt.Errorf("illegal zip path: %s", f.Name)
		}

		if f.FileInfo().IsDir() {
			os.MkdirAll(destPath, f.Mode())
			continue
		}

		if err := os.MkdirAll(filepath.Dir(destPath), 0755); err != nil {
			return fmt.Errorf("failed to create parent dir for %s: %w", destPath, err)
		}

		rc, err := f.Open()
		if err != nil {
			return fmt.Errorf("failed to open zip entry %s: %w", f.Name, err)
		}

		out, err := os.OpenFile(destPath, os.O_WRONLY|os.O_CREATE|os.O_TRUNC, f.Mode())
		if err != nil {
			rc.Close()
			return fmt.Errorf("failed to create file %s: %w", destPath, err)
		}

		_, err = io.Copy(out, rc)
		rc.Close()
		out.Close()

		if err != nil {
			return fmt.Errorf("failed to extract %s: %w", f.Name, err)
		}
	}

	return nil
}

// Installation
func installTTR(tempDir string, filesToInstall map[string]string) error {
	// Make dir for install
	installDir, err := GetInstallDirByOS()
	if err != nil {
		return fmt.Errorf("couldn't find install dir: %w", err)
	}

	err = os.MkdirAll(installDir, os.ModePerm)
	if err != nil {
		return fmt.Errorf("couldn't make install dir: %w", err)
	}

	for file := range filesToInstall {
		err := os.Rename(filepath.Join(tempDir, file), filepath.Join(installDir, file))
		if err != nil {
			return fmt.Errorf("failed to rename file %s: %w", file, err)
		}
		// Set TTREngine to executable on mac and linux
		if (file == "TTREngine" || file == "Toontown Rewritten") && (runtime.GOOS == "linux" || runtime.GOOS == "darwin") {
			err := os.Chmod(filepath.Join(installDir, file), 0755)
			if err != nil {
				log.Error().
					Str("file", file).
					Err(err).
					Msg("Error setting file to be executable")
			}
		}
	}

	return nil
}

func GetInstallDirByOS() (string, error) {
	switch runtime.GOOS {
	case "windows":
		appData := os.Getenv("LOCALAPPDATA")
		if appData == "" {
			return "", fmt.Errorf("LOCALAPPDATA not set")
		}
		return filepath.Join(appData, "Toontown Rewritten"), nil
	case "darwin":
		homeDir, err := GetHomeDir()
		if err != nil {
			return "", err
		}
		return filepath.Join(homeDir, "Library", "Application Support", "Toontown Rewritten"), nil
	case "linux":
		homeDir, err := GetHomeDir()
		if err != nil {
			return "", err
		}
		return filepath.Join(homeDir, ".local", "share", "Toontown Rewritten"), nil
	}

	return "", fmt.Errorf("could not find install dir for runtime: %s", runtime.GOOS)
}

func GetHomeDir() (string, error) {
	homeDir, err := os.UserHomeDir()
	if err != nil {
		return "", err
	}
	return homeDir, nil
}
