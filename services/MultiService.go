package services

import (
	"YATL/src/multi"

	"github.com/rs/zerolog/log"
)

type MultiService struct{}

func (g *MultiService) Mt_init() uint8 {
	id, err := NewSession()

	if err != nil {
		log.Error().Err(err).Msg("Failed to init mt_session")
		return 0
	}

	return id
}

func (g *MultiService) Mt_select_window(id uint8) uint64 {
	window := GetSession(id).SelectWindow()

	return uint64(window)
}

func (g *MultiService) Mt_send_key(id uint8, window uint64, key string) {
	GetSession(id).SendKey(window, key)
}

func (g *MultiService) Mt_set_key_up(id uint8, window uint64, key string) {
	GetSession(id).SetKeyUp(window, key)
}

func (g *MultiService) Mt_set_key_down(id uint8, window uint64, key string) {
	GetSession(id).SetKeyDown(window, key)
}

func (g *MultiService) Mt_get_window_from_pid(id uint8, pid int) uint64 {
	window := GetSession(id).GetWindowFromPID(pid)

	if window == 0 {
		log.Error().Msg("Failed to get window from PID")
	}

	return uint64(window)
}

func (g *MultiService) Mt_shutdown(id uint8) {
	RemoveSession(id)
}

func (g *MultiService) SaveMTProfile(name string, profile multi.MTProfile) {
	multi.SaveMTProfile(name, profile)
}

// Returns 0 on success
func (g *MultiService) RemoveMTProfile(name string) int {
	err := multi.RemoveMTProfile(name)
	if err != nil {
		log.Error().Err(err).Msg("Failed to remove MultiToon profile")
		return 1
	}
	return 0
}

func (g *MultiService) LoadTTRControls() map[string]string {
	controls, err := multi.LoadTTRControls()
	if err != nil {
		log.Error().Err(err).Msg("Failed to load ttr controls")
	}
	return controls
}

func (g *MultiService) LoadMTProfile(name string) multi.MTProfile {
	return multi.LoadMTProfile(name)
}

func (g *MultiService) LoadAllMTProfiles() map[string]multi.MTProfile {
	return multi.LoadAllMTProfiles()
}
