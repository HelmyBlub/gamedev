import { ABILITIES_FUNCTIONS, createAbility, setAbilityToBossLevel } from "../../../ability/ability.js";
import { applyDebuff, removeCharacterDebuffs, tickCharacterDebuffs } from "../../../debuff/debuff.js";
import { calculateDirection, calculateDistance, getNextId } from "../../../game.js";
import { IdCounter, Game, Position, FACTION_ENEMY } from "../../../gameModel.js";
import { determineClosestCharacter, calculateAndSetMoveDirectionToPositionWithPathing, getPlayerCharacters, moveCharacterTick } from "../../character.js";
import { CHARACTER_TYPE_FUNCTIONS, Character, IMAGE_SLIME, createCharacter } from "../../characterModel.js";
import { paintCharacterWithAbilitiesDefault, paintCharatersPets } from "../../characterPaint.js";
import { PathingCache } from "../../pathing.js";
import { paintKingHpBar } from "../kingEnemy.js";
import { GameMapGodArea, getGodAreaMiddlePosition } from "../../../map/mapGodArea.js";
import { ABILITY_NAME_SEEKER } from "./abilitySeeker.js";
import { ABILITY_NAME_MOVING_FIRE } from "./abilityMovingFire.js";
import { ABILITY_NAME_TILE_EXPLOSION } from "./abilityTileExplosions.js";
import { ABILITY_NAME_MELEE, AbilityMelee } from "../../../ability/abilityMelee.js";
import { GodAbility, setGodAbilityPickUpPosition } from "./godAbility.js";
import { createDebuffDamageTaken } from "../../../debuff/debuffDamageTaken.js";


const FIRST_PICK_UP_DELAY = 3000;
export type GodEnemyCharacter = Character & {
    pickUpAbilityIndex?: number,
    pickUpCount: number,
    allAbilitiesPickedUp?: boolean,
    firstAttackedTime?: number,
};

export const CHARACTER_TYPE_GOD_ENEMY = "GodEnemyCharacter";

export function addGodEnemyType() {
    CHARACTER_TYPE_FUNCTIONS[CHARACTER_TYPE_GOD_ENEMY] = {
        tickFunction: tickEnemyCharacter,
        paintCharacterType: paint,
    }
}

export function spawnGodEnemy(godArea: GameMapGodArea, game: Game) {
    const spawn: Position = getGodAreaMiddlePosition(godArea, game.state.map)!;
    const king = createGodEnemy(game.state.idCounter, spawn, game);
    game.state.bossStuff.bosses.push(king);
}

export function applyExponentialStackingDamageTakenDebuff(target: Character, game: Game) {
    const factor = 2;
    const duration = 30000;
    const debuffDamageTaken = createDebuffDamageTaken(factor, duration, game.state.time, true);
    applyDebuff(debuffDamageTaken, target, game);
}

function createGodEnemy(idCounter: IdCounter, spawnPosition: Position, game: Game): GodEnemyCharacter {
    const bossSize = 60;
    const color = "black";
    const moveSpeed = 1;
    const hp = 5 * 1000 * 1000 * 1000;
    const experienceWorth = 0;
    const character = createCharacter(getNextId(idCounter), spawnPosition.x, spawnPosition.y, bossSize, bossSize, color, moveSpeed, hp, FACTION_ENEMY, CHARACTER_TYPE_GOD_ENEMY, experienceWorth);
    const godCharacter: GodEnemyCharacter = {
        ...character,
        pickUpCount: 0,
    };
    const abilityMelee = createAbility(ABILITY_NAME_MELEE, game.state.idCounter) as AbilityMelee;
    abilityMelee.damage = 50;
    godCharacter.abilities.push(abilityMelee);
    godCharacter.abilities.push(createAbility(ABILITY_NAME_SEEKER, game.state.idCounter));
    godCharacter.abilities.push(createAbility(ABILITY_NAME_MOVING_FIRE, game.state.idCounter));
    godCharacter.abilities.push(createAbility(ABILITY_NAME_TILE_EXPLOSION, game.state.idCounter));
    godCharacter.paint.image = IMAGE_SLIME;
    if (game.debug.lowKingHp) {
        godCharacter.hp = 50000;
        godCharacter.maxHp = 50000;
    }
    godCharacter.isRootImmune = true;
    setGodAbilityPickUpPosition(godCharacter, game);
    return godCharacter;
}

function tickEnemyCharacter(character: Character, game: Game, pathingCache: PathingCache | null) {
    const enemy = character as GodEnemyCharacter;
    if (enemy.isDead) return;
    if (enemy.firstAttackedTime === undefined) {
        if (enemy.hp < enemy.maxHp) {
            enemy.firstAttackedTime = game.state.time;
        }
        return;
    }

    let pickUpAbility = false;
    if (!enemy.allAbilitiesPickedUp) {
        if (enemy.pickUpCount === 0 && enemy.firstAttackedTime !== undefined && enemy.firstAttackedTime + FIRST_PICK_UP_DELAY <= game.state.time) {
            pickUpAbility = true;
        } else if (enemy.pickUpCount > 0 && enemy.pickUpCount <= (1 - enemy.hp / enemy.maxHp) * 10) {
            pickUpAbility = true;
        }
    }
    if (pickUpAbility) {
        const godAbilityToPickUp = getAbilityToPickUp(enemy);
        if (godAbilityToPickUp) {
            enemy.isMoving = true;
            enemy.isDebuffImmune = true;
            removeCharacterDebuffs(enemy, game);
            enemy.moveDirection = calculateDirection(enemy, godAbilityToPickUp.pickUpPosition!);
        }
    } else {
        const playerCharacters = getPlayerCharacters(game.state.players);
        const closest = determineClosestCharacter(enemy, playerCharacters);
        calculateAndSetMoveDirectionToPositionWithPathing(enemy, closest.minDistanceCharacter, game.state.map, pathingCache, game.state.idCounter, game.state.time, game);
    }

    moveCharacterTick(enemy, game.state.map, game.state.idCounter, game);
    if (pickUpAbility) {
        const godAbilityToPickUp = getAbilityToPickUp(enemy);
        if (godAbilityToPickUp) {
            const distance = calculateDistance(enemy, godAbilityToPickUp.pickUpPosition!);
            if (distance < enemy.width + 10) {
                godAbilityToPickUp.pickedUp = true;
                enemy.isDebuffImmune = false;
                enemy.pickUpCount++;
                enemy.pickUpAbilityIndex = undefined;
                setAbilityToBossLevel(godAbilityToPickUp, enemy.pickUpCount);
            }
        }
    }

    for (let ability of enemy.abilities) {
        const abilityFunctions = ABILITIES_FUNCTIONS[ability.name];
        if (abilityFunctions) {
            if (abilityFunctions.tickBossAI) abilityFunctions.tickBossAI(enemy, ability, game);
        }
    }
    tickCharacterDebuffs(enemy, game);
}

function getAbilityToPickUp(enemy: GodEnemyCharacter): GodAbility | undefined {
    if (enemy.pickUpAbilityIndex === undefined) {
        let closestNotPickedUpAbilityIndex: number | undefined = undefined;
        let closestDistance = 0;
        for (let i = 0; i < enemy.abilities.length; i++) {
            const godAbility = enemy.abilities[i] as GodAbility;
            if (godAbility.pickedUp === undefined || godAbility.pickedUp) continue;
            if (closestNotPickedUpAbilityIndex === undefined) {
                closestNotPickedUpAbilityIndex = i;
                closestDistance = calculateDistance(godAbility.pickUpPosition!, enemy);
            } else {
                const tempDistance = calculateDistance(godAbility.pickUpPosition!, enemy);
                if (tempDistance < closestDistance) {
                    closestNotPickedUpAbilityIndex = i;
                    closestDistance = tempDistance;
                }
            }
        }
        if (closestNotPickedUpAbilityIndex === undefined) {
            enemy.allAbilitiesPickedUp = true;
            return undefined;
        } else {
            enemy.pickUpAbilityIndex = closestNotPickedUpAbilityIndex;
        }
    }
    return enemy.abilities[enemy.pickUpAbilityIndex] as GodAbility;
}

function paint(ctx: CanvasRenderingContext2D, character: Character, cameraPosition: Position, game: Game) {
    if (character.isDead) return;
    paintCharatersPets(ctx, [character], cameraPosition, game);
    paintCharacterWithAbilitiesDefault(ctx, character, cameraPosition, game);
    paintKingHpBar(ctx, character);
}
