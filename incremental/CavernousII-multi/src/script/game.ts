import type { ActionInstance } from "./actions";
import { Clone } from "./clones";
import { redrawTimeNode, writeNumber } from "./functions";
import type { GrindRoute } from "./grind_routes";
import { resetLoop } from "./loop";
import { currentLoopLog, displayedLog } from "./loop_log";
import { drawMap, getMapLocation } from "./map";
import { getMessage, getMessageBox } from "./messages";
import type { QueueAction } from "./queues";
import { realms } from "./realms";
import { Route, getBestRoute } from "./routes";
import { load } from "./save";
import { AutoRestart, settings, toggleRunning } from "./settings";
import { getStat, stats } from "./stats";
import { stuff } from "./stuff";
import { ActionStatus } from "./util";
import { zones } from "./zones";

/** ****************************************** Game loop ********************************************/

let gameStatus = { paused: false };
const fps = 60;

class Game {
    lastAction = Date.now();
    timeBanked = 0;
    queueTime = 0;
    queuesNode: HTMLElement = document.querySelector("#queues")!;
    queueTimeNode: HTMLElement = document.querySelector("#time-spent")!;
    zoneTimeNode: HTMLElement = document.querySelector("#time-spent-zone")!;
    queueActionNode: HTMLElement = document.querySelector("#actions-spent")!;
    loopCompletions = 0;
    clones: Clone[] = [];
    currentRoutes: Route[] = [];
    breakActions = false;
    shouldReset = false;
    currentZone = 0;
    displayZone = 0;
    totalDrain = 0;
    grindRoutes: GrindRoute[] = [];
    routes: Route[] = [];
    currentRealm = 0;

    runActions(time: number): number {
        const mana = getStat("Mana");
        while (time > 0.001) {
            let actions = <QueueAction[]>zones[this.currentZone].queues.map(q => q.getNextAction());
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
                zones[this.currentZone].queues.every((q, i) => this.clones[i].isSyncing || this.clones[i].damage == Infinity || this.clones[i].notSyncing || !q.hasFutureSync()) &&
                waitActions.some(a => a.action == "=")
            ) {
                waitActions.filter(a => a.action == "=").forEach(a => a.complete());
                this.clones.forEach(c => c.unSync());
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
                if (this.clones[a].damage === Infinity) {
                    this.clones[a].addToTimeline({ name: "Dead" }, nextTickTime);
                } else {
                    this.clones[a].addToTimeline({ name: "None" }, nextTickTime);
                    getStat("Speed").gainSkill(nextTickTime / 1000);
                }
            });
            waitActions.forEach(a => {
                a.currentClone!.addToTimeline({ name: "Wait" }, nextTickTime);
                getStat("Speed").gainSkill(nextTickTime / 1000);
            });
            this.clones.forEach(c => c.drown(nextTickTime));
            zones[this.currentZone].tick(nextTickTime);
            mana.spendMana(nextTickTime / 1000);
            time -= nextTickTime;
            this.queueTime += nextTickTime;
        }
        gameStatus.paused = false;
        return 0;
    }

    mainLoop() {
        if (zones[0].index === -1 || realms[0].index === -1) return;
        if (this.shouldReset) {
            resetLoop();
        }
        const mana = getStat("Mana");
        this.queuesNode = this.queuesNode || document.querySelector("#queues");
        if (isNaN(mana.current) && settings.running) toggleRunning();
        const time = Date.now() - this.lastAction;
        this.lastAction = Date.now();
        if (settings.running) {
            if (mana.current == 0 || this.clones.every(c => c.damage === Infinity)) {
                this.queuesNode?.classList.add("out-of-mana");
                // Attempt to update any mana rock currently being mined
                this.clones.forEach(c => {
                    let cloneLoc = zones[this.currentZone].getMapLocation(c.x, c.y);
                    if (cloneLoc?.baseType.name == "Mana-infused Rock") {
                        let action = cloneLoc.getPresentAction();
                        if (action && action.startingDuration > action.remainingDuration) {
                            Route.updateBestRoute(cloneLoc);
                        }
                        const route = getBestRoute(c.x, c.y, this.currentZone);
                        if (route) {
                            route.hasAttempted = true;
                        }
                    }
                });
                currentLoopLog.finalize();
                getMessage("Out of Mana").display();
                if (settings.autoRestart == AutoRestart.RestartAlways || (settings.autoRestart == AutoRestart.RestartDone && this.clones.every(c => c.repeated))) {
                    resetLoop();
                }
            } else {
                this.queuesNode?.classList.remove("out-of-mana");
            }
            if (settings.autoRestart == AutoRestart.RestartAlways && zones[this.currentZone].queues.every(q => !q.getNextAction())) {
                this.queuesNode?.classList.remove("out-of-mana");
                resetLoop();
            }
        }
        if (
            !settings.running ||
            mana.current == 0 ||
            (settings.autoRestart == AutoRestart.WaitAny &&
                zones[this.currentZone].queues.some(q => !q.getNextAction() && (!q.length || q[q.length - 1].actionID != "="))) ||
            (settings.autoRestart == AutoRestart.WaitAll && zones[this.currentZone].queues.every(q => !q.getNextAction()) && this.clones.some(c => c.damage < Infinity)) ||
            !getMessageBox()?.hidden
        ) {
            this.timeBanked += time;
            gameStatus.paused = true;
            redrawTimeNode();
            return;
        }
        let timeAvailable = time;
        if (settings.usingBankedTime && this.timeBanked > 0) {
            const speedMultiplier = 3 + zones[0].cacheManaGain[0] ** 0.5;
            timeAvailable = Math.min(time + this.timeBanked, time * speedMultiplier);
        }
        timeAvailable = Math.min(timeAvailable, settings.maxTotalTick, mana.current * 1000);
        if (timeAvailable < 0) timeAvailable = 0;

        let timeLeft = this.runActions(timeAvailable);

        this.timeBanked += time + timeLeft - timeAvailable;
        if (this.timeBanked < 0) this.timeBanked = 0;

        if (zones[this.currentZone].queues.some(q => q.selected)) {
            this.clones[zones[this.currentZone].queues.findIndex(q => q.selected)].writeStats();
        }
        this.queueTimeNode = this.queueTimeNode || document.querySelector("#time-spent");
        this.queueTimeNode.innerText = writeNumber(this.queueTime / 1000, 1);
        this.zoneTimeNode = this.zoneTimeNode || document.querySelector("#time-spent-zone");
        if (this.currentZone == this.displayZone) {
            this.zoneTimeNode.innerText = writeNumber((this.queueTime - (zones[this.currentZone].zoneStartTime || 0)) / 1000, 1);
        } else {
            this.zoneTimeNode.innerText = writeNumber(Math.max(0, (zones[this.displayZone + 1]?.zoneStartTime || 0) - (zones[this.displayZone].zoneStartTime || 0)) / 1000, 1);
        }
        this.queueActionNode = this.queueActionNode || document.querySelector("#actions-spent");
        this.queueActionNode.innerText = `${writeNumber(this.loopCompletions, 0)} (x${writeNumber(1 + this.loopCompletions / 40, 3)})`;
        redrawTimeNode();

        stats.forEach(e => e.update());
        stuff.forEach(e => e.displayDescription());

        if (currentLoopLog == displayedLog) displayedLog.display();

        drawMap();
    }
}

export const game = new Game();

setInterval(() => game.mainLoop(), Math.floor(1000 / fps));

export function setup() {
    const URLParams = new URL(document.location.href).searchParams;
    Clone.addNewClone();
    zones[0].enterZone();
    zones[0].queues[0].selected = true;
    getMapLocation(0, 0);
    drawMap();
    getMessage("Welcome to Cavernous!").display();
    if (URLParams.has("timeless")) {
        game.timeBanked = Infinity;
    }
}

// Calling load directly prevents tests from stopping loading.
setTimeout(() => load(), 15);
