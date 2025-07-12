import { characterTakeDamage, determineCharactersInDistance, findCharacterByIdAroundPosition } from "../../character/character.js";
import { Character } from "../../character/characterModel.js";
import { TamerPetCharacter } from "../../character/playerCharacters/tamer/tamerPetCharacter.js";
import { AbilityUpgradeOption, UpgradeOption, UpgradeOptionAndProbability } from "../../character/upgrade.js";
import { AbilityDamageBreakdown } from "../../combatlog.js";
import { applyDebuff } from "../../debuff/debuff.js";
import { createDebuffBoomerangStacks, DEBUFF_NAME_BOOMERANG_STACKS, DebuffBoomerangStacks } from "../../debuff/debuffBoomerangStack.js";
import { calculateDirection, calculateDistance, getCameraPosition, getNextId } from "../../game.js";
import { FACTION_ENEMY, FACTION_PLAYER, Game, IdCounter, Position } from "../../gameModel.js";
import { getPointPaintPosition } from "../../gamePaint.js";
import { calculateMovePosition, GameMap, moveByDirectionAndDistance } from "../../map/map.js";
import { nextRandom } from "../../randomNumberGenerator.js";
import { Ability, AbilityObject, AbilityOwner, PaintOrderAbility, ABILITIES_FUNCTIONS, findAbilityOwnerById } from "../ability.js";
import { AbilityUpgradesFunctions, pushAbilityUpgradesOptions, upgradeAbility } from "../abilityUpgrade.js";
import { ABILITY_PET_BOOMERANG_UPGRADE_BOUNCE, AbilityPetBoomerangUpgradeBounce, addAbilityPetBoomerangUpgradeBounce } from "./abilityPetBoomerangUpgradeBounce.js";
import { ABILITY_PET_BOOMERANG_UPGRADE_FIRE_SPEED, AbilityPetBoomerangUpgradeFireSpeed, addAbilityPetBoomerangUpgradeFireSpeed } from "./abilityPetBoomerangUpgradeFireSpeed.js";
import { ABILITY_PET_BOOMERANG_UPGRADE_STACK_DAMAGE_PER_CENT, AbilityPetBoomerangUpgradeStackingDamage, addAbilityPetBoomerangUpgradeStackingDamage } from "./abilityPetBoomerangUpgradeStackingDamage .js";

const TARGET_SEARCH_RANGE = 400;
const BASE_DAMAGE = 200;
export const ABILITY_BOOMERANG_BASE_THROW_INTERVAL = 1000;

export type AbilityPetBoomerang = Ability & {
    baseDamage: number,
    nextThrowTime?: number,
    duration: number,
    radius: number,
}

export type AbilityObjectPetBoomerang = AbilityObject & {
    deleteTime: number,
    radius: number,
    targetIdRef?: number,
    targetPosition?: Position,
    direction: number,
    speed: number,
    tickInterval: number,
    nextTickTime?: number,
    bounce: number,
    hitTarget: boolean,
    applyStacks: number,
}

export const ABILITY_PET_BOOMERANG_UPGRADE_FUNCTIONS: AbilityUpgradesFunctions = {};
export const ABILITY_NAME_PET_BOOMERANG = "Boomerang";

export function addAbilityPetBoomerang() {
    ABILITIES_FUNCTIONS[ABILITY_NAME_PET_BOOMERANG] = {
        createAbilityBossUpgradeOptions: createAbilityPetBoomerangUpgradeOptions,
        createAbility: createAbilityPetBoomerang,
        createDamageBreakDown: createDamageBreakDown,
        executeUpgradeOption: executeAbilityPetBoomerangUpgradeOption,
        deleteAbilityObject: deleteAbilityObjectPetBoomerang,
        getMoreInfosText: getLongDescription,
        paintAbilityObject: paintAbilityObjectPetBoomerang,
        resetAbility: resetAbility,
        setAbilityToLevel: setAbilityPetBoomerangToLevel,
        setAbilityToBossLevel: setAbilityPetBoomerangToBossLevel,
        setAbilityToEnemyLevel: setAbilityToEnemyLevel,
        tickAbility: tickAbilityPetBoomerang,
        tickAbilityObject: tickAbilityObjectPetBoomerang,
        abilityUpgradeFunctions: ABILITY_PET_BOOMERANG_UPGRADE_FUNCTIONS,
    };
    addAbilityPetBoomerangUpgradeFireSpeed();
    addAbilityPetBoomerangUpgradeBounce();
    addAbilityPetBoomerangUpgradeStackingDamage();
}

function createAbilityPetBoomerang(idCounter: IdCounter): AbilityPetBoomerang {
    return {
        id: getNextId(idCounter),
        name: ABILITY_NAME_PET_BOOMERANG,
        baseDamage: BASE_DAMAGE,
        passive: true,
        upgrades: {},
        radius: 20,
        duration: 5000,
    }
}

function createAbilityObjectBoomerang(
    position: Position,
    damage: number,
    abilityBoomerang: AbilityPetBoomerang,
    faction: string,
    target: Character | undefined,
    direction: number,
    game: Game
): AbilityObjectPetBoomerang {
    const stacksUpgrade = abilityBoomerang.upgrades[ABILITY_PET_BOOMERANG_UPGRADE_STACK_DAMAGE_PER_CENT] as AbilityPetBoomerangUpgradeStackingDamage;
    const bounceUpgrade = abilityBoomerang.upgrades[ABILITY_PET_BOOMERANG_UPGRADE_BOUNCE] as AbilityPetBoomerangUpgradeBounce;
    let object: AbilityObjectPetBoomerang = {
        type: ABILITY_NAME_PET_BOOMERANG,
        color: "red",
        damage: damage,
        faction: faction,
        x: position.x,
        y: position.y,
        radius: abilityBoomerang.radius,
        abilityIdRef: abilityBoomerang.id,
        deleteTime: game.state.time + abilityBoomerang.duration + (bounceUpgrade ? bounceUpgrade.bonusDuration : 0),
        targetIdRef: target ? target.id : undefined,
        direction: direction,
        speed: 4,
        tickInterval: 200,
        nextTickTime: game.state.time,
        hitTarget: false,
        bounce: bounceUpgrade ? bounceUpgrade.bounce : 0,
        applyStacks: stacksUpgrade ? stacksUpgrade.applyStacks : 0,
    };
    if (target === undefined) {
        object.targetPosition = { x: object.x, y: object.y };
        moveByDirectionAndDistance(object.targetPosition, object.direction, object.speed * 20, false);
    }

    return object;
}

function createDamageBreakDown(damage: number, ability: Ability, abilityObject: AbilityObject | undefined, damageAbilityName: string, game: Game): AbilityDamageBreakdown[] {
    const damageBreakDown: AbilityDamageBreakdown[] = [];
    damageBreakDown.push({
        damage: damage,
        name: ABILITY_NAME_PET_BOOMERANG,
    });
    return damageBreakDown;
}

function getLongDescription(): string[] {
    return [
        `Ability: ${ABILITY_NAME_PET_BOOMERANG}`,
        `Throw Boomerang in direction of enemy.`,
    ];
}

function resetAbility(ability: Ability) {
    const boomerang = ability as AbilityPetBoomerang;
    boomerang.nextThrowTime = undefined;
}

function setAbilityPetBoomerangToLevel(ability: Ability, level: number) {
    const boomerang = ability as AbilityPetBoomerang;
    boomerang.baseDamage = level * BASE_DAMAGE;
}

function setAbilityToEnemyLevel(ability: Ability, level: number, damageFactor: number) {
    const boomerang = ability as AbilityPetBoomerang;
    boomerang.baseDamage = level * 5 * damageFactor;
}

function setAbilityPetBoomerangToBossLevel(ability: Ability, level: number) {
    const boomerang = ability as AbilityPetBoomerang;
    boomerang.baseDamage = level * 25;
}

function onEnemyHit(abilityObject: AbilityObject, targetCharacter: Character, game: Game) {
    const boomerang = abilityObject as AbilityObjectPetBoomerang;
    if (boomerang.hitTarget) return;
    if (boomerang.targetIdRef === targetCharacter.id) {
        if (boomerang.bounce > 0) {
            const targets = determineCharactersInDistance(abilityObject, game.state.map, [], game.state.bossStuff.bosses, TARGET_SEARCH_RANGE / 2, FACTION_PLAYER, true);
            if (targets.length < 20) {
                for (let i = targets.length - 1; i >= 0; i--) {
                    if (targets[i].id === boomerang.targetIdRef) {
                        targets.splice(i, 1);
                        break;
                    }
                }
            }
            if (targets.length > 0) {
                const randomTargetIndex = Math.floor(nextRandom(game.state.randomSeed) * targets.length);
                const target = targets[randomTargetIndex];
                boomerang.targetIdRef = target.id;
                let targetPos: Position = { x: target.x, y: target.y };
                if (target.isMoving) {
                    targetPos = calculateMovePosition(targetPos, target.moveDirection, target.baseMoveSpeed, false);
                }
                boomerang.direction = calculateDirection(abilityObject, targetPos);
            }
            boomerang.bounce--;
        } else {
            boomerang.hitTarget = true;
        }
    }
}

function tickAbilityObjectPetBoomerang(abilityObject: AbilityObject, game: Game) {
    const petBoomerang = abilityObject as AbilityObjectPetBoomerang;
    moveByDirectionAndDistance(petBoomerang, petBoomerang.direction, petBoomerang.speed, false);

    if (!petBoomerang.nextTickTime || petBoomerang.nextTickTime <= game.state.time) {
        petBoomerang.nextTickTime = game.state.time + petBoomerang.tickInterval;
        detectBoomerangEnemyHit(game.state.map, petBoomerang, petBoomerang.radius, petBoomerang.faction, petBoomerang.abilityIdRef!, petBoomerang.damage, game, petBoomerang);
        if (!petBoomerang.hitTarget) {
            if (petBoomerang.targetIdRef !== undefined) {
                const target = findCharacterByIdAroundPosition(petBoomerang, TARGET_SEARCH_RANGE, game, petBoomerang.targetIdRef);
                if (target) {
                    if (target.state === "alive") {
                        const newDirection = calculateDirection(petBoomerang, target);
                        if (Math.abs(newDirection - petBoomerang.direction) < 0.5) {
                            petBoomerang.direction = newDirection;
                            if (petBoomerang.speed < 4) petBoomerang.speed = 4;
                        } else {
                            const nextPosition: Position = { x: petBoomerang.x, y: petBoomerang.y };
                            moveByDirectionAndDistance(nextPosition, petBoomerang.direction, petBoomerang.speed, false);
                            const modify = calculateMovePosition({ x: 0, y: 0 }, calculateDirection(petBoomerang, target), 0.75, false);
                            nextPosition.x += modify.x;
                            nextPosition.y += modify.y;
                            petBoomerang.direction = calculateDirection(petBoomerang, nextPosition);
                            petBoomerang.speed = calculateDistance(petBoomerang, nextPosition);
                        }
                    } else {
                        petBoomerang.targetIdRef = undefined;
                        petBoomerang.targetPosition = { x: target.x, y: target.y };
                    }
                } else {
                    petBoomerang.targetIdRef = undefined;
                    petBoomerang.hitTarget = true;
                }
            } else if (petBoomerang.targetPosition) {
                if (Math.abs(calculateDirection(petBoomerang, petBoomerang.targetPosition) - petBoomerang.direction) > 1) {
                    petBoomerang.hitTarget = true;
                }
            } else {
                // should not happen
                petBoomerang.hitTarget = true;
            }
        } else {
            const owner = findAbilityOwnerById(petBoomerang.abilityIdRef!, game);
            if (owner) {
                const nextPosition: Position = { x: petBoomerang.x, y: petBoomerang.y };
                moveByDirectionAndDistance(nextPosition, petBoomerang.direction, petBoomerang.speed, false);
                const modify = calculateMovePosition({ x: 0, y: 0 }, calculateDirection(petBoomerang, owner), 0.75, false);
                nextPosition.x += modify.x;
                nextPosition.y += modify.y;
                petBoomerang.direction = calculateDirection(petBoomerang, nextPosition);
                petBoomerang.speed = calculateDistance(petBoomerang, nextPosition);
            }
        }
    }
}

export function detectBoomerangEnemyHit(map: GameMap, circleCenter: Position, circleRadius: number, faction: string, abilityId: number, damage: number, game: Game, abilityObject: AbilityObjectPetBoomerang) {
    const maxEnemySizeEstimate = 40;
    const characters = determineCharactersInDistance(circleCenter, map, game.state.players, game.state.bossStuff.bosses, circleRadius * 2 + maxEnemySizeEstimate, faction, true);
    for (let charIt = characters.length - 1; charIt >= 0; charIt--) {
        const c = characters[charIt];
        const distance = calculateDistance(c, circleCenter);
        if (distance < circleRadius + c.width / 2) {
            let takeDamage = damage;
            const stacks = c.debuffs.find((d) => d.name === DEBUFF_NAME_BOOMERANG_STACKS) as DebuffBoomerangStacks;
            if (stacks) takeDamage *= (1 + stacks.stackCounter * ABILITY_PET_BOOMERANG_UPGRADE_STACK_DAMAGE_PER_CENT);
            characterTakeDamage(c, takeDamage, game, abilityId, ABILITY_NAME_PET_BOOMERANG, abilityObject);
            if (abilityObject.applyStacks > 0) {
                const debuff = createDebuffBoomerangStacks(abilityObject.applyStacks);
                applyDebuff(debuff, c, game);
            }
            onEnemyHit(abilityObject, c, game);
        }
    }
}

function deleteAbilityObjectPetBoomerang(abilityObject: AbilityObject, game: Game) {
    const abilityObjectPetBoomerang = abilityObject as AbilityObjectPetBoomerang;
    return abilityObjectPetBoomerang.deleteTime < game.state.time;
}

function paintAbilityObjectPetBoomerang(ctx: CanvasRenderingContext2D, abilityObject: AbilityObject, paintOrder: PaintOrderAbility, game: Game) {
    const petBoomerang = abilityObject as AbilityObjectPetBoomerang;
    const cameraPosition = getCameraPosition(game);
    const paintPos = getPointPaintPosition(ctx, abilityObject, cameraPosition, game.UI.zoom);
    ctx.fillStyle = abilityObject.faction === FACTION_ENEMY ? "black" : abilityObject.color;

    if (abilityObject.faction === FACTION_PLAYER) ctx.globalAlpha *= game.UI.playerGlobalAlphaMultiplier;
    ctx.beginPath();
    ctx.arc(
        paintPos.x,
        paintPos.y,
        petBoomerang.radius, 0, 2 * Math.PI,
    );
    ctx.fill();
    ctx.globalAlpha = 1;
}

function createAbilityPetBoomerangUpgradeOptions(ability: Ability, character: Character, game: Game): UpgradeOptionAndProbability[] {
    const upgradeOptions: UpgradeOptionAndProbability[] = [];
    pushAbilityUpgradesOptions(ABILITY_PET_BOOMERANG_UPGRADE_FUNCTIONS, upgradeOptions, ability, character, game);
    return upgradeOptions;
}

function executeAbilityPetBoomerangUpgradeOption(ability: Ability, character: Character, upgradeOption: UpgradeOption, game: Game) {
    const abilityUpgradeOption: AbilityUpgradeOption = upgradeOption as AbilityUpgradeOption;
    upgradeAbility(ability, character, abilityUpgradeOption);
}

function tickAbilityPetBoomerang(abilityOwner: AbilityOwner, ability: Ability, game: Game) {
    if (ability.disabled) return;
    const boomerang = ability as AbilityPetBoomerang;
    const pet = abilityOwner as TamerPetCharacter;

    if (!boomerang.nextThrowTime || boomerang.nextThrowTime < game.state.time) {
        const fireSpeedUpgrade = boomerang.upgrades[ABILITY_PET_BOOMERANG_UPGRADE_FIRE_SPEED] as AbilityPetBoomerangUpgradeFireSpeed;
        const fireSpeedFactor = fireSpeedUpgrade ? fireSpeedUpgrade.fireSpeedFactor : 1;
        boomerang.nextThrowTime = game.state.time + ABILITY_BOOMERANG_BASE_THROW_INTERVAL * fireSpeedFactor;
        let throwBoomerang: boolean = true;
        let target: Character | undefined = undefined;
        let direction = 0;
        if (abilityOwner.faction === FACTION_PLAYER) {
            //prio boss
            let targets = determineCharactersInDistance(abilityOwner, undefined, [], game.state.bossStuff.bosses, TARGET_SEARCH_RANGE, FACTION_PLAYER, true);
            if (targets.length <= 0) {
                targets = determineCharactersInDistance(abilityOwner, game.state.map, [], undefined, TARGET_SEARCH_RANGE, FACTION_PLAYER, true);
            }
            if (targets.length > 0) {
                const randomTargetIndex = Math.floor(nextRandom(game.state.randomSeed) * targets.length);
                target = targets[randomTargetIndex];
                direction = calculateDirection(abilityOwner, target);
            } else {
                throwBoomerang = false;
            }
        } else {
            direction = nextRandom(game.state.randomSeed) * Math.PI * 2;
        }
        if (throwBoomerang) {
            const damage = boomerang.baseDamage * pet.sizeFactor;
            const boomerangObject = createAbilityObjectBoomerang(abilityOwner, damage, boomerang, abilityOwner.faction, target, direction, game);
            game.state.abilityObjects.push(boomerangObject);
        }
    }
}
