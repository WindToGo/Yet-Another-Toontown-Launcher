package services

import (
	"YATL/src/calculator"
)

type CalculatorService struct{}

func (g *CalculatorService) CalculateAttacks(gags[] calculator.GagAttack, isLured bool, cog calculator.Cog) []calculator.AttackAnalysis {
	attacks := make([]calculator.AttackAnalysis, len(gags))

	for i, gag := range gags {
		attacks[i] = calculator.AttackAnalysis{Gag: gag.Gag, IsOrg: gag.IsOrg, IsSOS: gag.IsSOS}
	}

	return calculator.IntoCalculateDamage(isLured, 7, attacks, cog)
}
