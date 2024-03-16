import { determineClosestCharacter, findCharacterById, getPlayerCharacters } from "../../character.js";
import { calculateDirection, calculateDistance, getCameraPosition, getNextId } from "../../../game.js";
import { Game, IdCounter, Position } from "../../../gameModel.js";
import { getPointPaintPosition, paintTextWithOutline } from "../../../gamePaint.js";
import { ABILITIES_FUNCTIONS, Ability, AbilityObject, AbilityObjectCircle, AbilityOwner, PaintOrderAbility, detectAbilityObjectCircleToCharacterHit } from "../../../ability/ability.js";
import { GodAbility } from "./godAbility.js";
import { GodEnemyCharacter, applyExponentialStackingDamageTakenDebuff } from "./godEnemy.js";
import { Character } from "../../characterModel.js";
import { GAME_IMAGES, loadImage } from "../../../imageLoad.js";

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

const IMAGE_EYE = "eye";
GAME_IMAGES[IMAGE_EYE] = {
    imagePath: "/images/eye.png",
    spriteRowHeights: [],
    spriteRowWidths: [],
};

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
    const abiltiySeeker = ability as AbilitySeeker;
    const position: Position = !abiltiySeeker.pickedUp && abiltiySeeker.pickUpPosition ? abiltiySeeker.pickUpPosition : abilityOwner;
    const paintPos = getPointPaintPosition(ctx, position, cameraPosition);
    if (abiltiySeeker.pickedUp) paintPos.y += 10;
    const eyeImageRef = GAME_IMAGES[IMAGE_EYE];
    loadImage(eyeImageRef);
    const god = abilityOwner as GodEnemyCharacter;
    const sizeFactor = abiltiySeeker.pickedUp ? 0.4 : 0.5 + god.pickUpCount * 0.1;
    if (eyeImageRef.imageRef?.complete) {
        const eyeImage: HTMLImageElement = eyeImageRef.imageRef;
        ctx.drawImage(
            eyeImage,
            0,
            0,
            eyeImage.width,
            eyeImage.height,
            Math.floor(paintPos.x - eyeImage.width / 2),
            Math.floor(paintPos.y - eyeImage.height / 2),
            Math.floor(eyeImage.width * sizeFactor),
            Math.floor(eyeImage.height * sizeFactor)
        )
    }
    if (!abiltiySeeker.pickedUp) {
        ctx.font = "bold 16px Arial";
        paintTextWithOutline(ctx, "white", "black", `Lvl ${god.pickUpCount + 1}`, paintPos.x, paintPos.y + 25, true, 2);
    }
}

function paintAbilityObject(ctx: CanvasRenderingContext2D, abilityObject: AbilityObject, paintOrder: PaintOrderAbility, game: Game) {
    const abilityObjectFireCircle = abilityObject as AbilityObjectSeekerGround;
    const cameraPosition = getCameraPosition(game);
    const paintPos = getPointPaintPosition(ctx, abilityObject, cameraPosition);

    if (paintOrder === "beforeCharacterPaint" && abilityObjectFireCircle.subType === "SeekerGround") {
        ctx.fillStyle = abilityObject.color;
        ctx.globalAlpha = 0.7;
        ctx.beginPath();
        ctx.arc(
            paintPos.x,
            paintPos.y,
            abilityObjectFireCircle.radius, 0, 2 * Math.PI
        );
        ctx.fill();
        ctx.globalAlpha = 1;
    } else if (paintOrder === "afterCharacterPaint" && abilityObjectFireCircle.subType !== "SeekerGround") {
        const abilityFollow = abilityObject as AbilityObjectSeekerFollow;
        const eyeImageRef = GAME_IMAGES[IMAGE_EYE];
        loadImage(eyeImageRef);
        const sizeFactor = 0.5;
        let direction = 0;
        if (abilityFollow.playerReachedTime === undefined) {
            const target = findCharacterById(getPlayerCharacters(game.state.players), abilityFollow.targetPlayerCharacterId);
            if (!target) return;
            direction = calculateDirection(abilityObject, target) + Math.PI;
        } else {
            direction = (game.state.time / 100) % (Math.PI * 2)
        }
        if (eyeImageRef.imageRef?.complete) {
            const eyeImage: HTMLImageElement = eyeImageRef.imageRef;
            ctx.translate(paintPos.x, paintPos.y);
            ctx.rotate(direction);
            ctx.translate(-paintPos.x, -paintPos.y);
            const width = Math.floor(eyeImage.width * sizeFactor);
            const height = Math.floor(eyeImage.height * sizeFactor);
            ctx.drawImage(
                eyeImage,
                0,
                0,
                eyeImage.width,
                eyeImage.height,
                Math.floor(paintPos.x - width / 2),
                Math.floor(paintPos.y - height / 2),
                width,
                height
            )
            ctx.resetTransform();
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

