import { paintDefaultAbilityStatsUI } from "../../ability/ability.js";
import { calculateDirection, calculateDistance, getNextId } from "../../game.js";
import { Game, Position } from "../../gameModel.js";
import { GAME_IMAGES, getImage } from "../../imageLoad.js";
import { nextRandom } from "../../randomNumberGenerator.js";
import { determineCharactersInDistance, determineClosestCharacter, calculateAndSetMoveDirectionToPositionWithPathing, calculateCharacterMovePosition, getPlayerCharacters, setCharacterAbilityLevel } from "../character.js";
import { Character, createCharacter } from "../characterModel.js";
import { paintCharacter } from "../characterPaint.js";
import { PathingCache } from "../pathing.js";

export type PetTargetBehavior = "passive" | "aggressive" | "protective";
export type PetNoTargetBehavior = "stay" | "hyperactive" | "following";
export type Trait = "loves food" | "very hungry" | "never gets fat";
export const TAMER_PET_TRAITS: Trait[] = ["loves food", "very hungry", "never gets fat"];
const MAX_HAPPINES = 150;
const MAX_FOOD_INTAKE = 500;
const MAX_OVERFED_SIZE = 10;
const MIN_MOVEMENTSPEED_FACTOR = 0.1;

GAME_IMAGES["HAPPY"] = {
    imagePath: "/images/happy.png",
    spriteRowHeights: [40],
    spriteRowWidths: [40],
};
GAME_IMAGES["UNHAPPY"] = {
    imagePath: "/images/unhappy.png",
    spriteRowHeights: [40],
    spriteRowWidths: [40],
};


export type TamerPetCharacter = Character & {
    petTargetBehavior: PetTargetBehavior;
    petNoTargetBehavior: PetNoTargetBehavior;
    foodIntakeLevel: FoodIntakeLevel,
    happines: Happiness,
    defaultSize: number,
    sizeFactor: number,
    nextMovementUpdateTime?: number;
    baseMoveSpeed: number,
    leveling: {
        level: number,
        experience: number,
        experienceForLevelUp: number,
    }
    traits: Trait[],
}


type Happiness = {
    current: number,
    unhappyAt: number,
    hyperactiveAt: number,
    tickInterval: number,
    nextTick?: number,
    visualizations: {
        happy: boolean,
        displayUntil: number,
    }[],
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
        bossSkillPoints: 0,
        leveling: {
            experience: 0,
            experienceForLevelUp: 10,
            level: 0,
        },
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
            tickInterval: Math.floor(1000 * (nextRandom(game.state.randomSeed) * 0.5 + 0.75)),
            visualizations: [],
        },
        traits: [],
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
    if (pet.happines.current > pet.happines.hyperactiveAt) {
        if (pet.happines.nextTick === undefined || pet.happines.nextTick < game.state.time) {
            pet.happines.nextTick = game.state.time + pet.happines.tickInterval;
            changeTamerPetHappines(pet, -1, game.state.time, false);
        }
    }
}

export function tamerPetFeed(pet: TamerPetCharacter, feedValue: number, time: number) {
    const beforeFeed = pet.foodIntakeLevel.current;
    pet.foodIntakeLevel.current += feedValue;
    if (pet.foodIntakeLevel.current > MAX_FOOD_INTAKE) pet.foodIntakeLevel.current = MAX_FOOD_INTAKE;
    if (feedValue > 0) {
        if (pet.traits.includes("loves food")) {
            changeTamerPetHappines(pet, 20, time, true);
        } else {
            if (beforeFeed < pet.foodIntakeLevel.underfedAt) {
                changeTamerPetHappines(pet, 20, time, true);
            } else if (beforeFeed > pet.foodIntakeLevel.overfedAt * 1.2) {
                changeTamerPetHappines(pet, -10, time, true);
            } else {
                changeTamerPetHappines(pet, 5, time, true);
            }
        }

    } else if (feedValue < 0) {
        if (pet.foodIntakeLevel.current < pet.foodIntakeLevel.underfedAt) {
            changeTamerPetHappines(pet, feedValue, time, true);
        }
    }
}

function foodIntakeToDisplayText(foodIntakeLevel: FoodIntakeLevel): string{
    if(foodIntakeLevel.current < foodIntakeLevel.underfedAt){
        return "hungry";
    }else if(foodIntakeLevel.current > foodIntakeLevel.overfedAt){
        return "ate too much";
    }else{
        return "not hungry";
    }
}
function happinessToDisplayText(happines: Happiness): string{
    if(happines.current < happines.unhappyAt){
        return "unhappy";
    }else if(happines.current > happines.hyperactiveAt){
        return "too much";
    }else{
        return "happy";
    }
}

export function paintTamerPetCharacterStatsUI(ctx: CanvasRenderingContext2D, pet: TamerPetCharacter, drawStartX: number, drawStartY: number, game: Game): { width: number, height: number } {
    const textLines: string[] = [
        `Pet Stats:`,
        `Color: ${pet.color}`,
        `food: ${foodIntakeToDisplayText(pet.foodIntakeLevel)}`,
        `Happiness: ${happinessToDisplayText(pet.happines)}`,
        `Movement Speed: ${pet.moveSpeed.toFixed(2)}`,
        `Level: ${pet.leveling.level.toFixed(0)}`,
    ];

    if (pet.abilities.length > 0) {
        textLines.push("");
        textLines.push("Abilities:");
        for (let ability of pet.abilities) {
            textLines.push(ability.name);
        }
    }

    if (pet.traits.length > 0) {
        textLines.push("");
        textLines.push("Traits:");
        for (let trait of pet.traits) {
            textLines.push(trait);
        }
    }

    return paintDefaultAbilityStatsUI(ctx, textLines, drawStartX, drawStartY);
}

export function paintTamerPetCharacter(ctx: CanvasRenderingContext2D, character: Character, cameraPosition: Position, game: Game) {
    let tamerPetCharacter = character as TamerPetCharacter;
    paintCharacter(ctx, character, cameraPosition, game);
    if(tamerPetCharacter.happines.visualizations.length > 0){
        let centerX = ctx.canvas.width / 2;
        let centerY = ctx.canvas.height / 2;
        let paintX = character.x - cameraPosition.x + centerX;
        let paintY = character.y - cameraPosition.y + centerY - Math.floor(character.height / 2);
        let happyImage = getImage("HAPPY");
        let unhappyImage = getImage("UNHAPPY");
        for(let visu of tamerPetCharacter.happines.visualizations){
            if(visu.displayUntil >= game.state.time){
                if (visu.happy && happyImage) {
                    ctx.drawImage(happyImage, paintX - Math.floor(happyImage.width/2), paintY - happyImage.height);
                    paintY -= happyImage.height;
                }else if(!visu.happy && unhappyImage){
                    ctx.drawImage(unhappyImage, paintX - Math.floor(unhappyImage.width/2), paintY - unhappyImage.height);
                    paintY -= unhappyImage.height;
                }
            }
        }
    }
}

export function changeTamerPetHappines(pet: TamerPetCharacter, value: number, time: number, visualizeChange: boolean) {
    pet.happines.current += value;
    if (visualizeChange) pet.happines.visualizations.push({ happy: value > 0, displayUntil: time + 500 });
    if (pet.happines.current < 0) pet.happines.current = 0;
    if (pet.happines.current > MAX_HAPPINES) pet.happines.current = MAX_HAPPINES;
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
        let tickChange = -1;
        if (pet.traits.includes("very hungry")) tickChange = -5;

        if (intakeLevel.current > 0) tamerPetFeed(pet, tickChange, game.state.time);
    }

    if (intakeLevel.current < intakeLevel.underfedAt) {
        pet.sizeFactor = 1 - (intakeLevel.underfedAt - intakeLevel.current) / intakeLevel.underfedAt / 2;
        pet.moveSpeed = pet.baseMoveSpeed;
    } else if (intakeLevel.current > intakeLevel.overfedAt) {
        if (pet.traits.includes("never gets fat")) {
            pet.sizeFactor = 1;
            pet.moveSpeed = pet.baseMoveSpeed;
        } else {
            pet.sizeFactor = 1 + (intakeLevel.current - intakeLevel.overfedAt) / intakeLevel.overfedAt;
            pet.sizeFactor = Math.min(MAX_OVERFED_SIZE, pet.sizeFactor);
            pet.moveSpeed = pet.baseMoveSpeed * Math.max(MIN_MOVEMENTSPEED_FACTOR, 1 / pet.sizeFactor);
        }
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
        if (closest.minDistance < 60) {
            target = closest.minDistanceCharacter;
        } else {
            let closest = determineClosestCharacter(pet, playerCharacters);
            target = closest.minDistanceCharacter;
        }
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

    let newMovePosition = calculateCharacterMovePosition(pet, game.state.map, game.state.idCounter);
    if (newMovePosition && !collisionWithOtherPets(pet, petOwner, newMovePosition, game)) {
        pet.x = newMovePosition.x;
        pet.y = newMovePosition.y;
    }
}

function collisionWithOtherPets(pet: TamerPetCharacter, petOwner: Character, newMovePosition: Position, game: Game): boolean {
    for (let petIt of petOwner.pets!) {
        if (petIt === pet) continue;
        const distanceBefore = calculateDistance(petIt, pet);
        const distanceAfter = calculateDistance(petIt, newMovePosition);
        if (distanceBefore > distanceAfter && distanceAfter < (pet.width + petIt.width) / 2.5) {
            return true;
        }
    }
    return false;
}
