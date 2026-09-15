import fishData from "../../data/fish.json";
import locData from "../../data/locations.json";

export interface Fish {
  name: string;
  weight_min: number;
  weight_max: number;
  rarity: number;
  bonus?: string;
  locations: string[];
}

interface RodInfo {
  rrf: number;
  weight_max: number;
  probability: number[];
}

interface Buckets {
  confBuckets: number;
  confTime: number;
  avgBuckets: number;
  avgTime: number;
}

export interface LocationRank {
  total: number;
  buckets: Buckets;
}

interface ToonFish {
  rod: { id: number; name: string };
  collection: Record<string, { album: Record<string, { name: string }> }>;
}

export interface FishLikelihood {
  name: string;
  chance: number;
}

export interface LocationRank {
  total: number;
  buckets: Buckets;
  topFish: FishLikelihood[];
}

export default class FishCalculator {
  private fishingInfo: typeof fishData;
  private locationInfo: Record<string, string[]>;
  private rodInfo: RodInfo;
  private caught: string[];
  private catchable: Fish[];
  private minsToCapacity = 3; // time in minutes to fill bucket

  constructor(data: string) {
    this.fishingInfo = fishData;
    this.locationInfo = locData;
    const toon: ToonFish = JSON.parse(data);
    this.rodInfo = (this.fishingInfo.rods as Record<string, RodInfo>)[toon.rod.name];
    this.caught = this.getCaughtBy(toon);
    this.catchable = this.getCatchable();
  }

  /** Finds the chance of catching a new fish at all locations, sorted descending. */
  sortBestLocation(): [string, LocationRank][] {
    const locations = this.getLocationRanks();
    const bestLocation: Record<string, LocationRank> = {};

    for (const [location, rarities] of Object.entries(locations)) {
      const availRarities = Object.keys(rarities);
      if (availRarities.length === 0) continue;

      const totalAvail = availRarities.reduce(
        (sum, rarity) => sum + this.rodInfo.probability[Number(rarity) - 1],
        0
      );
      const total = Object.values(rarities).reduce((sum, value) => sum + value, 0);
      const normalizedTotal = total / totalAvail;

      if (normalizedTotal === 0) continue;

      const playground = Object.entries(this.locationInfo).find(([, streets]) =>
        streets.includes(location)
      );
      if (playground) {
        const playgroundProb = bestLocation[playground[0]]?.total ?? 0;
        if (playgroundProb === normalizedTotal) continue;
      }

      const buckets = this.getBucketsByLocation(normalizedTotal);
      const topFish = this.getTopNewFish(location, 3);
      bestLocation[location] = { total: normalizedTotal, buckets, topFish };
    }

    return Object.entries(bestLocation).sort((a, b) => b[1].total - a[1].total);
  }

  getUncaught(): Fish[] {
    return this.fishingInfo.fish.filter((fish: { name: string; }) => !this.caught.includes(fish.name));
  }

  getCatchable(): Fish[] {
    return this.fishingInfo.fish.filter((fish: { weight_min: number; }) => fish.weight_min <= this.rodInfo.weight_max);
  }

  getCaught(): string[] {
    return this.caught;
  }

  getNew(): Fish[] {
    return this.catchable.filter((fish) => !this.caught.includes(fish.name));
  }

  getByLocation(location: string): Fish[] {
    let gatheredFish: Fish[] = [];
    for (const fish of this.getCatchable()) {
      if (fish.locations.includes(location)) gatheredFish.push(fish);
      if (fish.locations.includes("Anywhere")) gatheredFish.push(fish);
      for (const [playground, streets] of Object.entries(this.locationInfo)) {
        if (playground === location && streets.some((street) => fish.locations.includes(street))) {
          gatheredFish.push(fish);
        }
      }
    }
    for (const [playground, streets] of Object.entries(this.locationInfo)) {
      if (streets.includes(location)) {
        this.getByLocation(playground).forEach((fish) => gatheredFish.push(fish));
      }
    }
    return gatheredFish;
  }

  // --- private helpers ---

  private getBucketsByLocation(total: number): Buckets {
    if (total >= 1) {
      return { confBuckets: 1, confTime: this.minsToCapacity, avgBuckets: 1, avgTime: this.minsToCapacity };
    } else if (total <= 0) {
      return { confBuckets: 0, confTime: 0, avgBuckets: 0, avgTime: 0 };
    }
    const confidence = 0.1;
    const bucketCapacity = 20;
    const missProb = 1 - total;

    const confAttempts = Math.log(confidence) / Math.log(missProb);
    const confBuckets = Math.ceil(confAttempts / bucketCapacity);
    const confTime = confBuckets * this.minsToCapacity;

    const avgAttempts = 1 / total;
    const avgBuckets = Math.ceil(avgAttempts / bucketCapacity);
    const avgTime = avgBuckets * this.minsToCapacity;

    return { confBuckets, confTime, avgBuckets, avgTime };
  }

  private getByLocationRarity(location: string, rarity: number): Fish[] {
    const gatheredFish: Fish[] = [];
    const fishList = this.getByLocation(location);
    const fishMatch = (loc: string, rar: number, fish: Fish) => {
      const rarityIndex = this.getRarity(fish, loc);
      if (rarityIndex === rar && !gatheredFish.includes(fish)) gatheredFish.push(fish);
    };
    const playground = Object.entries(this.locationInfo).find(([, streets]) =>
      streets.includes(location)
    )?.[0];

    for (const fish of fishList) {
      if (fish.locations.includes(location)) fishMatch(location, rarity, fish);
      if (playground && fish.locations.includes(playground)) fishMatch(playground, rarity, fish);
      if (fish.locations.includes("Anywhere")) fishMatch("Anywhere", rarity, fish);
      for (const [pg, streets] of Object.entries(this.locationInfo)) {
        if (pg === location && streets.some((s) => fish.locations.includes(s)) && !gatheredFish.includes(fish)) {
          fishMatch(pg, rarity, fish);
        }
      }
    }
    return gatheredFish;
  }

  private getLocationRanks(): Record<string, Record<number, number>> {
    const locations: Record<string, Record<number, number>> = {};
    for (const pg in this.locationInfo) {
      locations[pg] = this.getRarityByLocation(pg);
      for (const street of this.locationInfo[pg]) {
        locations[street] = this.getRarityByLocation(street);
      }
    }
    return locations;
  }

  private getRarityByLocation(location: string): Record<number, number> {
    const data: Record<number, number> = {};
    for (let rarity = 1; rarity <= 10; rarity++) {
      const rarityFish = this.getByLocationRarity(location, rarity);
      const rodRarity = this.rodInfo.probability[rarity - 1];
      if (rarityFish.length > 0) {
        const totalFish = rarityFish.length;
        const newFish = rarityFish.filter((fish) => !this.caught.includes(fish.name));
        data[rarity] = rodRarity * (newFish.length / totalFish);
      }
    }
    return data;
  }

  private getCaughtBy(toon: ToonFish): string[] {
    const fish: string[] = [];
    for (const key in toon.collection) {
      const album = toon.collection[key].album;
      for (const type in album) {
        fish.push(album[type].name);
      }
    }
    return fish;
  }

  private getRarity(fish: Fish, loc: string): number {
    const locIdx = fish.locations.indexOf(loc);
    const adjLoc = locIdx !== -1 ? locIdx : 0;
    const rarity = fish.rarity + adjLoc;
    return rarity < 10 ? rarity : 10;
  }

  private getTopNewFish(location: string, n: number): FishLikelihood[] {
    const candidates: FishLikelihood[] = [];

    for (let rarity = 1; rarity <= 10; rarity++) {
      const rarityFish = this.getByLocationRarity(location, rarity);
      if (rarityFish.length === 0) continue;

      const rodRarity = this.rodInfo.probability[rarity - 1];
      const newFish = rarityFish.filter((fish) => !this.caught.includes(fish.name));

      for (const fish of newFish) {
        candidates.push({ name: fish.name, chance: rodRarity / rarityFish.length });
      }
    }

    return candidates.sort((a, b) => b.chance - a.chance).slice(0, n);
  }
}
