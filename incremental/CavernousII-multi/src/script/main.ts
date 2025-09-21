import type { ActionInstance } from "./actions";
import { clones, Clone } from "./clones";
import { redrawTimeNode, writeNumber } from "./functions";
import { resetLoop } from "./loop";
import { currentLoopLog, displayedLog } from "./loop_log";
import { drawMap, getMapLocation } from "./map";
import { getMessage } from "./messages";
import { realms } from "./realms";
import { Route, getBestRoute } from "./routes";
import { load } from "./save";
import { AutoRestart, settings, toggleRunning } from "./settings";
import { getStat, stats } from "./stats";
import { stuff } from "./stuff";
import { ActionStatus } from "./util";
import { currentZone, displayZone, zones } from "./zones";

const possibleActionIcons = ["★", "✣", "✦", "♣", "♠", "⚑", "×", "⬈", "⬉", "⬊", "⬋"];

const version = (document.querySelector("#version") as HTMLElement).innerText
	.split(".")
	.map((e, i) => parseInt(e, 36) / 100 ** i)
	.reduce((v, e) => v + e);
let previousVersion: number;

/** ****************************************** Game loop ********************************************/

let lastAction = Date.now();
let timeBanked = 0;
let queueTime = 0;
let queuesNode: HTMLElement;
let queueTimeNode: HTMLElement;
let zoneTimeNode: HTMLElement;
let queueActionNode: HTMLElement;
let loopCompletions = 0;
let gameStatus = { paused: false };
const fps = 60;
let shouldReset = false;

setInterval(function mainLoop() {
	if (zones[0].index === -1 || realms[0].index === -1) return;
	if (shouldReset) {
		resetLoop();
	}
	const mana = getStat("Mana");
	queuesNode = queuesNode || document.querySelector("#queues");
	if (isNaN(mana.current) && settings.running) toggleRunning();
	const time = Date.now() - lastAction;
	lastAction = Date.now();
	if (settings.running) {
		if (mana.current == 0 || clones.every(c => c.damage === Infinity)) {
			queuesNode.classList.add("out-of-mana");
			// Attempt to update any mana rock currently being mined
			clones.forEach(c => {
				let cloneLoc = zones[currentZone].getMapLocation(c.x, c.y);
				if (cloneLoc?.baseType.name == "Mana-infused Rock") {
					let action = cloneLoc.getPresentAction();
					if (action && action.startingDuration > action.remainingDuration) {
						Route.updateBestRoute(cloneLoc);
					}
					const route = getBestRoute(c.x, c.y, currentZone);
					if (route) {
						route.hasAttempted = true;
					}
				}
			});
			currentLoopLog.finalize();
			getMessage("Out of Mana").display();
			if (settings.autoRestart == AutoRestart.RestartAlways || (settings.autoRestart == AutoRestart.RestartDone && clones.every(c => c.repeated))) {
				resetLoop();
			}
		} else {
			queuesNode.classList.remove("out-of-mana");
		}
		if (settings.autoRestart == AutoRestart.RestartAlways && zones[currentZone].queues.every(q => !q.getNextAction())) {
			queuesNode.classList.remove("out-of-mana");
			resetLoop();
		}
	}
	if (
		!settings.running ||
		mana.current == 0 ||
		(settings.autoRestart == AutoRestart.WaitAny &&
			zones[currentZone].queues.some(q => !q.getNextAction() && (!q.length || q[q.length - 1].actionID != "="))) ||
		(settings.autoRestart == AutoRestart.WaitAll && zones[currentZone].queues.every(q => !q.getNextAction()) && clones.some(c => c.damage < Infinity)) ||
		!messageBox.hidden
	) {
		timeBanked += time;
		gameStatus.paused = true;
		redrawTimeNode();
		return;
	}
	let timeAvailable = time;
	if (settings.usingBankedTime && timeBanked > 0) {
		const speedMultiplier = 3 + zones[0].cacheManaGain[0] ** 0.5;
		timeAvailable = Math.min(time + timeBanked, time * speedMultiplier);
	}
	timeAvailable = Math.min(timeAvailable, settings.maxTotalTick, mana.current * 1000);
	if (timeAvailable < 0) timeAvailable = 0;

	let timeLeft = runActions(timeAvailable);

	timeBanked += time + timeLeft - timeAvailable;
	if (timeBanked < 0) timeBanked = 0;

	if (zones[currentZone].queues.some(q => q.selected)) {
		clones[zones[currentZone].queues.findIndex(q => q.selected)].writeStats();
	}
	queueTimeNode = queueTimeNode || document.querySelector("#time-spent");
	queueTimeNode.innerText = writeNumber(queueTime / 1000, 1);
	zoneTimeNode = zoneTimeNode || document.querySelector("#time-spent-zone");
	if (currentZone == displayZone) {
		zoneTimeNode.innerText = writeNumber((queueTime - (zones[currentZone].zoneStartTime || 0)) / 1000, 1);
	} else {
		zoneTimeNode.innerText = writeNumber(Math.max(0, (zones[displayZone + 1]?.zoneStartTime || 0) - (zones[displayZone].zoneStartTime || 0)) / 1000, 1);
	}
	queueActionNode = queueActionNode || document.querySelector("#actions-spent");
	queueActionNode.innerText = `${writeNumber(loopCompletions, 0)} (x${writeNumber(1 + loopCompletions / 40, 3)})`;
	redrawTimeNode();

	stats.forEach(e => e.update());
	stuff.forEach(e => e.displayDescription());

	if (currentLoopLog == displayedLog) displayedLog.display();

	drawMap();
}, Math.floor(1000 / fps));

function runActions(time: number): number {
	const mana = getStat("Mana");
	let loops = 0;
	while (time > 0.001) {
		let actions = <QueueAction[]>zones[currentZone].queues.map(q => q.getNextAction());
		const nullActions = actions.map((a, i) => (a === null ? i : -1)).filter(a => a > -1);
		actions = actions.filter(a => a !== null);
		if (actions.length == 0) {
			if (settings.autoRestart == AutoRestart.RestartAlways || settings.autoRestart == AutoRestart.RestartDone) {
				resetLoop();
			}
			gameStatus.paused = true;
			return time;
		}
		// Pause ASAP.
		if (actions.some(a => a.actionID == ":")) {
			if (settings.running) toggleRunning();
			actions.forEach(a => {
				if (a.action == ":") a.complete();
			});
			return time;
		}
		if (actions.some(a => a.done == ActionStatus.NotStarted)) {
			actions.forEach(a => a.start());
			continue;
		}
		const waitActions = actions.filter(a => a.done != ActionStatus.Started);
		actions = actions.filter(a => a.done == ActionStatus.Started);
		if (
			zones[currentZone].queues.every((q, i) => clones[i].isSyncing || clones[i].damage == Infinity || clones[i].notSyncing || !q.hasFutureSync()) &&
			waitActions.some(a => a.action == "=")
		) {
			waitActions.filter(a => a.action == "=").forEach(a => a.complete());
			clones.forEach(c => c.unSync());
			continue;
		}
		if (actions.length == 0) {
			if (waitActions.length > 0) {
				waitActions.forEach(a => a.start());
			}
			gameStatus.paused = true;
			return time;
		}
		const instances = actions.map(a => <ActionInstance>a.currentAction);
		if (actions.some(a => a.currentAction?.expectedLeft === 0 && a.actionID == "T")) {
			// If it's started and has nothing left, it's tried to start an action with no duration - like starting a Wither activation when it's complete.
			actions.forEach(a => {
				if (a.currentAction?.expectedLeft === 0 && a.actionID == "T") a.done = ActionStatus.Complete;
			});
			continue;
		}
		let nextTickTime = Math.min(...instances.map(i => i.expectedLeft / instances.reduce((a, c) => a + +(c === i), 0)), time);
		if (nextTickTime < 0.01) nextTickTime = 0.01;
		actions.forEach(a => a.tick(nextTickTime));
		nullActions.forEach(a => {
			if (clones[a].damage === Infinity) {
				clones[a].addToTimeline({ name: "Dead" }, nextTickTime);
			} else {
				clones[a].addToTimeline({ name: "None" }, nextTickTime);
				getStat("Speed").gainSkill(nextTickTime / 1000);
			}
		});
		waitActions.forEach(a => {
			a.currentClone!.addToTimeline({ name: "Wait" }, nextTickTime);
			getStat("Speed").gainSkill(nextTickTime / 1000);
		});
		clones.forEach(c => c.drown(nextTickTime));
		zones[currentZone].tick(nextTickTime);
		mana.spendMana(nextTickTime / 1000);
		time -= nextTickTime;
		queueTime += nextTickTime;
	}
	gameStatus.paused = false;
	return 0;
}

function setup() {
	Clone.addNewClone();
	zones[0].enterZone();
	zones[0].queues[0].selected = true;
	getMapLocation(0, 0);
	drawMap();
	getMessage("Welcome to Cavernous!").display();
	if (URLParams.has("timeless")) {
		timeBanked = Infinity;
	}
}

function applyCustomStyling() {
	if (settings.debug_verticalBlocksJustify) {
		(document.querySelector(".vertical-blocks") as HTMLElement).style.justifyContent = settings.debug_verticalBlocksJustify;
	}
}

// Calling load directly prevents tests from stopping loading.
setTimeout(() => load(), 15);
