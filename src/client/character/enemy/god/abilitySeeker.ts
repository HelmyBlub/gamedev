import { determineClosestCharacter, findCharacterById, getPlayerCharacters } from "../../character.js";
import { calculateDirection, calculateDistance, getCameraPosition, getNextId } from "../../../game.js";
import { Game, IdCounter, Position } from "../../../gameModel.js";
import { getPointPaintPosition, paintTextWithOutline } from "../../../gamePaint.js";
import { ABILITIES_FUNCTIONS, Ability, AbilityObject, AbilityObjectCircle, AbilityOwner, PaintOrderAbility, detectAbilityObjectCircleToCharacterHit } from "../../../ability/ability.js";
import { GodAbility } from "./godAbility.js";
import { applyExponentialStackingDamageTakenDebuff } from "./godEnemy.js";
import { Character } from "../../characterModel.js";


export const ABILITY_NAME_SEEKER = "Seeker";
export type AbilitySeeker = GodAbility & {
    cooldown: number,
    cooldownFinishedTime: number,
    groundRadius: number,
}

export type AbilityObjectSeekerGround = AbilityObjectCircle & {
    subType: "SeekerGround",
    tickInterval: number,
    nextTickTime?: number,
}

export type AbilityObjectSeekerFollow = AbilityObjectCircle & {
    subType: "SeekerFollow",
    targetPlayerCharacterId: number,
    groundSpawnDelay: number,
    playerReachedTime?: number,
    moveSpeed: number,
    moveSpeedIncreaseFactor: number,
    groundCreated?: boolean,
    groundRadius: number,
}

export function addGodAbilitySeeker() {
    ABILITIES_FUNCTIONS[ABILITY_NAME_SEEKER] = {
        createAbility: createAbility,
        deleteAbilityObject: deleteObject,
        onObjectHit: onObjectHit,
        paintAbility: paintAbility,
        paintAbilityObject: paintAbilityObject,
        setAbilityToBossLevel: setAbilityToBossLevel,
        tickAbilityObject: tickAbilityObject,
        tickBossAI: tickBossAI,
    };
}

function createAbility(
    idCounter: IdCounter,
    playerInputBinding?: string,
): AbilitySeeker {
    return {
        id: getNextId(idCounter),
        name: ABILITY_NAME_SEEKER,
        cooldown: 5000,
        cooldownFinishedTime: 0,
        groundRadius: 50,
        pickedUp: false,
        passive: false,
        playerInputBinding: playerInputBinding,
        upgrades: {},
    };
}

function createObjectFollow(targetCharacterID: number, owner: AbilityOwner, faction: string, groundRadius: number): AbilityObjectSeekerFollow {
    return {
        type: ABILITY_NAME_SEEKER,
        x: owner.x,
        y: owner.y,
        radius: 6,
        color: "black",
        faction: faction,
        subType: "SeekerFollow",
        moveSpeed: 1.5,
        targetPlayerCharacterId: targetCharacterID,
        damage: 0,
        moveSpeedIncreaseFactor: 1.001,
        groundSpawnDelay: 2000,
        groundRadius: groundRadius,
    }
}

function createObjectGround(abilityObject: AbilityObjectSeekerFollow, gameTime: number): AbilityObjectSeekerGround {
    return {
        type: ABILITY_NAME_SEEKER,
        x: abilityObject.x,
        y: abilityObject.y,
        radius: abilityObject.groundRadius,
        color: "black",
        damage: 10,
        faction: abilityObject.faction,
        subType: "SeekerGround",
        tickInterval: 250,
    }
}

function onObjectHit(ability: AbilityObject, targetCharacter: Character, game: Game) {
    applyExponentialStackingDamageTakenDebuff(targetCharacter, game);
}

function setAbilityToBossLevel(ability: Ability, level: number) {
    const abilitySeeker = ability as AbilitySeeker;
    abilitySeeker.groundRadius = 30 + level * 20;
}

function paintAbility(ctx: CanvasRenderingContext2D, abilityOwner: AbilityOwner, ability: Ability, cameraPosition: Position, game: Game) {
    const abiltiyMovingFire = ability as AbilitySeeker;
    const position: Position | undefined = abiltiyMovingFire.pickedUp ? undefined : abiltiyMovingFire.pickUpPosition;
    if (!position) return;
    const paintPos = getPointPaintPosition(ctx, position, cameraPosition);
    ctx.font = "20px Arial";
    paintTextWithOutline(ctx, "white", "black", "Seeker", paintPos.x, paintPos.y, true);
}

function paintAbilityObject(ctx: CanvasRenderingContext2D, abilityObject: AbilityObject, paintOrder: PaintOrderAbility, game: Game) {
    const abilityObjectFireCircle = abilityObject as AbilityObjectSeekerGround;
    const cameraPosition = getCameraPosition(game);
    const paintPos = getPointPaintPosition(ctx, abilityObject, cameraPosition);

    if ((paintOrder === "beforeCharacterPaint" && abilityObjectFireCircle.subType === "SeekerGround")
        || (paintOrder === "afterCharacterPaint" && abilityObjectFireCircle.subType !== "SeekerGround")
    ) {
        ctx.fillStyle = abilityObject.color;
        ctx.beginPath();
        ctx.arc(
            paintPos.x,
            paintPos.y,
            abilityObjectFireCircle.radius, 0, 2 * Math.PI
        );
        ctx.fill();
        if (abilityObjectFireCircle.subType !== "SeekerGround") {
            ctx.lineWidth = 1;
            ctx.strokeStyle = "white";
            ctx.stroke();
        }
    }
}

function tickBossAI(abilityOwner: AbilityOwner, ability: Ability, game: Game) {
    const seeker = ability as AbilitySeeker;
    if (!seeker.pickedUp) return;
    if (seeker.cooldownFinishedTime < game.state.time) {
        seeker.cooldownFinishedTime = game.state.time + seeker.cooldown;
        const closest = determineClosestCharacter(abilityOwner, getPlayerCharacters(game.state.players));
        if (!closest.minDistanceCharacter) return;
        const seekerFollow = createObjectFollow(closest.minDistanceCharacter.id, abilityOwner, abilityOwner.faction, seeker.groundRadius);
        game.state.abilityObjects.push(seekerFollow);
    }
}

function tickAbilityObject(abilityObject: AbilityObject, game: Game) {
    const abilityObjectFireCircle = abilityObject as AbilityObjectSeekerGround;
    if (abilityObjectFireCircle.subType === "SeekerGround") {
        if (abilityObjectFireCircle.nextTickTime === undefined) abilityObjectFireCircle.nextTickTime = game.state.time + abilityObjectFireCircle.tickInterval;
        if (abilityObjectFireCircle.nextTickTime <= game.state.time) {
            detectAbilityObjectCircleToCharacterHit(game.state.map, abilityObjectFireCircle, game);
            abilityObjectFireCircle.nextTickTime += abilityObjectFireCircle.tickInterval;
        }
    } else if (abilityObjectFireCircle.subType === "SeekerFollow") {
        const abilityFollow = abilityObject as AbilityObjectSeekerFollow;
        const target = findCharacterById(getPlayerCharacters(game.state.players), abilityFollow.targetPlayerCharacterId);
        if (!target) return;
        const distance = calculateDistance(abilityFollow, target);
        if (abilityFollow.playerReachedTime === undefined) {
            if (distance <= abilityFollow.moveSpeed + 5) {
                abilityFollow.playerReachedTime = game.state.time;
            } else {
                const direction = calculateDirection(abilityFollow, target);
                abilityFollow.x = abilityFollow.x + Math.cos(direction) * abilityFollow.moveSpeed;
                abilityFollow.y = abilityFollow.y + Math.sin(direction) * abilityFollow.moveSpeed;
                abilityFollow.moveSpeed *= abilityFollow.moveSpeedIncreaseFactor;
            }
        } else {
            if (!abilityFollow.groundCreated && abilityFollow.playerReachedTime + abilityFollow.groundSpawnDelay <= game.state.time) {
                const seekerGround = createObjectGround(abilityFollow, game.state.time);
                abilityFollow.groundCreated = true;
                game.state.abilityObjects.push(seekerGround);
            }
        }
    }
}

function deleteObject(abilityObject: AbilityObject, game: Game): boolean {
    const seekerFollow = abilityObject as AbilityObjectSeekerFollow;
    if (seekerFollow.subType === "SeekerFollow" && seekerFollow.playerReachedTime !== undefined) {
        return seekerFollow.playerReachedTime + seekerFollow.groundSpawnDelay < game.state.time;
    }
    return false;
}

