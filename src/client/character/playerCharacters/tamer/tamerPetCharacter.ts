import { ABILITIES_FUNCTIONS, paintDefaultAbilityStatsUI } from "../../../ability/ability.js";
import { ABILITY_NAME_LEASH, AbilityLeash } from "../../../ability/abilityLeash.js";
import { calculateDirection, calculateDistance, getNextId } from "../../../game.js";
import { FACTION_ENEMY, FACTION_PLAYER, Game, Position } from "../../../gameModel.js";
import { getPointPaintPosition } from "../../../gamePaint.js";
import { GAME_IMAGES, getImage } from "../../../imageLoad.js";
import { moveByDirectionAndDistance } from "../../../map/map.js";
import { nextRandom } from "../../../randomNumberGenerator.js";
import { determineCharactersInDistance, determineClosestCharacter, calculateAndSetMoveDirectionToPositionWithPathing, calculateCharacterMovePosition, getPlayerCharacters, setCharacterPosition } from "../../character.js";
import { CHARACTER_TYPE_FUNCTIONS, Character, createCharacter } from "../../characterModel.js";
import { PathingCache, getNextWaypoint } from "../../pathing.js";
import { Leveling } from "../levelingCharacter.js";
import { Trait, addTamerPetTraits, tamerPetIncludesTrait } from "./petTrait.js";
import { TAMER_PET_TRAIT_EATS_LESS } from "./petTraitEatsLess.js";
import { TAMER_PET_TRAIT_GETS_FAT_EASILY } from "./petTraitGetFatEasily.js";
import { TAMER_PET_TRAIT_HAPPY_ONE } from "./petTraitHappyOne.js";
import { TAMER_PET_TRAIT_NEEDS_MORE_LOVE } from "./petTraitNeedsMoreLove.js";
import { TAMER_PET_TRAIT_NEVER_GETS_FAT } from "./petTraitNeverGetsFat.js";
import { TAMER_PET_TRAIT_VERY_HUNGRY } from "./petTraitVeryHungry.js";

export type PetTargetBehavior = "passive" | "aggressive" | "protective";
export type PetNoTargetBehavior = "stay" | "hyperactive" | "following";
export type PetHappines = "unhappy" | "happy" | "hyperactive";
export type PetHunger = "not hungry" | "hungry" | "ate too much";

const MAX_HAPPINES = 150;
const MAX_FOOD_INTAKE = 500;
const MAX_OVERFED_SIZE = 5;
const MIN_MOVEMENTSPEED_FACTOR = 0.1;

export type TamerPetCharacter = Character & {
    petTargetBehavior: PetTargetBehavior;
    petNoTargetBehavior: PetNoTargetBehavior;
    foodIntakeLevel: FoodIntakeLevel,
    happines: Happiness,
    defaultSize: number,
    sizeFactor: number,
    nextMovementUpdateTime?: number;
    baseMoveSpeed: number,
    traits: Trait[],
    forcedMovePosition?: Position,
    tradable: boolean,
    gifted?: boolean,
    legendary?: {
        buildingRefId: number,
    }
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
GAME_IMAGES[TAMER_PET_CHARACTER] = {
    properties: { baseColor: "green" },
    imagePath: "/images/slime.png",
    spriteRowHeights: [20],
    spriteRowWidths: [20],
};
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

export function addTamerPetFunctions() {
    CHARACTER_TYPE_FUNCTIONS[TAMER_PET_CHARACTER] = {
        tickPetFunction: tickTamerPetCharacter,
        paintCharacterType: paintTamerPetCharacter,
        reset: reset,
    }
    addTamerPetTraits();
}

export function tradePets(fromCharacter: Character, toCharacter: Character, game: Game) {
    if (fromCharacter.pets) {
        for (let i = fromCharacter.pets.length - 1; i >= 0; i--) {
            const pet = fromCharacter.pets[i];
            if (pet.tradable) {
                if (!toCharacter.pets) toCharacter.pets = [];
                fromCharacter.pets.splice(i, 1);
                pet.tradable = false;
                pet.gifted = true;
                reset(pet);
                toCharacter.pets.push(pet);
                for (let ability of pet.abilities) {
                    ability.disabled = false;
                }
                const leash: AbilityLeash = pet.abilities.find((a) => a.name === ABILITY_NAME_LEASH) as AbilityLeash;
                if (leash) leash.leashedToOwnerId = toCharacter.id;
            }
        }
    }
}

export function createTamerPetCharacter(owner: Character, color: string, game: Game): TamerPetCharacter {
    const defaultSize = 30;
    const baseMoveSpeed = 2;
    const character = createCharacter(getNextId(game.state.idCounter), owner.x, owner.y, defaultSize, defaultSize, color, baseMoveSpeed, 20, owner.faction, TAMER_PET_CHARACTER, 10);
    const tamerPetCharacter: TamerPetCharacter = {
        ...character,
        petTargetBehavior: "protective",
        petNoTargetBehavior: "following",
        defaultSize: defaultSize,
        sizeFactor: 1,
        baseMoveSpeed: baseMoveSpeed,
        bossSkillPoints: {available: 0, used: 0},
        level: {
            level: 0,
            leveling:{
                experience: 0,
                experienceForLevelUp: 10,
            }
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
        tradable: true,
    };
    return tamerPetCharacter;
}

function tickTamerPetCharacter(character: Character, petOwner: Character, game: Game, pathingCache: PathingCache | null) {
    const pet: TamerPetCharacter = character as TamerPetCharacter;
    if (pathingCache === null) {
        console.log("needs pathing cache");
        return;
    }
    if (character.isDead) return;
    moveTick(pet, petOwner, game, pathingCache);
    foodIntakeLevelTick(pet, game);
    if (pet.happines.current >= pet.happines.hyperactiveAt - 10 || tamerPetIncludesTrait(TAMER_PET_TRAIT_NEEDS_MORE_LOVE, pet)) {
        if (pet.happines.nextTick === undefined || pet.happines.nextTick < game.state.time) {
            pet.happines.nextTick = game.state.time + pet.happines.tickInterval;
            changeTamerPetHappines(pet, -1, game.state.time, false);
        }
    }
}

export function tamerPetFeed(pet: TamerPetCharacter, feedValue: number, time: number) {
    if (tamerPetIncludesTrait(TAMER_PET_TRAIT_GETS_FAT_EASILY, pet) && feedValue > 0) {
        feedValue *= 2;
    }
    if (tamerPetIncludesTrait(TAMER_PET_TRAIT_EATS_LESS, pet) && feedValue < 0) {
        feedValue /= 2;
    }

    const beforeFeed = pet.foodIntakeLevel.current;
    pet.foodIntakeLevel.current += feedValue;
    if (pet.foodIntakeLevel.current > MAX_FOOD_INTAKE) pet.foodIntakeLevel.current = MAX_FOOD_INTAKE;
    if (feedValue > 0) {
        if (tamerPetIncludesTrait("loves food", pet)) {
            changeTamerPetHappines(pet, 20, time, true);
        } else if (tamerPetIncludesTrait("wants to stay slim", pet)) {
            changeTamerPetHappines(pet, -5, time, true);
        } else {
            if (beforeFeed < pet.foodIntakeLevel.underfedAt) {
                changeTamerPetHappines(pet, 10, time, true);
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

export function petHappinessToDisplayText(happines: Happiness): PetHappines {
    if (happines.current < happines.unhappyAt) {
        return "unhappy";
    } else if (happines.current > happines.hyperactiveAt) {
        return "hyperactive";
    } else {
        return "happy";
    }
}

export function petFoodIntakeToDisplayText(foodIntakeLevel: FoodIntakeLevel): PetHunger {
    if (foodIntakeLevel.current < foodIntakeLevel.underfedAt) {
        return "hungry";
    } else if (foodIntakeLevel.current > foodIntakeLevel.overfedAt) {
        return "ate too much";
    } else {
        return "not hungry";
    }
}
export function paintTamerPetCharacterStatsUI(ctx: CanvasRenderingContext2D, pet: TamerPetCharacter, drawStartX: number, drawStartY: number, game: Game): { width: number, height: number } {
    const textLines: string[] = [`Pet Stats:`];
    if (pet.gifted) {
        textLines[0] += " (gifted)"
        textLines.push("gifted pets don't get stronger");
    }

    textLines.push(
        `Color: ${pet.paint.color}`,
        `food: ${petFoodIntakeToDisplayText(pet.foodIntakeLevel)}`,
        `Happiness: ${petHappinessToDisplayText(pet.happines)}`,
        `Movement Speed: ${pet.moveSpeed.toFixed(2)}`,
        `Level: ${pet.level!.level.toFixed(0)}`,
        `XP: ${pet.level!.leveling!.experience.toFixed(0)}/${pet.level!.leveling!.experienceForLevelUp.toFixed(0)}`,
    );

    if (pet.abilities.length > 0) {
        textLines.push("");
        textLines.push("Abilities:");
        for (let ability of pet.abilities) {
            textLines.push(ability.name);
            const upgradeKeys = Object.keys(ability.upgrades);
            if (upgradeKeys.length > 0) {
                const abilityFunctions = ABILITIES_FUNCTIONS[ability.name];
                const upgradeFunctions = abilityFunctions.abilityUpgradeFunctions;
                if (!upgradeFunctions) continue;
                for (let key of upgradeKeys) {
                    textLines.push(" -" + upgradeFunctions[key].getStatsDisplayText(ability));
                }
            }
        }
    }

    if (pet.traits.length > 0) {
        textLines.push("");
        textLines.push("Traits:");
        for (let trait of pet.traits) {
            textLines.push(trait.name);
        }
    }

    return paintDefaultAbilityStatsUI(ctx, textLines, drawStartX, drawStartY);
}

export function changeTamerPetHappines(pet: TamerPetCharacter, value: number, time: number, visualizeChange: boolean) {
    pet.happines.current += value;
    if (tamerPetIncludesTrait(TAMER_PET_TRAIT_HAPPY_ONE, pet)) {
        pet.happines.current = pet.happines.hyperactiveAt - 1;
    }
    if (visualizeChange && pet.faction === FACTION_PLAYER) pet.happines.visualizations.push({ happy: value > 0, displayUntil: time + 500 });
    for (let i = pet.happines.visualizations.length - 1; i >= 0; i--) {
        if (pet.happines.visualizations[i].displayUntil < time) {
            pet.happines.visualizations.splice(i, 1);
        }
    }

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

export function findPetOwner(pet: TamerPetCharacter, game: Game): Character | undefined {
    let characters: Character[];
    if (pet.faction === FACTION_PLAYER) {
        characters = getPlayerCharacters(game.state.players);
        const pastCharacters = game.state.pastPlayerCharacters.characters;
        for (let i = 0; i < pastCharacters.length; i++) {
            const pastChar = pastCharacters[i];
            if (pastChar) characters.push(pastChar);
        }
        for (let character of characters) {
            if (character.pets?.includes(pet)) {
                return character;
            }
        }
    } else {
        characters = game.state.bossStuff.bosses;
        for (let character of characters) {
            if (character.pets?.includes(pet)) {
                return character;
            }
        }
        for (let i = 0; i < game.state.map.activeChunkKeys.length; i++) {
            const chunk = game.state.map.chunks[game.state.map.activeChunkKeys[i]];
            for (let character of chunk.characters) {
                if (character.pets?.includes(pet)) {
                    return character;
                }
            }
        }
    }
    return undefined;
}

function paintTamerPetCharacter(ctx: CanvasRenderingContext2D, character: Character, cameraPosition: Position, game: Game) {
    const tamerPetCharacter = character as TamerPetCharacter;
    const petImage = getImage(TAMER_PET_CHARACTER, character.paint.color);
    if (petImage) {
        const characterImage = GAME_IMAGES[TAMER_PET_CHARACTER];
        const spriteAnimation = Math.floor(game.state.time / 250) % 2;
        const happinesToInt = tamerPetCharacter.happines.current < tamerPetCharacter.happines.unhappyAt ? 0 : (tamerPetCharacter.happines.current > tamerPetCharacter.happines.hyperactiveAt) ? 2 : 1;
        const spriteWidth = characterImage.spriteRowWidths[0];
        const spriteHappinesOffset = happinesToInt * 2 * (spriteWidth + 1);
        const spriteHeight = characterImage.spriteRowHeights[0];
        const spriteColor = characterImage.properties.colorToSprite!.indexOf(character.paint.color);
        const paintPos = getPointPaintPosition(ctx, character, cameraPosition);
        ctx.drawImage(
            petImage,
            0 + spriteAnimation * (spriteWidth + 1) + spriteHappinesOffset,
            0 + spriteColor * (spriteHeight + 1),
            spriteWidth, spriteHeight,
            Math.floor(paintPos.x - character.width / 2),
            Math.floor(paintPos.y - character.height / 2),
            character.width, character.height
        );
    }
    for (let ability of character.abilities) {
        const abilityFunctions = ABILITIES_FUNCTIONS[ability.name];
        if (abilityFunctions.paintAbility !== undefined) {
            abilityFunctions.paintAbility(ctx, character, ability, cameraPosition, game);
        }
    }
    if (tamerPetCharacter.happines.visualizations.length > 0) {
        const paintPos = getPointPaintPosition(ctx, character, cameraPosition);
        paintPos.y -= Math.floor(character.height / 2);
        const happyImage = getImage("HAPPY");
        const unhappyImage = getImage("UNHAPPY");
        for (let visu of tamerPetCharacter.happines.visualizations) {
            if (visu.displayUntil >= game.state.time) {
                if (visu.happy && happyImage) {
                    ctx.drawImage(happyImage, paintPos.x - Math.floor(happyImage.width / 2), paintPos.y - happyImage.height);
                    paintPos.y -= happyImage.height;
                } else if (!visu.happy && unhappyImage) {
                    ctx.drawImage(unhappyImage, paintPos.x - Math.floor(unhappyImage.width / 2), paintPos.y - unhappyImage.height);
                    paintPos.y -= unhappyImage.height;
                }
            }
        }
    }
}

function foodIntakeLevelTick(pet: TamerPetCharacter, game: Game) {
    const intakeLevel = pet.foodIntakeLevel;
    if (intakeLevel.nextTick === undefined || intakeLevel.nextTick <= game.state.time) {
        intakeLevel.nextTick = game.state.time + intakeLevel.tickInterval;
        let tickChange = -1;
        if (tamerPetIncludesTrait(TAMER_PET_TRAIT_VERY_HUNGRY, pet)) tickChange = -5;

        if (intakeLevel.current > 0) tamerPetFeed(pet, tickChange, game.state.time);
    }

    if (intakeLevel.current < intakeLevel.underfedAt) {
        pet.sizeFactor = 1 - (intakeLevel.underfedAt - intakeLevel.current) / intakeLevel.underfedAt / 2;
        pet.moveSpeed = pet.baseMoveSpeed;
    } else if (intakeLevel.current > intakeLevel.overfedAt) {
        if (tamerPetIncludesTrait(TAMER_PET_TRAIT_NEVER_GETS_FAT, pet)) {
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
    pet.weight = (pet.width * pet.height) / 3;
}

function reset(character: Character) {
    const pet: TamerPetCharacter = character as TamerPetCharacter;
    pet.happines.nextTick = undefined;
    pet.happines.visualizations = [];
    pet.foodIntakeLevel.nextTick = undefined;
    pet.nextMovementUpdateTime = undefined;
    pet.forcedMovePosition = undefined;
}

function moveTick(pet: TamerPetCharacter, petOwner: Character, game: Game, pathingCache: PathingCache) {
    if (pet.forcedMovePosition) {
        if (pet.happines.current < pet.happines.unhappyAt) {
            pet.isMoving = false;
        } else {
            pet.isMoving = true;
            const direction = calculateDirection(pet, pet.forcedMovePosition);
            pet.moveDirection = direction;
        }
    } else {
        const target = getTargetByBehavior(pet, petOwner, game);
        let changed = false;
        if (target) {
            changed = calculateAndSetMoveDirectionToPositionWithPathing(pet, target, game.state.map, pathingCache, game.state.idCounter, game.state.time, game);
        } 
        if(!changed) {
            setMoveDirectionWithNoTarget(pet, petOwner, game);
        }
    }
    setMovePositonWithPetCollision(pet, petOwner, game);
}

function setMovePositonWithPetCollision(pet: TamerPetCharacter, petOwner: Character, game: Game) {
    const newMovePosition = calculateCharacterMovePosition(pet, game.state.map, game.state.idCounter);
    if (newMovePosition) {
        const collidedPet = collisionWithOtherPets(pet, petOwner, newMovePosition, game);
        if (collidedPet === undefined) {
            pet.x = newMovePosition.x;
            pet.y = newMovePosition.y;
        } else {
            const direction = calculateDirection(collidedPet, newMovePosition);
            const distance = (pet.width + collidedPet.width) / 2.5 - calculateDistance(collidedPet, newMovePosition);
            const totalWeight = pet.weight + collidedPet.weight;
            const factorPet = 1 / totalWeight * pet.weight;
            const factorCollidedPet = 1 / totalWeight * collidedPet.weight;
            moveByDirectionAndDistance(newMovePosition, direction, (distance) * factorCollidedPet, true, game.state.map, game.state.idCounter);
            moveByDirectionAndDistance(collidedPet, direction + Math.PI, (distance) * factorPet, true, game.state.map, game.state.idCounter);
            pet.x = newMovePosition.x;
            pet.y = newMovePosition.y;
        }
    }
}

function setMoveDirectionWithNoTarget(pet: TamerPetCharacter, petOwner: Character, game: Game) {
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
                    const nextWayPoint: Position | null = getNextWaypoint(pet, petOwner, game.state.map, game.performance.pathingCache, game.state.idCounter, game.state.time, game);
                    const canPetReachOwner = nextWayPoint !== null;
                    if (!canPetReachOwner) {
                        setCharacterPosition(pet, petOwner, game.state.map);
                    }else{
                        const direction = calculateDirection(pet, nextWayPoint);
                        pet.moveDirection = direction + (nextRandom(game.state.randomSeed) * Math.PI / 2 - Math.PI / 4);
                    }
                                    
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

function getTargetByBehavior(pet: TamerPetCharacter, petOwner: Character, game: Game): Character | null {
    let target: Character | null = null;
    if (pet.petTargetBehavior === "aggressive") {
        let characters = determineTargetsInDistance(pet, pet, game);
        const closest = determineClosestCharacter(pet, characters);
        target = closest.minDistanceCharacter;
    } else if (pet.petTargetBehavior === "protective") {
        let characters;
        if (game.state.bossStuff.endBossStarted) {
            characters = determineTargetsInDistance(pet, petOwner, game, 400, true);
        } else {
            characters = determineTargetsInDistance(pet, petOwner, game, 200);
        }
        let closest = determineClosestCharacter(petOwner, characters);
        if (closest.minDistance < 80) {
            target = closest.minDistanceCharacter;
        } else {
            closest = determineClosestCharacter(pet, characters);
            target = closest.minDistanceCharacter;
        }
    } else if (pet.petTargetBehavior === "passive") {
        //not searching for target
    }
    return target;
}

function determineTargetsInDistance(pet: TamerPetCharacter, center: Position, game: Game, distance: number = 200, ignoreMapEnemies: boolean = false): Character[] {
    if (pet.faction === FACTION_PLAYER) {
        if (ignoreMapEnemies) {
            return determineCharactersInDistance(center, undefined, [], game.state.bossStuff.bosses, distance);
        } else {
            return determineCharactersInDistance(center, game.state.map, [], game.state.bossStuff.bosses, distance);
        }
    } else {
        return determineCharactersInDistance(center, undefined, game.state.players, undefined, distance);
    }
}

function collisionWithOtherPets(pet: TamerPetCharacter, petOwner: Character, newMovePosition: Position, game: Game): TamerPetCharacter | undefined {
    for (let petIt of petOwner.pets!) {
        if (petIt === pet) continue;
        const distanceBefore = calculateDistance(petIt, pet);
        const distanceAfter = calculateDistance(petIt, newMovePosition);
        if (distanceBefore > distanceAfter && distanceAfter < (pet.width + petIt.width) / 2.5) {
            return petIt;
        }
    }
    return undefined;
}
