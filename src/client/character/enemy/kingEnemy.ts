import { ABILITIES_FUNCTIONS, Ability, setAbilityToBossLevel, updateAbilitiesOnCharacterChange } from "../../ability/ability.js";
import { ABILITY_NAME_FIRE_CIRCLE } from "../../ability/abilityFireCircle.js";
import { ABILITY_NAME_ICE_AURA } from "../../ability/abilityIceAura.js";
import { ABILITY_NAME_MELEE } from "../../ability/abilityMelee.js";
import { ABILITY_NAME_SHOOT } from "../../ability/abilityShoot.js";
import { ABILITY_NAME_SWORD } from "../../ability/abilitySword.js";
import { tickCharacterDebuffs } from "../../debuff/debuff.js";
import { deepCopy, getNextId, saveCharacterAsPastCharacter } from "../../game.js";
import { IdCounter, Game, Position, FACTION_ENEMY, CelestialDirection } from "../../gameModel.js";
import { getPointPaintPosition } from "../../gamePaint.js";
import { GAME_IMAGES, getImage } from "../../imageLoad.js";
import { changeTileIdOfMapChunk } from "../../map/map.js";
import { getKingAreaMiddlePosition, getEntranceChunkAndTileXYForPosition } from "../../map/mapKingArea.js";
import { determineClosestCharacter, calculateAndSetMoveDirectionToPositionWithPathing, getPlayerCharacters, moveCharacterTick, resetCharacter } from "../character.js";
import { CHARACTER_TYPE_FUNCTIONS, Character, IMAGE_SLIME, PLAYER_BASE_HP, createCharacter } from "../characterModel.js";
import { paintCharacterWithAbilitiesDefault, paintCharatersPets } from "../characterPaint.js";
import { PathingCache } from "../pathing.js";
import { CHARACTER_TYPE_BOSS_ENEMY, getCelestialDirection } from "./bossEnemy.js";
import { legendaryAbilityGiveBlessing, classBuildingPutLegendaryCharacterStuffBackIntoBuilding } from "../../map/buildings/classBuilding.js";
import { MoreInfosPartContainer, createCharacterMoreInfosPartContainer } from "../../moreInfo.js";
import { doDamageMeterSplit } from "../../combatlog.js";
import { CHARACTER_TYPE_END_BOSS_CROWN_ENEMY, createKingCrownCharacter, KingCrownEnemyCharacter } from "./kingCrown.js";
import { copyCursesToTarget, Curse } from "../../curse/curse.js";
import { CHARACTER_UPGRADE_BONUS_DAMAGE_REDUCTION, CharacterUpgradeBonusDamageReduction } from "../upgrades/characterUpgradeDamageReduction.js";
import { playerCharacterChangeToKingModification } from "../playerCharacters/playerCharacters.js";

export type KingEnemyCharacter = Character;
export const CHARACTER_TYPE_KING_ENEMY = "KingEnemyCharacter";

export const IMAGE_CROWN = "Crown";
export const KING_BASE_HP = 50000000;
GAME_IMAGES[IMAGE_CROWN] = {
    imagePath: "/images/crown.png",
    spriteRowHeights: [20],
    spriteRowWidths: [20],
};

export function addKingType() {
    CHARACTER_TYPE_FUNCTIONS[CHARACTER_TYPE_KING_ENEMY] = {
        onCharacterKill: onCharacterKill,
        paintBigUiHpBarOnSpecialFight: paintKingHpBar,
        paintCharacterType: paintKing,
        tickFunction: tickKingEnemyCharacter,
    }
}

export function createDefaultNextKing(idCounter: IdCounter, game: Game): KingEnemyCharacter {
    const bossSize = 60;
    const color = "black";
    const moveSpeed = 1;
    const hp = KING_BASE_HP;
    const experienceWorth = 0;
    const bossCharacter = createCharacter(getNextId(idCounter), 0, 0, bossSize, bossSize, color, moveSpeed, hp, FACTION_ENEMY, CHARACTER_TYPE_KING_ENEMY, experienceWorth);
    bossCharacter.paint.image = IMAGE_SLIME;
    const abilities: Ability[] = createKingAbilities(1, game);
    bossCharacter.abilities = abilities;
    return bossCharacter;
}

export function kingCreateMoreInfos(game: Game, celestialDirection: CelestialDirection, heading: string): MoreInfosPartContainer | undefined {
    if (!game.ctx) return;
    let kingChar: Character | undefined = undefined;
    if (game.state.bossStuff.kingFightStartedTime === undefined) {
        const king = game.state.bossStuff.nextKings[celestialDirection];
        if (!king) return;
        kingChar = deepCopy(king) as Character;
        modifyCharacterToKing(kingChar, game);
        kingChar.type = CHARACTER_TYPE_KING_ENEMY;
        resetCharacter(kingChar, game);
    } else {
        for (let boss of game.state.bossStuff.bosses) {
            if (boss.type === CHARACTER_TYPE_KING_ENEMY) {
                kingChar = boss;
            }
        }
    }
    if (!kingChar) return;
    return createCharacterMoreInfosPartContainer(game.ctx, kingChar, game.UI.moreInfos, game, heading);
}

export function setPlayerAsKing(game: Game) {
    if (game.testing.replay) return;
    let kingBaseCharacter: Character | undefined = undefined;
    let crown: KingCrownEnemyCharacter | undefined;
    for (let boss of game.state.bossStuff.bosses) {
        if (boss.type === CHARACTER_TYPE_END_BOSS_CROWN_ENEMY) {
            crown = boss;
        }
    }
    if (!crown) throw "where is the crown?";
    if (crown.targetCharacterId !== undefined) {
        for (let player of game.state.players) {
            if (player.character.id === crown.targetCharacterId) {
                kingBaseCharacter = player.character;
                break;
            }
        }
    }
    const king: Character = deepCopy(kingBaseCharacter);
    king.isDamageImmune = false;
    king.isDebuffImmune = false;
    king.width += 15;
    resetCharacter(king, game);
    const celestialDirection = getCelestialDirection(king, game.state.map);
    const oldBoss = game.state.bossStuff.nextKings[celestialDirection];
    game.state.bossStuff.nextKings[celestialDirection] = king;
    game.state.players[0].character.becameKing = true;
    if (king.curses && king.characterClasses) {
        for (let charClass of king.characterClasses) {
            if (charClass.legendary) {
                if (charClass.curses === undefined) charClass.curses = [];
                const cursesToCopy: Curse[] = [];
                for (let curse of king.curses) {
                    if (curse.cleansed) continue;
                    cursesToCopy.push(curse);
                }
                copyCursesToTarget(cursesToCopy, charClass.curses, game);
            }
        }
    }
    playerCharacterChangeToKingModification(king);
    if (oldBoss?.characterClasses) {
        legendaryAbilityGiveBlessing(celestialDirection, [oldBoss]);
        classBuildingPutLegendaryCharacterStuffBackIntoBuilding(oldBoss, game);
        saveCharacterAsPastCharacter(oldBoss, game);
    }
}

export function startKingFight(kingAreaPosition: Position, game: Game) {
    const entrance = getEntranceChunkAndTileXYForPosition(game.state.players[0].character, game.state.map);
    if (entrance) {
        changeTileIdOfMapChunk(entrance.chunkX, entrance.chunkY, entrance.tileX, entrance.tileY, 2, game);
        const spawn: Position = getKingAreaMiddlePosition(kingAreaPosition, game.state.map)!;
        const celestialDirection = getCelestialDirection(spawn, game.state.map);
        const king: Character = deepCopy(game.state.bossStuff.nextKings[celestialDirection]);
        modifyCharacterToKing(king, game);
        updateAbilitiesOnCharacterChange(king, game);
        king.x = spawn.x;
        king.y = spawn.y;
        if (king.pets) {
            for (let pet of king.pets) {
                pet.x = spawn.x;
                pet.y = spawn.y;
            }
        }
        if (game.state.activeCheats && game.state.activeCheats.indexOf("reducedBossHp") !== -1) {
            king.hp = 500;
            king.maxHp = 500;
        }
        game.state.bossStuff.bosses.push(king);
        game.state.bossStuff.closedOfKingAreaEntrance = entrance;
        game.state.bossStuff.kingFightStartedTime = game.state.time;
        if (game.UI.playerGlobalAlphaMultiplier > 0.25) {
            game.UI.playerGlobalAlphaMultiplier = 0.25;
        }
        doDamageMeterSplit("King Fight", game);
        for (let boss of game.state.bossStuff.bosses) {
            if (boss.type === CHARACTER_TYPE_BOSS_ENEMY) {
                boss.x = spawn.x;
                boss.y = spawn.y;
            }
        }
    } else {
        throw new Error("bossArea entrance not found, should not be able to happen");
    }
}

function tickKingEnemyCharacter(enemy: KingEnemyCharacter, game: Game, pathingCache: PathingCache | null) {
    if (enemy.state === "dead") return;
    const playerCharacters = getPlayerCharacters(game.state.players);
    const closest = determineClosestCharacter(enemy, playerCharacters);

    calculateAndSetMoveDirectionToPositionWithPathing(enemy, closest.minDistanceCharacter, game.state.map, pathingCache, game.state.idCounter, game.state.time, game);
    moveCharacterTick(enemy, game.state.map, game.state.idCounter, game);

    for (let ability of enemy.abilities) {
        const abilityFunctions = ABILITIES_FUNCTIONS[ability.name];
        if (abilityFunctions) {
            if (abilityFunctions.tickAI) abilityFunctions.tickAI(enemy, ability, game);
        }
    }
    changeKingAbilityLevelBasedOnHp(enemy);
    tickCharacterDebuffs(enemy, game);
}

export function modifyCharacterToKing(boss: Character, game: Game) {
    boss.type = CHARACTER_TYPE_KING_ENEMY;
    let newHp = KING_BASE_HP;
    if (boss.characterClasses) {
        const hpIncreaseFactor = boss.maxHp / PLAYER_BASE_HP;
        newHp *= hpIncreaseFactor;
        removeDamageReductionUpgrades(boss);
    }
    boss.maxHp = newHp;
    boss.hp = boss.maxHp;
    boss.faction = FACTION_ENEMY;
    if (boss.pets) {
        for (let pet of boss.pets) {
            pet.faction = boss.faction;
        }
    }
    boss.baseMoveSpeed = 1;
    resetCharacter(boss, game);
    changeKingAbilityLevelBasedOnHp(boss);
}

export function paintKingHpBar(ctx: CanvasRenderingContext2D, boss: Character, game: Game, displayName: string = "King") {
    const fillAmount = Math.max(0, boss.hp / boss.maxHp);
    if (fillAmount <= 0) return
    const hpBarWidth = Math.floor(ctx.canvas.width / 2);
    const hpBarText = `${displayName} HP: ${(boss.hp / boss.maxHp * 100).toFixed(2)}%`;
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

function removeDamageReductionUpgrades(boss: Character) {
    if (!boss.characterClasses) return;
    for (let charClass of boss.characterClasses) {
        if (!charClass.characterClassUpgrades) continue;
        const reductionUpgrade = charClass.characterClassUpgrades[CHARACTER_UPGRADE_BONUS_DAMAGE_REDUCTION] as CharacterUpgradeBonusDamageReduction;
        if (!reductionUpgrade) continue;
        delete charClass.characterClassUpgrades[CHARACTER_UPGRADE_BONUS_DAMAGE_REDUCTION];
        boss.damageTakenModifierFactor = 1;
    }
}

function onCharacterKill(character: Character, game: Game) {
    game.state.bossStuff.bosses.push(createKingCrownCharacter(game.state.idCounter, character));
}

function changeKingAbilityLevelBasedOnHp(enemy: KingEnemyCharacter) {
    const hpLeftPerCent = enemy.hp / enemy.maxHp;
    const hpBasedlevel = Math.max(Math.floor((1 - hpLeftPerCent) * 10 + 1), 1);

    for (let ability of enemy.abilities) {
        setAbilityToBossLevel(ability, hpBasedlevel);
    }
    if (enemy.pets) {
        const petMoveSpeed = Math.min(0.5 + (hpBasedlevel / 14 * 2), 3);
        for (let pet of enemy.pets) {
            pet.baseMoveSpeed = petMoveSpeed;
            for (let ability of pet.abilities) {
                setAbilityToBossLevel(ability, hpBasedlevel);
            }
        }
    }
}

function paintKing(ctx: CanvasRenderingContext2D, character: Character, cameraPosition: Position, game: Game) {
    if (character.state === "dead") return;
    paintCharatersPets(ctx, [character], cameraPosition, game);
    paintCharacterWithAbilitiesDefault(ctx, character, cameraPosition, game);
    const crownImage = getImage(IMAGE_CROWN);
    if (crownImage) {
        const paintPos = getPointPaintPosition(ctx, character, cameraPosition, game.UI.zoom);
        const crownX = Math.floor(paintPos.x - Math.floor(crownImage.width / 2));
        const crownY = Math.floor(paintPos.y - character.height / 2 - crownImage.height);
        ctx.drawImage(crownImage, crownX, crownY);
    }
}

function createKingAbilities(level: number, game: Game): Ability[] {
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
        setAbilityToKingLevel(ability, level);
        ability.passive = true;
        abilities.push(ability);
    }

    return abilities;
}

function setAbilityToKingLevel(ability: Ability, level: number) {
    const abilityFunctions = ABILITIES_FUNCTIONS[ability.name];
    if (abilityFunctions.setAbilityToBossLevel) {
        abilityFunctions.setAbilityToBossLevel(ability, level);
    } else {
        throw new Error("function setAbilityToBossLevel missing for" + ability.name);
    }
}