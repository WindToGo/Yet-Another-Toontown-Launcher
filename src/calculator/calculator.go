package calculator

import (
	"math"
	"sort"
	"strings"
)

// Special Cases:
// Since lure has org change it's accuracy, the damage is accuracy for lure
//
//	so treat lure DAMAGE as lure ACCURACY
type Gag struct {
	GagType   string `json:"GagType"`
	GagName   string `json:"GagName"`
	Damage    int    `json:"Damage"`
	OrgDamage int    `json:"OrgDamage"`
	Accuracy  int    `json:"Accuracy"`
	Stun      int    `json:"Stun"`
	Shorthand string `json:"Shorthand"`
	Resource  string `json:"Resource"`
}

type GagAttack struct {
	Gag   Gag
	IsOrg bool
	// IsSOS marks a gag as coming from an SOS card. SOS gags always hit —
	// see IntoCalculateDamage's sosTracks handling.
	IsSOS bool
}

type Cog struct {
	Level       int      `json:"level"`
	Tier        int      `json:"tier"`
	BoilerLevel int      `json:"boilerLevel"`
	Cheats      []string `json:"cheats"`
}

type AttackAnalysis struct {
	Gag         Gag
	IsOrg       bool
	IsSOS       bool
	BaseDamage  float64
	LureDamage  float64
	ComboDamage float64
	FinalAcc    float64
}

// tgtDEF integers for acc calcs
// Tiny dictates defence for tier 1 cogs (flunkies)
const (
	DefLevel1     int = -2
	DefLevel2     int = -5
	DefLevel3     int = -10
	DefLevel4     int = -15
	DefLevel4Tiny int = -12
	DefLevel5     int = -20
	DefLevel5Tiny int = -15
	DefLevel6     int = -25
	DefLevel7     int = -30
	DefLevel8     int = -35
	DefLevel9     int = -40
	DefLevel10    int = -45
	DefLevel11    int = -50
	DefLevel12    int = -55
	DefLevel13    int = -60
	DefLevel14    int = -65
)

const (
	AccuracyUp      string = "AccuracyUp"
	FiredUp         string = "FiredUp"
	PayRaise        string = "PayRaise"
	MarketResearch  string = "MarketResearch"
	ForemanDefence  string = "ForemanDefence"
	ForemanFiredUp  string = "ForemanFiredUp"
	OverPaidBullion string = "OverPaidBullion"
	OverPaidCoin    string = "OverPaidCoin"
	BearMarket      string = "BearMarket"
	BullMarket      string = "BullMarket"
	GolfDefenseDown string = "GolfDefenceDown"
)

const TRAPSTUN int = 50

// Above 95 raw accuracy, additional accuracy has diminishing returns rather
// than being hard-capped at 95: Accuracy = (RawAcc - 95) * 0.04 + 95
const AccuracyDiminishingReturnsThreshold int = 95
const AccuracyDiminishingReturnsFactor float64 = 0.04

var gagOrder = map[string]int{
	"Toon-Up": 0,
	"Trap":    1,
	"Lure":    2,
	"Sound":   3,
	"Throw":   4,
	"Squirt":  5,
	"Drop":    6,
}

var lureGagTiers = map[string]int{
	"$1 Dollar Bill":  1,
	"$5 Dollar Bill":  2,
	"$10 Dollar Bill": 3,

	"Small Magnet":  1,
	"Big Magnet":    2,
	"Hypno-goggles": 3,
	"Presentation":  3,
}

// Helpers
func filter[T any](ss []T, test func(T) bool) (ret []T) {
	for _, s := range ss {
		if test(s) {
			ret = append(ret, s)
		}
	}
	return
}

func applyAccuracyDiminishingReturns(rawAcc int) float64 {
	if rawAcc <= AccuracyDiminishingReturnsThreshold {
		return float64(rawAcc)
	}
	scaled := float64(rawAcc-AccuracyDiminishingReturnsThreshold)*AccuracyDiminishingReturnsFactor + float64(AccuracyDiminishingReturnsThreshold)
	return math.Round(scaled*10) / 10
}

func applyStatusAffects(atk *AttackAnalysis, cog Cog) {
	for _, cheat := range cog.Cheats {
		switch cheat {
		// General
		case AccuracyUp:
			atk.FinalAcc = applyAccuracyDiminishingReturns(int(atk.FinalAcc) + 75)
		// Field Office
		case FiredUp:
			multiplyAllDamages(atk, 1.5)
		case MarketResearch:
			multiplyAllDamages(atk, (0.95 - 0.05*float64(cog.BoilerLevel)))
		// Factory
		case ForemanDefence:
			multiplyAllDamages(atk, 0.75)
		case ForemanFiredUp:
			multiplyAllDamages(atk, 1.5)
		// Mint
		case BearMarket:
			multiplyAllDamages(atk, 0.5)
		case BullMarket:
			multiplyAllDamages(atk, 1.5)
		// Golf Course
		case GolfDefenseDown:
			multiplyAllDamages(atk, 1.6)
		}
	}
}

func multiplyAllDamages(atk *AttackAnalysis, def float64) {
	atk.BaseDamage = math.Floor(atk.BaseDamage * def)
	atk.LureDamage = atk.LureDamage * def
	atk.ComboDamage = atk.ComboDamage * def
}

func IntoCalculateDamage(isLured bool, trackEXP int, attacks []AttackAnalysis, cog Cog) []AttackAnalysis {
	// A gag track becomes guaranteed-hit for this whole attack if any
	// selected gag in it came from an SOS card.
	sosTracks := map[string]bool{}
	for _, a := range attacks {
		if a.IsSOS {
			sosTracks[a.Gag.GagType] = true
		}
	}

	sort.Slice(attacks, func(i, j int) bool {
		return gagOrder[attacks[i].Gag.GagType] < gagOrder[attacks[j].Gag.GagType]
	})

	trackEXP = (trackEXP - 1) * 10

	tgtDEF := getTgtDEF(cog.Level, cog.Tier)

	soloLure, groupLure := groupLure(attacks)

	lureGagTest := func(a AttackAnalysis) bool { return a.Gag.GagType != "Lure" }
	attacks = filter(attacks, lureGagTest)

	if soloLure != nil {
		attacks = append(attacks, *soloLure)
	}

	if groupLure != nil {
		attacks = append(attacks, *groupLure)
	}

	sort.Slice(attacks, func(i, j int) bool {
		return gagOrder[attacks[i].Gag.GagType] < gagOrder[attacks[j].Gag.GagType]
	})

	CalculateDamageRec(&attacks, 0, 0, isLured, trackEXP, tgtDEF, cog, make(map[string]bool), sosTracks)

	return attacks
}

func CalculateDamageRec(
	attacks *[]AttackAnalysis,
	i int,
	stun int,
	isLured bool,
	trackEXP int,
	tgtDEF int,
	cog Cog,
	seenTracks map[string]bool,
	sosTracks map[string]bool,
) {
	// Base case
	if i >= len(*attacks) {
		return
	}

	// Get surrounding gags unless nil
	var prevGag, nextGag *Gag
	if i < len(*attacks)-1 {
		nextGag = &(*attacks)[i+1].Gag
	}
	if i > 0 {
		prevGag = &(*attacks)[i-1].Gag
	}

	a := &(*attacks)[i]

	stun = 0
	trapLureComboIndex := -1
	for k := 0; k < len(*attacks)-1; k++ {
		if (*attacks)[k].Gag.GagType == "Trap" && (*attacks)[k+1].Gag.GagType == "Lure" {
			trapLureComboIndex = k + 1
			break
		}
	}

	// Calc accuracy
	var gagAcc float64
	switch {
	case sosTracks[a.Gag.GagType]:
		gagAcc = 100
	case isLured && a.Gag.GagType == "Drop":
		gagAcc = 0
	case isLured || a.Gag.GagType == "Trap":
		gagAcc = 100
	default:
		stun := 0
		for j := range i {
			prev := (*attacks)[j].Gag
			if prev.GagType != "Trap" && prev.GagType != "Lure" && prev.GagType != a.Gag.GagType {
				stun += prev.Stun
			}
		}

		if trapLureComboIndex != -1 && i > trapLureComboIndex {
			stun += TRAPSTUN
		}

		gagAcc = applyAccuracyDiminishingReturns(getGagAccuracy(*a, (prevGag != nil && prevGag.GagType == "Trap")) + trackEXP + tgtDEF + stun)
	}

	// Calc damage
	base, lure, combo := getGagDamage(*a, isLured, nextGag, prevGag)

	// Add info to list
	a.BaseDamage = base
	a.LureDamage = lure
	a.ComboDamage = combo
	a.FinalAcc = gagAcc

	applyStatusAffects(a, cog)

	// Apply Affects to Damage Numbers

	// Change lure state
	isLured = (a.Gag.GagType == "Lure" && (prevGag == nil || prevGag.GagType != "Trap")) ||
		(isLured && nextGag != nil && nextGag.GagType == a.Gag.GagType)

	CalculateDamageRec(attacks, i+1, stun, isLured, trackEXP, tgtDEF, cog, seenTracks, sosTracks)
}

func groupLure(attacks []AttackAnalysis) (*AttackAnalysis, *AttackAnalysis) {
	var lureAttacks, groupLures, soloLures []AttackAnalysis

	for _, attack := range attacks {
		if attack.Gag.GagType == "Lure" {
			lureAttacks = append(lureAttacks, attack)
		}
	}

	if len(lureAttacks) == 0 {
		return nil, nil
	}

	sort.Slice(lureAttacks, func(i, j int) bool {
		return lureAttacks[i].Gag.Damage > lureAttacks[j].Gag.Damage
	})

	for _, a := range lureAttacks {
		if strings.HasPrefix(a.Gag.GagName, "$") {
			soloLures = append(soloLures, a)
		} else {
			groupLures = append(groupLures, a)
		}
	}

	var mainSoloLure *AttackAnalysis
	var mainGroupLure *AttackAnalysis

	if len(soloLures) >= 1 {
		mainSoloLure = &soloLures[0]
	}

	if len(groupLures) >= 1 {
		mainGroupLure = &groupLures[0]
	}

	if len(soloLures) >= 2 {
		for _, a := range soloLures[1:] {
			if !mainSoloLure.IsOrg {
				mainSoloLure.Gag.Damage += 20 - 5*(lureGagTiers[mainSoloLure.Gag.GagName]-lureGagTiers[a.Gag.GagName])
			} else {
				mainSoloLure.Gag.OrgDamage += 20 - 5*(lureGagTiers[mainSoloLure.Gag.GagName]-lureGagTiers[a.Gag.GagName])
			}
		}
	}

	if len(groupLures) >= 2 {
		for _, a := range groupLures[1:] {
			if !mainGroupLure.IsOrg {
				mainGroupLure.Gag.Damage += 20 - 5*(lureGagTiers[mainGroupLure.Gag.GagName]-lureGagTiers[a.Gag.GagName])
			} else {
				mainGroupLure.Gag.OrgDamage += 20 - 5*(lureGagTiers[mainGroupLure.Gag.GagName]-lureGagTiers[a.Gag.GagName])
			}
		}
	}

	return mainSoloLure, mainGroupLure
}

func getGagDamage(attack AttackAnalysis, isLured bool, nextGag *Gag, prevGag *Gag) (float64, float64, float64) {
	g := attack.Gag
	gagType := g.GagType
	gagDamage, lureDamage, comboDamage := 0.0, 0.0, 0.0
	hasCombo := adjacentSameType(nextGag, prevGag, gagType)

	// Calculate damage for current gag
	// Lure deals no damage
	if gagType == "Lure" {
		return 0, 0, 0
	}

	if gagType == "Trap" {
		// Multiple traps
		if adjacentSameType(nextGag, prevGag, gagType) {
			return 0, 0, 0
		}
		// Trap at the end or with no lure
		if nextGag == nil || nextGag.GagType != "Lure" {
			return 0, 0, 0
		}
		damage := float64(g.Damage)
		if attack.IsOrg {
			damage = float64(g.OrgDamage)
		}
		return damage, 0, 0
	}

	var baseDamage float64
	baseDamage = float64(g.Damage)
	if attack.IsOrg {
		baseDamage = float64(g.OrgDamage)
	}

	switch {
	// Drop on lured cog
	case isLured && gagType == "Drop":
		gagDamage = 0
	// Lure after trap placed
	case gagType == "Trap" && nextGag != nil && nextGag.GagType == "Lure":
		gagDamage = baseDamage
	// Sound on lured cog
	case isLured && gagType == "Sound":
		gagDamage = baseDamage
	// Lured on Throw, Squirt, Sound
	case isLured:
		lureDamage = baseDamage * 0.5
		if hasCombo {
			comboDamage = baseDamage * 0.2
		}
		gagDamage = baseDamage
	// No funny buisiness
	default:
		if hasCombo {
			comboDamage = baseDamage * 0.2
		}
		gagDamage = baseDamage
	}

	return gagDamage, lureDamage, comboDamage
}

func getGagAccuracy(attack AttackAnalysis, isTrapPlaced bool) int {
	g := attack.Gag

	if g.GagType != "Lure" {
		return g.Accuracy
	}

	acc := g.Damage
	if attack.IsOrg {
		acc = g.OrgDamage
	}
	if isTrapPlaced {
		acc += 10
	}

	return acc
}

func adjacentSameType(nextGag, prevGag *Gag, typ string) bool {
	if nextGag != nil && nextGag.GagType == typ {
		return true
	}
	if prevGag != nil && prevGag.GagType == typ {
		return true
	}
	return false
}

// Believe me I wish this was a formula too
func getTgtDEF(level int, tier int) int {
	var tgtDEF int
	switch level {
	case 1:
		tgtDEF = DefLevel1
	case 2:
		tgtDEF = DefLevel2
	case 3:
		tgtDEF = DefLevel3
	case 4:
		if tier == 1 {
			tgtDEF = DefLevel4Tiny
		} else {
			tgtDEF = DefLevel4
		}
	case 5:
		if tier == 1 {
			tgtDEF = DefLevel5Tiny
		} else {
			tgtDEF = DefLevel5
		}
	case 6:
		tgtDEF = DefLevel6
	case 7:
		tgtDEF = DefLevel7
	case 8:
		tgtDEF = DefLevel8
	case 9:
		tgtDEF = DefLevel9
	case 10:
		tgtDEF = DefLevel10
	case 11:
		tgtDEF = DefLevel11
	case 12:
		tgtDEF = DefLevel12
	case 13:
		tgtDEF = DefLevel13
	case 14:
		tgtDEF = DefLevel13
	default:
		tgtDEF = DefLevel14

	}

	return tgtDEF
}
