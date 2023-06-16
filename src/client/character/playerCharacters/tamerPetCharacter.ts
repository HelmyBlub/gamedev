import { calculateDirection, calculateDistance, getNextId } from "../../game.js";
import { Game } from "../../gameModel.js";
import { nextRandom } from "../../randomNumberGenerator.js";
import { determineCharactersInDistance, determineClosestCharacter, calculateAndSetMoveDirectionToPositionWithPathing, moveCharacterTick } from "../character.js";
import { Character, createCharacter } from "../characterModel.js";
import { PathingCache } from "../pathing.js";

export type PetTargetBehavior = "passive" | "aggressive" | "protective";
export type PetNoTargetBehavior = "stay" | "hyperactive" | "protective";

export type TamerPetCharacter = Character & {
    petTargetBehavior: PetTargetBehavior;
    petNoTargetBehavior: PetNoTargetBehavior;
    foodIntakeLevel: FoodIntakeLevel,
    defaultSize: number,
    sizeFactor: number,
    nextMovementUpdateTime?: number;
    baseMoveSpeed: number,
}

type FoodIntakeLevel = {
    current: number,
    overfedAt: number,
    underfedAt: number,
    tickInterval: number,
    nextTick?: number,
}

export const TAMER_PET_CHARACTER = "tamerPet";

export function createTamerPetCharacter(owner: Character, color: string, petTargetBehavior: PetTargetBehavior, petNoTargetBehavior: PetNoTargetBehavior, game: Game): TamerPetCharacter {
    const defaultSize = 15;
    const baseMoveSpeed = 2;
    let character = createCharacter(getNextId(game.state.idCounter), owner.x, owner.y, defaultSize, defaultSize, color, baseMoveSpeed, 20, owner.faction, TAMER_PET_CHARACTER, 10);
    const tamerPetCharacter: TamerPetCharacter = {
        ...character,
        petTargetBehavior: petTargetBehavior,
        petNoTargetBehavior: petNoTargetBehavior,
        defaultSize: defaultSize,
        sizeFactor: 1,
        baseMoveSpeed: baseMoveSpeed,
        foodIntakeLevel: {
            current: 50,
            underfedAt: 40 - Math.floor(nextRandom(game.state.randomSeed) * 20),
            overfedAt: 60 + Math.floor(nextRandom(game.state.randomSeed) * 20),
            tickInterval: Math.floor(1000 * (nextRandom(game.state.randomSeed) * 0.5 + 0.75)),
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

function foodIntakeLevelTick(pet: TamerPetCharacter, game: Game) {
    const intakeLevel = pet.foodIntakeLevel;
    if (intakeLevel.nextTick === undefined || intakeLevel.nextTick <= game.state.time) {
        intakeLevel.nextTick = game.state.time + intakeLevel.tickInterval;
        if (intakeLevel.current > 0) intakeLevel.current -= 1;
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
            case "protective":
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
