import { clones } from "./clones";
import { creatures } from "./creatures";
import { grindRoutes, GrindRoute } from "./grind_routes";
import { showFinalLocation } from "./highlights";
import { currentLoopLog } from "./loop_log";
import { drawMap } from "./map";
import { getMessage } from "./messages";
import { prestigecount } from "./prestige";
import { currentRealm, realms } from "./realms";
import { routes, Route } from "./routes";
import { updateRunes } from "./runes";
import { save } from "./save";
import { setSetting, toggleAutoRestart, toggleGrindMana, settings } from "./settings";
import { getStat, stats } from "./stats";
import { stuff } from "./stuff";
import { zones, moveToZone, totalDrain } from "./zones";

export let resetting = false;

export function resetLoop(noLoad = false, saveGame = true) {
	if (resetting) return;
	shouldReset = false;
	resetting = true;
	const mana = getStat("Mana"); /* Cleaned up my additions as is handled during initilization */
	if (getMessage("Time Travel").display(zones[0].manaGain == 0 && realms[currentRealm].name == "Core Realm" && prestigecount == 0))
		setSetting(toggleAutoRestart, 3);
	else getMessage("Persisted Programming").display();
	if (mana.base == 5.5) getMessage("The Looping of Looping Loops").display() && setSetting(toggleAutoRestart, 1);
	if (mana.base == 6) getMessage("Strip Mining").display();
	if (mana.base == 7.4) getMessage("Buy More Time").display();
	if (routes.length == 3) getMessage("All the known ways").display() && setSetting(toggleGrindMana, true);
	if (queueTime > 50000) getMessage("Looper's Log: Supplemental").display();
	if (mana.current > 0) {
		currentLoopLog.finalize();
	}
	stuff.forEach(s => {
		s.count = 0;
	});
	stats.forEach((s, i) => {
		s.reset();
		s.update();
	});
	if (settings.grindMana && routes.length && !noLoad) {
		Route.loadBestRoute();
	}
	if (settings.grindStats && grindRoutes.length) {
		GrindRoute.loadBestRoute();
	}
	stuff.forEach(s => {
		s.count = 0;
		s.update();
	});
	clones.forEach(c => c.reset());
	queueTime = 0;
	totalDrain = 0;
	loopCompletions = 0;
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
	if (isNaN(timeBanked)) {
		timeBanked = 0;
	}
	resetting = false;
	currentRoutes = [];
}
