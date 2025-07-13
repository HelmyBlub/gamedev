import { determineCharactersInDistance, findCharacterByIdAroundPosition } from "../../character/character.js";
import { Character } from "../../character/characterModel.js";
import { findPetOwner, petHappinessToDisplayText, TamerPetCharacter } from "../../character/playerCharacters/tamer/tamerPetCharacter.js";
import { AbilityUpgradeOption, UpgradeOption, UpgradeOptionAndProbability } from "../../character/upgrade.js";
import { AbilityDamageBreakdown } from "../../combatlog.js";
import { calculateDirection, calculateDistance, getCameraPosition, getNextId } from "../../game.js";
import { FACTION_ENEMY, FACTION_PLAYER, Game, IdCounter, Position } from "../../gameModel.js";
import { getPointPaintPosition } from "../../gamePaint.js";
import { moveByDirectionAndDistance } from "../../map/map.js";
import { nextRandom } from "../../randomNumberGenerator.js";
import { Ability, AbilityObject, AbilityOwner, PaintOrderAbility, ABILITIES_FUNCTIONS } from "../ability.js";
import { createAbilityObjectExplode } from "../abilityExplode.js";
import { createAbilityObjectIceAura } from "../abilityIceAura.js";
import { AbilityUpgradesFunctions, pushAbilityUpgradesOptions, upgradeAbility } from "../abilityUpgrade.js";
import { ABILITY_PET_BOMBARD_UPGRADE_FIRE_SPEED, AbilityPetBombardUpgradeFireSpeed, addAbilityPetBombardUpgradeFireSpeed } from "./abilityPetBombardUpgradeFireSpeed.js";
import { ABILITY_PET_BOMBARD_UPGRADE_ICE, AbilityPetBombardUpgradeIce, addAbilityPetBombardUpgradeIce } from "./abilityPetBombardUpgradeIce.js";
import { ABILITY_PET_BOMBARD_UPGRADE_MORE_PROJECTILES, AbilityPetBombardUpgradeProjectiles, addAbilityPetBombardUpgradeProjectiles } from "./abilityPetBombardUpgradeProjectiles.js";

const TARGET_SEARCH_RANGE = 400;
const BASE_DAMAGE = 500;
export const ABILITY_BOMBARD_BASE_SHOOT_INTERVAL = 1000;
const EXPLOSION_BASE_RADIUS = 55;

export type AbilityPetBombard = Ability & {
    baseDamage: number,
    nextShootTime?: number,
}

export type AbilityObjectPetBombard = AbilityObject & {
    delete: boolean,
    radius: number,
    explosionRadius: number,
    targetIdRef?: number,
    targetPosition?: Position,
    direction: number,
    speed: number,
    tickInterval: number,
    iceSlowFactor: number,
    nextTickTime?: number,
}

export const ABILITY_PET_BOMBARD_UPGRADE_FUNCTIONS: AbilityUpgradesFunctions = {};
export const ABILITY_NAME_PET_BOMBARD = "Bombard";

export function addAbilityPetBombard() {
    ABILITIES_FUNCTIONS[ABILITY_NAME_PET_BOMBARD] = {
        createAbilityBossUpgradeOptions: createAbilityPetUpgradeOptions,
        createAbility: createAbilityPetBombard,
        createDamageBreakDown: createDamageBreakDown,
        executeUpgradeOption: executeAbilityUpgradeOption,
        deleteAbilityObject: deleteAbilityObject,
        getMoreInfosText: getLongDescription,
        paintAbilityObject: paintAbilityObject,
        resetAbility: resetAbility,
        setAbilityToLevel: setAbilityToLevel,
        setAbilityToBossLevel: setAbilityToBossLevel,
        setAbilityToEnemyLevel: setAbilityToEnemyLevel,
        tickAbility: tickAbility,
        tickAbilityObject: tickAbilityObject,
        abilityUpgradeFunctions: ABILITY_PET_BOMBARD_UPGRADE_FUNCTIONS,
    };
    addAbilityPetBombardUpgradeFireSpeed();
    addAbilityPetBombardUpgradeProjectiles();
    addAbilityPetBombardUpgradeIce();
}

function createAbilityPetBombard(idCounter: IdCounter): AbilityPetBombard {
    return {
        id: getNextId(idCounter),
        name: ABILITY_NAME_PET_BOMBARD,
        baseDamage: BASE_DAMAGE,
        passive: true,
        upgrades: {},
    }
}

function createAbilityObjectBombard(
    position: Position,
    damage: number,
    abilityBombard: AbilityPetBombard,
    explosionRadius: number,
    faction: string,
    target: Character | undefined,
    direction: number,
    game: Game
): AbilityObjectPetBombard {
    const iceUpgrade = abilityBombard.upgrades[ABILITY_PET_BOMBARD_UPGRADE_ICE] as AbilityPetBombardUpgradeIce;
    let object: AbilityObjectPetBombard = {
        type: ABILITY_NAME_PET_BOMBARD,
        color: "red",
        damage: damage,
        faction: faction,
        x: position.x,
        y: position.y,
        abilityIdRef: abilityBombard.id,
        targetIdRef: target ? target.id : undefined,
        direction: direction,
        speed: 8,
        tickInterval: 200,
        nextTickTime: game.state.time,
        radius: 10,
        explosionRadius: explosionRadius,
        delete: false,
        iceSlowFactor: iceUpgrade ? iceUpgrade.iceSlowFactor : 1,
    };
    if (target === undefined) {
        object.targetPosition = { x: object.x, y: object.y };
        moveByDirectionAndDistance(object.targetPosition, object.direction, TARGET_SEARCH_RANGE, false);
    } else {
        object.targetPosition = { x: target.x, y: target.y };
    }

    return object;
}

function createDamageBreakDown(damage: number, ability: Ability, abilityObject: AbilityObject | undefined, damageAbilityName: string, game: Game): AbilityDamageBreakdown[] {
    const damageBreakDown: AbilityDamageBreakdown[] = [];
    damageBreakDown.push({
        damage: damage,
        name: ABILITY_NAME_PET_BOMBARD,
    });
    return damageBreakDown;
}

function getLongDescription(): string[] {
    return [
        `Ability: ${ABILITY_NAME_PET_BOMBARD}`,
        `Shoot Rocket in direction of enemy.`,
        `Explodes when target reached.`,
    ];
}

function resetAbility(ability: Ability) {
    const bombard = ability as AbilityPetBombard;
    bombard.nextShootTime = undefined;
}

function setAbilityToLevel(ability: Ability, level: number) {
    const bombard = ability as AbilityPetBombard;
    bombard.baseDamage = level * BASE_DAMAGE;
}

function setAbilityToEnemyLevel(ability: Ability, level: number, damageFactor: number) {
    const bombard = ability as AbilityPetBombard;
    bombard.baseDamage = level * 5 * damageFactor;
}

function setAbilityToBossLevel(ability: Ability, level: number) {
    const bombard = ability as AbilityPetBombard;
    bombard.baseDamage = level * 25;
}

function tickAbilityObject(abilityObject: AbilityObject, game: Game) {
    const bombard = abilityObject as AbilityObjectPetBombard;
    moveByDirectionAndDistance(bombard, bombard.direction, bombard.speed, false);
    if (bombard.targetPosition === undefined || calculateDistance(bombard, bombard.targetPosition) < bombard.explosionRadius / 2) {
        bombard.delete = true;
        let explodeDelay = 0;
        if (bombard.faction === FACTION_ENEMY) explodeDelay = 1000;
        const explodeObject = createAbilityObjectExplode(bombard, bombard.damage, bombard.explosionRadius, bombard.faction, bombard.abilityIdRef, explodeDelay, game);
        game.state.abilityObjects.push(explodeObject);
        if (bombard.iceSlowFactor > 1) {
            const petSizeFactor = bombard.explosionRadius / EXPLOSION_BASE_RADIUS;
            const deleteTime = game.state.time + ABILITY_BOMBARD_BASE_SHOOT_INTERVAL * petSizeFactor + 1000;
            const iceObject = createAbilityObjectIceAura(bombard.damage / 10, explodeObject.radius, bombard.iceSlowFactor, bombard.faction, bombard.x, bombard.y, deleteTime, bombard.abilityIdRef!);
            game.state.abilityObjects.push(iceObject);
        }
        return;
    }

    if (!bombard.nextTickTime || bombard.nextTickTime <= game.state.time) {
        bombard.nextTickTime = game.state.time + bombard.tickInterval;
        if (bombard.targetIdRef !== undefined) {
            const target = findCharacterByIdAroundPosition(bombard, TARGET_SEARCH_RANGE, game, bombard.targetIdRef);
            if (target) {
                if (target.state === "alive") {
                    const newDirection = calculateDirection(bombard, target);
                    bombard.direction = newDirection;
                    bombard.targetPosition = { x: target.x, y: target.y };
                } else {
                    bombard.abilityIdRef = undefined;
                }
            }
        }
    }
}

function deleteAbilityObject(abilityObject: AbilityObject, game: Game) {
    const bombard = abilityObject as AbilityObjectPetBombard;
    return bombard.delete;
}

function paintAbilityObject(ctx: CanvasRenderingContext2D, abilityObject: AbilityObject, paintOrder: PaintOrderAbility, game: Game) {
    const bombard = abilityObject as AbilityObjectPetBombard;
    const cameraPosition = getCameraPosition(game);
    const paintPos = getPointPaintPosition(ctx, abilityObject, cameraPosition, game.UI.zoom);
    ctx.fillStyle = abilityObject.faction === FACTION_ENEMY ? "black" : abilityObject.color;

    if (abilityObject.faction === FACTION_PLAYER) ctx.globalAlpha *= game.UI.playerGlobalAlphaMultiplier;
    ctx.beginPath();
    ctx.arc(
        paintPos.x,
        paintPos.y,
        bombard.radius, 0, 2 * Math.PI,
    );
    ctx.fill();
    ctx.globalAlpha = 1;
}

function createAbilityPetUpgradeOptions(ability: Ability, character: Character, game: Game): UpgradeOptionAndProbability[] {
    const upgradeOptions: UpgradeOptionAndProbability[] = [];
    pushAbilityUpgradesOptions(ABILITY_PET_BOMBARD_UPGRADE_FUNCTIONS, upgradeOptions, ability, character, game);
    return upgradeOptions;
}

function executeAbilityUpgradeOption(ability: Ability, character: Character, upgradeOption: UpgradeOption, game: Game) {
    const abilityUpgradeOption: AbilityUpgradeOption = upgradeOption as AbilityUpgradeOption;
    upgradeAbility(ability, character, abilityUpgradeOption);
}

function tickAbility(abilityOwner: AbilityOwner, ability: Ability, game: Game) {
    if (ability.disabled) return;
    const bombard = ability as AbilityPetBombard;
    const pet = abilityOwner as TamerPetCharacter;

    if (!bombard.nextShootTime || bombard.nextShootTime < game.state.time) {
        const fireSpeedUpgrade = ability.upgrades[ABILITY_PET_BOMBARD_UPGRADE_FIRE_SPEED] as AbilityPetBombardUpgradeFireSpeed;
        let fireSpeedFactor = fireSpeedUpgrade ? fireSpeedUpgrade.fireSpeedFactor : 1;
        if (pet.faction === FACTION_ENEMY) fireSpeedFactor * 3;

        bombard.nextShootTime = game.state.time + ABILITY_BOMBARD_BASE_SHOOT_INTERVAL * pet.sizeFactor * fireSpeedFactor;
        let petOwnerTargets: Character[] = [];
        if (pet.faction === FACTION_PLAYER && pet.petTargetBehavior === "protective") {
            const petOwner = findPetOwner(pet, game);
            if (petOwner) {
                petOwnerTargets = determineCharactersInDistance(petOwner, game.state.map, [], game.state.bossStuff.bosses, TARGET_SEARCH_RANGE * 0.3, FACTION_PLAYER, true);
            }
        }
        const bossTargets = determineCharactersInDistance(abilityOwner, undefined, [], game.state.bossStuff.bosses, TARGET_SEARCH_RANGE * 1.5, FACTION_PLAYER, true);
        const targets = determineCharactersInDistance(abilityOwner, game.state.map, [], undefined, TARGET_SEARCH_RANGE, FACTION_PLAYER, true);
        const projectileUpgrade = ability.upgrades[ABILITY_PET_BOMBARD_UPGRADE_MORE_PROJECTILES] as AbilityPetBombardUpgradeProjectiles;
        const projectileCounter = projectileUpgrade ? projectileUpgrade.projectileCounter : 1;
        for (let i = 0; i < projectileCounter; i++) {
            let target: Character | undefined = undefined;
            let direction = 0;
            if (abilityOwner.faction === FACTION_PLAYER) {
                //prio boss
                if (petOwnerTargets.length > 0) {
                    const randomTargetIndex = Math.floor(nextRandom(game.state.randomSeed) * petOwnerTargets.length);
                    target = petOwnerTargets[randomTargetIndex];
                    direction = calculateDirection(abilityOwner, target);
                    petOwnerTargets = []; // only target one enmey close to player
                } else if (bossTargets.length > 0) {
                    const randomTargetIndex = Math.floor(nextRandom(game.state.randomSeed) * bossTargets.length);
                    target = bossTargets[randomTargetIndex];
                    direction = calculateDirection(abilityOwner, target);
                    bossTargets.splice(randomTargetIndex, 1);
                } else if (targets.length > 0) {
                    const randomTargetIndex = Math.floor(nextRandom(game.state.randomSeed) * targets.length);
                    target = targets[randomTargetIndex];
                    direction = calculateDirection(abilityOwner, target);
                    targets.splice(randomTargetIndex, 1);
                } else {
                    direction = nextRandom(game.state.randomSeed) * Math.PI * 2;
                }
            } else {
                direction = nextRandom(game.state.randomSeed) * Math.PI * 2;
            }
            const damage = bombard.baseDamage;
            const explosionRadius = EXPLOSION_BASE_RADIUS * pet.sizeFactor;
            const bombardObject = createAbilityObjectBombard(abilityOwner, damage, bombard, explosionRadius, abilityOwner.faction, target, direction, game);
            game.state.abilityObjects.push(bombardObject);
        }
    }
}
