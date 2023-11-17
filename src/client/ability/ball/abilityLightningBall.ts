import { getCharactersTouchingLine, getRandomAlivePlayerCharacter } from "../../character/character.js";
import { Character } from "../../character/characterModel.js";
import { AbilityUpgradeOption, UpgradeOption, UpgradeOptionAndProbability } from "../../character/upgrade.js";
import { BUFF_NAME_BALL_PHYSICS, BuffBallPhysics, createBuffBallPhysics, findBallBuff } from "../../debuff/buffBallPhysics.js";
import { applyDebuff, removeCharacterDebuff } from "../../debuff/debuff.js";
import { calculateDirection, getClientInfoByCharacterId, getNextId, modulo } from "../../game.js";
import { Position, Game, IdCounter, FACTION_ENEMY, ClientInfo } from "../../gameModel.js";
import { getPointPaintPosition } from "../../gamePaint.js";
import { calculateBounceAngle, calculateMovePosition, isPositionBlocking } from "../../map/map.js";
import { playerInputBindingToDisplayValue } from "../../playerInput.js";
import { ABILITIES_FUNCTIONS, Ability, AbilityOwner, detectSomethingToCharacterHit, getAbilityNameUiText, paintDefaultAbilityStatsUI } from "../ability.js";
import { AbilityUpgradesFunctions, pushAbilityUpgradesOptions, pushAbilityUpgradesUiTexts, upgradeAbility } from "../abilityUpgrade.js";
import { addAbilityLightningStrikesUpgradeHpLeach, lightningBallUpgradeHpLeachExecute } from "./abilityLightningBallUpgradeHpLeach.js";
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
        setAbilityToLevel: setAbilityToLevel,
        setAbilityToBossLevel: setAbilityToBossLevel,
        setAbilityToEnemyLevel: setAbilityToEnemyLevel,
        tickAbility: tickAbility,
        abilityUpgradeFunctions: ABILITY_LIGHTNING_BALL_UPGRADE_FUNCTIONS,
        canBeUsedByBosses: false,
    };
    addAbilityLightningBallUpgradeLightningStrikes();
    addAbilityLightningStrikesUpgradeHpLeach();
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

function castBounceBall(abilityOwner: AbilityOwner, ability: Ability, castPosition: Position, isKeydown: boolean, game: Game) {
    if (!isKeydown) return;
    const abilityBounceBall = ability as AbilityLightningBall;
    if (abilityBounceBall.currentCharges <= 0) return;
    const buffBallPhyscis = createBuffBallPhysics(ability.id);
    applyDebuff(buffBallPhyscis, abilityOwner as any, game);
    abilityBounceBall.moveDirection = calculateDirection(abilityOwner, castPosition);
    abilityBounceBall.currentCharges--;

    if (abilityBounceBall.nextRechargeTime === undefined) {
        abilityBounceBall.nextRechargeTime = game.state.time + abilityBounceBall.baseRechargeTime;
    }
    lightningBallUpgradeLightningStirkesExecute(abilityBounceBall, abilityOwner, game);
    const clientInfo: ClientInfo | undefined = getClientInfoByCharacterId(abilityOwner.id, game);
    if (clientInfo) clientInfo.lastMousePosition = castPosition;
}

function createAbilityBossSpeedBoostUpgradeOptions(ability: Ability): UpgradeOptionAndProbability[] {
    const upgradeOptions: UpgradeOptionAndProbability[] = [];
    pushAbilityUpgradesOptions(ABILITY_LIGHTNING_BALL_UPGRADE_FUNCTIONS, upgradeOptions, ability);
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
    const abilityBounceBall = ability as AbilityLightningBall;
    rechargeTick(abilityBounceBall, game);

    const ballBuff = findBallBuff(abilityOwner, abilityBounceBall);
    if (!ballBuff) return;

    const maxJumpDistance = game.state.map.tileSize / 3;
    const jumpTicks = Math.max(1, Math.round(abilityBounceBall.speed / maxJumpDistance));
    const tickDistnace = abilityBounceBall.speed / jumpTicks;
    for(let i = 0; i < jumpTicks; i++){
        jumpTick(abilityBounceBall, abilityOwner, ballBuff, tickDistnace, game);
    }
}

function jumpTick(abilityBounceBall: AbilityLightningBall, abilityOwner: AbilityOwner, ballBuff: BuffBallPhysics, moveDistance: number, game: Game){
    const newPosition = calculateMovePosition(abilityOwner, abilityBounceBall.moveDirection, moveDistance, false);
    lightningBallUpgradeHpLeachExecute(abilityBounceBall, moveDistance, abilityOwner);
    if (!isPositionBlocking(newPosition, game.state.map, game.state.idCounter, game)) {
        abilityOwner.x = newPosition.x;
        abilityOwner.y = newPosition.y;
        damageTick(abilityBounceBall, abilityOwner, game);
    }else{
        removeCharacterDebuff(ballBuff, abilityOwner as any, game);
    }
}

function damageTick(abilityBounceBall: AbilityLightningBall, abilityOwner: AbilityOwner, game: Game): number {
    const hitCount = detectSomethingToCharacterHit(
        game.state.map,
        abilityOwner,
        abilityBounceBall.radius * 2,
        abilityOwner.faction,
        abilityBounceBall.damage,
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
        `Ends if it hits a wall.`,
        "Ability stats:",
        `Damage: ${abilityBounceBall.damage}`,
    );
    pushAbilityUpgradesUiTexts(ABILITY_LIGHTNING_BALL_UPGRADE_FUNCTIONS, textLines, ability);

    return paintDefaultAbilityStatsUI(ctx, textLines, drawStartX, drawStartY);
}

