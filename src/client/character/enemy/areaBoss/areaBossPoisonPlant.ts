import { Ability } from "../../../ability/ability.js";
import { getNextId } from "../../../game.js";
import { FACTION_ENEMY, Game, IdCounter, Position } from "../../../gameModel.js";
import { getPointPaintPosition } from "../../../gamePaint.js";
import { GAME_IMAGES, loadImage } from "../../../imageLoad.js";
import { findNearNonBlockingPosition } from "../../../map/map.js";
import { findMapModifierById, removeMapModifier } from "../../../map/modifiers/mapModifier.js";
import { Character, createCharacter } from "../../characterModel.js";
import { paintCharacterHpBar } from "../../characterPaint.js";
import { AREA_BOSS_FUNCTIONS, AreaBossEnemy, CHARACTER_TYPE_AREA_BOSS } from "./areaBoss.js";
import { createObjectCurseIce } from "./abilityCurseIce.js";
import { addAbilityPoisonCloud, createAbilityPoisonCloud } from "./abilityPoisonCloud.js";
import { addAbilityPoisonBeam, createAbilityPoisonBeam } from "./abilityPoisonBeam.js";
import { addAbilityPoisonAura, createAbilityPoisonAura } from "./abilityPoisonAura.js";
import { createAbilityHpRegen } from "../../../ability/abilityHpRegen.js";
import { addAbilityCursePoison, createObjectCursePoison } from "./abilityCursePoison.js";

export type AreaBossEnemyPoisonPlant = AreaBossEnemy & {
};

export const AREA_BOSS_TYPE_POISON_PLANT = "Poison Plant";
export const IMAGE_AREA_BOSS_TYPE_POISON_PLANT = "PoisonPlant";
GAME_IMAGES[IMAGE_AREA_BOSS_TYPE_POISON_PLANT] = {
    imagePath: "/images/poisonPlant.png",
    spriteRowHeights: [80],
    spriteRowWidths: [80],
};

export function addAreaBossTypePoisonPlant() {
    AREA_BOSS_FUNCTIONS[AREA_BOSS_TYPE_POISON_PLANT] = {
        onDeath: onDeath,
        paint: paint,
        tick: tick,
        scaleWithBossLevel: scaleWithBossLevel,
    };
    addAbilityCursePoison();
    addAbilityPoisonCloud();
    addAbilityPoisonBeam();
    addAbilityPoisonAura();
}

export function createAreaBossPoisonPlant(idCounter: IdCounter, spawn: Position, mapModifierIdRef: number, game: Game): AreaBossEnemyPoisonPlant {
    const bossSize = 40;
    const color = "black";
    const dummyValue = 1;
    const hp = 100;
    const nonBlockingSpawn = findNearNonBlockingPosition(spawn, game.state.map, game.state.idCounter, game);

    const baseCharacter = createCharacter(getNextId(idCounter), nonBlockingSpawn.x, nonBlockingSpawn.y, bossSize, bossSize, color, dummyValue, hp, FACTION_ENEMY, CHARACTER_TYPE_AREA_BOSS, dummyValue);
    const abilities: Ability[] = [];
    abilities.push(createAbilityPoisonCloud(game.state.idCounter));
    abilities.push(createAbilityPoisonBeam(game.state.idCounter));
    abilities.push(createAbilityPoisonAura(game.state.idCounter));
    abilities.push(createAbilityHpRegen(game.state.idCounter, undefined, 1));
    baseCharacter.abilities = abilities;
    const areaBoss: AreaBossEnemyPoisonPlant = { ...baseCharacter, mapModifierIdRef: mapModifierIdRef, areaBossType: AREA_BOSS_TYPE_POISON_PLANT };
    areaBoss.isUnMoveAble = true;
    areaBoss.isDamageImmune = true;
    areaBoss.isDebuffImmune = true;
    return areaBoss;
}

function scaleWithBossLevel() {
    //prevent default scale by just overwriting
}

function onDeath(character: Character, game: Game) {
    const areaBoss = character as AreaBossEnemyPoisonPlant;
    const curse = createObjectCursePoison(areaBoss, game);
    if (curse) game.state.abilityObjects.push(curse);
    removeMapModifier(areaBoss.mapModifierIdRef, game);
}

function paint(ctx: CanvasRenderingContext2D, character: Character, cameraPosition: Position, game: Game) {
    if (character.state === "dead") return;
    const areaBossPaintPos = getPointPaintPosition(ctx, character, cameraPosition, game.UI.zoom);
    ctx.strokeStyle = "black";
    ctx.fillStyle = "black";

    const characterImage = GAME_IMAGES[IMAGE_AREA_BOSS_TYPE_POISON_PLANT];
    loadImage(characterImage, character.paint.color, undefined);
    if (characterImage.imageRef) {
        const paintPos = getPointPaintPosition(ctx, character, cameraPosition, game.UI.zoom);
        if (paintPos.x < -character.width || paintPos.x > ctx.canvas.width / game.UI.zoom.factor
            || paintPos.y < -character.height || paintPos.y > ctx.canvas.height / game.UI.zoom.factor) return;
        const spriteWidth = characterImage.spriteRowWidths[0];
        const spriteHeight = characterImage.spriteRowHeights[0];
        ctx.drawImage(
            characterImage.imageRef,
            0,
            0,
            spriteWidth, spriteHeight,
            Math.floor(paintPos.x - character.width / 2),
            Math.floor(paintPos.y - character.height / 2),
            character.width, character.height
        );
        const hpBarPos = {
            x: Math.floor(areaBossPaintPos.x - character.width / 2),
            y: Math.floor(areaBossPaintPos.y - character.height / 2)
        };
        paintCharacterHpBar(ctx, character, hpBarPos, "white", "purple");
    }
}

function tick(enemy: Character, game: Game) {
    if (enemy.state === "dead") return;
    const plant = enemy as AreaBossEnemyPoisonPlant;
    plant.width = 20 + 60 * (plant.hp / plant.maxHp);
    plant.height = plant.width;
}
