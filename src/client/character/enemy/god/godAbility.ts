import { Ability } from "../../../ability/ability.js";
import { Game, Position } from "../../../gameModel.js";
import { areaSpawnOnDistanceGetAreaMiddlePosition, GameMapAreaSpawnOnDistance } from "../../../map/mapAreaSpawnOnDistance.js";
import { Leveling } from "../../playerCharacters/levelingCharacter.js";
import { GodEnemyCharacter } from "./godEnemy.js";

export type GodAbility = Ability & {
    areaIdRef?: number,
    pickUpPosition?: Position,
    pickedUp: boolean,
    level: Leveling,
}

export function setGodAbilityPickUpPosition(godArea: GameMapAreaSpawnOnDistance, god: GodEnemyCharacter, game: Game) {
    if (!godArea) return;
    const godAreaCenter = areaSpawnOnDistanceGetAreaMiddlePosition(godArea, game.state.map);
    if (godAreaCenter === undefined) return;

    const godAbilities: GodAbility[] = [];
    for (let ability of god.abilities) {
        let godAbility = ability as GodAbility;
        if (godAbility.pickedUp !== undefined && !godAbility.pickedUp) {
            godAbilities.push(godAbility);
        }
    }

    const angleChangePosition = Math.PI * 2 / godAbilities.length;
    const radius = godArea.size * game.state.map.chunkLength * game.state.map.tileSize / 4;
    for (let i = 0; i < godAbilities.length; i++) {
        godAbilities[i].pickUpPosition = {
            x: godAreaCenter.x + Math.cos(i * angleChangePosition) * radius,
            y: godAreaCenter.y + Math.sin(i * angleChangePosition) * radius,
        }
    }
}