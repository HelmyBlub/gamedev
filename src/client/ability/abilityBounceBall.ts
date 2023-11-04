import { Character } from "../character/characterModel.js";
import { BUFF_NAME_BALL_PHYSICS, BuffBallPhysics, createBuffBallPhysics } from "../debuff/buffBallPhysics.js";
import { DEBUFFS_FUNCTIONS, DebuffFunctions, applyDebuff, removeCharacterDebuff } from "../debuff/debuff.js";
import { getNextId } from "../game.js";
import { Position, Game, IdCounter, FACTION_ENEMY } from "../gameModel.js";
import { getPointPaintPosition } from "../gamePaint.js";
import { playerInputBindingToDisplayValue } from "../playerInput.js";
import { ABILITIES_FUNCTIONS, Ability, AbilityOwner, detectSomethingToCharacterHit } from "./ability.js";

type AbilityBounceBall = Ability & {
    damage: number,
    radius: number,
    tickInterval: number,
    nextTickTime?: number,
}
export const ABILITY_NAME_BOUNCE_BALL = "Bounce Ball";

export function addAbilityBounceBall() {
    ABILITIES_FUNCTIONS[ABILITY_NAME_BOUNCE_BALL] = {
        activeAbilityCast: castBounceBall,
        createAbility: createAbilityBounceBall,
        paintAbility: paintAbility,
        paintAbilityUI: paintAbilityUI,
        setAbilityToLevel: setAbilityToLevel,
        setAbilityToBossLevel: setAbilityToBossLevel,
        setAbilityToEnemyLevel: setAbilityToEnemyLevel,
        tickAbility: tickAbility,
        canBeUsedByBosses: false,
    };
}

export function createAbilityBounceBall(
    idCounter: IdCounter,
    playerInputBinding?: string,
    damage: number = 50,
    radius: number = 30,
): AbilityBounceBall {
    return {
        id: getNextId(idCounter),
        name: ABILITY_NAME_BOUNCE_BALL,
        damage: damage,
        radius: radius,
        passive: false,
        tickInterval: 250,
        upgrades: {},
        playerInputBinding: playerInputBinding,
    };
}

function castBounceBall(abilityOwner: AbilityOwner, ability: Ability, castPosition: Position, isKeydown: boolean, game: Game) {
    if (!isKeydown) return;
    const abilityBounceBall = ability as AbilityBounceBall;
    console.log("cast bounce ball");
    const buffBallPhyscis = createBuffBallPhysics(ability.id);
    applyDebuff(buffBallPhyscis, abilityOwner as any, game);
}

function setAbilityToLevel(ability: Ability, level: number) {
    const abilityIce = ability as AbilityBounceBall;
    abilityIce.damage = level * 100;
    abilityIce.radius = 30 + level * 10;
}

function setAbilityToEnemyLevel(ability: Ability, level: number, damageFactor: number) {
    const abilityIce = ability as AbilityBounceBall;
    abilityIce.damage = level / 2 * damageFactor;
    abilityIce.radius = 30 + level * 3;
}

function setAbilityToBossLevel(ability: Ability, level: number) {
    const abilityIce = ability as AbilityBounceBall;
    abilityIce.damage = level * 10;
    abilityIce.radius = 60 + level * 12;
}

function paintAbilityUI(ctx: CanvasRenderingContext2D, ability: Ability, drawStartX: number, drawStartY: number, size: number, game: Game) {
    const bounceBall = ability as AbilityBounceBall;
    const fontSize = 12;
    const rectSize = size;

    ctx.lineWidth = 1;
    ctx.strokeStyle = "black";
    ctx.fillStyle = "white";
    ctx.fillRect(drawStartX, drawStartY, rectSize, rectSize);
    ctx.beginPath();
    ctx.rect(drawStartX, drawStartY, rectSize, rectSize);
    ctx.stroke();

    ctx.fillStyle = "black";
    ctx.font = fontSize + "px Arial";

    // if (feedPet.nextRechargeTime !== undefined && game.state.time < feedPet.nextRechargeTime) {
    //     ctx.fillStyle = "gray";
    //     const heightFactor = Math.max((feedPet.nextRechargeTime - game.state.time) / feedPet.baseRechargeTime, 0);
    //     ctx.fillRect(drawStartX, drawStartY, rectSize, rectSize * heightFactor);
    // }

    // const meatImage = getImage(ABILITY_NAME_FEED_PET);
    // if (meatImage) {
    //     ctx.drawImage(meatImage, drawStartX, drawStartY);
    // }

    if (bounceBall.playerInputBinding) {
        const keyBind = playerInputBindingToDisplayValue(bounceBall.playerInputBinding, game);
        ctx.fillStyle = "black";
        ctx.font = "10px Arial";
        ctx.fillText(keyBind, drawStartX + 1, drawStartY + 8);
    }
}

function findBallBuff(owner: AbilityOwner, abilityBall: AbilityBounceBall): BuffBallPhysics | undefined{
    if (!owner.debuffs) return undefined;
    for (let buff of owner.debuffs) {
        if (buff.name === BUFF_NAME_BALL_PHYSICS) {
            const ballBuff = buff as BuffBallPhysics;
            if (ballBuff.abilityRefId === abilityBall.id) {
                return ballBuff;
            }
        }
    }
    return undefined;
}

function paintAbility(ctx: CanvasRenderingContext2D, abilityOwner: AbilityOwner, ability: Ability, cameraPosition: Position, game: Game) {
    const abilityBall = ability as AbilityBounceBall;
    if (!findBallBuff(abilityOwner, abilityBall)) return;
    const paintPos = getPointPaintPosition(ctx, abilityOwner, cameraPosition);
    ctx.fillStyle = "red";
    if (abilityOwner.faction === FACTION_ENEMY) {
        ctx.fillStyle = "darkgray";
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
    const abilityBounceBall = ability as AbilityBounceBall;
    const ballBuff = findBallBuff(abilityOwner, abilityBounceBall);
    if (!ballBuff) return;

    if (abilityBounceBall.nextTickTime === undefined) abilityBounceBall.nextTickTime = game.state.time + abilityBounceBall.tickInterval;
    if (abilityBounceBall.nextTickTime <= game.state.time) {
        detectSomethingToCharacterHit(
            game.state.map,
            abilityOwner,
            abilityBounceBall.radius * 2,
            abilityOwner.faction,
            abilityBounceBall.damage,
            game.state.players,
            game.state.bossStuff.bosses,
            ability.id,
            undefined,
            game
        );

        abilityBounceBall.nextTickTime += abilityBounceBall.tickInterval;
        removeCharacterDebuff(ballBuff, abilityOwner as any, game);

        if (abilityBounceBall.nextTickTime <= game.state.time) {
            abilityBounceBall.nextTickTime = game.state.time + abilityBounceBall.tickInterval;
        }
    }
}
