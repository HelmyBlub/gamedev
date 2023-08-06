import { determineCharactersInDistance, characterTakeDamage } from "../../character/character.js";
import { BossEnemyCharacter } from "../../character/enemy/bossEnemy.js";
import { TamerPetCharacter, tamerPetFeed } from "../../character/playerCharacters/tamer/tamerPetCharacter.js";
import { UpgradeOptionAndProbability } from "../../character/upgrade.js";
import { getNextId, calculateDirection, calculateDistance } from "../../game.js";
import { IdCounter, Position, Game } from "../../gameModel.js";
import { GameMap, moveByDirectionAndDistance } from "../../map/map.js";
import { Player } from "../../player.js";
import { ABILITIES_FUNCTIONS, Ability, AbilityOwner } from "../ability.js";
import { AbilityUpgradesFunctions, pushAbilityUpgradesOptions } from "../abilityUpgrade.js";
import { abilityPetBreathUpgradeExplodeApplyExplode, addAbilityPetBreathUpgradeExplode } from "./abilityPetBreathUpgradeExplode.js";
import { ABILITY_PET_BREATH_UPGARDE_RANGE_UP, AbilityPetBreathUpgradeRangeUp, abilityPetBreathUpgradeRangeUpGetAdditionFoodIntake, abilityPetBreathUpgradeRangeUpGetAdditionRange, addAbilityPetBreathUpgradeRangeUp } from "./abilityPetBreathUpgradeRangeUp.js";
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
        tickAbility: tickAbilityPetBreath,
        createAbility: createAbilityPetBreath,
        createAbilityBossUpgradeOptions: createAbilityPetBreathUpgradeOptions,
        paintAbility: paintAbilityPetBreath,
        setAbilityToLevel: setAbilityPetBreathToLevel,
        setAbilityToBossLevel: setAbilityPetBreathToBossLevel,
        abilityUpgradeFunctions: ABILITY_PET_BREATH_UPGRADE_FUNCTIONS,
        isPassive: true,
    };

    addAbilityPetBreathUpgradeSlow();
    addAbilityPetBreathUpgradeExplode();
    addAbilityPetBreathUpgradeRangeUp();
}

export function createAbilityPetBreath(
    idCounter: IdCounter,
    playerInputBinding?: string,
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

function createAbilityPetBreathUpgradeOptions(ability: Ability): UpgradeOptionAndProbability[] {
    let upgradeOptions: UpgradeOptionAndProbability[] = [];
    pushAbilityUpgradesOptions(ABILITY_PET_BREATH_UPGRADE_FUNCTIONS, upgradeOptions, ability);
    return upgradeOptions;
}

function setAbilityPetBreathToLevel(ability: Ability, level: number) {
    let abilityPetBreath = ability as AbilityPetBreath;
    abilityPetBreath.damage = level * 100;
}

function setAbilityPetBreathToBossLevel(ability: Ability, level: number) {
    let abilityPetBreath = ability as AbilityPetBreath;
    abilityPetBreath.damage = level * 25;
}

function paintAbilityPetBreath(ctx: CanvasRenderingContext2D, abilityOwner: AbilityOwner, ability: Ability, cameraPosition: Position, game: Game) {
    let abilityPetBreath = ability as AbilityPetBreath;
    if (!abilityPetBreath.active) return;
    let centerX = ctx.canvas.width / 2;
    let centerY = ctx.canvas.height / 2;
    let paintX = Math.floor(abilityOwner.x - cameraPosition.x + centerX);
    let paintY = Math.floor(abilityOwner.y - cameraPosition.y + centerY);

    const startAngle = abilityPetBreath.directionAngle - abilityPetBreath.angleSize / 2;
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = abilityPetBreath.color;
    ctx.beginPath();
    let pos1 = { x: paintX, y: paintY };
    let pos2 = { x: paintX, y: paintY };
    moveByDirectionAndDistance(pos1, abilityPetBreath.directionAngle - abilityPetBreath.angleSize / 2, abilityPetBreath.range, false);
    moveByDirectionAndDistance(pos2, abilityPetBreath.directionAngle + abilityPetBreath.angleSize / 2, abilityPetBreath.range, false);
    ctx.moveTo(paintX, paintY);
    ctx.lineTo(pos1.x, pos1.y);
    ctx.lineTo(pos2.x, pos2.y);
    ctx.fill();

    ctx.beginPath();
    ctx.arc(
        paintX,
        paintY,
        abilityPetBreath.range,
        startAngle,
        startAngle + abilityPetBreath.angleSize,
    )
    ctx.fill();
    ctx.globalAlpha = 1;
}

function tickAbilityPetBreath(abilityOwner: AbilityOwner, ability: Ability, game: Game) {
    let abilityPetBreath = ability as AbilityPetBreath;
    let pet = abilityOwner as TamerPetCharacter;
    const activeUntil = pet.foodIntakeLevel.underfedAt / 2;
    abilityPetBreath.active = pet.foodIntakeLevel.current > activeUntil;
    const underfed = pet.foodIntakeLevel.current < pet.foodIntakeLevel.underfedAt;
    if (!abilityPetBreath.active) return;

    abilityPetBreath.directionAngle = pet.moveDirection;
    const rangeUpgrade = abilityPetBreath.upgrades[ABILITY_PET_BREATH_UPGARDE_RANGE_UP] as AbilityPetBreathUpgradeRangeUp;
    let rangeBonus = 0;
    if(rangeUpgrade) rangeBonus = abilityPetBreathUpgradeRangeUpGetAdditionRange(pet, rangeUpgrade);
    abilityPetBreath.range = Math.sqrt(pet.width * 3) / 3 * (25 + rangeBonus) + 5;
    if(underfed){
        const underfedFactor = (pet.foodIntakeLevel.current - activeUntil) / activeUntil;
        abilityPetBreath.range *= underfedFactor;
    } 
    
    if (abilityPetBreath.nextTickTime === undefined) abilityPetBreath.nextTickTime = game.state.time + abilityPetBreath.tickInterval;
    if (abilityPetBreath.nextTickTime <= game.state.time) {
        detectPetBreathToCharactersHit(pet, abilityPetBreath, game.state.map, game.state.players, game.state.bossStuff.bosses, game);
        let foodChangePerSec = 5;
        if(rangeUpgrade) foodChangePerSec += abilityPetBreathUpgradeRangeUpGetAdditionFoodIntake(pet, rangeUpgrade);
        tamerPetFeed(pet, - abilityPetBreath.tickInterval / 1000 * foodChangePerSec, game.state.time);
        abilityPetBreath.nextTickTime += abilityPetBreath.tickInterval;
        if (abilityPetBreath.nextTickTime <= game.state.time) {
            abilityPetBreath.nextTickTime = game.state.time + abilityPetBreath.tickInterval;
        }
    }
}

function getDamage(pet: TamerPetCharacter, ability: AbilityPetBreath): number{
    return ability.damage * pet.sizeFactor;
}

function detectPetBreathToCharactersHit(abilityOwner: TamerPetCharacter, ability: AbilityPetBreath, map: GameMap, players: Player[], bosses: BossEnemyCharacter[], game: Game) {
    let maxEnemySizeEstimate = 40;

    let targetCharacters = determineCharactersInDistance(abilityOwner, map, players, bosses, ability.range + maxEnemySizeEstimate);
    const damage = getDamage(abilityOwner, ability);
    for (let charIt = targetCharacters.length - 1; charIt >= 0; charIt--) {
        let targetCharacter = targetCharacters[charIt];
        if (targetCharacter.isDead || targetCharacter.faction === abilityOwner.faction) continue;
        let isHit = detectPetBreathToCharacterHit(abilityOwner, ability, targetCharacter, targetCharacter.width);
        if (isHit) {
            abilityPetBreathUpgradeExplodeApplyExplode(ability, abilityOwner, targetCharacter, game);
            abilityPetBreathUpgradeSlowApplySlow(ability, targetCharacter, game);
            characterTakeDamage(targetCharacter, damage, game, ability.id);
        }
    }
}

function detectPetBreathToCharacterHit(abilityOwner: AbilityOwner, ability: AbilityPetBreath, pos: Position, enemyWidth: number): boolean {
    let angle = calculateDirection(abilityOwner, pos);
    if (angle < 0) angle += Math.PI * 2;
    let currentPetBreathAngle = ability.directionAngle % (Math.PI * 2);
    let startAngle = currentPetBreathAngle - ability.angleSize / 2;
    angle = (angle - startAngle) % (Math.PI * 2);
    if (angle < 0) angle += Math.PI * 2;

    if (angle <= ability.angleSize) {
        let distance = calculateDistance(abilityOwner, pos);
        if (distance < ability.range + enemyWidth) {
            return true;
        }
    }

    return false;
}
