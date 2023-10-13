import { ABILITIES_FUNCTIONS, Ability } from "../../ability/ability.js";
import { ABILITY_NAME_FIRE_CIRCLE } from "../../ability/abilityFireCircle.js";
import { ABILITY_NAME_ICE_AURA } from "../../ability/abilityIceAura.js";
import { ABILITY_NAME_MELEE } from "../../ability/abilityMelee.js";
import { ABILITY_NAME_SHOOT } from "../../ability/abilityShoot.js";
import { ABILITY_NAME_SWORD } from "../../ability/abilitySword.js";
import { tickCharacterDebuffs } from "../../debuff/debuff.js";
import { deepCopy, getNextId, saveCharacterAsPastCharacter } from "../../game.js";
import { IdCounter, Game, Position, FACTION_ENEMY, LOCALSTORAGE_NEXTENDBOSSES } from "../../gameModel.js";
import { getPointPaintPosition } from "../../gamePaint.js";
import { GAME_IMAGES, getImage } from "../../imageLoad.js";
import { changeTileIdOfMapChunk } from "../../map/map.js";
import { getBossAreaMiddlePosition, getEntranceChunkAndTileXYForPosition } from "../../map/mapEndBossArea.js";
import { determineClosestCharacter, calculateAndSetMoveDirectionToPositionWithPathing, getPlayerCharacters, moveCharacterTick, resetCharacter } from "../character.js";
import { CHARACTER_TYPE_FUNCTIONS, Character, IMAGE_SLIME, createCharacter } from "../characterModel.js";
import { paintCharacterDefault, paintCharatersPets } from "../characterPaint.js";
import { PathingCache } from "../pathing.js";
import { getCelestialDirection } from "./bossEnemy.js";

export type EndBossEnemyCharacter = Character;
export const CHARACTER_TYPE_END_BOSS_ENEMY = "EndBossEnemyCharacter";

export const IMAGE_CROWN = "Crown";
GAME_IMAGES[IMAGE_CROWN] = {
    imagePath: "/images/crown.png",
    spriteRowHeights: [20],
    spriteRowWidths: [20],
};

export function addEndBossType() {
    CHARACTER_TYPE_FUNCTIONS[CHARACTER_TYPE_END_BOSS_ENEMY] = {
        tickFunction: tickEndBossEnemyCharacter,
        paintCharacterType: paintEndBoss,
    }
}

export function createDefaultNextEndBoss(idCounter: IdCounter, game: Game): EndBossEnemyCharacter {
    const bossSize = 60;
    const color = "black";
    const moveSpeed = 1;
    const hp = 50000000;
    const experienceWorth = 0;
    const bossCharacter = createCharacter(getNextId(idCounter), 0, 0, bossSize, bossSize, color, moveSpeed, hp, FACTION_ENEMY, CHARACTER_TYPE_END_BOSS_ENEMY, experienceWorth);
    bossCharacter.paint.image = IMAGE_SLIME;
    const abilities: Ability[] = createEndBossAbilities(1, game);
    bossCharacter.abilities = abilities;
    return bossCharacter;
}

export function setPlayerAsEndBoss(game: Game) {
    if (game.testing.replay) return;
    const boss: Character = deepCopy(game.state.players[0].character);
    const celestialDirection = getCelestialDirection(boss);
    const oldBoss = game.state.bossStuff.nextEndbosses[celestialDirection];
    game.state.bossStuff.nextEndbosses[celestialDirection] = boss;
    if (!game.multiplayer.disableLocalStorage) {
        localStorage.setItem(LOCALSTORAGE_NEXTENDBOSSES, JSON.stringify(game.state.bossStuff.nextEndbosses));
    }

    if (oldBoss?.characterClass) {
        saveCharacterAsPastCharacter(oldBoss, game);
    }
}

export function startEndBoss(endBossAreaPosition: Position, game: Game) {
    const entrance = getEntranceChunkAndTileXYForPosition(game.state.players[0].character, game.state.map);
    if (entrance) {
        changeTileIdOfMapChunk(entrance.chunkX, entrance.chunkY, entrance.tileX, entrance.tileY, 2, game);
        const spawn: Position = getBossAreaMiddlePosition(endBossAreaPosition, game.state.map)!;
        const celestialDirection = getCelestialDirection(spawn);
        const endBoss: Character = deepCopy(game.state.bossStuff.nextEndbosses[celestialDirection]);
        modifyCharacterToEndBoss(endBoss);
        endBoss.x = spawn.x;
        endBoss.y = spawn.y;
        if (endBoss.pets) {
            for (let pet of endBoss.pets) {
                pet.x = spawn.x;
                pet.y = spawn.y;
            }
        }
        if (Math.abs(spawn.x) < 2000 && Math.abs(spawn.y) < 2000 && !endBoss.characterClass) {
            endBoss.hp = 500;
            endBoss.maxHp = 500;
        }
        game.state.bossStuff.bosses.push(endBoss);
        game.state.bossStuff.closedOfEndBossEntrance = entrance;
        game.state.bossStuff.endBossStarted = true;
    } else {
        throw new Error("bossArea entrance not found, should not be able to happen");
    }
}

function tickEndBossEnemyCharacter(enemy: EndBossEnemyCharacter, game: Game, pathingCache: PathingCache | null) {
    if (enemy.isDead) return;
    const playerCharacters = getPlayerCharacters(game.state.players);
    const closest = determineClosestCharacter(enemy, playerCharacters);

    calculateAndSetMoveDirectionToPositionWithPathing(enemy, closest.minDistanceCharacter, game.state.map, pathingCache, game.state.idCounter, game.state.time);
    moveCharacterTick(enemy, game.state.map, game.state.idCounter);

    for (let ability of enemy.abilities) {
        const abilityFunctions = ABILITIES_FUNCTIONS[ability.name];
        if (abilityFunctions) {
            if (abilityFunctions.tickAbility) abilityFunctions.tickAbility(enemy, ability, game);
            if (abilityFunctions.tickBossAI) abilityFunctions.tickBossAI(enemy, ability, game);
        }
    }
    changeBossAbilityLevelBasedOnHp(enemy);
    tickCharacterDebuffs(enemy, game);
}

function modifyCharacterToEndBoss(boss: Character) {
    boss.type = CHARACTER_TYPE_END_BOSS_ENEMY;
    boss.maxHp = 50000000;
    boss.hp = boss.maxHp;
    boss.faction = FACTION_ENEMY;
    if (boss.pets) {
        for (let pet of boss.pets) {
            pet.faction = boss.faction;
        }
    }
    boss.moveSpeed = 1;
    resetCharacter(boss);
    changeBossAbilityLevelBasedOnHp(boss);
}

function paintEndBoss(ctx: CanvasRenderingContext2D, character: Character, cameraPosition: Position, game: Game) {
    if (character.isDead) return;
    paintCharatersPets(ctx, [character], cameraPosition, game);
    paintCharacterDefault(ctx, character, cameraPosition, game);
    const crownImage = getImage(IMAGE_CROWN);
    if (crownImage) {
        const paintPos = getPointPaintPosition(ctx, character, cameraPosition);
        const crownX = Math.floor(paintPos.x - Math.floor(crownImage.width / 2));
        const crownY = Math.floor(paintPos.y - character.height / 2 - crownImage.height);
        ctx.drawImage(crownImage, crownX, crownY);
    }
    if (game.state.bossStuff.endBossStarted) paintBossHpBar(ctx, character);
}

function paintBossHpBar(ctx: CanvasRenderingContext2D, boss: Character) {
    const fillAmount = Math.max(0, boss.hp / boss.maxHp);
    if (fillAmount <= 0) return
    const hpBarWidth = Math.floor(ctx.canvas.width / 2);
    const hpBarText = `BossHP: ${(boss.hp / boss.maxHp * 100).toFixed(2)}%`;
    const hpBarLeft = Math.floor(ctx.canvas.width / 4);
    const hpBarHeight = 20;
    const fontSize = hpBarHeight - 2;
    const top = 22;
    ctx.lineWidth = 1;
    ctx.strokeStyle = "black";
    ctx.fillStyle = "red";
    ctx.fillRect(hpBarLeft, top, Math.ceil(hpBarWidth * fillAmount), hpBarHeight);
    ctx.beginPath();
    ctx.rect(hpBarLeft, top, hpBarWidth, hpBarHeight);
    ctx.stroke();

    ctx.fillStyle = "black";
    ctx.font = "bold " + fontSize + "px Arial";
    const textWidth = ctx.measureText(hpBarText).width;
    ctx.fillText(hpBarText, Math.floor(ctx.canvas.width / 2 - textWidth / 2), top + fontSize + 1);
}

function changeBossAbilityLevelBasedOnHp(enemy: EndBossEnemyCharacter) {
    const hpLeftPerCent = enemy.hp / enemy.maxHp;
    const abilityLevel = Math.max(Math.floor((1 - hpLeftPerCent) * 10), 1);

    for (let ability of enemy.abilities) {
        const abilityFunctions = ABILITIES_FUNCTIONS[ability.name];
        if (abilityFunctions && abilityFunctions.setAbilityToBossLevel) {
            abilityFunctions.setAbilityToBossLevel(ability, abilityLevel);
        }
    }
    if (enemy.pets) {
        for (let pet of enemy.pets) {
            for (let ability of pet.abilities) {
                const abilityFunctions = ABILITIES_FUNCTIONS[ability.name];
                if (abilityFunctions && abilityFunctions.setAbilityToBossLevel) {
                    abilityFunctions.setAbilityToBossLevel(ability, abilityLevel);
                }
            }
        }
    }
}

function createEndBossAbilities(level: number, game: Game): Ability[] {
    const abilities: Ability[] = [];
    const abilityKeys: string[] = [
        ABILITY_NAME_MELEE,
        ABILITY_NAME_SHOOT,
        ABILITY_NAME_SWORD,
        ABILITY_NAME_FIRE_CIRCLE,
        ABILITY_NAME_ICE_AURA
    ];

    for (let abilityKey of abilityKeys) {
        const abilityFunctions = ABILITIES_FUNCTIONS[abilityKey];
        const ability = abilityFunctions.createAbility(game.state.idCounter);
        setAbilityToEndBossLevel(ability, level);
        ability.passive = true;
        abilities.push(ability);
    }

    return abilities;
}

function setAbilityToEndBossLevel(ability: Ability, level: number) {
    const abilityFunctions = ABILITIES_FUNCTIONS[ability.name];
    if (abilityFunctions.setAbilityToBossLevel) {
        abilityFunctions.setAbilityToBossLevel(ability, level);
    } else {
        throw new Error("function setAbilityToBossLevel missing for" + ability.name);
    }
}