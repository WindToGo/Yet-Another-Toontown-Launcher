package login

import (
	"YATL/src/patcher"
	"path/filepath"
	"slices"

	"github.com/rs/zerolog/log"
	"github.com/spf13/viper"
	"github.com/zalando/go-keyring"
)

const service = "YATL"
const plaintextUsernameFile = "names.toml"

func SaveAccount(username string, password string) error {
	err := keyring.Set(service, username, password)
	if err != nil {
		log.Error().Err(err).Msg("Failed to add user to keyring")
		return err
	}

	accounts := GetAllAccounts()
	if !slices.Contains(accounts, username) {
		accounts = append(accounts, username)
	}

	viper.Set("accounts", accounts)
	err = viper.WriteConfig()
	if err != nil {
		log.Error().Err(err).Msg("Viper failed to write to config file")
		return err
	}
	return nil
}

func GetPasswordFromUsername(username string) (string, error) {
	pass, err := keyring.Get(service, username)
	if err != nil {
		log.Error().Err(err).Msg("Failed to get password from keyring")
		return "", err
	}
	return pass, nil
}

func RemoveAccount(username string) error {
	err := keyring.Delete(service, username)
	if err != nil {
		log.Error().Err(err).Msg("Failed to delete user from keyring")
		return err
	}

	accounts := GetAllAccounts()
	accounts = slices.DeleteFunc(accounts, func(a string) bool { return a == username })

	viper.Set("accounts", accounts)
	err = viper.WriteConfig()
	if err != nil {
		log.Error().Err(err).Msg("Viper failed to write to config file")
		return err
	}
	return nil
}

func GetAllAccounts() []string {
	return viper.GetStringSlice("accounts")
}


func getPlaintextUsernameFile() string {
	dir, err := patcher.GetInstallDirByOS()
	if err != nil {
		return ""
	}
	return filepath.Join(dir, plaintextUsernameFile)
}
