package multi

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"

	"YATL/src/patcher"

	"github.com/rs/zerolog/log"
	"github.com/spf13/viper"
)

type KV struct {
	Key   string `mapstructure:"key" json:"key"`
	Value string `mapstructure:"value" json:"value"`
}

type MTProfileStored struct {
	Name                string        `mapstructure:"Name"`
	KeyMap              map[string]KV `mapstructure:"KeyMap"`
	AutoAttatchAccounts []string      `mapstructure:"AutoAttatchAccounts"`
}

type MTProfile struct {
	Name                string            `mapstructure:"name"`
	KeyMap              map[string]string `mapstructure:"keyMap"`
	AutoAttatchAccounts []string          `mapstructure:"autoAttatchAccounts"`
}

func SaveMTProfile(profileName string, profile MTProfile) error {
	profiles := viper.GetStringMap("mtProfiles")
	if profiles == nil {
		profiles = map[string]any{}
	}

	stored := MTProfileStored{
		Name:                profile.Name,
		KeyMap:              make(map[string]KV),
		AutoAttatchAccounts: profile.AutoAttatchAccounts,
	}

	for k, v := range profile.KeyMap {
		stored.KeyMap[k] = KV{
			Key:   k,
			Value: v,
		}
	}

	profiles[profileName] = stored
	viper.Set("mtProfiles", profiles)

	return viper.WriteConfig()
}

func RemoveMTProfile(profileName string) error {
	profiles := viper.GetStringMap("mtProfiles")
	delete(profiles, profileName)
	viper.Set("mtProfiles", profiles)

	return viper.WriteConfig()
}

func LoadMTProfile(profileName string) MTProfile {
	raw := viper.Get("mtProfiles." + profileName)
	if raw == nil {
		return MTProfile{
			Name:                profileName,
			KeyMap:              make(map[string]string),
			AutoAttatchAccounts: []string{},
		}
	}

	var stored MTProfileStored
	bytes, _ := json.Marshal(raw)
	if err := json.Unmarshal(bytes, &stored); err != nil {
		return MTProfile{
			Name:                profileName,
			KeyMap:              make(map[string]string),
			AutoAttatchAccounts: []string{},
		}
	}

	out := MTProfile{
		Name:                stored.Name,
		KeyMap:              make(map[string]string),
		AutoAttatchAccounts: stored.AutoAttatchAccounts,
	}

	for _, kv := range stored.KeyMap {
		out.KeyMap[kv.Key] = kv.Value
	}

	return out
}

func LoadAllMTProfiles() map[string]MTProfile {
	result := make(map[string]MTProfile)
	profiles := viper.GetStringMap("mtProfiles")

	for name := range profiles {
		result[name] = LoadMTProfile(name)
	}

	return result
}

func LoadTTRControls() (map[string]string, error) {
	var ttrDir, err = patcher.GetInstallDirByOS()

	if err != nil {
		log.Error().Err(err).Msg("Err getting install dir to load controls")
	}

	file, err := os.Open(filepath.Join(ttrDir, "settings.json"))
	if err != nil {
		log.Error().Err(err).Msg("Failed to open settings.json")
	}

	var data map[string]any
	if err := json.NewDecoder(file).Decode(&data); err != nil {
		return nil, err
	}

	controlsField, ok := data["controls"].(map[string]any)
	if !ok {
		return nil, fmt.Errorf("controls field not found or invalid")
	}

	controls := make(map[string]string)
	for k, v := range controlsField {
		if str, ok := v.(string); ok {
			controls[k] = str
		}
	}

	return controls, nil
}
