package services

import (
	"YATL/src/login"
)

type LoginService struct{}

// Returns PID
func (g *LoginService) Login(username string) int {
	return login.HandleLogin(username)
}

// Returns 0 on success
func (g *LoginService) SaveAccount(username string, password string) int {
	err := login.SaveAccount(username, password)
	if err != nil {
		return 1
	}
	return 0
}

func (g *LoginService) TestLoginAccount(username string, password string) bool {
	resp, err := login.TestLoginTTRSuccess(username, password);

	if err != nil {
		return false
	}

	return resp
}

func (g *LoginService) GetAllAccounts() []string {
	return login.GetAllAccounts()
}
