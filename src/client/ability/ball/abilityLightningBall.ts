import { Character } from "../../character/characterModel.js";
import { AbilityUpgradeOption, UpgradeOption, UpgradeOptionAndProbability } from "../../character/upgrade.js";
import { BUFF_NAME_BALL_PHYSICS, BuffBallPhysics, createBuffBallPhysics, findBallBuff } from "../../debuff/buffBallPhysics.js";
import { applyDebuff, removeCharacterDebuff } from "../../debuff/debuff.js";
import { calculateDirection, getClientInfoByCharacterId, getNextId } from "../../game.js";
import { Position, Game, IdCounter, FACTION_ENEMY, ClientInfo } from "../../gameModel.js";
import { getPointPaintPosition } from "../../gamePaint.js";
import { calculateMovePosition, isPositionBlocking } from "../../map/map.js";
import { playerInputBindingToDisplayValue } from "../../playerInput.js";
import { ABILITIES_FUNCTIONS, Ability, AbilityOwner, detectSomethingToCharacterHit, getAbilityNameUiText, paintDefaultAbilityStatsUI } from "../ability.js";
import { AbilityUpgradesFunctions, pushAbilityUpgradesOptions, pushAbilityUpgradesUiTexts, upgradeAbility } from "../abilityUpgrade.js";
import { addAbilityLightningBallUpgradeBounceBonus, lightningBallUpgradeBounceBonusGetBonusDamageFactor, lightningBallUpgradeBounceBonusSetBonusDamageFactor } from "./abilityLightningBallUpgradeBounceBonus.js";
import { addAbilityLightningBallUpgradeHpLeach, lightningBallUpgradeHpLeachExecute } from "./abilityLightningBallUpgradeHpLeach.js";
import { addAbilityLightningBallUpgradeIceAura, lightningBallUpgradeIceAuraExecute } from "./abilityLightningBallUpgradeIceAura.js";
import { addAbilityLightningBallUpgradeLightningStrikes, lightningBallUpgradeLightningStirkesExecute } from "./abilityLightningBallUpgradeLightningStrikesBuff.js";

export type AbilityLightningBall = Ability & {
    baseRechargeTime: number,
    nextRechargeTime?: number,
    currentCharges: number,
    maxCharges: number,
    damage: number,
    radius: number,
    moveDirection: number,
    speed: number,
    tickInterval: number,
    nextTickTime?: number,
}

export const ABILITY_NAME_LIGHTNING_BALL = "Lighning Ball";
export const ABILITY_LIGHTNING_BALL_UPGRADE_FUNCTIONS: AbilityUpgradesFunctions = {};

export function addAbilityLightningBall() {
    ABILITIES_FUNCTIONS[ABILITY_NAME_LIGHTNING_BALL] = {
        activeAbilityCast: castBounceBall,
        createAbility: createAbilityLightningBall,
        createAbilityBossUpgradeOptions: createAbilityBossSpeedBoostUpgradeOptions,
        executeUpgradeOption: executeAbilityUpgradeOption,
        paintAbility: paintAbility,
        paintAbilityUI: paintAbilityUI,
        paintAbilityStatsUI: paintAbilityStatsUI,
        resetAbility: resetAbility,
        setAbilityToLevel: setAbilityToLevel,
        setAbilityToBossLevel: setAbilityToBossLevel,
        setAbilityToEnemyLevel: setAbilityToEnemyLevel,
        tickAbility: tickAbility,
        tickBossAI: tickBossAI,
        abilityUpgradeFunctions: ABILITY_LIGHTNING_BALL_UPGRADE_FUNCTIONS,
        canBeUsedByBosses: true,
    };
    addAbilityLightningBallUpgradeLightningStrikes();
    addAbilityLightningBallUpgradeHpLeach();
    addAbilityLightningBallUpgradeBounceBonus();
    addAbilityLightningBallUpgradeIceAura();
}

export function createAbilityLightningBall(
    idCounter: IdCounter,
    playerInputBinding?: string,
    damage: number = 50,
    radius: number = 30,
): AbilityLightningBall {
    return {
        id: getNextId(idCounter),
        name: ABILITY_NAME_LIGHTNING_BALL,
        damage: damage,
        radius: radius,
        passive: false,
        tickInterval: 250,
        moveDirection: 0,
        baseRechargeTime: 4000,
        currentCharges: 2,
        maxCharges: 2,
        speed: 60,
        upgrades: {},
        playerInputBinding: playerInputBinding,
        tradable: true,
    };
}

export function getDamageAbilityLightningBall(abilityBounceBall: AbilityLightningBall, abilityOwner: AbilityOwner) {
    let damageFactor = 1;
    damageFactor += lightningBallUpgradeBounceBonusGetBonusDamageFactor(abilityBounceBall, abilityOwner);
    return abilityBounceBall.damage * damageFactor;
}

function tickBossAI(abilityOwner: AbilityOwner, ability: Ability, game: Game) {
    const abilityBall = ability as AbilityLightningBall;
    if (abilityOwner.debuffs) {
        const ballPhysics: BuffBallPhysics | undefined = abilityOwner.debuffs.find((d) => d.name === BUFF_NAME_BALL_PHYSICS) as any;
        if(ballPhysics) return;
    }
    let pos: Position = {
        x: abilityOwner.x,
        y: abilityOwner.y
    };
    if(abilityOwner.moveDirection){
        pos = calculateMovePosition(abilityOwner, abilityOwner.moveDirection, 1, false);
    }

    castBounceBall(abilityOwner, ability, pos, true, game);
}

function resetAbility(ability: Ability) {
    const ball = ability as AbilityLightningBall;
    ball.nextRechargeTime = undefined;
    ball.currentCharges = ball.maxCharges;
}

function castBounceBall(abilityOwner: AbilityOwner, ability: Ability, castPosition: Position, isKeydown: boolean, game: Game) {
    if (!isKeydown) return;
    const abilityLightningBall = ability as AbilityLightningBall;
    if (abilityLightningBall.currentCharges <= 0) return;
    const buffBallPhyscis = createBuffBallPhysics(ability.id, ability.name);
    applyDebuff(buffBallPhyscis, abilityOwner as any, game);
    abilityLightningBall.moveDirection = calculateDirection(abilityOwner, castPosition);
    abilityLightningBall.currentCharges--;

    if (abilityLightningBall.nextRechargeTime === undefined) {
        abilityLightningBall.nextRechargeTime = game.state.time + abilityLightningBall.baseRechargeTime;
    }
    lightningBallUpgradeBounceBonusSetBonusDamageFactor(abilityLightningBall, abilityOwner);
    lightningBallUpgradeLightningStirkesExecute(abilityLightningBall, abilityOwner, game);
    const clientInfo: ClientInfo | undefined = getClientInfoByCharacterId(abilityOwner.id, game);
    if (clientInfo) clientInfo.lastMousePosition = castPosition;
}

function createAbilityBossSpeedBoostUpgradeOptions(ability: Ability, character: Character, game: Game): UpgradeOptionAndProbability[] {
    const upgradeOptions: UpgradeOptionAndProbability[] = [];
    pushAbilityUpgradesOptions(ABILITY_LIGHTNING_BALL_UPGRADE_FUNCTIONS, upgradeOptions, ability, character, game);
    return upgradeOptions;
}

function executeAbilityUpgradeOption(ability: Ability, character: Character, upgradeOption: UpgradeOption, game: Game) {
    const abilityUpgradeOption: AbilityUpgradeOption = upgradeOption as AbilityUpgradeOption;
    upgradeAbility(ability, character, abilityUpgradeOption);
}

function setAbilityToLevel(ability: Ability, level: number) {
    const abilityBall = ability as AbilityLightningBall;
    abilityBall.damage = level * 100;
}

function setAbilityToEnemyLevel(ability: Ability, level: number, damageFactor: number) {
    const abilityBall = ability as AbilityLightningBall;
    abilityBall.damage = level / 2 * damageFactor;
}

function setAbilityToBossLevel(ability: Ability, level: number) {
    const abilityBall = ability as AbilityLightningBall;
    abilityBall.damage = level * 10;
}

function paintAbilityUI(ctx: CanvasRenderingContext2D, ability: Ability, drawStartX: number, drawStartY: number, size: number, game: Game) {
    const bounceBall = ability as AbilityLightningBall;
    const rectSize = size;

    ctx.lineWidth = 1;
    ctx.strokeStyle = "black";
    ctx.fillStyle = "white";
    ctx.fillRect(drawStartX, drawStartY, rectSize, rectSize);
    ctx.beginPath();
    ctx.rect(drawStartX, drawStartY, rectSize, rectSize);
    ctx.stroke();

    if (bounceBall.nextRechargeTime !== undefined && game.state.time < bounceBall.nextRechargeTime) {
        ctx.fillStyle = "gray";
        const heightFactor = Math.max((bounceBall.nextRechargeTime - game.state.time) / bounceBall.baseRechargeTime, 0);
        ctx.fillRect(drawStartX, drawStartY, rectSize, rectSize * heightFactor);
    }

    const fontSize = Math.floor(size * 0.8);
    ctx.fillStyle = "black";
    ctx.font = fontSize + "px Arial";
    ctx.fillText("" + bounceBall.currentCharges, drawStartX, drawStartY + rectSize - (rectSize - fontSize * 0.9));

    if (bounceBall.playerInputBinding) {
        const keyBind = playerInputBindingToDisplayValue(bounceBall.playerInputBinding, game);
        ctx.fillStyle = "black";
        ctx.font = "10px Arial";
        ctx.fillText(keyBind, drawStartX + 1, drawStartY + 8);
    }
}

function paintAbility(ctx: CanvasRenderingContext2D, abilityOwner: AbilityOwner, ability: Ability, cameraPosition: Position, game: Game) {
    const abilityBall = ability as AbilityLightningBall;
    if (!findBallBuff(abilityOwner, abilityBall)) return;
    const paintPos = getPointPaintPosition(ctx, abilityOwner, cameraPosition);
    ctx.fillStyle = "blue";
    if (abilityOwner.faction === FACTION_ENEMY) {
        ctx.fillStyle = "darkblue";
    }

    ctx.beginPath();
    ctx.arc(
        paintPos.x,
        paintPos.y,
        abilityBall.radius, 0, 2 * Math.PI
    );
    ctx.fill();
}

function tickAbility(abilityOwner: AbilityOwner, ability: Ability, game: Game) {
    const abilityLightningBall = ability as AbilityLightningBall;
    rechargeTick(abilityLightningBall, game);

    const ballBuff = findBallBuff(abilityOwner, abilityLightningBall);
    if (!ballBuff) return;

    const maxJumpDistance = game.state.map.tileSize / 3;
    const jumpTicks = Math.max(1, Math.round(abilityLightningBall.speed / maxJumpDistance));
    const tickDistnace = abilityLightningBall.speed / jumpTicks;
    for (let i = 0; i < jumpTicks; i++) {
        let end = jumpTick(abilityLightningBall, abilityOwner, ballBuff, tickDistnace, game);
        if(end) break;
    }
}

function jumpTick(abilityLightningBall: AbilityLightningBall, abilityOwner: AbilityOwner, ballBuff: BuffBallPhysics, moveDistance: number, game: Game): boolean {
    const newPosition = calculateMovePosition(abilityOwner, abilityLightningBall.moveDirection, moveDistance, false);
    lightningBallUpgradeHpLeachExecute(abilityLightningBall, moveDistance, abilityOwner);
    if (!isPositionBlocking(newPosition, game.state.map, game.state.idCounter, game)) {
        abilityOwner.x = newPosition.x;
        abilityOwner.y = newPosition.y;
        damageTick(abilityLightningBall, abilityOwner, game);
        return false;
    } else {
        lightningBallUpgradeIceAuraExecute(abilityLightningBall, abilityOwner, game);
        removeCharacterDebuff(ballBuff, abilityOwner as any, game);
        return true;
    }
}

function damageTick(abilityBounceBall: AbilityLightningBall, abilityOwner: AbilityOwner, game: Game): number {
    const hitCount = detectSomethingToCharacterHit(
        game.state.map,
        abilityOwner,
        abilityBounceBall.radius * 2,
        abilityOwner.faction,
        getDamageAbilityLightningBall(abilityBounceBall, abilityOwner),
        game.state.players,
        game.state.bossStuff.bosses,
        abilityBounceBall.id,
        undefined,
        game
    );
    return hitCount;
}

function rechargeTick(abilityBounceBall: AbilityLightningBall, game: Game) {
    if (abilityBounceBall.nextRechargeTime != undefined && abilityBounceBall.nextRechargeTime <= game.state.time) {
        abilityBounceBall.currentCharges++;
        if (abilityBounceBall.currentCharges < abilityBounceBall.maxCharges) {
            abilityBounceBall.nextRechargeTime = game.state.time + abilityBounceBall.baseRechargeTime;
        } else {
            abilityBounceBall.nextRechargeTime = undefined;
        }
    }
}

function paintAbilityStatsUI(ctx: CanvasRenderingContext2D, ability: Ability, drawStartX: number, drawStartY: number, game: Game): { width: number, height: number } {
    const abilityBounceBall = ability as AbilityLightningBall;
    const textLines: string[] = getAbilityNameUiText(ability);
    textLines.push(
        `Key: ${playerInputBindingToDisplayValue(abilityBounceBall.playerInputBinding!, game)}`,
        `Click to become a lightning ball.`,
        `Move with lightning speed.`,
        `Immune to damage.`,
        `Ends if it hits a wall.`,
        "Ability stats:",
        `Damage: ${abilityBounceBall.damage}`,
    );
    pushAbilityUpgradesUiTexts(ABILITY_LIGHTNING_BALL_UPGRADE_FUNCTIONS, textLines, ability);

    return paintDefaultAbilityStatsUI(ctx, textLines, drawStartX, drawStartY);
}

