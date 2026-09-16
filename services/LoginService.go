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

// AttemptLogin checks a username/password against TTR and reports whether a
// Toonguard code is required before the account can be saved.
func (g *LoginService) AttemptLogin(username string, password string) *login.LoginAttempt {
	attempt, err := login.AttemptLogin(username, password)
	if err != nil {
		return &login.LoginAttempt{Message: "Failed to reach Toontown Rewritten."}
	}
	return attempt
}

// SubmitToonguard completes a login started by AttemptLogin using the code
// emailed to the player.
func (g *LoginService) SubmitToonguard(username string, responseToken string, code string) *login.LoginAttempt {
	attempt, err := login.SubmitToonguard(username, responseToken, code)
	if err != nil {
		return &login.LoginAttempt{Message: "Failed to reach Toontown Rewritten."}
	}
	return attempt
}

func (g *LoginService) GetAllAccounts() []string {
	return login.GetAllAccounts()
}

// Returns 0 on success
func (g *LoginService) RemoveAccount(username string) int {
	err := login.RemoveAccount(username)
	if err != nil {
		return 1
	}
	return 0
}
