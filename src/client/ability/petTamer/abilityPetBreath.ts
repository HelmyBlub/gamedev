import { determineCharactersInDistance, characterTakeDamage } from "../../character/character.js";
import { Character } from "../../character/characterModel.js";
import { BossEnemyCharacter } from "../../character/enemy/bossEnemy.js";
import { TamerPetCharacter, petHappinessToDisplayText, tamerPetFeed } from "../../character/playerCharacters/tamer/tamerPetCharacter.js";
import { UpgradeOptionAndProbability } from "../../character/upgrade.js";
import { AbilityDamageBreakdown } from "../../combatlog.js";
import { getNextId, calculateDirection, calculateDistance } from "../../game.js";
import { IdCounter, Position, Game, FACTION_PLAYER } from "../../gameModel.js";
import { getPointPaintPosition } from "../../gamePaint.js";
import { GameMap, moveByDirectionAndDistance } from "../../map/map.js";
import { Player } from "../../player.js";
import { ABILITIES_FUNCTIONS, Ability, AbilityObject, AbilityOwner } from "../ability.js";
import { AbilityUpgradesFunctions, pushAbilityUpgradesOptions } from "../abilityUpgrade.js";
import { abilityPetBreathUpgradeExplodeApplyExplode, addAbilityPetBreathUpgradeExplode } from "./abilityPetBreathUpgradeExplode.js";
import { ABILITY_PET_BREATH_UPGRADE_RANGE_UP, AbilityPetBreathUpgradeRangeUp, abilityPetBreathUpgradeRangeUpGetAdditionFoodIntake, abilityPetBreathUpgradeRangeUpGetAdditionRange, addAbilityPetBreathUpgradeRangeUp } from "./abilityPetBreathUpgradeRangeUp.js";
import { abilityPetBreathUpgradeSlowApplySlow, addAbilityPetBreathUpgradeSlow } from "./abilityPetBreathUpgradeSlow.js";

export type AbilityPetBreath = Ability & {
    damage: number,
    range: number,
    directionAngle: number,
    angleSize: number,
    tickInterval: number,
    nextTickTime?: number,
    active: boolean,
    color: string,
}
export const ABILITY_NAME_PET_BREATH = "Breath";
export const ABILITY_PET_BREATH_UPGRADE_FUNCTIONS: AbilityUpgradesFunctions = {};

export function addAbilityPetBreath() {
    ABILITIES_FUNCTIONS[ABILITY_NAME_PET_BREATH] = {
        createAbility: createAbilityPetBreath,
        createAbilityBossUpgradeOptions: createAbilityPetBreathUpgradeOptions,
        createDamageBreakDown: createDamageBreakDown,
        getMoreInfosText: getLongDescription,
        paintAbility: paintAbilityPetBreath,
        resetAbility: resetAbility,
        setAbilityToLevel: setAbilityPetBreathToLevel,
        setAbilityToBossLevel: setAbilityPetBreathToBossLevel,
        setAbilityToEnemyLevel: setAbilityToEnemyLevel,
        tickAbility: tickAbilityPetBreath,
        abilityUpgradeFunctions: ABILITY_PET_BREATH_UPGRADE_FUNCTIONS,
    };

    addAbilityPetBreathUpgradeSlow();
    addAbilityPetBreathUpgradeExplode();
    addAbilityPetBreathUpgradeRangeUp();
}

export function getPetAbilityBreathDamage(pet: TamerPetCharacter, ability: AbilityPetBreath): number {
    return ability.damage * pet.sizeFactor;
}

function createAbilityPetBreath(
    idCounter: IdCounter,
): AbilityPetBreath {
    return {
        id: getNextId(idCounter),
        name: ABILITY_NAME_PET_BREATH,
        damage: 100,
        angleSize: Math.PI * 0.75,
        directionAngle: 0,
        range: 20,
        passive: true,
        tickInterval: 100,
        upgrades: {},
        active: false,
        color: "red",
    };
}

function resetAbility(ability: Ability) {
    const abilityPetBreath = ability as AbilityPetBreath;
    abilityPetBreath.nextTickTime = undefined;
    abilityPetBreath.active = false;
}

function createDamageBreakDown(damage: number, ability: Ability, abilityObject: AbilityObject | undefined, damageAbilityName: string, game: Game): AbilityDamageBreakdown[] {
    const damageBreakDown: AbilityDamageBreakdown[] = [];
    if (abilityObject) {
        damageBreakDown.push({
            damage: damage,
            name: abilityObject.type,
        });
    } else {
        damageBreakDown.push({
            damage: damage,
            name: ability.name,
        });
    }
    return damageBreakDown;
}

function getLongDescription(): string[] {
    return [
        `Ability: ${ABILITY_NAME_PET_BREATH}`,
        `Frontal cone attack. Makes pet hungry.`,
    ];
}

function createAbilityPetBreathUpgradeOptions(ability: Ability, character: Character, game: Game): UpgradeOptionAndProbability[] {
    const upgradeOptions: UpgradeOptionAndProbability[] = [];
    pushAbilityUpgradesOptions(ABILITY_PET_BREATH_UPGRADE_FUNCTIONS, upgradeOptions, ability, character, game);
    return upgradeOptions;
}

function setAbilityPetBreathToLevel(ability: Ability, level: number) {
    const abilityPetBreath = ability as AbilityPetBreath;
    abilityPetBreath.damage = level * 100;
}

function setAbilityToEnemyLevel(ability: Ability, level: number, damageFactor: number) {
    const abilityPetBreath = ability as AbilityPetBreath;
    abilityPetBreath.damage = level / 2 * damageFactor;
}

function setAbilityPetBreathToBossLevel(ability: Ability, level: number) {
    const abilityPetBreath = ability as AbilityPetBreath;
    abilityPetBreath.damage = level * 4;
}

function paintAbilityPetBreath(ctx: CanvasRenderingContext2D, abilityOwner: AbilityOwner, ability: Ability, cameraPosition: Position, game: Game) {
    const abilityPetBreath = ability as AbilityPetBreath;
    if (!abilityPetBreath.active) return;
    const paintPos = getPointPaintPosition(ctx, abilityOwner, cameraPosition);
    const startAngle = abilityPetBreath.directionAngle - abilityPetBreath.angleSize / 2;
    ctx.globalAlpha = 0.5;
    if (abilityOwner.faction === FACTION_PLAYER) ctx.globalAlpha *= game.UI.playerGlobalAlphaMultiplier;
    ctx.fillStyle = abilityPetBreath.color;
    ctx.beginPath();
    const pos1 = { x: paintPos.x, y: paintPos.y };
    const pos2 = { x: paintPos.x, y: paintPos.y };
    moveByDirectionAndDistance(pos1, abilityPetBreath.directionAngle - abilityPetBreath.angleSize / 2, abilityPetBreath.range, false);
    moveByDirectionAndDistance(pos2, abilityPetBreath.directionAngle + abilityPetBreath.angleSize / 2, abilityPetBreath.range, false);
    ctx.moveTo(paintPos.x, paintPos.y);
    ctx.lineTo(pos1.x, pos1.y);
    ctx.lineTo(pos2.x, pos2.y);
    ctx.fill();

    ctx.beginPath();
    ctx.arc(
        paintPos.x,
        paintPos.y,
        abilityPetBreath.range,
        startAngle,
        startAngle + abilityPetBreath.angleSize,
    )
    ctx.fill();
    ctx.globalAlpha = 1;
}

function tickAbilityPetBreath(abilityOwner: AbilityOwner, ability: Ability, game: Game) {
    const abilityPetBreath = ability as AbilityPetBreath;
    const pet = abilityOwner as TamerPetCharacter;

    if (ability.disabled || petHappinessToDisplayText(pet.happines) === "very unhappy") {
        abilityPetBreath.active = false;
        return;
    }

    const activeUntil = pet.foodIntakeLevel.underfedAt / 2;
    abilityPetBreath.active = pet.foodIntakeLevel.current > activeUntil;
    const underfed = pet.foodIntakeLevel.current < pet.foodIntakeLevel.underfedAt;
    if (!abilityPetBreath.active) return;

    abilityPetBreath.directionAngle = pet.moveDirection;
    const rangeUpgrade = abilityPetBreath.upgrades[ABILITY_PET_BREATH_UPGRADE_RANGE_UP] as AbilityPetBreathUpgradeRangeUp;
    let rangeBonus = 0;
    if (rangeUpgrade) rangeBonus = abilityPetBreathUpgradeRangeUpGetAdditionRange(pet, rangeUpgrade);
    abilityPetBreath.range = Math.sqrt(pet.width * 3) / 3 * (25 + rangeBonus) + 5;
    if (underfed) {
        const underfedFactor = (pet.foodIntakeLevel.current - activeUntil) / activeUntil;
        abilityPetBreath.range *= underfedFactor;
    }

    if (abilityPetBreath.nextTickTime === undefined) abilityPetBreath.nextTickTime = game.state.time + abilityPetBreath.tickInterval;
    if (abilityPetBreath.nextTickTime <= game.state.time) {
        detectPetBreathToCharactersHit(pet, abilityPetBreath, game.state.map, game.state.players, game.state.bossStuff.bosses, game);
        let foodChangePerSec = 5;
        if (rangeUpgrade) foodChangePerSec += abilityPetBreathUpgradeRangeUpGetAdditionFoodIntake(pet, rangeUpgrade);
        tamerPetFeed(pet, - abilityPetBreath.tickInterval / 1000 * foodChangePerSec, game.state.time);
        abilityPetBreath.nextTickTime += abilityPetBreath.tickInterval;
        if (abilityPetBreath.nextTickTime <= game.state.time) {
            abilityPetBreath.nextTickTime = game.state.time + abilityPetBreath.tickInterval;
        }
    }
}

function detectPetBreathToCharactersHit(abilityOwner: TamerPetCharacter, ability: AbilityPetBreath, map: GameMap, players: Player[], bosses: BossEnemyCharacter[], game: Game) {
    const maxEnemySizeEstimate = 40;

    const targetCharacters = determineCharactersInDistance(abilityOwner, map, players, bosses, ability.range + maxEnemySizeEstimate);
    const damage = getPetAbilityBreathDamage(abilityOwner, ability);
    for (let charIt = targetCharacters.length - 1; charIt >= 0; charIt--) {
        const targetCharacter = targetCharacters[charIt];
        if (targetCharacter.isDead || targetCharacter.faction === abilityOwner.faction) continue;
        const isHit = detectPetBreathToCharacterHit(abilityOwner, ability, targetCharacter, targetCharacter.width);
        if (isHit) {
            abilityPetBreathUpgradeExplodeApplyExplode(ability, abilityOwner, targetCharacter, game);
            abilityPetBreathUpgradeSlowApplySlow(ability, targetCharacter, game);
            characterTakeDamage(targetCharacter, damage, game, ability.id, ability.name);
        }
    }
}

function detectPetBreathToCharacterHit(abilityOwner: AbilityOwner, ability: AbilityPetBreath, pos: Position, enemyWidth: number): boolean {
    let angle = calculateDirection(abilityOwner, pos);
    if (angle < 0) angle += Math.PI * 2;
    const currentPetBreathAngle = ability.directionAngle % (Math.PI * 2);
    const startAngle = currentPetBreathAngle - ability.angleSize / 2;
    angle = (angle - startAngle) % (Math.PI * 2);
    if (angle < 0) angle += Math.PI * 2;

    if (angle <= ability.angleSize) {
        const distance = calculateDistance(abilityOwner, pos);
        if (distance < ability.range + enemyWidth) {
            return true;
        }
    }

    return false;
}
