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
    nextMovementUpdateTime?: number;
}

export const TAMER_PET_CHARACTER = "tamerPet";

export function createTamerPetCharacter(owner: Character, color: string, petTargetBehavior: PetTargetBehavior, petNoTargetBehavior: PetNoTargetBehavior, game: Game): TamerPetCharacter {
    let character = createCharacter(getNextId(game.state.idCounter), owner.x, owner.y, 15, 15, color, 2, 20, owner.faction, TAMER_PET_CHARACTER, 10);
    const tamerPetCharacter: TamerPetCharacter = {
        ...character,
        petTargetBehavior: petTargetBehavior,
        petNoTargetBehavior: petNoTargetBehavior,
    };
    return tamerPetCharacter;
}

export function tickTamerPetCharacter(character: Character, petOwner: Character, game: Game, pathingCache: PathingCache | null) {
    const pet: TamerPetCharacter = character as TamerPetCharacter;
    if (pathingCache === null) {
        console.log("needs pathing cache");
        return;
    }
    const isPlayer = character.faction === "player";
    if (character.isDead) return;
    let target: Character | null = null;

    if (pet.petTargetBehavior === "aggressive") {
        let playerCharacters = determineCharactersInDistance(character, game.state.map, [], game.state.bossStuff.bosses, 200);
        let closest = determineClosestCharacter(character, playerCharacters);
        target = closest.minDistanceCharacter;
    } else if (pet.petTargetBehavior === "protective") {
        let playerCharacters = determineCharactersInDistance(petOwner, game.state.map, [], game.state.bossStuff.bosses, 200);
        let closest = determineClosestCharacter(petOwner, playerCharacters);
        target = closest.minDistanceCharacter;
    } else if (pet.petTargetBehavior === "passive") {
        //not searching for target
    }

    if (target) {
        calculateAndSetMoveDirectionToPositionWithPathing(character, target, game.state.map, pathingCache, game.state.idCounter, game.state.time);
    } else {
        switch (pet.petNoTargetBehavior) {
            case "stay":
                pet.isMoving = false;
                break;
            case "protective":
                if (pet.nextMovementUpdateTime === undefined || pet.nextMovementUpdateTime <= game.state.time) {
                    const random = nextRandom(game.state.randomSeed);
                    const distance = calculateDistance(pet, petOwner);
                    if(random > Math.max(distance / 100, 0.2)){
                        pet.isMoving = false;
                    }else{
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

    moveCharacterTick(character, game.state.map, game.state.idCounter, isPlayer);
}
