import { creatures } from "./creatures";
import { game } from "./game";
import { GrindRoute } from "./grind_routes";
import { showFinalLocation } from "./highlights";
import { currentLoopLog } from "./loop_log";
import { drawMap } from "./map";
import { getMessage } from "./messages";
import { prestige } from "./prestige";
import { realms } from "./realms";
import { Route } from "./routes";
import { updateRunes } from "./runes";
import { save } from "./save";
import { setSetting, toggleAutoRestart, toggleGrindMana, settings } from "./settings";
import { getStat, stats } from "./stats";
import { stuff } from "./stuff";
import { zones, moveToZone } from "./zones";

export let resetting = false;

export function resetLoop(noLoad = false, saveGame = true) {
	if (resetting) return;
	game.shouldReset = false;
	resetting = true;
	const mana = getStat("Mana"); /* Cleaned up my additions as is handled during initilization */
	if (getMessage("Time Travel").display(zones[0].manaGain == 0 && realms[game.currentRealm].name == "Core Realm" && prestige.prestigecount == 0))
		setSetting(toggleAutoRestart, 3);
	else getMessage("Persisted Programming").display();
	if (mana.base == 5.5) getMessage("The Looping of Looping Loops").display() && setSetting(toggleAutoRestart, 1);
	if (mana.base == 6) getMessage("Strip Mining").display();
	if (mana.base == 7.4) getMessage("Buy More Time").display();
	if (game.routes.length == 3) getMessage("All the known ways").display() && setSetting(toggleGrindMana, true);
	if (game.queueTime > 50000) getMessage("Looper's Log: Supplemental").display();
	if (mana.current > 0) {
		currentLoopLog.finalize();
	}
	stuff.forEach(s => {
		s.count = 0;
	});
	stats.forEach(s => {
		s.reset();
		s.update();
	});
	if (settings.grindMana && game.routes.length && !noLoad) {
		Route.loadBestRoute();
	}
	if (settings.grindStats && game.grindRoutes.length) {
		GrindRoute.loadBestRoute();
	}
	stuff.forEach(s => {
		s.count = 0;
		s.update();
	});
	game.clones.forEach(c => c.reset());
	game.queueTime = 0;
	game.totalDrain = 0;
	game.loopCompletions = 0;
	creatures.forEach(c => {
		c.attack = c.creature.attack;
		c.defense = c.creature.defense;
		c.health = c.creature.health;
		c.drawHealth();
	});
	zones.forEach(z => {
		z.resetZone();
		(z.queues || []).forEach(q => q.reset());
	});
	updateRunes();
	moveToZone(0, false);
	getStat("Mana").dirty = true;
	getStat("Mana").update();
	drawMap();
	if (saveGame) save();
	showFinalLocation();
	if (isNaN(game.timeBanked)) {
		game.timeBanked = 0;
	}
	resetting = false;
	game.currentRoutes = [];
}
