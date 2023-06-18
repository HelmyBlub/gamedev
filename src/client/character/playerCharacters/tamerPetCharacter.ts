import { paintDefaultAbilityStatsUI } from "../../ability/ability.js";
import { calculateDirection, calculateDistance, getNextId } from "../../game.js";
import { Game } from "../../gameModel.js";
import { nextRandom } from "../../randomNumberGenerator.js";
import { determineCharactersInDistance, determineClosestCharacter, calculateAndSetMoveDirectionToPositionWithPathing, moveCharacterTick } from "../character.js";
import { Character, createCharacter } from "../characterModel.js";
import { PathingCache } from "../pathing.js";

export type PetTargetBehavior = "passive" | "aggressive" | "protective";
export type PetNoTargetBehavior = "stay" | "hyperactive" | "following";

export type TamerPetCharacter = Character & {
    petTargetBehavior: PetTargetBehavior;
    petNoTargetBehavior: PetNoTargetBehavior;
    foodIntakeLevel: FoodIntakeLevel,
    happines: Happiness,
    defaultSize: number,
    sizeFactor: number,
    nextMovementUpdateTime?: number;
    baseMoveSpeed: number,
}

type Happiness = {
    current: number,
    unhappyAt: number,
    hyperactiveAt: number,
}

type FoodIntakeLevel = {
    current: number,
    overfedAt: number,
    underfedAt: number,
    tickInterval: number,
    nextTick?: number,
}

export const TAMER_PET_CHARACTER = "tamerPet";

export function createTamerPetCharacter(owner: Character, color: string, game: Game): TamerPetCharacter {
    const defaultSize = 15;
    const baseMoveSpeed = 2;
    let character = createCharacter(getNextId(game.state.idCounter), owner.x, owner.y, defaultSize, defaultSize, color, baseMoveSpeed, 20, owner.faction, TAMER_PET_CHARACTER, 10);
    const tamerPetCharacter: TamerPetCharacter = {
        ...character,
        petTargetBehavior: "protective",
        petNoTargetBehavior: "following",
        defaultSize: defaultSize,
        sizeFactor: 1,
        baseMoveSpeed: baseMoveSpeed,
        foodIntakeLevel: {
            current: 50,
            underfedAt: 40 - Math.floor(nextRandom(game.state.randomSeed) * 20),
            overfedAt: 60 + Math.floor(nextRandom(game.state.randomSeed) * 20),
            tickInterval: Math.floor(1000 * (nextRandom(game.state.randomSeed) * 0.5 + 0.75)),
        },
        happines: {
            current: 50,
            unhappyAt: 40 - Math.floor(nextRandom(game.state.randomSeed) * 20),
            hyperactiveAt: 100 + Math.floor(nextRandom(game.state.randomSeed) * 20),
        }
    };
    return tamerPetCharacter;
}

export function tickTamerPetCharacter(character: Character, petOwner: Character, game: Game, pathingCache: PathingCache | null) {
    const pet: TamerPetCharacter = character as TamerPetCharacter;
    if (pathingCache === null) {
        console.log("needs pathing cache");
        return;
    }
    if (character.isDead) return;
    moveTick(pet, petOwner, game, pathingCache);
    foodIntakeLevelTick(pet, game);
}

export function tamerPetFeed(pet: TamerPetCharacter, feedValue: number) {
    const beforeFeed = pet.foodIntakeLevel.current;
    pet.foodIntakeLevel.current += feedValue;
    if (feedValue > 0) {
        if (beforeFeed < pet.foodIntakeLevel.underfedAt) {
            changeHappines(pet, 20);
        } else if (beforeFeed > pet.foodIntakeLevel.overfedAt * 1.2) {
            changeHappines(pet, -10);
        } else {
            changeHappines(pet, 5);
        }
    } else if (feedValue < 0) {
        if (pet.foodIntakeLevel.current < pet.foodIntakeLevel.underfedAt) {
            changeHappines(pet, feedValue);
        }
    }
}

export function paintTamerPetCharacterStatsUI(ctx: CanvasRenderingContext2D, pet: TamerPetCharacter, drawStartX: number, drawStartY: number, game: Game): { width: number, height: number } {
    const textLines: string[] = [
        `Pet Stats:`,
        `Color: ${pet.color}`,
        `food intake: ${pet.foodIntakeLevel.current}`,
        `Happiness: ${pet.happines.current}`,
        `Movement Speed: ${pet.moveSpeed.toFixed(2)}`,
    ];
    return paintDefaultAbilityStatsUI(ctx, textLines, drawStartX, drawStartY);
}

function changeHappines(pet: TamerPetCharacter, value: number) {
    pet.happines.current += value;
    if (pet.happines.current < pet.happines.unhappyAt) {
        pet.petTargetBehavior = "passive";
        pet.petNoTargetBehavior = "stay";
    } else if (pet.happines.current > pet.happines.hyperactiveAt) {
        pet.petTargetBehavior = "aggressive";
        pet.petNoTargetBehavior = "hyperactive";
    } else {
        pet.petTargetBehavior = "protective";
        pet.petNoTargetBehavior = "following";
    }
}

function foodIntakeLevelTick(pet: TamerPetCharacter, game: Game) {
    const intakeLevel = pet.foodIntakeLevel;
    if (intakeLevel.nextTick === undefined || intakeLevel.nextTick <= game.state.time) {
        intakeLevel.nextTick = game.state.time + intakeLevel.tickInterval;
        if (intakeLevel.current > 0) tamerPetFeed(pet, -1);
    }

    if (intakeLevel.current < intakeLevel.underfedAt) {
        pet.sizeFactor = 1 - (intakeLevel.underfedAt - intakeLevel.current) / intakeLevel.underfedAt / 2;
        pet.moveSpeed = pet.baseMoveSpeed;
    } else if (intakeLevel.current > intakeLevel.overfedAt) {
        pet.sizeFactor = 1 + (intakeLevel.current - intakeLevel.overfedAt) / intakeLevel.overfedAt;
        pet.sizeFactor = Math.min(10, pet.sizeFactor);
        pet.moveSpeed = pet.baseMoveSpeed * Math.max(0.10, 1 / pet.sizeFactor);
    } else {
        pet.sizeFactor = 1;
        pet.moveSpeed = pet.baseMoveSpeed;
    }

    pet.width = pet.defaultSize * pet.sizeFactor;
    pet.height = pet.width;
    pet.weight = pet.width * pet.height;
}

function moveTick(pet: TamerPetCharacter, petOwner: Character, game: Game, pathingCache: PathingCache) {
    const isPlayer = pet.faction === "player";
    let target: Character | null = null;
    if (pet.petTargetBehavior === "aggressive") {
        let playerCharacters = determineCharactersInDistance(pet, game.state.map, [], game.state.bossStuff.bosses, 200);
        let closest = determineClosestCharacter(pet, playerCharacters);
        target = closest.minDistanceCharacter;
    } else if (pet.petTargetBehavior === "protective") {
        let playerCharacters = determineCharactersInDistance(petOwner, game.state.map, [], game.state.bossStuff.bosses, 200);
        let closest = determineClosestCharacter(petOwner, playerCharacters);
        target = closest.minDistanceCharacter;
    } else if (pet.petTargetBehavior === "passive") {
        //not searching for target
    }

    if (target) {
        calculateAndSetMoveDirectionToPositionWithPathing(pet, target, game.state.map, pathingCache, game.state.idCounter, game.state.time);
    } else {
        switch (pet.petNoTargetBehavior) {
            case "stay":
                pet.isMoving = false;
                break;
            case "following":
                if (pet.nextMovementUpdateTime === undefined || pet.nextMovementUpdateTime <= game.state.time) {
                    const random = nextRandom(game.state.randomSeed);
                    const distance = calculateDistance(pet, petOwner);
                    if (random > Math.max(distance / 100, 0.2)) {
                        pet.isMoving = false;
                    } else {
                        pet.isMoving = true;
                        let direction = calculateDirection(pet, petOwner);
                        pet.moveDirection = direction + (nextRandom(game.state.randomSeed) * Math.PI / 2 - Math.PI / 4);
                    }
                    pet.nextMovementUpdateTime = game.state.time + 500;
                }
                break;
            case "hyperactive":
                if (pet.nextMovementUpdateTime === undefined || pet.nextMovementUpdateTime <= game.state.time) {
                    pet.isMoving = true;
                    pet.moveDirection = nextRandom(game.state.randomSeed) * Math.PI * 2;
                    pet.nextMovementUpdateTime = game.state.time + nextRandom(game.state.randomSeed) * 100 + 50;
                }
                break;
        }
    }

    moveCharacterTick(pet, game.state.map, game.state.idCounter, isPlayer);
}
