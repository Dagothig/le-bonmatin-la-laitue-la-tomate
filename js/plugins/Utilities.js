function override(obj) {
    for (let i = 1; i < arguments.length; i++) {
        let fn = arguments[i];
        let original = obj[fn.name];
        obj[fn.name] = function (a, b, c, d, e, f) {
            return fn.call(this, original, a, b, c, d, e, f);
        }
    }
}

function rgbToHsl(arr, i) {
    const r = arr[i + 0];
    const g = arr[i + 1];
    const b = arr[i + 2];
    var cmin = Math.min(r, g, b);
    var cmax = Math.max(r, g, b);
    var h = 0;
    var s = 0;
    var l = (cmin + cmax) / 2;
    var delta = cmax - cmin;

    if (delta > 0) {
        if (r === cmax) {
            h = 60 * (((g - b) / delta + 6) % 6);
        } else if (g === cmax) {
            h = 60 * ((b - r) / delta + 2);
        } else {
            h = 60 * ((r - g) / delta + 4);
        }
        s = delta / (255 - Math.abs(2 * l - 255));
    }
    arr[i + 0] = h;
    arr[i + 1] = s;
    arr[i + 2] = l;
}

function hslToRgb(arr, i) {
    const h = arr[i + 0];
    const s = arr[i + 1];
    const l = arr[i + 2];
    var c = (255 - Math.abs(2 * l - 255)) * s;
    var x = c * (1 - Math.abs((h / 60) % 2 - 1));
    var m = l - c / 2;
    var cm = c + m;
    var xm = x + m;

    if (h < 60) {
        arr[i + 0] = cm;
        arr[i + 1] = xm;
        arr[i + 2] = m;
    } else if (h < 120) {
        arr[i + 0] = xm;
        arr[i + 1] = cm;
        arr[i + 2] = m;
    } else if (h < 180) {
        arr[i + 0] = m;
        arr[i + 1] = cm;
        arr[i + 2] = xm;
    } else if (h < 240) {
        arr[i + 0] = m;
        arr[i + 1] = xm;
        arr[i + 2] = cm;
    } else if (h < 300) {
        arr[i + 0] = xm;
        arr[i + 1] = m;
        arr[i + 2] = cm;
    } else {
        arr[i + 0] = cm;
        arr[i + 1] = m;
        arr[i + 2] = xm;
    }
}

const GROUND = 0;
const FLYING = 1;
const EMPTY_OBJ = {};
const EMPTY_ARR = [];

const reverseParams = {
    mhp: 0,
    mmp: 1,
    atk: 2,
    def: 3,
    mat: 4,
    mdf: 5,
    agi: 6,
    luk: 7
}

function aaa_fireplace(eventId, strength = 100) {
    var vmin = 0, vmax = 90, pmin = 0, pmax = 100;
    var tmin = [-16, -8, 0, 64], tmax = [48, 24, 12, 0];
    var e = $gameMap.event(eventId);
    var dst = Math.sqrt(Math.pow($gamePlayer.x - e.x, 2) + Math.pow($gamePlayer.y - e.y, 2));
    var p = (1 - Math.min(Math.max(dst - 1, 0) / 8, 1)) * strength / 100;
    AudioManager.playBgs({
        name: "Fireplace", pan: 0,
        volume: p * (vmax - vmin) + vmin,
        pitch: p * (pmax - pmin) + pmin,
    });
    $gameScreen._tone = $gameScreen._toneTarget = tmin.map((c, i) => c + p * (tmax[i] - tmin[i]));
}

function aaa_se(eventId, se) {
    var e = $gameMap.event(eventId);
    se.volume = se.volume || 90;
    se.pitch = se.pitch | 100;
    se.pan = se.pan || 0;
    se.strength = se.strength || 100;
    var dst = Math.sqrt(Math.pow($gamePlayer.x - e.x, 2) + Math.pow($gamePlayer.y - e.y, 2));
    var p = (1 - Math.min(Math.max(dst - 1, 0) / 8, 1)) * se.strength / 100;
    se.volume *= p
    AudioManager.playSe(se);
}

function aaa_jump(e, x, y, h) {
    e.jump(x, y);
    if (isFinite(h)) {
        e._jumpPeak += h;
        e._jumpCount = e._jumpPeak * 2;
        for (const follower of (e._followers || EMPTY_OBJ)._data || EMPTY_ARR) {
            follower._jumpPeak += h;
            follower._jumpCount = e._jumpPeak * 2;
        }
    }
}

function aaa_jump_forward(e, d, h) {
    var x = $gameMap.xWithDirection(0, e.direction()) * d;
    var y = $gameMap.yWithDirection(0, e.direction()) * d;
    aaa_jump(e, x, y, h);
    if (isFinite(h)) {
        e._jumpPeak += h;
        e._jumpCount = e._jumpPeak * 2;
    }
}

// Extend vars
var $gameMapSwitches = {};
function aaa_map_switch(name, value) {
    var switches = $gameMapSwitches[$gameMap._mapId] || ($gameMapSwitches[$gameMap._mapId] = {});
    if (typeof value === "undefined") {
        return switches[name];
    }
    switches[name] = value;
    $gameMap.requestRefresh();
}

override(DataManager,
    function createGameObjects(createGameObjects) {
        createGameObjects.call(this);
        $gameMapSwitches = {};
    });

var MOVE = "startMove",
    WIGGLE = "startWiggle",
    PARABOLA = "startParabola",
    WAIT = "startWait",
    PATTERN = "setPattern",
    MOTION = "gogoGadgetMotion",
    SE = "playSe",
    SHAKE = "gogoGadgetShake",
    OPACITY = "setOpacity",
    FLIP = "flippendo";

function aaa_anim(target, anim, delay) {
    var sprite = SceneManager.battlerSprite(target);
    sprite._aaaX = sprite._aaaX || 0;
    sprite._aaaY = sprite._aaaY || 0;
    delay = delay || 0;
    var sideSign = target instanceof Game_Actor ? -1 : 1;
    if (delay) {
        sprite.pushMove([WAIT, delay]);
    }
    switch (anim) {
        case "jump_in":
        default:
            sprite.pushMove([MOVE, sideSign * -100, 50, 0]);
            sprite.pushMove([PARABOLA, sideSign * -20, 0, -60, 12]);
            sprite.pushMove([PARABOLA, 0, 0, -10, 4]);
            break;
        case "wiggle":
            sprite.pushMove([WIGGLE, -5, -2, 5, 0, 30]);
            break;
        case "reset":
            sprite._aaaX = 0;
            sprite._aaaY = 0;
            sprite.pushMove([PARABOLA, sideSign * -3, 3, -6, 12]);
            sprite.pushMove([PARABOLA, 0, 0, -4, 12]);
            break;
        case "step_back":
            sprite._aaaX += sideSign * -30;
            sprite._aaaY += 0;
            sprite.pushMove([MOVE, sprite._aaaX, sprite._aaaY, 12]);
            break;
        case "step_forward":
            sprite._aaaX += sideSign * 50;
            sprite._aaaY += 0;
            sprite.pushMove([MOVE, sprite._aaaX, sprite._aaaY, 12]);
            break;
        case "shuffle":
            sprite.pushMove([WAIT, 4]);
            sprite.pushMove([PARABOLA, sideSign * 10, -10, -20, 12]);
            sprite.pushMove([WAIT, 8]);
            sprite.pushMove([PARABOLA, sideSign * -15, 10, -30, 12]);
            sprite.pushMove([WAIT, 6]);
            sprite.pushMove([PARABOLA, sideSign * -30, 0, -10, 12]);
            break;
        case "step_down":
            sprite._aaaX += sideSign * -5;
            sprite._aaaY += 30;
            sprite.pushMove([MOVE, sprite._aaaX, sprite._aaaY, 12]);
            break;
        case "lunge":
            sprite._aaaX += sideSign * 20;
            sprite.pushMove([PARABOLA, sprite._aaaX, sprite._aaaY, -10, 8]);
            sprite._aaaX = 0;
            sprite._aaaY = 0;
            sprite.pushMove([MOVE, sprite._aaaX, sprite._aaaY, 3]);
            break;
        case "jump":
            sprite.pushMove([PARABOLA, sprite._aaaX + sideSign * 3, 3, -6, 12]);
            sprite.pushMove([PARABOLA, sprite._aaaX, 0, -20, 12]);
            break;
    }
}

override(Array.prototype,
    function remove() {
        for (let i = arguments.length - 1; i > 0; i--) {
            let idx = this.indexOf(arguments[i]);
            if (idx >= 0) {
                this.splice(idx, 1);
            }
        }
    },
    function random() {
        return this[(Math.random() * (this.length - 1)) | 0];
    });

(function () {
    override(DataManager,
        function makeSaveContents(makeSaveContents) {
            var contents = makeSaveContents.call(this);
            contents.mapSwitches = $gameMapSwitches;
            return contents;
        },
        function extractSaveContents(extractSaveContents, contents) {
            extractSaveContents.call(this, contents);
            $gameMapSwitches = contents.mapSwitches || {};
        });

    override(Game_Event.prototype,
        function setupPage(setupPage) {
            this._hasRun = false;
            setupPage.call(this);

        },
        function meetsConditions(meetsConditions, page) {
            var cmd = page.list && page.list[0] && page.list[0];
            if (cmd && cmd.code === 356) { // Plugin command lol
                if (cmd.parameters[0] === "aaa_condition") {
                    // Assume the next item is a script to eval
                    if (!eval(page.list[1].parameters[0]))
                        return false;
                }
            }
            return meetsConditions.call(this, page);
        },
        function isMapPassable(_isMapPassable, x, y, d) {
            var x2 = $gameMap.roundXWithDirection(x, d);
            var y2 = $gameMap.roundYWithDirection(y, d);
            var d2 = this.reverseDir(d);
            switch (this.movementType) {
                case FLYING:
                    return (
                        ($gameMap.isPassable(x, y, d) && $gameMap.isPassable(x2, y2, d2)) ||
                        $gameMap.isBoatPassable(x2, y2) ||
                        $gameMap.isShipPassable(x2, y2));
                case GROUND:
                default:
                    return $gameMap.isPassable(x, y, d) && $gameMap.isPassable(x2, y2, d2);
            }
        },
        function isCollidedWithEvents(_isCollidedWithEvents, x, y) {
            return this.movementType !== FLYING &&
                $gameMap.eventsXyNt(x, y).some(event =>
                    event.movementType !== FLYING &&
                    event._priorityType);
        });

    override(Game_Player.prototype,
        function triggerButtonAction() {
            if (Input.isTriggered('ok')) {
                if (this.getOnOffVehicle()) {
                    return true;
                }
                this.checkEventTriggerThere([0,1,2]);
                if ($gameMap.setupStartingEvent()) {
                    return true;
                }
                this.checkEventTriggerHere([0]);
                if ($gameMap.setupStartingEvent()) {
                    return true;
                }
            }
            return false;
        });
})();

function eval_fn_expr(expr, args) {
    expr = expr.trim();
    if (!expr.startsWith("{")) {
        expr = "{ return " + expr + " }";
    }
    expr = "(function(" + (args || "") + ") " + expr + ")";
    try {
        return eval(expr);
    } catch (err) {
        console.error(expr);
        throw err;
    }
}

// Extendoooooo
(function () {
    var aaaExtend = /\<<aaa_extend (.*)\>>/;
    var targetsRegexp = /\<<aaa_targets ([\s\S]*?)\>>/;
    var targettedRegexp = /\<<aaa_targetted ([\s\S]*?)\>>/;
    var applyRegexp = /\<<aaa_apply ([\s\S]*?)\>>/;
    var removedRegexp = /\<<aaa_removed ([\s\S]*?)\>>/;
    var eotRegexp = /\<<aaa_eot ([\s\S]*?)\>>/;
    var actionRegexp = /\<<aaa_action ([\s\S]*?)\>>/;
    var actionsRegexp = /\<<aaa_actions ([\s\S]*?)\>>/;
    var performActionStartRegexp = /\<<aaa_performActionStart ([\s\S]*?)\>>/;
    var setupRegexp = /\<<aaa_setup ([\s\S]*?)\>>/;
    var deathRegexp = /\<<aaa_death ([\s\S]*?)\>>/;
    var escapeRegexp = /\<<aaa_escape ([\s\S]*?)\>>/;
    var restrictedRegexp = /\<<aaa_on_restrict ([\s\S]*?)\>>/;
    var tilingRegexp = /\<<aaa_tiling *(\d+)? *(\d+)? *(\[[\d+\,]*\d+\])? *(\d+|\[[\d+\,]*\d+\])?\>>/;
    var battlerIconRegexp = /\<<aaa_icon *(\d+)? *(\d+)? *(\d+)? *(\d+)? *([-_/\w]+)?\>>/;
    const actorSpriteRegexp = /\<<aaa_actor_sprite *([-_\w]+)?\>>/;
    const shadowRegexp = /\<<shadow *(\w+)? *(-?\d+)?\>>/;
    const overlayRegexp = /\<<aaa_overlay (\d+)\>>/;

    function extendoList(entries) {
        for (let index = 0; index < entries.length; index++) {
            const entry = entries[index];
            switch (entry.code) {
                // Set Movement Route
                case 205:
                    for (const routeEntry of entry.parameters[1].list)
                        if (routeEntry.code === Game_Character.ROUTE_SCRIPT)
                            routeEntry.evalFn = eval_fn_expr("{\n" + routeEntry.parameters[0] + "\n}", "command, gc, params");
                    break;
                // Conditional Branch
                case 111:
                    switch (entry.parameters[0]) {
                        // Script
                        case 12:
                            entry.evalFn = eval_fn_expr(entry.parameters[1]);
                            break;
                    }
                    break;
                // Control Variables
                case 122:
                    // Operand
                    switch (entry.parameters[3]) {
                        // Script
                        case 4:
                            entry.evalFn = eval_fn_expr(entry.parameters[4]);
                            break;
                    }
                    break;
                // Script
                case 355:
                    let lines = "{\n" + entry.parameters[0] + "\n";
                    while (index + 1 < entries.length) {
                        const otherEntry = entries[index + 1];
                        if (otherEntry.code === 655) {
                            lines += otherEntry.parameters[0] + "\n";
                            index++;
                        }
                        else
                            break;
                    }
                    entry.evalFn = eval_fn_expr(lines + "}");
                    break;
            }
        }
    }

    DataManager._databaseFiles.push({ name: "$dataWalkthrough", src: "Walkthrough.json" });

    var original_onLoad = DataManager.onLoad;
    DataManager.onLoad = function (object) {
        original_onLoad.call(DataManager, object);
        switch (object) {
            case $dataMapInfos:
                var $gms = window.$gms = {};
                for (const map of object) {
                    if (!map)
                        continue;
                    $gms[map.name] = map;
                    Object.defineProperty(map, "$sw", {
                        configurable: true,
                        get() { return $gameMapSwitches[map.id] || ($gameMapSwitches[map.id] = {}); }
                    });
                }
                break;
            case $dataMap:
                $dataMap.bgm.filters = ($dataMap.meta.bgmFilter || "").split(",").filter(i => i);
                for (const event of $dataMap.events)
                    for (const page of event && event.pages || []) {
                        extendoList(page && page.list || []);
                        for (const routeEntry of (page && page.moveRoute || {}).list || [])
                            if (routeEntry.code === Game_Character.ROUTE_SCRIPT)
                                routeEntry.evalFn = eval_fn_expr("{\n" + routeEntry.parameters[0] + "\n}", "command, gc, params");
                    }
                $dataMap.playerScale = Number.parseFloat($dataMap.meta.playerScale) || 1;
                break;
            case $dataCommonEvents:
                for (const event of $dataCommonEvents)
                    extendoList(event && event.list || []);
                break;
            case $dataTroops:
                for (const troop of $dataTroops)
                    for (const page of troop && troop.pages || [])
                        extendoList(page && page.list || [])
                break;
            case $dataStates:
                for (const state of object) {
                    if (!state)
                        continue;
                    const note = state && state.note || "";
                    const extStr = (note.match(aaaExtend) || [])[1];
                    const ext = JSON.parse(extStr || "{}");
                    Object.assign(state, ext);
                    const targettedMatch = note.match(targettedRegexp);
                    state._customTargetted = targettedMatch && targettedMatch[1] && eval_fn_expr(targettedMatch[1], "target");
                    const applyMatch = note.match(applyRegexp);
                    state._customApply = applyMatch && applyMatch[1] && eval_fn_expr(applyMatch[1], "action, target");
                    const removedMatch = note.match(removedRegexp);
                    state._customRemoved = removedMatch && removedMatch[1] && eval_fn_expr(removedMatch[1], "affected");
                    const eotMatch = note.match(eotRegexp);
                    state._customEOT = eotMatch && eotMatch[1] && eval_fn_expr(eotMatch[1]);
                    const overlayMatch = note.match(overlayRegexp);
                    overlayMatch && (state.overlay = parseInt(overlayMatch[1]) || 0);
                    state.params = [0,0,0,0,0,0,0,0];
                    for (key in state && state.meta) {
                        const value = state.meta[key];
                        if (key.startsWith("stat-")) {
                            const name = key.substring(5);
                            const num = Number.parseFloat(value);
                            const param = reverseParams[name];
                            if (isFinite(param)) {
                                state.params[param] = num;
                            }
                        }
                        if (key.startsWith("TRAIT_")) {
                            const num = Number.parseFloat(value);
                            const code = Game_BattlerBase[key];
                            if (isFinite(code)) {
                                state.traits.push({ code: code, value: num });
                            }
                        }
                    }
                    if (state.meta.counterSkillId) {
                        state.counterSkillId = parseInt(state.meta.counterSkillId);
                    }
                }
                break;
            case $dataSkills:
                for (const skill of object) {
                    if (!skill)
                        continue;
                    skill.damage.formulaFn = eval_fn_expr(skill.damage.formula, "target, item, a, b, v, sign");
                    const note = skill && skill.note || "";
                    const targetMatch = note.match(targetsRegexp);
                    skill._customTargets = targetMatch && targetMatch[1] && eval_fn_expr(targetMatch[1]);
                    const actionMatch = note.match(actionRegexp);
                    skill._customAction = actionMatch && actionMatch[1] && eval_fn_expr(actionMatch[1], "target");
                    const performActionStartMatch = note.match(performActionStartRegexp);
                    skill._customPerformActionStart = performActionStartMatch && performActionStartMatch[1] && eval_fn_expr(performActionStartMatch[1], "battler");
                }
                break;
            case $dataActors:
                window.$btl = {};
                for (const actor of object) {
                    if (!actor)
                        continue;
                    const note = actor && actor.note || "";
                    const setupMatch = note.match(setupRegexp);
                    actor._customSetup = setupMatch && setupMatch[1] && eval_fn_expr(setupMatch[1]);
                    const shadowMatch = note.match(shadowRegexp);
                    if (shadowMatch) {
                        actor.shadowImg = shadowMatch[1];
                        actor.shadowOffset = parseFloat(shadowMatch[2])
                    }
                    const deathMatch = note.match(deathRegexp);
                    actor._customDeath = deathMatch && deathMatch[1] && eval_fn_expr(deathMatch[1]);
                    const iconMatch = note.match(battlerIconRegexp);
                    if (iconMatch) {
                        window.iconMatch = iconMatch;
                        actor._iconX = parseInt(iconMatch[1]) || 0;
                        actor._iconY = parseInt(iconMatch[2]) || 0;
                        actor._iconW = parseInt(iconMatch[3]) || 0;
                        actor._iconH = parseInt(iconMatch[4]) || 0;
                        actor._iconSrc = iconMatch[iconMatch.length - 1] || null;
                    }
                }
                break;
            case $dataEnemies:
                for (const enemy of object) {
                    if (!enemy)
                        continue;
                    const note = enemy && enemy.note || "";
                    const actionMatch = note.match(actionRegexp);
                    enemy._customAction = actionMatch && actionMatch[1] && eval_fn_expr(actionMatch[1], "actionList, ratingZero");
                    const actionsMatch = note.match(actionsRegexp);
                    enemy._customActions = actionsMatch && actionsMatch[1] && eval_fn_expr(actionsMatch[1], "actionList");
                    const restrictedMatch = note.match(restrictedRegexp);
                    enemy._customOnRestrict = restrictedMatch && restrictedMatch[1] && eval_fn_expr(restrictedMatch[1]);
                    const setupMatch = note.match(setupRegexp);
                    enemy._customSetup = setupMatch && setupMatch[1] && eval_fn_expr(setupMatch[1], "enemyId, x, y");
                    const deathMatch = note.match(deathRegexp);
                    enemy._customDeath = deathMatch && deathMatch[1] && eval_fn_expr(deathMatch[1]);
                    const escapeMatch = note.match(escapeRegexp);
                    enemy._customEscape = escapeMatch && escapeMatch[1] && eval_fn_expr(escapeMatch[1]);
                    const tilingMatch = note.match(tilingRegexp);
                    if (tilingMatch) {
                        enemy.tw = parseInt(tilingMatch[1]) || 0;
                        enemy.th = parseInt(tilingMatch[2]) || 0;
                        enemy.patternType = JSON.parse(tilingMatch[3]) || null;
                        enemy.patternFrameDuration =
                            JSON.parse(tilingMatch[4]) ||
                            (enemy.patternType
                                ? new Array(enemy.patternType.length)
                                    .fill(parseInt(tilingMatch[4]) || 0)
                                : null);
                    }
                    const shadowMatch = note.match(shadowRegexp);
                    if (shadowMatch) {
                        enemy.shadowImg = shadowMatch[1] || Galv.BES.img;
                        enemy.shadowOffset = parseFloat(shadowMatch[2]) || Galv.BES.os
                    }
                    const actorSpriteMatch = note.match(actorSpriteRegexp);
                    enemy.actorSprite = actorSpriteMatch && (actorSpriteMatch[1] || "Actor1_1");
                    const iconMatch = note.match(battlerIconRegexp);
                    if (iconMatch) {
                        window.iconMatch = iconMatch;
                        let i = 1;
                        for (; i <= Math.min(5, iconMatch.length); i++ ) {
                            const n = parseInt(iconMatch[i]);
                            if (iconMatch[i] && !Number.isFinite(n)) {
                                const parts = iconMatch[i].split("/");
                                enemy._iconSrc = parts.pop();
                                enemy._iconFolder = "img/" + parts.join("/") + "/";
                                break;
                            } else {
                                enemy[["_iconX", "_iconY", "_iconW", "_iconH"][i - 1]] = n || 0;
                            }
                        }
                    }
                }
                break;
            case $dataSystem:
                var $gvars = window.$gvars = {};
                for (var i = 0; i < $dataSystem.variables.length; i++) {
                    const key = $dataSystem.variables[i].trim();
                    if (key) {
                        const variableId = i;
                        Object.defineProperty($gvars, key, {
                            configurable: true,
                            get() {
                                return $gameVariables.value(variableId);
                            },
                            set(value) {
                                return $gameVariables.setValue(variableId, value);
                            }
                        })
                    }
                }

                var $gsw = window.$gsw = {};
                for (var i = 0; i < $dataSystem.switches.length; i++) {
                    const key = $dataSystem.switches[i].trim();
                    if (key) {
                        const switchId = i;
                        Object.defineProperty($gsw, key, {
                            configurable: true,
                            get() {
                                return $gameSwitches.value(switchId);
                            },
                            set(value) {
                                return $gameSwitches.setValue(switchId, value);
                            }
                        });
                    }
                }
                break;
            case $dataArmors:
            case $dataWeapons:
                for (const item of object) {
                    if (item && item.meta) {
                        item.aaa_stats = {};
                        item.aaa_states = [];
                        for (key in item && item.meta) {
                            const value = item.meta[key];
                            if (key.startsWith("stat-")) {
                                const name = key.substring(5);
                                item.aaa_stats[name] = Number.parseFloat(value);
                                const param = reverseParams[name];
                                if (isFinite(param)) {
                                    item.params[param] = item.aaa_stats[name];
                                }
                            }
                            if (key === "state") {
                                item.aaa_states.push(Number.parseInt(value));
                            }
                        }
                    }
                }
                break;
            case $dataItems:
                for (const item of object) {
                    if (item && item.damage) {
                        item.damage.formulaFn = eval_fn_expr(item.damage.formula, "target, item, a, b, v, sign");
                    }
                }
                break;
        }
    };

    const EO = {};
    const EA = [];
    override(DataManager,
        function extractSaveContents(extractSaveContents, contents) {
            if (contents && contents.map) {
                extendoList(((contents.map._interpreter || EO)._list || EA));
                for (const event of contents.map._events || EA) {
                    extendoList(((event || EO)._interpreter || EO)._list || EA);
                    const moveRoute = ((event || EO)._moveRoute || EO).list || EA;
                    for (const routeEntry of moveRoute)
                        if (routeEntry.code === Game_Character.ROUTE_SCRIPT)
                                routeEntry.evalFn = eval_fn_expr("{\n" + routeEntry.parameters[0] + "\n}", "command, gc, params");
                }
                for (const event of contents.map._commonEvents || EA) {
                    extendoList(((event || EO)._interpreter || EO)._list || EA);
                }
            }
            extractSaveContents.call(this, contents);
        })

    var original_applyGuard = Game_Action.prototype.applyGuard;
    Game_Action.prototype.applyGuard = function (damage, target) {
        return damage;
    };

    var originalDef = Object.getOwnPropertyDescriptor(Game_BattlerBase.prototype, 'def');
    Object.defineProperties(Game_BattlerBase.prototype, {
        lukVar: {
            configurable: true,
            get: function () {
                return 1 + Math.random() * (this.luk - 95) / 100;
            }
        },
        grd: {
            configurable: true,
            get: function () {
                return this.traitsSum(Game_BattlerBase.TRAIT_SPARAM, 1) * 100;
            }
        },
        def: {
            configurable: true,
            get: function () {
                return originalDef.get.call(this) * (this.isGuard() ? 2 : 1) + (this.isGuard() ? this.grd : 0);
            }
        }
    });

    Game_Action.prototype.speed = function () {
        var speed = this.subject().agi;
        if (this.item()) {
            speed += this.item().speed;
        }
        if (this.isAttack()) {
            speed += this.subject().attackSpeed();
        }
        return speed;
    };

    var original_setupParallax = Game_Map.prototype.setupParallax;
    Game_Map.prototype.setupParallax = function () {
        original_setupParallax.call(this);
        this._parallaxPosX = null;
        this._parallaxPosY = null;
        const sxFromMeta = parseFloat($dataMap.meta.bgSx);
        if (isFinite(sxFromMeta)) {
            this._parallaxSx = sxFromMeta;
        }
        const syFromMeta = parseFloat($dataMap.meta.bgSy);
        if (isFinite(syFromMeta)) {
            this._parallaxSy = syFromMeta;
        }
    }

    var original_changeParallax = Game_Map.prototype.changeParallax;
    Game_Map.prototype.changeParallax = function (name, loopX, loopY, sx, sy, x, y) {
        original_changeParallax.call(this, name, loopX, loopY, sx, sy);
        this._parallaxPosX = Number.isFinite(x) ? x : null;
        this._parallaxPosY = Number.isFinite(y) ? y : null;
    }

    var original_parallaxOx = Game_Map.prototype.parallaxOx;
    Game_Map.prototype.parallaxOx = function () {
        if (Number.isFinite(this._parallaxPosX)) {
            return 256 - this.adjustX(this.parallaxPX() + 0.5) * this.tileWidth();
        }
        return original_parallaxOx.call(this);
    };

    var original_parallaxOy = Game_Map.prototype.parallaxOy;
    Game_Map.prototype.parallaxOy = function () {
        if (Number.isFinite(this._parallaxPosY)) {
            return 256 - this.adjustY(this.parallaxPY() + 0.5) * this.tileWidth();
        }
        return original_parallaxOy.call(this);
    };

    Game_Map.prototype.parallaxPX = function () {
        return this._parallaxPosX;
    };

    Game_Map.prototype.parallaxPY = function () {
        return this._parallaxPosY;
    };

    const defaultShadowColor = [0.0, 0.0, 0.0, 0.5];
    window.$tileShadowColor = new Float32Array(defaultShadowColor);

    override(Game_Interpreter.prototype,
        function pluginCommand(pluginCommand,command, args) {
            pluginCommand.call(this, command, args);
            if (command === "aaa_anim") {
                aaa_anim($gameTroop.members()[parseInt(args[0]) || 0], args[1], args[2]);
            } else if (command === "aaa_run_once") {
                if (this._hasRun) {
                    this.command115(); // Exit event processing
                } else {
                    this._hasRun = true;
                }
            } else if (command === "se") {
                AudioManager.playSe({ name: args[0] });
            } else if (command === "bgm") {
                AudioManager.playBgm({
                    name: args[0],
                    filters: [args[args.length - 1]]
                });
            } else if (command === "tileShadow") {
                const color = args[0] || defaultShadowColor;
                for (let i = 0; i < color.length; i++)
                    window.$tileShadowColor[i] = color[i];
            } else if (command === "fadein") {
                const fadeSpeed = Number.parseFloat(args[0]) || this.fadeSpeed();
                if (!$gameMessage.isBusy()) {
                    $gameScreen.startFadeIn(fadeSpeed);
                    this.wait(this.fadeSpeed());
                }
            } else if (command === "fadeout") {
                const fadeSpeed = Number.parseFloat(args[0]) || this.fadeSpeed();
                if (!$gameMessage.isBusy()) {
                    $gameScreen.startFadeOut(fadeSpeed);
                    this.wait(this.fadeSpeed());
                }
            } else if (command === "image") {
                const name = args[0];
                const idx = Number.parseInt(args[1]) || 0;
                const pattern = Number.parseInt(args[2]) || 0;
                const event = $gameMap.event(this.eventId());
                event.setImage(name, idx);
                event.setPattern(pattern);
                event._originalPattern = pattern;
            } else if (command === "weather") {
                const type = args[0];
                const power = Number.parseInt(args[1]);
                const duration = Number.parseInt(args[2]);
                $gameScreen.changeWeather(type, power, duration);
            } else if (command === "hud") {
                $gameMap.hud = args[0];
            } else if (command === "dash") {
                $gamePlayer._forceDashing = args[0] === "force";
            } else if (command === "wait_route") {
                this._character = $gameMap.event($gameMap.eventsByName[args[0]]);
                this.setWaitMode("route");
            } else if (command === "swap_bgm") {
                const pos = AudioManager._bgmBuffer ? AudioManager._bgmBuffer.seek() : 0;
                AudioManager.playBgm(args[0], pos);
            }
        },
        function jumpToLabel(_, labelName) {
            labelName = labelName + "";
            for (var i = 0; i < this._list.length; i++) {
                var command = this._list[i];
                if (command.code === 118 && command.parameters[0] === labelName) {
                    this.jumpTo(i);
                    return;
                }
            }
            return true;
        });

    override(ShaderTilemap.prototype,
        function _createLayers(_createLayers) {
            _createLayers.call(this);
            if (this.lowerLayer) {
                this.lowerLayer.shadowColor = window.$tileShadowColor;
            }
        })

    override(Sprite_Battler.prototype,
        function initMembers(initMembers) {
            initMembers.call(this);
            this._moves = [];
        },
        function dequeueMove() {
            while (!(this._movementDuration > 0) &&
                (this._moves.length || (this._repeatingMoves && this._repeatingMoves.length))) {
                var nextMove = this._moves.shift();
                if (!nextMove && this._repeatingMoves && this._repeatingMoves.length) {
                    if (!Number.isFinite(this._repeatingMoveIdx)) {
                        this._repeatingMoveIdx = 0;
                    } else {
                        this._repeatingMoveIdx = (this._repeatingMoveIdx + 1) % this._repeatingMoves.length;
                    }
                    nextMove = this._repeatingMoves[this._repeatingMoveIdx].slice();
                } else {
                    delete this._repeatingMoveIdx;
                }
                var type = nextMove.shift();
                this[type].apply(this, nextMove);
            }
        },
        function isMoving(isMoving) {
            return isMoving.call(this) && !Number.isFinite(this._repeatingMoveIdx);
        },
        function pushMove(_, args) {
            this._moves.push(args);
            this.dequeueMove();
        },
        function pushMoves(_, moveses) {
            for (const move of moveses)
                this._moves.push(move);
            this.dequeueMove();
        },
        function setRepeatingMoves(_, moveses) {
            this._repeatingMoves = moveses;
            this.dequeueMove();
        },
        function onMoveEnd(onMoveEnd) {
            onMoveEnd.call(this);
            switch (this._moveType) {
                case WIGGLE:
                case PARABOLA:
                    this._offsetX = this._targetOffsetX;
                    this._offsetY = this._targetOffsetY;
            }

            this.dequeueMove();
        },
        function startMove(startMove, x, y, duration) {
            this._moveType = MOVE;
            startMove.call(this, x, y, duration);
        },
        function startWiggle(_, mx, my, Mx, My, duration) {
            this._moveType = WIGGLE;
            this._targetOffsetX = this._offsetX;
            this._targetOffsetY = this._offsetY;
            this._wiggleX = mx;
            this._wiggleDX = Mx - mx;
            this._wiggleY = my;
            this._wiggleDY = My - my;
            this._movementDuration = duration;
        },
        function startParabola(_, x, y, h, duration) {
            this._moveType = PARABOLA;

            var x1 = this._offsetX || 0, y1 = this._offsetY || 0;
            var x3 = x, y3 = y;
            var x2 = (x1 + x3) / 2, y2 = h;
            var denom = (x1 - x2) * (x1 - x3) * (x2 - x3);

            this.paraA = (x3 * (y2 - y1) + x2 * (y1 - y3) + x1 * (y3 - y2)) / denom;
            this.paraB = (x3 * x3 * (y1 - y2) + x2 * x2 * (y3 - y1) + x1 * x1 * (y2 - y3)) / denom;
            this.paraC = (x2 * x3 * (x2 - x3) * y1 + x3 * x1 * (x3 - x1) * y2 + x1 * x2 * (x1 - x2) * y3) / denom;

            this._targetOffsetX = x;
            this._targetOffsetY = y;
            this._offsetBaseY = this._offsetY;
            this._movementDuration = duration;
        },
        function startWait(_, duration) {
            this._moveType = null;
            this._movementDuration = duration;
        },
        function playSe(_, se) {
            se.volume = se.volume || 90;
            se.pitch = se.pitch | 100;
            se.pan = se.pan || 0;
            AudioManager.playSe(se);
        },
        function gogoGadgetShake(_, shake) {
            $gameScreen.startShake(shake.power, shake.speed, shake.duration);
        },
        function gogoGadgetMotion(_, motion) {
            if (this._actor && (motion === "thrust" || motion === "swing" || motion === "missile")) {
                const weapons = this._actor.weapons();
                const wtypeId = weapons[0] ? weapons[0].wtypeId : 0;
                const attackMotion = $dataSystem.attackMotions[wtypeId];
                attackMotion && this._weaponSprite && this._weaponSprite.setup(attackMotion.weaponImageId);
            }
            this.startMotion(motion);
        },
        function setOpacity(_, opacity){
          this.opacity = opacity;
        },
        function flippendo() {
            this.scale.x = -this.scale.x;
        },
        function updateMove(updateMove) {
            if (this._moveType === MOVE)
                return updateMove.call(this);
            if (this._movementDuration <= 0) {
                return;
            }
            switch (this._moveType) {
                case WIGGLE:
                    var rx = Math.random();
                    var ry = Math.random();
                    this._offsetX = this._targetOffsetX + this._wiggleX + rx * this._wiggleDX;
                    this._offsetY = this._targetOffsetY + this._wiggleY + ry * this._wiggleDY;
                    break;
                case PARABOLA:
                    var d = this._movementDuration;
                    this._offsetX = (this._offsetX * (d - 1) + this._targetOffsetX) / d;
                    var x2 = this._offsetX * this._offsetX;
                    this._offsetY = x2 * this.paraA + this._offsetX * this.paraB + this.paraC;
                    this._offsetBaseY = (this._offsetBaseY * (d - 1) + this._targetOffsetY) / d;
                    break;
            }
            this._movementDuration--;
            if (this._movementDuration === 0) {
                this.onMoveEnd();
            }
        });

    override(Sprite_Enemy.prototype,
        function loadBitmap(loadBitmap, name, hue) {
            loadBitmap.call(this, name, hue);
            const data = $dataEnemies[this._enemy._enemyId];
            if (data.shadowImg) {
                if (!this.shadow) {
                    this.shadow = new Sprite_Base();
                    this.shadow.anchor.x = 0.5;
                    this.shadow.anchor.y = 1;
                    this.parent.addChildAt(this.shadow, this.parent.children.indexOf(this));
                }
                this.shadow.bitmap = ImageManager.loadSystem(data.shadowImg);
                this.shadow.offset = data.shadowOffset;
            } else if (this.shadow) {
                this.parent.removeChild(this.shadow);
            }
        },
        function update(update) {
            update.call(this);
            if (this.shadow) {
                this.shadow.x = this.x;
                this.shadow.y =
                    (Number.isFinite(this._offsetBaseY) ? this._offsetBaseY : this._offsetY) +
                    this._homeY +
                    this.shadow.offset;
                this.shadow.opacity = this.opacity;
            }
        },
        function updateStateSprite() {
            this._stateIconSprite.scale.x = 1 / this.scale.x;
            this._stateIconSprite.scale.y = 1 / this.scale.y;
            this._stateIconSprite.y = -Math.round((this.bitmap.height * this.scale.y + 40) * 0.9);
            if (this._stateIconSprite.y < 20 - this.y) {
                this._stateIconSprite.y = 20 - this.y;
            }
            this._stateIconSprite.y /= this.scale.y;
        });

    override(Scene_Battle.prototype,
        function terminate(terminate) {
            terminate.call(this);
            window.$btl = {};
        });

    var animRegexp = /\<<aaa_anim (.*)\>>/;

    override(Game_Actors.prototype,
        function actor(base, actorId) {
            const wasLoaded = this._data[actorId];
            const actor = base.call(this, actorId);
            if (!wasLoaded && actor) {
                $dataActors[actorId]._customSetup && $dataActors[actorId]._customSetup.call(actor);
                ($btl.party || ($btl.party = {}))[actor.name()] = actor;
            }
            return actor;
        })

    override(Game_Party.prototype,
        function addActor(addActor, actorId) {
            addActor.call(this, actorId);
            if (this.inBattle()) {
                $gameActors.actor(actorId).onBattleStart();
            }
        },
        function removeActor(removeActor, actorId) {
            if (this.inBattle()) {
                $gameActors.actor(actorId).onBattleEnd();
            }
            removeActor.call(this, actorId);
        })

    override(Game_BattlerBase.prototype,
        function statesCount(_) {
            return this._states.length;
        },
        function pushMove(_, args) {
            const sprite = SceneManager.battlerSprite(this);
            sprite && sprite.pushMove(args);
        },
        function pushMoves(_, moveses) {
            const sprite = SceneManager.battlerSprite(this);
            sprite && sprite.pushMoves(moveses);
        },
        function setRepeatingMoves(_, moveses) {
            const sprite = SceneManager.battlerSprite(this);
            sprite && sprite.setRepeatingMoves(moveses);
        },
        function tpRate(tpRate) {
            return this.maxTp() > 0 ? tpRate.call(this) : 0;
        });

    override(Game_Battler.prototype,
        function performActionStart(performActionStart, action) {
            performActionStart.call(this, action);
            var item = action.item();
            var note = item && item.note || "";
            var match = note.match(animRegexp);
            var args = match && match[1];
            if (args) {
                args = args.split(" ");
                switch (args[0]) {
                    case "self":
                        aaa_anim(action.subject(), args[1], args[2]);
                        break;
                    case "target":
                        aaa_anim(action.target(), args[1], args[2]);
                        break;
                }
            }
        });

    override(Game_Actor.prototype,
        function onBattleStart(onBattleStart) {
            onBattleStart.call(this);
            ($btl.party || ($btl.party = {}))[this.name()] = this;
        },
        function onBattleEnd(onBattleEnd) {
            onBattleEnd.call(this);
            if ($btl.party)
                delete $btl.party[this.actor().name];
        },
        function performCollapse(performCollapse) {
            Game_Battler.prototype.performCollapse.call(this);
            if ($gameParty.inBattle()) {
                this.actor()._customDeath ?
                    this.actor()._customDeath() :
                    SoundManager.playActorCollapse();
            }
        },
        function maxTp(maxTp) {
            return Number.isFinite(this._maxTp) ? this._maxTp : maxTp.call(this);
        },
        function atkRate() {
            return this.atk / this.maxAtk();
        },
        function maxAtk() {
            return 100;
        });

    override(Game_Enemy.prototype,
        function onBattleStart(onBattleStart) {
            onBattleStart.call(this);
            var enemy = this.enemy();
            enemy._customSetup && enemy._customSetup.call(this);
        },
        function transform(transform, enemyId) {
            const oldEnemyId = this._enemyId;
            transform.call(this, enemyId);
            if (oldEnemyId !== enemyId) {
                const enemy = this.enemy();
                enemy._customSetup && enemy._customSetup.call(this);
            }
        },
        function performCollapse(performCollapse) {
            performCollapse.call(this);
            var enemy = this.enemy();
            enemy._customDeath && enemy._customDeath.call(this);
        },
        function escape(escape) {
            escape.call(this);
            var enemy = this.enemy();
            enemy._customEscape && enemy._customEscape.call(this);
        },
        function selectAction(selectAction, actionList, ratingZero) {
            var enemy = this.enemy();
            return (
                enemy._customAction && enemy._customAction.call(this, actionList, ratingZero) ||
                selectAction.call(this, actionList, ratingZero));
        },
        function selectAllActions(selectAllActions, actionList) {
            let enemy = this.enemy();
            let actions = enemy._customActions && enemy._customActions.call(this, actionList);
            if (actions) {
                for (let i = 0; i < this.numActions(); i++) {
                    this.action(i).setEnemyAction(actions[i]);
                }
            } else {
                return selectAllActions.call(this, actionList);
            }
        },
        function gogoGadgetActions(_, actionList) {
            let tp = this.tp;
            let mp = this.mp;
            const actions = [];
            for (let i = 0 ; i < this.numActions(); i++) {
                actionList = actionList.filter(a =>
                    this.meetsCondition(a) &&
                    tp >= this.skillTpCost($dataSkills[a.skillId]) &&
                    mp >= this.skillMpCost($dataSkills[a.skillId]));
                const ratingMax = actionList.reduce((n, a) => Math.max(n, a.rating), 0);
                const ratingZero = ratingMax - 3;
                actionList = actionList.filter(a => a.rating > ratingZero);
                const action = this.selectAction(actionList, ratingZero);
                if (action) {
                    const skill = $dataSkills[action.skillId];
                    tp += Math.floor(skill.tpGain * this.tcr) - this.skillTpCost(skill);
                    mp -= this.skillMpCost(skill);
                    actions.push(action);
                }
            }
            return actions;
        },
        function onRestrict(onRestrict) {
            onRestrict.call(this);
            if (this.isAlive()) {
                var enemy = this.enemy();
                enemy._customOnRestrict && enemy._customOnRestrict.call(this);
            }
        },

        function paramBase(paramBase, paramId) {
            return this._cloneParams ?
                this._cloneParams[paramId] :
                paramBase.call(this, paramId);
        },

        function xparam(xparam, xparamId) {
            return (this._cloneXParams ? this._cloneXParams[xparamId] : 0) +
                xparam.call(this, xparamId);
        },

        function sparam(sparam, sparamId) {
            return (this._cloneSParams ? this._cloneSParams[sparamId] : 1) *
                sparam.call(this, sparamId);
        },

        function performAction(performAction, action) {
            if (this.enemy().actorSprite) {
                Game_Actor.prototype.performAction.call(this, action);
            } else {
                performAction.call(this, action);
            }
        },

        function weapons() {
            return this._cloneWeapons || [];
        },

        function performAttack(performAttack) {
            if (this.enemy().actorSprite) {
                Game_Actor.prototype.performAttack.call(this);
            } else {
                performAttack.call(this);
            }
        },

        function performDamage(performDamage) {
            performDamage.call(this);
            if (this.enemy().actorSprite && this.isSpriteVisible()) {
                this.requestMotion("damage");
            }
        },

        function performEvasion(performEvasion) {
            if (this.enemy().actorSprite) {
                Game_Actor.prototype.performEvasion.call(this);
            } else {
                performEvasion.call(this);
            }
        },

        function performMagicEvasion(performMagicEvasion) {
            if (this.enemy().actorSprite) {
                Game_Actor.prototype.performMagicEvasion.call(this);
            } else {
                performMagicEvasion.call(this);
            }
        },

        function performCounter(performCounter) {
            if (this.enemy().actorSprite) {
                Game_Actor.prototype.performCounter.call(this);
            } else {
                performCounter.call(this);
            }
        },

        function makeActions(makeActions) {
            if (this._cloneActions) {
                Game_Battler.prototype.makeActions.call(this);
                if (this.numActions() > 0) {
                    var actionList = this._cloneActions.filter(function(a) {
                        return this.isActionValid(a);
                    }, this);
                    if (actionList.length > 0) {
                        this.selectAllActions(actionList);
                    }
                }
                this.setActionState('waiting');
            } else {
                makeActions.call(this);
            }
        },

        function originalName(originalName) {
            return this._cloneName || originalName.call(this);
        },

        function battlerName(battlerName) {
            return this._cloneBattlerName || this.enemy().actorSprite || battlerName.call(this);
        },

        function transformAsClone(_, actor) {
            this._cloneParams = new Array(8).fill().map((_, paramId) => {
                var value = actor.paramBase(paramId) + actor.paramPlus(paramId);
                var maxValue = actor.paramMax(paramId);
                var minValue = actor.paramMin(paramId);
                return Math.round(value.clamp(minValue, maxValue));
            });
            this._cloneXParams = new Array(10).fill().map((_, xparamId) => {
                return actor.traitsSum(Game_BattlerBase.TRAIT_XPARAM, xparamId);
            });
            this._cloneSParams = new Array(10).fill().map((_, sparamId) => {
                return actor.traitsPi(Game_BattlerBase.TRAIT_SPARAM, sparamId);
            });
            this._cloneActions = actor.skills()
                // No chicken fo u!
                // TODO lol
                .filter(skill => skill.id !== 58)
                .map(skill => ({
                    conditionParam1: 0,
                    conditionParam2: 0,
                    conditionType: 0,
                    rating: 5,
                    skillId: skill.id
                }));
            this._cloneActions.push(
                {
                    conditionParam1: 0,
                    conditionParam2: 0,
                    conditionType: 0,
                    rating: 5,
                    skillId: 1
                },
                {
                    conditionParam1: 0,
                    conditionParam2: 0,
                    conditionType: 0,
                    rating: 1,
                    skillId: 2
                })
            this._cloneName = actor.name();
            this._cloneBattlerName = actor.battlerName();
            this._cloneWeapons = actor.weapons();
            this._letter = '';
            this._plural = false;
            this.refresh();
            this.recoverAll();
            this._tp = 0;
            this.numActions() > 0 && this.makeActions();
        });

    override(SceneManager,
        function battlerSprite(_, battler) {
            return (
                this._scene &&
                this._scene._spriteset &&
                this._scene._spriteset.battlerSprites &&
                this._scene._spriteset.battlerSprites().find(s =>
                    s._battler === battler));
        })

    override(Spriteset_Battle.prototype,
        function createEnemies() {
            var enemies = $gameTroop.members();
            var sprites = [];
            for (var i = 0; i < enemies.length; i++) {
                sprites[i] = enemies[i].enemy().actorSprite ?
                    new Sprite_EnemyActor(enemies[i]) :
                    new Sprite_Enemy(enemies[i]);
            }
            sprites.sort(this.compareEnemySprite.bind(this));
            for (var j = 0; j < sprites.length; j++) {
                this._battleField.addChild(sprites[j]);
            }
            this._enemySprites = sprites;
        });

    override(Sprite_Enemy.prototype,
        function initMembers(initMembers) {
            this.patternX = 0;
            this.patternY = 0;
            initMembers.call(this);
        },
        function setBattler(setBattler, battler) {
            setBattler.call(this, battler);
            this.patternFrameDuration = battler.enemy().patternFrameDuration;
        },
        function startBossCollapse(startBossCollapse) {
            startBossCollapse.call(this);
            this._effectDuration = this.th || this.bitmap.height;
        },
        function setPattern(_, x = this.patternX, y = this.patternY) {
            this.patternX = x;
            this.patternY = y;
        },
        function updateFrame(_) {
            Sprite_Battler.prototype.updateFrame.call(this);
            const enemy = this._enemy && this._enemy.enemy();
            const frameWidth = enemy && enemy.tw || this.bitmap.width;
            let frameHeight = enemy && enemy.th || this.bitmap.height;
            if (this._effectType === 'bossCollapse') {
                frameHeight = this._effectDuration;
            }
            let frameX = enemy.patternType ?
                enemy.patternType[this.patternX % enemy.patternType.length] :
                this.patternX;
            this.setFrame(
                frameX * frameWidth,
                this.patternY * frameHeight,
                frameWidth,
                frameHeight);

            if (enemy.patternType && !this._moves.length) {
                if (this.patternFrameDuration > 0) {
                    this.patternFrameDuration--;
                } else {
                    this.patternX++;
                    this.patternFrameDuration = enemy.patternFrameDuration[this.patternX % enemy.patternFrameDuration.length];
                }
            }
        },
        function setupEffect(setupEffect) {
            setupEffect.call(this);
            if (this._appeared && this._enemy.isAlive() && !this.opacity && !this._effectType) {
                this.startEffect("appear");
            }
        });

    override(Sprite_Actor.prototype,
        function update(update) {
            update.call(this);
            this._shadowSprite.y =
                (-this._offsetY) +
                (Number.isFinite(this._offsetBaseY) ? this._offsetBaseY : 0) +
                (this._shadowOffset || 0) +
                (-2);
        },
        function refreshMotion(refreshMotion) {
            const actor = this._actor;
            const motionGuard = Sprite_Actor.MOTIONS['guard'];
            if (actor &&
                (this._motion !== motionGuard || BattleManager.isInputting()) &&
                actor.isActing()) {
                return;
            }
            refreshMotion.call(this);
            if (this._motion === Sprite_Actor.MOTIONS["walk"] &&
                this._moveType === PARABOLA &&
                this._movementDuration > 0 &&
                (this._targetOffsetX + 50 < this._offsetX ||
                    this._targetOffsetX > this._offsetX)) {
                this.startMotion("escape");
            }
        },
        function startEntryMotion(startEntryMotion) {
            if (this._actor && this._actor.canMove()) {
                if (this._noEntry) {
                    delete this._noEntry;
                } else {
                    this.pushMoves([
                        [MOTION, "escape"],
                        [MOVE, 200, 50, 0],
                        [WAIT, this._actor.index() * 8],
                        [PARABOLA, 20, 0, -60, 12],
                        [PARABOLA, 0, 0, -10, 4]]);
                }
            } else {
                startEntryMotion.call(this);
            }
        },
        function startParabola(startParabola, x, y, h, duration) {
            startParabola.call(this, x, y, h, duration);
        },
        function stepForward(stepForward) {
            if (this._targetOffsetX !== -48 || this._targetOffsetY !== 0) {
                this.startParabola(-48, 0, -12, 12);
            }
            this._aaaX = -48;
        },
        function stepBack(stepBack) {
            this._actor.requestMotion("escape");
            this.startParabola(0, 0, -6, 12);
            this._aaaX = 0;
        },
        function retreat() {
            if (!this._moves.length &&
                (this._targetOffsetX !== 300 || this._targetOffsetY !== 0)) {
                this._actor.clearMotion();
                this.pushMoves([
                    [MOTION, "guard"],
                    [WAIT, (3 - this._actor.index()) * 8],
                    [MOTION, "escape"],
                    [PARABOLA, 50, 0, -20, 12],
                    [FLIP],
                    [MOTION, "walk"],
                    [PARABOLA, 70, 0, -10, 8],
                    [MOTION, "escape"],
                    [PARABOLA, 300, 0, -50, 18]
                ]);
            }
        },
        function updateBitmap(updateBitmap) {
            const name = this._actor.battlerName();
            const isDifferent = this._battlerName !== name;
            updateBitmap.call(this);
            if (isDifferent && this._actor.actor) {
                const data = this._actor.actor();
                this._shadowSprite.bitmap = ImageManager.loadSystem(data.shadowImg || "Shadow2");
                this._shadowOffset = data.shadowOffset || 0;
            }
        });

    var originalTargetsForOpponents = Game_Action.prototype.targetsForOpponents;
    Game_Action.prototype.targetsForOpponents = function () {
        var item = this.item();
        var customTargets = item._customTargets && item._customTargets.call(this);
        return (customTargets && customTargets.slice()) || originalTargetsForOpponents.call(this);
    }

    var originalTargetsForFriends = Game_Action.prototype.targetsForFriends;
    Game_Action.prototype.targetsForFriends = function () {
        var item = this.item();
        var customTargets = item._customTargets && item._customTargets.call(this);
        return (customTargets && customTargets.slice()) || originalTargetsForFriends.call(this);
    }

    var original_actionApply = Game_Action.prototype.apply;
    Game_Action.prototype.apply = function (target) {
        original_actionApply.call(this, target);
        var item = this.item();
        item._customAction && item._customAction.call(this, target);
    }

    function Sprite_EnemyActor(enemy) {
        Sprite_Actor.call(this, enemy);
    }

    window.Sprite_EnemyActor = Sprite_EnemyActor;
    Sprite_EnemyActor.prototype = Object.create(Sprite_Actor.prototype);
    Sprite_EnemyActor.prototype.constructor = Sprite_EnemyActor;

    override(Sprite_EnemyActor.prototype,
        function initMembers(_) {
            Sprite_Battler.prototype.initMembers.call(this);
            this._enemy = null;
            this._appeared = false;
            this._effectType = null;
            this._effectDuration = 0;
            this._shake = 0;
            this.createShadowSprite();
            this._shadowSprite.scale.x = -1;
            this.createWeaponSprite();
            this._weaponSprite.scale.x = -1;
            this._weaponSprite.x = 16;
            this.createMainSprite();
            this._mainSprite.scale.x = -1;
            Sprite_Enemy.prototype.createStateIconSprite.call(this);
        },
        function setBattler(_, battler) {
            Sprite_Battler.prototype.setBattler.call(this, battler);
            var changed = (battler !== this._actor);
            if (changed) {
                this._actor = this._enemy = battler;
                if (battler) {
                    this.setHome(battler.screenX(), battler.screenY());
                }
                this._stateIconSprite.setup(battler);
            }
        },
        function update(update) {
            update.call(this);
            if (this._enemy) {
                this.updateEffect();
                this.updateStateSprite();
            }
        },
        function updateBitmap(updateBitmap) {
            const shouldInitVisibility = this._battlerName !== this._enemy.battlerName();
            updateBitmap.call(this);
            shouldInitVisibility && this.initVisibility();
        },
        function initVisibility() {
            Sprite_Enemy.prototype.initVisibility.call(this);
        },
        function updateFrame(_) {
            Sprite_Battler.prototype.updateFrame.call(this);
            var bitmap = this._mainSprite.bitmap;
            if (bitmap) {
                var motionIndex = this._motion ? this._motion.index : 0;
                var pattern = this._pattern < 3 ? this._pattern : 1;
                var cw = bitmap.width / 9;
                var ch = bitmap.height / 6;
                var cx = Math.floor(motionIndex / 6) * 3 + pattern;
                var cy = motionIndex % 6;
                var fch = this._effectType === 'bossCollapse' ? this._effectDuration : ch;
                this._mainSprite.setFrame(cx * cw, cy * ch, cw, fch);
            }
        },
        function updatePosition(updatePosition) {
            updatePosition.call(this);
            this.x += this._shake;
        },
        function updateStateSprite() {
            this._stateIconSprite.y = -Math.round((this._mainSprite.bitmap.height / 6 + 40) * 0.9);
            if (this._stateIconSprite.y < 20 - this.y) {
                this._stateIconSprite.y = 20 - this.y;
            }
        },
        function initVisibility() {
            Sprite_Enemy.prototype.initVisibility.call(this);
        },
        function setupEffect() {
            Sprite_Enemy.prototype.setupEffect.call(this);
        },
        function startEffect(_, effectType) {
            Sprite_Enemy.prototype.startEffect.call(this, effectType);
        },
        function startAppear() {
            Sprite_Enemy.prototype.startAppear.call(this);
        },
        function startDisappear() {
            Sprite_Enemy.prototype.startDisappear.call(this);
        },
        function startWhiten() {
            Sprite_Enemy.prototype.startWhiten.call(this);
        },
        function startBlink() {
            Sprite_Enemy.prototype.startBlink.call(this);
        },
        function startCollapse() {
            Sprite_Enemy.prototype.startCollapse.call(this);
        },
        function startBossCollapse() {
            this._effectDuration = this._mainSprite.bitmap.height / 6;
            this._appeared = false;
        },
        function startInstantCollapse() {
            Sprite_Enemy.prototype.startInstantCollapse.call(this);
        },
        function updateEffect() {
            Sprite_Enemy.prototype.updateEffect.call(this);
        },
        function isEffecting() {
            Sprite_Enemy.prototype.isEffecting.call(this);
        },
        function revertToNormal() {
            Sprite_Enemy.prototype.revertToNormal.call(this);
        },
        function updateWhiten() {
            Sprite_Enemy.prototype.updateWhiten.call(this);
        },
        function updateBlink() {
            Sprite_Enemy.prototype.updateBlink.call(this);
        },
        function updateAppear() {
            Sprite_Enemy.prototype.updateAppear.call(this);
        },
        function updateDisappear() {
            Sprite_Enemy.prototype.updateDisappear.call(this);
        },
        function updateCollapse() {
            Sprite_Enemy.prototype.updateCollapse.call(this);
        },
        function updateBossCollapse() {
            Sprite_Enemy.prototype.updateBossCollapse.call(this);
        },
        function updateInstantCollapse() {
            Sprite_Enemy.prototype.updateInstantCollapse.call(this);
        },
        function moveToStartPosition() {

        },
        function stepForward() {
            if (this._targetOffsetX !== 48 || this._targetOffsetY !== 0) {
                this.startParabola(48, 0, -12, 12);
            }
            this._aaaX = 48;
        },
        function stepBack() {
            this._actor.requestMotion("escape");
            this.startParabola(0, 0, -6, 12);
            this._aaaX = 0;
        },
        function retreat() {},
        function damageOffsetX(damageOffsetX) {
            return damageOffsetX.call(this) * -1;
        });

    override(Sprite_StateOverlay.prototype,
        function updatePattern(_) {
            this._pattern++;
            this._pattern %= 8;
        },
        function update(update) {
            update.call(this);
            this._overlayCount--;
            if (!this._overlayCount) {
                findOverlay: if (this._battler) {
                    for (let i = 0, n = this._battler.statesCount(); i < n; i++) {
                        let stateIndex = ((this._overlayStateIndex || 0) + i + 1) % n;
                        let stateId = this._battler._states[stateIndex];
                        let state = $dataStates[stateId];
                        if (state.overlay) {
                            this._overlayIndex = state.overlay;
                            this._overlayStateIndex = stateIndex;
                            break findOverlay;
                        }
                    }
                    this._overlayIndex = 0;
                }
                this._overlayCount = 60;
            }
        });
    /*override(Sprite_StateIcon.prototype,
        function update(update) {
            update.call(this);
            let hue = this._hue || 0;
            let battlerHue = this._battler && this._battler.battlerHue() || 0;
            if (hue !== battlerHue) {
                this.bitmap = ImageManager.loadSystem('IconSet', -battlerHue);
                this.updateFrame();
                this._hue = battlerHue;
            }
        });*/

    override(BattleManager,
        function makeEscapeRatio() {
            this._escapeRatio = 1;
        });
})();

// Tinting
(function() {
    override(Sprite_Character.prototype,
        function updateOther(updateOther) {
            updateOther.call(this);
            if (this._character.tint !== undefined) {
                this.tint = this._character.tint;
            }
        });
})();

// Ding!
(function () {
    var original_actionApply = Game_Action.prototype.apply;
    Game_Action.prototype.apply = function (target) {
        original_actionApply.call(this, target);
        target.result().blocked =
            target.result().isHit() &&
            target.result().hpAffected &&
            target.result().hpDamage >= 0 &&
            target.result().hpDamage < 5 &&
            !target.result().drain;
    }

    const ding = { name: "Ding", volume: 90, pitch: 100 };
    const crit = { name: "Bell3", volume: 90, pitch: 100 };

    override(Window_BattleLog.prototype,
        function displayDamage(displayDamage, target) {
            if (target.result().blocked) {
                AudioManager.playSe(ding);
            }
            displayDamage.call(this, target);
        },
        function displayCritical(displayCritical, target) {
            if (target.result().critical) {
                AudioManager.playSe(crit);
            }
            displayCritical.call(this, target);
        })
})();

// Display target in log
(function () {
    Window_BattleLog.prototype.startAction = function (subject, action, targets) {
        var item = action.item();
        this.push('clear');
        this.push('performActionStart', subject, action);
        this.push('performAction', subject, action);
        this.push('showAnimation', subject, targets.clone(), item.animationId);
        this.displayAction(subject, item, targets);
    };

    var original_battleLogDisplayAction = Window_BattleLog.prototype.displayAction;
    Window_BattleLog.prototype.displayAction = function (subject, item, targets) {
        if (DataManager.isSkill(item)) {
            var target = targets.map(t => t && t.name()).join(", ");
            if (item.message1) {
                this.push('addText', subject.name() + item.message1.format(item.name, target));
            }
            if (item.message2) {
                this.push('addText', item.message2.format(item.name, target));
            }
        } else {
            original_battleLogDisplayAction.call(this, subject, item);
        }
    };

    override(Window_BattleLog.prototype,
        function waitForNewLine() {});

    override(Window_BattleStatus.prototype,
        function noop(_) {},
        function drawGaugeArea(drawGaugeArea, rect, actor) {
            if (actor._gauges) {
                let x = 0;
                for (let i = 0; i < actor._gauges.length; i++) {
                    const gauge = actor._gauges[i];
                    this[gauge[0] || "noop"](actor, rect.x + x, rect.y, gauge[1]);
                    x += 15 + gauge[1]
                }
            } else {
                drawGaugeArea.call(this, rect, actor);
            }
        },
        function drawActorAtk(_, actor, x, y, width) {
            let valueWidth = this.textWidth("999");
            width = width || 186;
            this.drawGauge(x, y, width, actor.atkRate(), this.powerUpColor(), this.powerDownColor());
            this.changeTextColor(this.systemColor());
            const fs = this.contents.fontSize;
            this.drawText("Violence", x, y, width - valueWidth);
            this.changeTextColor(this.normalColor());
            this.drawText(actor.atk, x + width - valueWidth, y, valueWidth, "right");
        });
})();

// Tapocher lés fenêtres
(function () {

    Window_MenuStatus.prototype.drawItemStatus = function (index) {
        var actor = $gameParty.members()[index];
        var rect = this.itemRect(index);
        var x = rect.x + 162;
        var y = rect.y + rect.height / 2 - this.lineHeight() * 2;
        var width = rect.width - x - this.textPadding();
        this.drawActorSimpleStatus(actor, x, y, width);
    };

    Window_SkillStatus.prototype.refresh = function () {
        this.contents.clear();
        if (this._actor) {
            var w = this.width - this.padding * 2;
            var h = this.height - this.padding * 2;
            var y = h / 2 - this.lineHeight() * 2;
            var width = w - 162 - this.textPadding();
            this.drawActorFace(this._actor, 0, 0, 144, h);
            this.drawActorSimpleStatus(this._actor, 162, y, width);
        }
    };

    Window_Base.prototype.drawActorSimpleStatus = function (actor, x, y, width) {
        const lineHeight = this.lineHeight();
        const availWidth = width - this.textPadding();
        const colWidth = (availWidth - this.standardPadding()) / 2;
        const thirdWidth = (availWidth - this.standardPadding() * 2) / 3;
        this.drawActorName(actor, x, y, availWidth);
        this.drawActorClass(actor, x, y + lineHeight * 1, availWidth);
        this.drawActorIcons(actor, x, y + lineHeight * 2, colWidth);
        this.drawActorHp(actor, x + 0 * (this.standardPadding() + thirdWidth), y + lineHeight * 3, thirdWidth);
        this.drawActorMp(actor, x + 1 * (this.standardPadding() + thirdWidth), y + lineHeight * 3, thirdWidth);
        this.drawActorTp(actor, x + 2 * (this.standardPadding() + thirdWidth), y + lineHeight * 3, thirdWidth);
    };
    Window_Status.prototype.maxEquipmentLines = function () {
        return 5;
    };
    Window_MenuStatus.prototype.maxItems = function () {
        return Math.min($gameParty.size(), 4);
    }

    var description = [
        "Calcul des dégâts: ",
        "  a.atk * a.luk - b.def * b.luk",
        "où luk est:",
        "  1 + uniform(0, mardité - 95) / 100",
        "Agileté détermine l'ordre des tours"];

    Window_Status.prototype.refresh = function () {
        this.contents.clear();
        if (!this._actor) {
            return
        }
        var lineHeight = this.lineHeight();

        this.drawActorFace(this._actor, 0, lineHeight * 0.5);
        var x1 = Window_Base._faceWidth + this.standardPadding();
        var colWidth = (this.contentsWidth() - x1 - this.standardPadding()) / 2;
        var x2 = x1 + colWidth + this.standardPadding();
        this.drawActorSimpleStatus(this._actor, x1, lineHeight * 0.5, colWidth);
        this.drawEquipments(x2, lineHeight * 0);

        this.drawHorzLine(lineHeight * 5);

        this.drawParameters(this.standardPadding(), lineHeight * 6);

        this.changeTextColor(this.systemColor());
        for (var i = 0; i < description.length; i++) {
            var y2 = lineHeight * (i + 6);
            this.drawText(description[i], this.standardPadding() + 160 + 60 + this.standardPadding(), y2);
        }

        this.drawHorzLine(lineHeight * 12);

        this.drawProfile(6, lineHeight * 13);
    };

    override(Window_Base.prototype,
        function drawActorMp(drawActorMp, actor, x, y, width) {
            if (actor.mmp) {
                drawActorMp.call(this, actor, x, y, width);
            }
        },
        function drawActorTp(drawActorTp, actor, x, y, width) {
            if (actor.maxTp()) {
                drawActorTp.call(this, actor, x, y, width);
            }
        },
        function drawGauge(drawGauge, x, y, width, rate, color1, color2) {
            rate = Math.min(Math.max(0, rate), 1);
            const parsed1 = [
                color1.substring(1, 3),
                color1.substring(3, 5),
                color1.substring(5, 7)
            ].map(p => Number.parseInt(p, 16));
            const parsed2 = [
                color2.substring(1, 3),
                color2.substring(3, 5),
                color2.substring(5, 7)
            ].map(p => Number.parseInt(p, 16));
            const curColor = "#" + parsed1
                .map((v, i) => v * (1 - rate) + parsed2[i] * rate)
                .map(p => Math.floor(p).toString(16).padStart(2, "0"))
                .join("");
            drawGauge.call(this, x, y, width, rate, color1, curColor);
        });

    Window_EquipStatus.prototype.refresh = function () {
        this.contents.clear();
        if (this._actor) {
            this.drawActorName(this._actor, this.textPadding(), 0, 270);
            for (var i = 0; i < 6; i++) {
                this.drawItem(0, this.lineHeight() * (1 + i), 2 + i);
            }
        }
    };

    override(Window_Message.prototype,
        function startMessage(startMessage) {
            startMessage.call(this);
            this._softWaitCount = 0;
        },
        function processCharacter(processCharacter, textState) {
            if (this._softWaitCount > 0) {
                this._softWaitCount--;
                return;
            }
            switch (textState.text[textState.index]) {
                case ",":
                    this._softWaitCount = 10;
                    break;
                case ".":
                case "!":
                case "?":
                    this._softWaitCount = 15;
                    break;
            }
            processCharacter.call(this, textState);
        });

    override(Window_ScrollText.prototype,
        function scrollSpeed(scrollSpeed) {
            return (this.aaaSpeed *
                    (this.isFastForward() ? this.fastForwardRate() : 1)) ||
                scrollSpeed.call(this);
        },
        function fastForwardRate() {
            return 9;
        },
        function processEscapeCharacter(processEscapeCharacter, code, textState) {
            switch (code) {
                case "S":
                    const param = this.obtainEscapeParam(textState)
                    this.aaaSpeed = Number.isFinite(param) ? param / 10 : 1;
                    break;
                default:
                    return processEscapeCharacter.call(this, code, textState);
            }
        });

})();

// State ameliorations
(function () {

    override(BattleManager,
        function applySubstitute(applySubstitute, target) {
            let newTarget;
            for (const state of target.states()) {
                newTarget = state._customTargetted && state._customTargetted(target);
                if (newTarget && newTarget.isAlive() && newTarget.canMove()) {
                    const targetSprite = SceneManager.battlerSprite(target);
                    const newTargetSprite = SceneManager.battlerSprite(newTarget);
                    let sideSign = target instanceof Game_Actor ? -1 : 1;
                    let offset = Math.max(targetSprite.width / 2, 36);
                    const dx = (targetSprite.x - newTargetSprite.x);
                    const dy = (targetSprite.y - newTargetSprite.y);
                    target.pushMoves([
                        [PARABOLA, sideSign * -3 * offset / 4, 0, -24, 8],
                        [WAIT, 30],
                        [PARABOLA, 0, 0, -24, 8]]);
                    newTarget.pushMoves([
                        [PARABOLA, dx + sideSign * offset / 2, dy + Math.sign(dy) * -4, -48, 12],
                        [WAIT, 30],
                        [PARABOLA, 0, 0, -24, 12]])
                    this._logWindow.displaySubstitute(newTarget, target);
                    return newTarget;
                }
            }
            return applySubstitute.call(this, target);
        });

    override(Game_Action.prototype,
        function itemEffectAddAttackState(itemEffectAddAttackState, target, effect) {
            this.subject().attackStates().forEach(function (stateId) {
                var chance = effect.value1;
                chance *= target.stateRate(stateId);
                chance *= this.subject().attackStatesRate(stateId);
                chance *= this.lukEffectRate(target);
                if (Math.random() < chance) {
                    var state = $dataStates[stateId];
                    const res = state._customApply ? state._customApply(this, target) : undefined;
                    if (res || res === undefined) {
                        target.addState(stateId);
                        this.makeSuccess(target);
                    }
                }
            }.bind(this), target);
        },
        function itemEffectAddNormalState(itemEffectAddNormalState, target, effect) {
            var chance = effect.value1;
            if (!this.isCertainHit()) {
                chance *= target.stateRate(effect.dataId);
                chance *= this.lukEffectRate(target);
            }
            if (Math.random() < chance) {
                var state = $dataStates[effect.dataId];
                const res = state._customApply ? state._customApply(this, target) : undefined;
                if (res || res === undefined) {
                    target.addState(effect.dataId);
                    this.makeSuccess(target);
                }
            }
        });

    override(Game_Battler.prototype,
        function removeState(removeState, stateId) {
            var wasAffected = this.isStateAffected(stateId);
            removeState.call(this, stateId);
            if (wasAffected) {
                var state = $dataStates[stateId];
                state._customRemoved && state._customRemoved(this);
            }
        },
        function clearStates(clearStates) {
            if (this._states) {
                for (const state of this.states()) {
                    state._customRemoved && state._customRemoved(this);
                }
            }
            clearStates.call(this);
        },
        function performActionStart(performActionStart, action) {
            performActionStart.call(this, action);
            var item = action.item();
            if (item._customPerformActionStart) {
                item._customPerformActionStart.call(action, this);
            }
        },
        function onTurnEnd(regenerateAll) {
            regenerateAll.call(this);
            for (const state of this.states()) {
                state._customEOT && state._customEOT.call(this);
            }
        },
        function chargeTpByDamage() { });
})();

// Audio ameliorations
(function () {
    var defVol = {
        generalVolume: 100,
        bgmVolume: 80,
        bgsVolume: 80,
        meVolume: 80,
        seVolume: 80,
        speechVolume: 100,
    };

    override(AudioManager,
        function updateSeParameters(updateSeParameters, buffer, se) {
            var configVolume = se.name.startsWith("_") ? this._speechVolume : this._seVolume;
            this.updateBufferParameters(buffer, configVolume, se);
        },
        function audioFileExt() {
            return ".ogg";
        },
        function updateBgmParameters(updateBgmParameters, bgm) {
            this.updateBufferParameters(
                this._bgmBuffer,
                this._bgmVolume * (this.ongoingSpeech ? 0.25 : 1),
                bgm);
        },
        function updateBufferParameters(updateBufferParameters, buffer, configVolume, audio) {
            updateBufferParameters.call(this, buffer, configVolume, audio);
            if (buffer && audio) {
                buffer.filters = audio.filters || null;
            }
        },
        function updateCurrentBgm(updateCurrentBgm, bgm, pos) {
            updateCurrentBgm.call(this, bgm, pos);
            this._currentBgm.filters = bgm.filters;
        },
        function saveBgm(saveBgm) {
            const bgm = saveBgm.call(this);
            this._currentBgm && (bgm.filters = this._currentBgm.filters);
            return bgm;
        },
        function playSe(playSe, se) {
            if (se.length) se = { name: se };
            if (!Number.isFinite(se.pitch)) se.pitch = 100;
            if (!Number.isFinite(se.volume)) se.volume = 90;
            playSe.call(this, se);
        },
        function playBgm(playBgm, bgm, pos) {
            if (bgm.length) bgm = { name: bgm };
            if (!Number.isFinite(bgm.pitch)) bgm.pitch = 100;
            if (!Number.isFinite(bgm.volume)) bgm.volume = 90;
            playBgm.call(this, bgm, pos);
        });

    override(WebAudio,
        function canPlayM4a() {
            return false;
        });

    override(ConfigManager,
        function readVolume(readVolume, config, name) {
            var value = config[name];
            if (value !== undefined) {
                return Number(value).clamp(0, 100);
            } else {
                return name in defVol ? defVol[name] : 100;
            }
        },
        function makeData(makeData) {
            var config = makeData.call(this);
            config.masterVolume = this.masterVolume;
            config.speechVolume = this.speechVolume;
            return config;
        },
        function applyData(applyData, config) {
            applyData.call(this, config);
            this.masterVolume = this.readVolume(config, "masterVolume");
            this.speechVolume = this.readVolume(config, "speechVolume");
        });

    Object.defineProperty(AudioManager, "speechVolume", {
        configurable: true,
        get() {
            return this._speechVolume;
        },
        set(value) {
            this._speechVolume = value;
        }
    });

    Object.defineProperty(ConfigManager, "masterVolume", {
        configurable: true,
        get() {
            return AudioManager.masterVolume * 100;
        },
        set(value) {
            AudioManager.masterVolume = value / 100;
        }
    });

    Object.defineProperty(ConfigManager, "speechVolume", {
        configurable: true,
        get() {
            return AudioManager.speechVolume;
        },
        set(value) {
            AudioManager.speechVolume = value;
        }
    });

    override(Window_Options.prototype,
        function addVolumeOptions(addVolumeOptions) {
            this.addCommand("Volume général", "masterVolume");
            addVolumeOptions.call(this);
            this.addCommand("Volume voix", "speechVolume");
        });

    var speechRegexp = /audio\/se\/_.*/;
    var bgmRegexp = /audio\/bgm\/.*/;

    AudioManager._ongoingSpeech = 0;
    Object.defineProperty(AudioManager, "ongoingSpeech", {
        configurable: true,
        get: function() {
            return this._ongoingSpeech;
        },
        set: function(value) {
            var previousVolume = this._bgmBuffer && this._bgmBuffer.volume;
            this._ongoingSpeech = value;
            this.updateBgmParameters(this._currentBgm);
            var newVolume = this._bgmBuffer && this._bgmBuffer.volume;
            if (previousVolume !== newVolume) {
                this._bgmBuffer.aaa_fade(previousVolume < newVolume ? 0.25 : 1, undefined, newVolume);
            }
        }
    });

    override(WebAudio,
        function _createContext(_createContext) {
            _createContext.call(this);

            impulseResponse = ( duration, decay, reverse ) => {
                let sampleRate = this._context.sampleRate;
                let length = sampleRate * duration;
                let impulse = this._context.createBuffer(2, length, sampleRate);
                let impulseL = impulse.getChannelData(0);
                let impulseR = impulse.getChannelData(1);

                if (!decay)
                    decay = 2.0;
                for (let i = 0; i < length; i++){
                    let n = reverse ? length - i : i;
                    impulseL[i] = (Math.random() * 2 - 1) * Math.pow(1 - n / length, decay);
                    impulseR[i] = (Math.random() * 2 - 1) * Math.pow(1 - n / length, decay);
                }
                return impulse;
            };
            this._convolverBuffer = impulseResponse(1, 1, false);

            this.filters = {
                insideAway: {
                    _lowpass: { wet: 1 },
                    _reverb: { wet: 0, dry: 1 }
                },
                farAway: {
                    _lowpass: { wet: 0.5 },
                    _reverb: { wet: 1, dry: 0.25 }
                },
                default: {
                    _lowpass: { wet: 0 },
                    _reverb: { wet: 0, dry: 1 }
                }
            }
        });

    override(WebAudio.prototype,
        function _startPlaying(_startPlaying, loop, offset) {
            let url = this._url || "";
            if (!this._isOngoingSpeech && url.match(speechRegexp)) {
                this._isOngoingSpeech = true;
                AudioManager.ongoingSpeech++;
            }
            this._isBgm = !!url.match(bgmRegexp);
            return _startPlaying.call(this, loop, offset);
        },
        function stop(stop) {
            if (this._isOngoingSpeech) {
                this._isOngoingSpeech = false;
                AudioManager.ongoingSpeech--;
            }
            return stop.call(this);
        },
        function aaa_fade(_, duration, from, to) {
            if (this.isReady()) {
                if (this._gainNode) {
                    var gain = this._gainNode.gain;
                    var currentTime = WebAudio._context.currentTime;
                    gain.cancelScheduledValues(currentTime);
                    gain.setValueAtTime(isFinite(from) ? from : gain.value, currentTime);
                    gain.linearRampToValueAtTime(to, currentTime + duration);
                }
            } else if (this._autoPlay) {
                this.addLoadListener(function () {
                    this.fadeIn(duration);
                }.bind(this));
            }
        },
        function _createNodes(_createNodes) {
            if (!this._isBgm) {
                return _createNodes.call(this);
            }

            _createNodes.call(this);

            const context = WebAudio._context;

            this._lowpassNode = context.createBiquadFilter();
            this._lowpassNode.type = "lowpass";
            this._lowpassDry = context.createGain();
            this._lowpassWet = context.createGain();
            this._reverbNode = context.createConvolver();
            this._reverbNode.buffer = WebAudio._convolverBuffer;
            this._reverbDry = context.createGain();
            this._reverbWet = context.createGain();

            this._updateFilters(false);
        },
        function _connectNodes(_connectNodes) {
            if (!this._isBgm) {
                return _connectNodes.call(this);
            }

            this._gainNode.connect(this._pannerNode);
            this._pannerNode.connect(this._reverbDry);
            this._pannerNode.connect(this._reverbNode);
            this._reverbNode.connect(this._reverbWet);
            this._reverbDry.connect(this._lowpassDry);
            this._reverbDry.connect(this._lowpassNode);
            this._reverbWet.connect(this._lowpassDry);
            this._reverbWet.connect(this._lowpassNode);
            this._lowpassNode.connect(this._lowpassWet);
            this._lowpassDry.connect(WebAudio._masterGainNode);
            this._lowpassWet.connect(WebAudio._masterGainNode);
        },
        function _removeNodes(_removeNodes) {
            if (!this._isBgm) {
                return _removeNodes.call(this);
            }

            _removeNodes.call(this);

            this._lowpassNode = null;
            this._lowpassDry = null;
            this._lowpassWet = null;
            this._reverbNode = null;
            this._reverbDry = null;
            this._reverbWet = null;
        },
        function _updateFilters(ramp) {
            const context = WebAudio._context;
            const rampTime = ramp ? 1 : 0;
            if (this._lowpassDry) {
                this._lowpassDry.gain.linearRampToValueAtTime(1 - this._lowpass.wet, context.currentTime + rampTime);
                this._lowpassWet.gain.linearRampToValueAtTime(this._lowpass.wet, context.currentTime + rampTime);
            }
            if (this._reverbDry) {
                this._reverbDry.gain.linearRampToValueAtTime(this._reverb.dry, context.currentTime + rampTime);
                this._reverbWet.gain.linearRampToValueAtTime(this._reverb.wet, context.currentTime + rampTime);
            }
        });

    Object.defineProperty(WebAudio.prototype, "filters", {
        configurable: true,
        get() {
            return this._filters;
        },
        set(filters) {
            this._filters = this._filters;
            const filter = filters && filters[0] || null;
            const toApply = WebAudio.filters[filter] || WebAudio.filters.default;
            for (const key in toApply) {
                this[key] = toApply[key];
            }
            this._updateFilters(true);
        }
    });
})();

// Vehicles
(function () {
    override(Game_Vehicle.prototype,
        function initMoveSpeed(initMoveSpeed) {
            if (this.isBoat()) {
                this.setMoveSpeed(4.5);
            } else {
                initMoveSpeed.call(this);
            }
        },
        function refresh(refresh) {
            refresh.call(this);
            this.initMoveSpeed();
        },
        function hasBgm() {
            return this._bgm || (this.vehicle().bgm && this.vehicle().bgm.name);
        },
        function getOn() {
            this._driving = true;
            this.setWalkAnime(true);
            this.setStepAnime(true);
            if (this.hasBgm()) {
                $gameSystem.saveWalkingBgm();
                this.playBgm();
            }
        },
        function getOff() {
            this._driving = false;
            this.setWalkAnime(false);
            this.setStepAnime(false);
            this.resetDirection();
            if (this.hasBgm()) {
                $gameSystem.replayWalkingBgm();
            }
        });

    override(Game_Map.prototype,
        function autoplay() {
            if ($dataMap.autoplayBgm) {
                const vehicle = $gamePlayer.isInVehicle() && $gamePlayer.vehicle();
                if (vehicle && vehicle.hasBgm()) {
                    $gameSystem.saveWalkingBgm2();
                } else {
                    AudioManager.playBgm($dataMap.bgm);
                }
            }
            if ($dataMap.autoplayBgs) {
                AudioManager.playBgs($dataMap.bgs);
            }
        });
})();

// Map ameliorations
(function () {
    var passableMask = 1 | 2 | 4 | 8;
    var idMasks = {
        2: 1, // Down
        4: 2, // Left
        6: 4, // Right
        8: 8 // Up
    };

    override(Game_Map.prototype,
        function isPassable(isPassable, x, y, d) {
            var regionId = this.regionId(x, y);
            if (!regionId || regionId > 17) {
                return isPassable.call(this, x, y, d);
            }
            if (regionId === 16)
                return true;
            if (regionId === 17)
                return false;
            regionId &= passableMask;
            return !!(regionId & idMasks[d]);
        },

        function isBoatPassable(isBoatPassable, x, y) {
            var regionId = this.regionId(x, y);
            return regionId === 16 || regionId !== 17 && isBoatPassable.call(this, x, y);
        },

        function isShipPassable(isShipPassable, x, y) {
            var regionId = this.regionId(x, y);
            return regionId === 16 || regionId !== 17 && isShipPassable.call(this, x, y);
        },

        function isAirshipLandOk(isAirshipLandOk, x, y) {
            var regionId = this.regionId(x, y);
            return regionId === 16 || regionId !== 17 && isAirshipLandOk.call(this, x, y);
        },

        function setupEvents(setupEvents) {
            setupEvents.call(this);
            this.eventsByName = {};
            for (var i = 0; i < this._events.length; i++) {
                var dataEvent = $dataMap.events[i];
                if (dataEvent && dataEvent.name) {
                    this.eventsByName[dataEvent.name] = i;
                }
            }
        },

        function autoplay(autoplay) {
            autoplay.call(this);
            if (!$dataMap.autoplayBgm && AudioManager._bgmBuffer && AudioManager._currentBgm) {
                AudioManager._currentBgm.filters =
                AudioManager._bgmBuffer.filters =
                    $dataMap.bgm && $dataMap.bgm.filters || null;
            }
        });

    const hurtSe = ["Ouch", "Owie", "JAiMal", "Bouhouhou"];
    override(Game_Actor.prototype,
        function performMapDamage(performMapDamage) {
            const steps = $gameParty.steps();
            if (steps !== window._lastHurtSteps) {
                AudioManager.playSe({ name: "Damage3", volume: 50, pitch: 90 + Math.random() * 20 });
                setTimeout(() => AudioManager.playSe(hurtSe[(Math.random() * hurtSe.length)|0]), 50);
                window._lastHurtSteps = steps;
            }
            performMapDamage.call(this);
        });
})();

// Zoomies
(function() {
    override(Game_Screen.prototype,
        function clearZoom(clearZoom) {
            clearZoom.call(this);
            this.zoomTarget = null;
            this.zoomTargetScale = 1;
            this.zoomTargetDuration = 0;
        },

        function zoomOn(_, eventId, scale, duration = 15) {
            var event = $gameMap.event(eventId);
            this.zoomOnCharacter(event, scale,duration);
        },

        function zoomOnPlayer(_, scale, duration = 15) {
            this.zoomOnCharacter($gamePlayer, scale, duration);
        },

        function zoomOnCharacter(_, character, scale, duration = 15) {
            this.startZoom(
                character && character.screenX() || 0,
                character && (character.screenY() - 24) || 0,
                scale,
                duration);
        },

        function zoomOnBattler(_, battler, scale, duration = 15) {
            const sprite = SceneManager.battlerSprite(battler);
            this.startZoom(
                sprite && sprite.x || 0,
                sprite && sprite.y || 0,
                scale,
                duration);
        },

        function track(_, eventId, scale, duration = 15) {
            this._zoomEventId = eventId;
            this.zoomOn(eventId, scale, duration);
        },

        function updateZoom(updateZoom) {
            const event = this._zoomEventId && $gameMap.event(this._zoomEventId);
            if (event) {
                this._zoomX = event.screenX() || 0;
                this._zoomY = (event.screenY() - 24) || 0;
            }
            updateZoom.call(this);
        },

        function resetZoom(_, duration = 15) {
            this.startZoom(this._zoomX, this._zoomY, 1, duration);
            delete this._zoomEventId;
        },

        function clearZoom(clearZoom) {
            clearZoom.call(this);
            delete this._zoomEventId;
        },

        function larpTint(_, toneA, toneB, value) {
            value = Math.min(Math.max(0, value), 1);
            this._tone = toneA.map((v, i) => v * (1 - value) + toneB[i] * value);
        });

    override(Game_Party.prototype,
        function getBattleMemberByName(_, name) {
            for (let i = 0; i < this.maxBattleMembers(); i++) {
                const id = this._actors[i];
                const actor = $gameActors.actor(id);
                if (actor.name() === name && actor.isAppeared()) {
                    return actor;
                }
            }
        },
        function transformActor(_, fromActorId, toActorId, initialize) {
            const actorIdx = $gameParty._actors.indexOf(fromActorId);
            if (actorIdx !== -1) {
                const battlerSprite = SceneManager.battlerSprite($gameParty.members()[actorIdx]);
                $gameParty._actors[actorIdx] = toActorId;
                const actor = $gameActors.actor(toActorId);
                // Assume transforms are the same "person"
                const fromActor = $gameActors.actor(fromActorId);
                $btl.party[actor.name()] = actor;
                $btl.party[fromActor.name()] = actor;
                initialize && (
                    actor.setup(toActorId),
                    actor.recoverAll(),
                    actor.clearResult());
                $gamePlayer.refresh();
                $gameMap.requestRefresh();
                if (battlerSprite) {
                    battlerSprite._noEntry = true;
                }
            }
        });
})();

const BASE_PATTERN_TYPE = [0, 1, 2, 1];

// Characters
(function() {
    override(Game_CharacterBase.prototype,
        function initMembers(initMembers) {
            initMembers.call(this);
            this.setPatternType(BASE_PATTERN_TYPE);
            this.resetPattern();
            this._animationWaitMultiplier = 2;
        },
        function straighten() {
            if (this.hasWalkAnime() || this.hasStepAnime()) {
                this.resetPattern();
            }
            this._animationCount = 0;
        },
        function maxPattern() {
            return (this._patternType || BASE_PATTERN_TYPE).length;
        },
        function pattern() {
            return (this._patternType || BASE_PATTERN_TYPE)[this._pattern || 0];
        },
        function resetPattern() {
            return this._pattern = this._patternReset || 0;
        },
        function setPatternType(_, patternType) {
            this._patternType = patternType;
            this._patternReset = patternType[patternType.length - 1];
        },
        function realMoveSpeed(realMoveSpeed) {
            return realMoveSpeed.call(this) + 0.25;
        },
        function animationWait() {
            return (9 - this.realMoveSpeed()) * (this._animationWaitMultiplier || 2);
        },
        function dstSE(_, se) {
            aaa_se(this.eventId(), se);
        },
        function jump(jump, xPlus, yPlus) {
            const x = this._x + xPlus;
            const y = this._y + yPlus;
            if ((!xPlus && !yPlus) ||
                this.isThrough() || this.isDebugThrough() ||
                (this.isMapPassable(x, y) && !this.isCollidedWithCharacters(x, y))) {
                jump.call(this, xPlus, yPlus);
                this._jumpPeak = Math.round(this._jumpPeak);
                this._jumpCount = Math.round(this._jumpCount);
            } else {
                this.setMovementSuccess(false);
            }
        },
        function jumpToTile(_, x, y, h) {
            aaa_jump(this, x - this.x, y - this.y, h);
        });

    override(Game_Follower.prototype,
        function realMoveSpeed() {
            return this._moveSpeed + (this.isDashing() ? 1 : 0);
        });

    override(Game_Character.prototype,
        function findDirectionTo(_, goalX, goalY) {
            var searchLimit = this.searchLimit();
            var mapWidth = $gameMap.width();
            var nodeList = [];
            var openList = [];
            var closedList = [];
            var start = {};
            var best = start;

            if (this.x === goalX && this.y === goalY) {
                return 0;
            }

            start.parent = null;
            start.x = this.x;
            start.y = this.y;
            start.g = 0;
            start.f = $gameMap.distance(start.x, start.y, goalX, goalY);
            nodeList.push(start);
            openList.push(start.y * mapWidth + start.x);

            while (nodeList.length > 0) {
                var bestIndex = 0;
                for (var i = 0; i < nodeList.length; i++) {
                    if (nodeList[i].f < nodeList[bestIndex].f) {
                        bestIndex = i;
                    }
                }

                var current = nodeList[bestIndex];
                var x1 = current.x;
                var y1 = current.y;
                var pos1 = y1 * mapWidth + x1;
                var g1 = current.g;

                nodeList.splice(bestIndex, 1);
                openList.splice(openList.indexOf(pos1), 1);
                closedList.push(pos1);

                if (current.x === goalX && current.y === goalY) {
                    best = current;
                    break;
                }

                if (g1 >= searchLimit) {
                    continue;
                }

                for (var j = 0; j < 4; j++) {
                    var direction = 2 + j * 2;
                    var x2 = $gameMap.roundXWithDirection(x1, direction);
                    var y2 = $gameMap.roundYWithDirection(y1, direction);
                    var pos2 = y2 * mapWidth + x2;

                    if (closedList.contains(pos2)) {
                        continue;
                    }
                    if (!this.canPass(x1, y1, direction)) {
                        continue;
                    }

                    var g2 = g1 + 1;
                    var index2 = openList.indexOf(pos2);

                    if (index2 < 0 || g2 < nodeList[index2].g) {
                        var neighbor;
                        if (index2 >= 0) {
                            neighbor = nodeList[index2];
                        } else {
                            neighbor = {};
                            nodeList.push(neighbor);
                            openList.push(pos2);
                        }
                        neighbor.parent = current;
                        neighbor.x = x2;
                        neighbor.y = y2;
                        neighbor.g = g2;
                        neighbor.f = g2 + $gameMap.distance(x2, y2, goalX, goalY);
                        if (!best || neighbor.f - neighbor.g < best.f - best.g) {
                            best = neighbor;
                        }
                    }
                }
            }

            var node = best;
            while (node.parent && node.parent !== start) {
                node = node.parent;
            }

            var deltaX1 = $gameMap.deltaX(node.x, start.x);
            var deltaY1 = $gameMap.deltaY(node.y, start.y);
            if (deltaY1 > 0) {
                return 2;
            } else if (deltaX1 < 0) {
                return 4;
            } else if (deltaX1 > 0) {
                return 6;
            } else if (deltaY1 < 0) {
                return 8;
            }

            var deltaX2 = this.deltaXFrom(goalX);
            var deltaY2 = this.deltaYFrom(goalY);
            if (Math.abs(deltaX2) > Math.abs(deltaY2)) {
                return deltaX2 > 0 ? 4 : 6;
            } else if (deltaY2 !== 0) {
                return deltaY2 > 0 ? 8 : 2;
            }

            return 0;
        },
        function moveTowardsTile(_, x, y) {
            this.moveStraight(this.findDirectionTo(x, y));
        },
        function patrol(_,
            x = this.event().x,
            y = this.event().y,
            wanderDst2 = 4,
            wanderSpeed = 2.5,
            sightDst2 = 9,
            chaseDst2 = 25,
            chaseSpeed = 3.75,
            screech = "Monster3"
        ) {
            const dx = this.x - x;
            const dy = this.y - y;
            const dst2 = dx * dx + dy * dy;
            if (dst2 >= chaseDst2) {
                return this.moveTowardsTile(x, y);
            }

            const pdx = $gamePlayer.x - this.x;
            const pdy = $gamePlayer.y - this.y;
            const pdst2 = pdx * pdx + pdy * pdy;
            if (pdst2 <= sightDst2) {
                if (this.moveSpeed() !== chaseSpeed) {
                    this.setMoveSpeed(chaseSpeed);
                    AudioManager.playSe(screech);
                    this.requestBalloon(5);
                }
                return this.moveTowardPlayer();
            }

            if (dst2 >= wanderDst2) {
                return this.moveTowardsTile(x, y);
            }

            this.moveSpeed() !== wanderSpeed && this.setMoveSpeed(wanderSpeed);
            return this.moveRandom();
        });
})();

Input.keyMapper[87] = "up"; // w
Input.keyMapper[83] = "down"; // s
Input.keyMapper[65] = "left"; // a
Input.keyMapper[68] = "right"; // d

// Transitiooooons
(function () {
    const STABILITY_THRESHOLD = 20;
    const MIN_STABLE_FRAMES = 4;
    const MAX_TRANSITION_FRAMES = 60;
    override(SceneManager,
        function snapForBackground() {
            this._backgroundBitmap = this.snap();
        },
        function changeScene(changeScene) {
            if (this.isSceneChanging()) {
                if (this._scene instanceof Scene_Map && this._nextScene instanceof Scene_Map) {
                    this._shouldStabilise = true;
                }
            }
            changeScene.call(this);
        },
        function updateScene(_) {
            const now = new Date();
            if (this._time) {
                const dt = Math.max(1, Math.min(1000, now - this._time));
                this._stableFrames = dt < STABILITY_THRESHOLD ? (this._stableFrames || 0) + 1 : 0;
            }
            this._time = now;
            if (this._scene) {
                if (!this._sceneStarted && this._scene.isReady()) {
                    this._scene.start();
                    this._sceneStarted = true;
                    if (this._shouldStabilise) {
                        this._stableFrames = Math.min(this._stableFrames || 0, MIN_STABLE_FRAMES - 1);
                        this._maxTransitionFrames = MAX_TRANSITION_FRAMES;
                    }
                    this.onSceneStart();
                }
                if (this.isCurrentSceneStarted()) upd: {
                    if (this._shouldStabilise) {
                        this._maxTransitionFrames--;
                        if (this._stableFrames < MIN_STABLE_FRAMES &&
                            this._maxTransitionFrames > 0) {
                            break upd;
                        } else {
                            this._shouldStabilise = false;
                        }
                    }
                    this._scene.update();
                }
            }
        });

    const CROSSFADE = 0;
    let lastFadeout = null;
    override(Scene_Map.prototype,
        function createCrossfadeSprite(_) {
            const bitmap = SceneManager.backgroundBitmap();
            this._fadeSprite && this.removeChild(this._fadeSprite);
            this._fadeSprite = new Sprite(bitmap);
            this.addChild(this._fadeSprite);
        },
        function createFadeSprite(createFadeSprite, white) {
            if (this._fadeSprite && !(this._fadeSprite instanceof ScreenSprite)) {
                this.removeChild(this._fadeSprite);
                delete this._fadeSprite;
            }
            createFadeSprite.call(this, white);
        },
        function startFadeIn(startFadeIn, duration, type) {
            if (type === CROSSFADE) {
                this.createCrossfadeSprite();
                this._fadeSign = 1;
                this._fadeDuration = duration || 30;
                this._fadeSprite.opacity = 255;
            } else {
                startFadeIn.call(this, duration, type);
            }
        },
        function fadeInForTransfer(fadeInForTransfer) {
            if (lastFadeout === CROSSFADE) {
                this.startFadeIn(this.fadeSpeed(), CROSSFADE);
            } else {
                fadeInForTransfer.call(this);
            }
        },
        function stop(stop) {
            lastFadeout = null;
            stop.call(this);
        },
        function fadeOutForTransfer(fadeOutForTransfer) {
            fadeOutForTransfer.call(this);
            lastFadeout = CROSSFADE;
            this._fadeDuration = -1;
            if (this._fadeSprite) {
                this._fadeSprite.opacity = 0;
            }
        });
})();

// Turn orderidoo
(function () {
    function Window_BattleOrder() {
        this.initialize.apply(this, arguments);
    }

    Window_BattleOrder.prototype = Object.create(Window_Base.prototype);
    Window_BattleOrder.prototype.constructor = Window_BattleOrder;

    const drawOffset = Math.round(Window_Base._iconWidth * (2/3));

    override(Window_BattleOrder.prototype,
        function initialize(initialize, x, y) {
            initialize.call(this, x || 0, y || 0,
                Graphics.boxWidth,
                Window_Base._iconHeight + this.standardPadding() * 2);
            this.opacity = 0;
        },
        function standardPadding() {
            return 8;
        },
        function refresh() {
            this.contents.clear();

            let x = 0;
            let battlers = [BattleManager._subject].concat(BattleManager._actionBattlers);
            for (const battler of battlers) {
                if (battler && battler.canMove()) {
                    // Compute the space necessary
                    let w = (battler._actions.length + 1) * drawOffset;
                    let subx = x + w - drawOffset;

                    for (let i = battler._actions.length - 1; i >= 0; i--) {
                        const action = battler._actions[i];
                        const item = action.item();
                        this.drawIcon(item && item.iconIndex || 16, subx, 0);
                        subx -= drawOffset;
                    }

                    this.drawBattlerIcon(battler, subx, 0);

                    x += w + Window_Base._iconWidth - drawOffset + this.standardPadding();
                }
            }
        });

    override(Window_Base.prototype,
        function drawBattlerIcon(_, battler, x, y) {
            const w = Window_Base._iconWidth;
            const h = Window_Base._iconHeight;
            const data = battler.isActor() ? battler.actor() : battler.enemy();
            let bitmap, sx, sy, sw, sh;

            if (data._iconSrc) {
                bitmap = ImageManager.loadBitmap(data._iconFolder, data._iconSrc);
            } else if (battler.isActor() || data.actorSprite) {
                bitmap = ImageManager.loadSvActor(battler.battlerName());
            } else {
                bitmap = ImageManager.loadSvEnemy(battler.battlerName());
            }
            // Lol.
            if (!bitmap.isReady()) {
                bitmap.addLoadListener(() => this.drawBattlerIcon(battler, x, y));
            }

            if (Number.isFinite(data._iconX)) {
                sx = data._iconX || 0;
                sy = data._iconY || 0;
                sw = data._iconW || w;
                sh = data._iconH || h;
            } else if (battler.isActor() || data.actorSprite) {
                sw = battler.isActor() ? w : -w;
                sh = h;
                sx = 12;
                sy = 8;
            } else {
                const tw = battler.enemy().tw || bitmap.width;
                const th = battler.enemy().th || bitmap.height;
                const widthRatio = Math.max(tw, w) / w;
                const heightRatio = Math.max(th, h) / h;
                const ratio = Math.min(Math.min(widthRatio, heightRatio), 2);
                sx = (tw - sw) / 2;
                sy = (th - sh) / 4;
                sw = w * ratio;
                sh = h * ratio;
            }

            if (sw < 0) {
                sw = -sw;
                x = -(x + w);
                this.contents._context.scale(-1, 1);
                this.contents.blt(bitmap, sx, sy, sw, sh, x, y, w, h);
                this.contents._context.scale(-1, 1);
            } else {
                this.contents.blt(bitmap, sx, sy, sw, sh, x, y, w, h);
            }
        });

    override(BattleManager,
        function setOrderWindow(_, orderWindow) {
            this._orderWindow = orderWindow;
        },
        function makeActionOrders(makeActionOrders) {
            makeActionOrders.call(this);
            this._orderWindow && this._orderWindow.refresh();
        });

    override(Scene_Battle.prototype,
        function createLogWindow(createLogWindow) {
            createLogWindow.call(this);
            this._logWindow.y = Window_Base._iconHeight + 16 - this._logWindow.standardPadding();
            this._orderWindow = new Window_BattleOrder();
            this.addWindow(this._orderWindow);
        },
        function createDisplayObjects(createDisplayObjects) {
            createDisplayObjects.call(this);
            BattleManager.setOrderWindow(this._orderWindow);
        });

    override(Window_ActorCommand.prototype,
        function activate(activate) {
            activate.call(this);
            const action = this._actor && this._actor.inputtingAction();
            action && action.setItemObject(null);
        });

    override(Game_Item.prototype,
        function setObject(setObject, item) {
            setObject.call(this, item);
            BattleManager.makeActionOrders();
        });

    override(Game_Battler.prototype,
        function removeCurrentAction(removeCurrentAction) {
            removeCurrentAction.call(this);
            BattleManager._orderWindow && BattleManager._orderWindow.refresh();
        });
})();

// Scoping
(function () {
    override(Scene_Battle.prototype,
        function selectActorSelection(selectActorSelection) {
            const action = BattleManager.inputtingAction();
            const item = action && action.item();
            if (item.meta.scope === "except_self" && action.subject().isActor()) {
                this._actorWindow.setDisabled([$gameParty.battleMembers().indexOf(action.subject())]);
            } else {
                this._actorWindow.setDisabled();
            }
            selectActorSelection.call(this);
        });

    override(Window_Selectable.prototype,
        function setDisabled(_, idxes) {
            this._disabledIdxes = idxes;
        },
        function isCurrentItemEnabled(isCurrentItemEnabled) {
            return (
                !this._disabledIdxes || !this._disabledIdxes.includes(this.index())) &&
                isCurrentItemEnabled.call(this);
        });

    override(Game_Action.prototype,
        function targetsForFriends(targetsForFriends) {
            targets = targetsForFriends.call(this);
            if (this.item().meta.scope === "except_self") {
                targets.remove(this.subject());
                if (this.isForOne() && !targets.length) {
                    const otherFriend = this
                        .friendsUnit()
                        .members()
                        .filter(m => m !== this.subject() && m.isAlive())
                        .random();
                    if (otherFriend) {
                        targets.push(otherFriend);
                    }
                }
            }
            return targets;
        });
})();

// Damage indicator
(function () {
    function Sprite_BarChange() {
        this.initialize.apply(this, arguments);
        this.windowskin = ImageManager.loadSystem('Window');
    }

    Sprite_BarChange.prototype = Object.create(Sprite.prototype);
    Sprite_BarChange.prototype.constructor = Sprite_BarChange;

    override(Sprite_BarChange.prototype,
        function initialize(initialize) {
            initialize.call(this);
            this._width = 80;
            this._height = 6;
            this._delay = 60;
            this._duration = this._totalDuration = 150;
            this.anchor.x = 0.5;
        },
        function textColor(_, n) {
            return Window_Base.prototype.textColor.call(this, n);
        },
        function setup(_, value1, value2, valueTotal, color1, color2) {
            this.bitmap = new Bitmap(this._width, this._height);
            this._rate = value1 / valueTotal;
            this._targetRate = value2 / valueTotal;
            this._gaugeBackColor = Window_Base.prototype.gaugeBackColor.call(this);
            this._color1 = this.textColor(color1);
            this._color2 = this.textColor(color2);

        },
        function isPlaying() {
            return this._duration > 0;
        },
        function update() {
            Sprite.prototype.update.call(this);
            if (this._duration > 0) {
                this._duration--;
                if (this._duration < this._totalDuration - this._delay) {
                    const rateDuration = Math.max(this._duration - this._delay, 0);
                    this._rate = (rateDuration * this._rate + this._targetRate) / (rateDuration + 1);
                }
            }
            this.draw();
        },
        function draw() {
            this.bitmap.fillRect(0, 0, this._width, this._height, this._gaugeBackColor);

            const rate = Math.min(Math.max(0, this._rate), 1);
            const parsed1 = [
                this._color1.substring(1, 3),
                this._color1.substring(3, 5),
                this._color1.substring(5, 7)
            ].map(p => Number.parseInt(p, 16));
            const parsed2 = [
                this._color2.substring(1, 3),
                this._color2.substring(3, 5),
                this._color2.substring(5, 7)
            ].map(p => Number.parseInt(p, 16));
            const curColor = "#" + parsed1
                .map((v, i) => v * (1 - rate) + parsed2[i] * rate)
                .map(p => Math.floor(p).toString(16).padStart(2, "0"))
                .join("");

            this.bitmap.gradientFillRect(0, 0, Math.floor(this._width * rate), this._height, this._color1, curColor);
        });

    override(Game_BattlerBase.prototype,
        function initialize(initialize) {
            initialize.call(this);
            this.mpChange = 0;
            this.tpChange = 0;
        },
        function paySkillCost(paySkillCost, skill) {
            const mp = this._mp;
            const tp = this._tp;
            paySkillCost.call(this, skill);
            if (this._mp !== mp) {
                this.mpChange += (this._mp - mp);
            }
            if (this._tp !== tp) {
                this.tpChange += (this._tp - tp);
            }
        });

    override(Game_Battler.prototype,
        // Fuck silent tp
        function gainSilentTp(_, value) {
            this.gainTp(value);
        },
        function initTp() {});

    override(Game_Action.prototype,
        function apply(apply, target) {
            const targetResult = target.result();
            const subject = this.subject();
            const subjectResult = subject.result();
            targetResult.startHp = target.hp;
            targetResult.startMp = target.mp;
            targetResult.startTp = target.tp;
            const subjectHp = subject.hp;
            const subjectMp = subject.mp;
            const subjectTp = subject.tp;
            apply.call(this, target);
            targetResult.endHp = target.hp;
            targetResult.endMp = target.mp;
            targetResult.endTp = target.tp;
            subjectResult.startHp = subjectHp;
            subjectResult.startMp = subjectMp;
            subjectResult.startTp = subjectTp;
            subjectResult.endHp = subject.hp;
            subjectResult.endMp = subject.mp;
            subjectResult.endTp = subject.tp;
        });

    function setupDamagePopup(setupDamagePopup) {
        let mpChange = this._battler.mpChange;
        if (this._battler.isDamagePopupRequested()) {
            const result = this._battler.result();
            if (result.hpAffected) {
                const sprite = new Sprite_BarChange();
                sprite.x = this.x;
                sprite.y = this.y;
                sprite.setup(
                    result.startHp || 0,
                    result.endHp || 0,
                    this._battler.mhp,
                    20, 21);
                this._damages.push(sprite);
                this.parent.addChild(sprite);
            }
            mpChange += result.mpDamage;
        }

        if (mpChange) {
            const sprite = new Sprite_BarChange();
            sprite.x = this.x;
            sprite.y = this.y + sprite._height;
            sprite.setup(
                this._battler.mp - mpChange,
                this._battler.mp,
                this._battler.mmp,
                22, 23);
            this._damages.push(sprite);
            this.parent.addChild(sprite);
            this._battler.mpChange = 0;
        }

        setupDamagePopup.call(this);
    }

    override(Sprite_Enemy.prototype,
        setupDamagePopup);

    override(Sprite_EnemyActor.prototype,
        setupDamagePopup);

    override(Sprite_Damage.prototype,
        function setup(setup, target) {
            const result = target.result();
            setup.call(this, target);
            if (!result.missed && !result.evaded &&
                !result.hpAffected &&
                !result.mpDamage &&
                target.isAlive() &&
                result.tpDamage) {
                this.createDigits(1, result.tpDamage);
            }
        });

    override(Window_BattleLog.prototype,
        // Don't display tp changes in log
        function displayTpDamage() {});
})();

// Event sprite control
(function() {
    override(Game_CharacterBase.prototype,
        function screenX(screenX) {
            return screenX.call(this) + (this._offsetX || 0);
        },
        function screenY(screenY) {
            return screenY.call(this) + (this._offsetY || 0);
        },
        function screenZ(screenZ) {
            return screenZ.call(this) + (this._offsetZ || 0);
        });
})();

// Checkpoints
(function () {
    override(DataManager,
        function loadCheckpoint(_, name) {
            var xhr = new XMLHttpRequest();
            var url = 'save/' + name + ".rpgsave";
            xhr.open('GET', url);
            xhr.overrideMimeType('application/json');
            xhr.onload = function() {
                if (xhr.status < 400) {
                    const json = LZString.decompressFromBase64(xhr.responseText);
                    DataManager.createGameObjects();
                    DataManager.extractSaveContents(JsonEx.parse(json));
                    SoundManager.playLoad();
                    var time = 48 / 60;
                    AudioManager.fadeOutBgm(time);
                    AudioManager.fadeOutBgs(time);
                    AudioManager.fadeOutMe(time);
                    if ($gameSystem.versionId() !== $dataSystem.versionId) {
                        $gamePlayer.reserveTransfer($gameMap.mapId(), $gamePlayer.x, $gamePlayer.y);
                        $gamePlayer.requestMapReload();
                    }
                    SceneManager.goto(Scene_Map);
                    $gameSystem.onAfterLoad();
                }
            };
            xhr.send();
        });

    const code = [
        38,
        38,
        40,
        40,
        37,
        39,
        37,
        39,
        66,
        65];

    override(Scene_Title.prototype,
        function start(start) {
            start.call(this);
            this.codeIndex = 0;
            this.onKeyDown = e => {
                if (e.keyCode === code[this.codeIndex]) {
                    this.codeIndex++;
                    if (this.codeIndex === code.length) {
                        SceneManager.push(Scene_Checkpoints);
                    }
                } else {
                    this.codeIndex = 0;
                }
            };
            document.addEventListener("keydown", this.onKeyDown);
        },
        function stop(stop) {
            document.removeEventListener("keydown", this.onKeyDown)
            stop.call(this);
        });

        function Scene_Checkpoints() {
            this.initialize.apply(this, arguments);
        }

        Scene_Checkpoints.prototype = Object.create(Scene_MenuBase.prototype);
        Scene_Checkpoints.prototype.constructor = Scene_Checkpoints;

        override(Scene_Checkpoints.prototype,
            function create(create) {
                create.call(this);
                this._checkpointsWindow = new Window_Checkpoints();
                this._checkpointsWindow.setHandler("cancel", this.popScene.bind(this));
                this.addWindow(this._checkpointsWindow);
            });

        function Window_Checkpoints() {
            this.initialize.apply(this, arguments);
        }

        Window_Checkpoints.prototype = Object.create(Window_Command.prototype);
        Window_Checkpoints.prototype.constructor = Window_Checkpoints;

        override(Window_Checkpoints.prototype,
            function initialize(initialize) {
                initialize.call(this);
                this.updatePlacement();
            },
            function windowWidth() {
                return 400;
            },
            function windowHeight() {
                return this.fittingHeight(Math.min(this.numVisibleRows(), 12));
            },
            function updatePlacement() {
                this.x = (Graphics.boxWidth - this.width) / 2;
                this.y = (Graphics.boxHeight - this.height) / 2;
            },
            function makeCommandList() {
                for (const name of [
                    "jean-jacques",
                    "temple-du-bonjour",
                    "premiere-du-bonjour",
                    "gaboue",
                    "poulet",
                    "pecheur",
                    "windo",
                    "detah",
                    "oracle",
                    "lieu-champetre",
                    "ville",
                    "bandits",
                    "jean-jacques-forrealthistimeprod2",
                    "pont",
                    "cossin-1",
                    "cossin-2",
                    "cossin-3",
                    "cossin-4",
                    "passage-1",
                    "passage-2"]) {
                    const capitalized = Array.from(name);
                    capitalized[0] = capitalized[0].toUpperCase();
                    for (let i = 0; i < capitalized.length; i++) {
                        if (capitalized[i] === "-") {
                            capitalized[i] = " ";
                            capitalized[i + 1] = capitalized[i + 1].toUpperCase();
                        }
                    }
                    this.addCommand(capitalized.join(""), name);
                }
            },
            function processOk() {
                DataManager.loadCheckpoint(this.commandSymbol(this.index()));
            });
})();

// Disable dash
(function() {
    override(Game_Map.prototype,
        function isDashDisabled() {
            return true;
        });

    override(Window_Options.prototype,
        function addCommand(addCommand, name, symbol, enabled, ext) {
            symbol !== "alwaysDash" && addCommand.call(this, name, symbol, enabled, ext);
        });
    override (Game_Player.prototype,
        function isDashing(isDashing) {
            return isDashing.call(this) || this._forceDashing;
        });
})();

// Savefilelist
(function () {
    override(DataManager,
        function makeSavefileInfo(makeSavefileInfo) {
            const info = makeSavefileInfo.call(this);
            info.title = $dataMap.displayName || info.title;
            info.version = 1;
            return info;
        },
        function isThisGameFile(isThisGameFile, savefileId) {
            var globalInfo = this.loadGlobalInfo();
            return !!(globalInfo && globalInfo[savefileId]);
        },
        function saveGlobalInfo(saveGlobalInfo, info) {
            saveGlobalInfo.call(this, info);
            this._globalInfo = info;
        },
        function loadGlobalInfo(loadGlobalInfo) {
            if (this._globalInfo) {
                return this._globalInfo;
            }
            const globalInfo = loadGlobalInfo.call(this);
            (async () => {
                let dirty = false;
                await Promise.all(globalInfo.map(async (info, i) => {
                    if (!info) {
                        return;
                    }
                    try {
                        if (!info.version) {
                            info.version = 0;
                        }
                        if (info.version < 1) {
                            const json = JSON.parse(StorageManager.load(i));
                            const mapId = json.map._mapId;
                            const mapRes = await fetch("data/" + 'Map%1.json'.format(mapId.padZero(3)));
                            const map = await mapRes.json();
                            info.title = map.displayName || info.title;
                            info.version = 1;
                            dirty = true;
                        }
                    } catch (err) {
                        console.log("Could not update file info");
                        console.trace(err);
                    }
                }));
                if (dirty) {
                    this.saveGlobalInfo(globalInfo);
                }
            })();
            return this._globalInfo = globalInfo;
        });

    override(Window_SavefileList.prototype,
        function itemHeight() {
            return 48 + this.textPadding() * 2;
        },
        function textHeight() {
            return this.contents.fontSize + 8;
        },
        function drawItem(_, index) {
            const id = index + 1;
            const valid = DataManager.isThisGameFile(id);
            const info = DataManager.loadSavefileInfo(id);
            this.resetTextColor();
            this.changePaintOpacity(valid || this._mode !== "load");

            const rect = this.itemRectForText(index);
            rect.y += this.textPadding();
            rect.height -= this.textPadding() * 2
            let right = rect.x + rect.width;
            const bottom = rect.y + rect.height;
            const textCenterY = rect.y + (rect.height - this.textHeight()) / 2;

            let x = rect.x;

            const idWidth = this.textWidth("99:");
            this.drawText(id + ":", rect.x, textCenterY, idWidth, "right");
            x += idWidth + this.textPadding();

            if (valid) {
                this.drawText(info.title, x, textCenterY);

                const playTimeWidth = this.textWidth("99:99:99");
                this.drawPlaytime(info, right - playTimeWidth, textCenterY, playTimeWidth);
                right -= playTimeWidth + this.standardPadding();

                const charsWidth = 4 * 48;
                right -= charsWidth;
                if (info.characters) {
                    for (let i = 0; i < info.characters.length; i++) {
                        let data = info.characters[i];
                        this.drawCharacter(data[0], data[1], right + (i + 0.5) * 48, bottom);
                    }
                }
            }
        })
})();

// Avoid runtime evals
(function () {
    override(Game_Action.prototype,
        function evalDamageFormula(evalDamageFormula, target) {
            try {
                var item = this.item();
                var a = this.subject();
                var b = target;
                var v = $gameVariables._data;
                var sign = ([3, 4].contains(item.damage.type) ? -1 : 1);
                var value = Math.max(item.damage.formulaFn.call(this, target, item, a, b, v, sign), 0) * sign;
                if (isNaN(value)) value = 0;
                return value;
            } catch (e) {
                return 0;
            }
        })

    override(Game_Character.prototype,
        function processMoveCommand(processMoveCommand, command) {
            if (command.code === Game_Character.ROUTE_SCRIPT) {
                const gc = Game_Character;
                const params = command.parameters;
                return command.evalFn.call(this, command, gc, params);
            } else {
                return processMoveCommand.call(this, command);
            }
        })

    override(Game_Interpreter.prototype,
        function executeCommand(executeCommand) {
            const command = this.currentCommand();
            this._evalFn = command && command.evalFn;
            return executeCommand.call(this);
        },
        function command111(command111) {
            // Script
            if (this._params[0] === 12) {
                this._branch[this._indent] = !!this._evalFn.call(this);
                if (this._branch[this._indent] === false) {
                    this.skipBranch();
                }
                return true;
            } else {
                return command111.call(this);
            }
        },
        function command122(command122) {
            // Script
            if (this._params[3] === 4) {
                const value = this._evalFn.call(this);
                for (var i = this._params[0]; i <= this._params[1]; i++) {
                    this.operateVariable(i, this._params[2], value);
                }
                return true;
            } else {
                return command122.call(this);
            }
        },
        function command355() {
            this.currentCommand().evalFn.call(this);
            while (this.nextEventCode() === 655) {
                this._index++;
            }
            return true;
        });
})();

// Additional stats
(function () {
    Object.defineProperties(Game_BattlerBase.prototype, {
        // Health static regeneration
        hsrg: {
            configurable: true,
            get() {
                return this.traitObjects().reduce((n, trait) => {
                    return n + (trait.aaa_stats && trait.aaa_stats.hsrg || 0);
                }, 0);
            }
        }
    });

    override(Game_BattlerBase.prototype,
        function paramMax(paramMax, paramId) {
            if (paramId === 0) {
                return 999999;  // MHP
            } else if (paramId === 1) {
                return 9999;    // MMP
            } else {
                return 99999;
            }
        },
        function paramPlus(paramPlus, paramId) {
            let n = paramPlus.call(this, paramId);
            for (const state of this.states()) {
                n += state.params[paramId];
            }
            return n;
        });

    override(Game_Actor.prototype,
        function states(states) {
            const base = states.call(this);
            for (const trait of this.equips()) {
                if (trait && trait.aaa_states) {
                    for (const stateId of trait.aaa_states) {
                        const state = $dataStates[stateId];
                        if (!base.contains(state)) {
                            base.push(state);
                        }
                    }
                }
            }
            return base;
        },
        function changeEquip(changeEquip, slotId, item) {
            const lostStates = this.states();
            changeEquip.call(this, slotId, item);
            const newStates = this.states();

            for (let i = lostStates.length - 1; i >= 0; i--) {
                if (!newStates.contains(lostStates[i])) {
                    lostStates[i]._customRemoved && lostStates[i]._customRemoved(this);
                }
            }

            for (let i = newStates.length - 1; i >= 0; i--) {
                if (lostStates.contains(newStates[i])) {
                    newStates.splice(i, 1);
                }
            }
            for (const state of newStates) {
                state._customApply && state._customApply(null, this);
            }
        });

    override(Game_Battler.prototype,
        function regenerateHp(_) {
            const value = Math.max(
                Math.floor(this.mhp * this.hrg + this.hsrg),
                -this.maxSlipDamage());
            value !== 0 && this.gainHp(value);
        },
        function refresh(refresh) {
            refresh.call(this);
            this.aaaLevitate = false;
            this.aaaWiggle = false;
            for (const state of this.states()) {
                if (state && state.meta) {
                    if (state.meta.levitate) {
                        this.aaaLevitate = true;
                    }
                    if (state.meta.wiggle) {
                        this.aaaWiggle = true;
                    }
                }
            }
        },
        function makeActionTimes() {
            return this.actionPlusSet().reduce(function(r, p) {
                return Math.random() < Math.abs(p) ? r + Math.sign(p) : r;
            }, 1);
        },
        function canInput(canInput) {
            return canInput.call(this) && this.numActions() > 0;
        });

    override(Sprite_Character.prototype,
        function setCharacter(setCharacter, character) {
            setCharacter.call(this, character);
            const actor =
                character.actor && character.actor() ||
                (character === $gamePlayer && $gameParty.members()[0]);
            this._actor = actor;
        },
        function updatePosition(updatePosition) {
            updatePosition.call(this);
            if (this._actor && this._actor.aaaLevitate) {
                this.aaaLevitate = (this.aaaLevitate || 0) + 1;
                const offset = (Math.sin(this.aaaLevitate / 30) + 6) * 3;
                this.y -= offset;
            }

            if (this._actor && this._actor.aaaWiggle) {
                this.x += Math.random() * 6 - 3;
                this.y += Math.random() * 2 - 1;
            }
        });

    override(Sprite_Actor.prototype,
        function update(update) {
            update.call(this);
            if (this._battler && this._battler.aaaLevitate) {
                this.aaaLevitate = (this.aaaLevitate || 0) + 1;
                const offset = (Math.sin(this.aaaLevitate / 30) + 6) * 3;
                this.y -= offset;
                this._shadowSprite.y += offset;
            }

            if (this._battler && this._battler.aaaWiggle) {
                this.x += Math.random() * 6 - 3;
                const offset = Math.random() * 2 - 1;
                this.y += offset;
                this._shadowSprite.y -= offset;
            }
        });

    override(Window_Base.prototype,
        function drawText(drawText, text, x, y, maxWidth, align) {
            if (isFinite(text) && parseFloat(text) > 999) {
                return drawText.call(this, "oui", x, y, maxWidth, align);
            } else {
                return drawText.call(this, text, x, y, maxWidth, align);
            }
        },
        function textWidth(textWidth, text) {
            if (isFinite(text) && parseFloat(text) > 999) {
                return textWidth.call(this, "oui");
            } else {
                return textWidth.call(this, text);
            }
        });

    override(Sprite_Damage.prototype,
        function digitWidth() {
            return this._damageBitmap ? 24 : 0;
        },
        function digitHeight() {
            return this._damageBitmap ? 32 : 0;
        },
        function createDigits(createDigits, baseRow, value) {
            if (value > 999) {
                const string = "oui";
                const row = baseRow + (value < 0 ? 1 : 0);
                const w = this.digitWidth();
                const h = this.digitHeight();
                for (let i = 0; i < string.length; i++) {
                    const sprite = this.createChildSprite();
                    const n = 10 + i;
                    sprite.setFrame(n * w, row * h, w, h);
                    sprite.x = (i - (string.length - 1) / 2) * w;
                    sprite.dy = -i;
                }
            } else {
                return createDigits.call(this, baseRow, value);
            }
        });

    String.prototype.format = function () {
        var args = arguments;
        return this.replace(/%([0-9]+)/g, function (s, n) {
            const arg = args[Number(n) - 1];
            return arg > 999 ? "oui" : arg;
        });
    };

    override(Window_ActorCommand.prototype,
        function addAttackCommand(addAttackCommand) {
            const skillId = this._actor.attackSkillId();
            const skill = $dataSkills[skillId];
            if (!skill) {
                return addAttackCommand.call(this);
            }
            this.addCommand(skill.name, "attack", this._actor.canAttack());
        });
})();

// Make title command quicker
(function () {
    override(Window_TitleCommand.prototype,
        function open() {
            this.openness = 255;
        },
        function close() {
            this.openness = 0;
        });
})();

// Track visited zones
(function () {
    window.$visitedMaps = {};

    const oracleMissableZones = [56, 68, 70, 80];

    override(Game_Map.prototype,
        function setup(setup, mapId) {
            setup.call(this, mapId);
            if (!$visitedMaps[mapId])
                $visitedMaps[mapId] = true;
            // If you are visiting the oracle, we assume you visited all previous zones for historic
            // purposes.
            // Zones 80, 81, and 82
            if (mapId === 82)
                for (let i = 0; i < 82; i++)
                    if (!oracleMissableZones.includes(i))
                        $visitedMaps[i] = true;
            $visitedMaps[6] = false;
        },
        function makeSaveContents(makeSaveContents) {
            const contents = makeSaveContents.call(this);
            $visitedMaps[6] = false;
            contents.visitedMaps = $visitedMaps;
            return contents;
        },
        function extractSaveContents(extractSaveContents, contents) {
            extractSaveContents.call(this, contents);
            $visitedMaps = contents.visitedMaps || {};
            $visitedMaps[6] = false;
        });
})();

// Enqueue action
(function () {
    override(Game_Battler.prototype,
        function enqueueAction(_, skillId, targetIndex) {
            const action = new Game_Action(this);
            action.setSkill(skillId);
            if (targetIndex === -2) {
                action.setTarget(this._lastTargetIndex);
            } else if (targetIndex === -1) {
                action.decideRandomTarget();
            } else {
                action.setTarget(targetIndex);
            }
            this._actions.push(action);
        });
})();

// Smaller overworld sprites
(function () {
    override(Game_CharacterBase.prototype,
        function sizeFactor() {
            return 1;
        },
        function realMoveSpeed(realMoveSpeed) {
            return realMoveSpeed.call(this) * ((this.sizeFactor() || 1) + 1) / 2;
        });

    override(Game_Player.prototype,
        function sizeFactor() {
            return $dataMap.playerScale;
        });

    override(Game_Follower.prototype,
        function sizeFactor() {
            return $dataMap.playerScale;
        });

    override(Game_Vehicle.prototype,
        function sizeFactor() {
            return $dataMap.playerScale;
        });

    override(Sprite_Character.prototype,
        function setCharacter(setCharacter, character) {
            setCharacter.call(this, character);
            const event = character.event && character.event();
            this.scale.x = this.scale.y =
                parseFloat(event && event.meta && event.meta.scale) ||
                character.sizeFactor();
        });

    override(Sprite_BasicShadow.prototype,
        function setCharacter(setCharacter, character) {
            setCharacter.call(this, character);
            const event = character.event && character.event();
            this.scale.x = this.scale.y =
                parseFloat(event && event.meta && event.meta.scale) ||
                character.sizeFactor();
        });
})();

// Event contextual plugin commands
(function () {
    window.$charByName = {};

    const eventRegexp = /event (.*)/;
    const choiceRegexp = /choice (\d+) (.*)/;

    function defineFns(entries) {
        for (let i = 0; i < entries.length; i++) {
            const entry = entries[i];
            switch (entry.code) {
                case 356: // Plugin command
                    const str = (entry.parameters && entry.parameters[0] || "").toString();
                    const eventMatch = str.match(eventRegexp);
                    if (eventMatch) {
                        const fn = eval_fn_expr(eventMatch[1]);
                        const nextEntry = entries[i + 1];
                        if (nextEntry) {
                            nextEntry.eventFn = fn;
                        }
                    }
                    const choiceMatch = str.match(choiceRegexp);
                    if (choiceMatch) {
                        const n = Number.parseInt(choiceMatch[1]) || 0;
                        const fn = eval_fn_expr(choiceMatch[2]);
                        // Look for the next choice.
                        // We can get plugin commands in between but nothing else.
                        for (let j = i + 1; j < entries.length; j++) {
                            const entry = entries[j];
                            if (!entry) {
                                break;
                            } else if (entry.code === 102) {
                                entry.choiceFns = entry.choiceFns || [];
                                entry.choiceFns[n] = fn;
                            } else if (entry.code !== 356) {
                                break;
                            }
                        }
                    }
                    break;
            }
        }
    }

    override(DataManager,
        function onLoad(onLoad, object) {
            onLoad.call(this, object);
            if (!object) return;
            switch (object) {
                case $dataActors:
                    for (const actor of $dataActors) {
                        if (!actor) continue;
                        Object.defineProperty(window.$charByName, actor.name, {
                            configurable: true,
                            get() {
                                const index = $gameParty.allMembers().findIndex(bm =>
                                    bm.name() === actor.name);
                                switch (index) {
                                    case -1:
                                        return null;
                                    case 0:
                                        return $gamePlayer;
                                    default:
                                        return $gamePlayer.followers().follower(index - 1);
                                }
                            }
                        });
                    }
                    Object.defineProperty(window.$charByName, "Protagoniste", {
                        configurable: true,
                        get() {
                            return $gamePlayer;
                        }
                    });
                    break;
                case $dataMap:
                    if (!$dataMap.events) break;
                    for (const event of $dataMap.events) {
                        if (!event) continue;
                        for (const page of event.pages || []) {
                            defineFns(page.list);
                        }
                    }
                    break;
                case $dataCommonEvents:
                    if (!$dataCommonEvents) break;
                    for (const event of $dataCommonEvents) {
                        if (!event) continue;
                        defineFns(event.list);
                    }
                    break;
            }
        });

    override(Game_Interpreter.prototype,
        function character(character, param) {
            const cmd = this.currentCommand();
            return cmd && cmd.eventFn ? cmd.eventFn.call(this) : character.call(this, param);
        },
        function setupChoices(setupChoices, params) {
            const cmd = this.currentCommand();
            if (cmd && cmd.choiceFns) {
                const choices = params[0].slice();
                const branchIdx = new Array(choices.length);
                let cancelType = params[1];
                let defaultType = params[2]
                for (let i = choices.length - 1; i >= 0; i--) {
                    branchIdx[i] = i;
                    const choice = choices[i];
                    if (!choice || (cmd.choiceFns[i] && !cmd.choiceFns[i].call(this))) {
                        choices.splice(i, 1);
                        branchIdx.splice(i, 1);
                        cancelType >= i && cancelType--;
                        defaultType >= i && defaultType--;
                    }
                }
                params = [choices, cancelType, defaultType].concat(params.slice(3));
                setupChoices.call(this, params);
                $gameMessage.setChoiceCallback(n => {
                    this._branch[this._indent] = branchIdx[n];
                });
            } else {
                setupChoices.call(this, params);
            }
        });

    override(Game_Follower.prototype,
        function chaseCharacter(chaseCharacter, character) {
            if (this.isMoveRouteForcing()) {
                return;
            }
            return chaseCharacter.call(this, character);
        });
})();

// Additional non-combat followers
(function () {
    override(Game_Party.prototype,
        function nonBattleMembers() {
            return this.allMembers().slice(this.maxBattleMembers());
        });
    override(Game_Followers.prototype,
        function initialize(initialize) {
            initialize.call(this);
            this._data.push(new Game_Follower(this._data.length + 1));
            this._data.push(new Game_Follower(this._data.length + 1));
        },
        function refresh(refresh) {
            if (this._data.length < $gameParty.maxBattleMembers() + 2) {
                this._data.push(new Game_Follower(this._data.length + 1));
                this._data.push(new Game_Follower(this._data.length + 1));
            }
            refresh.call(this);
        },
        function isSomeoneCollided(_, x, y) {
            return this.visibleFollowers().some(function(follower) {
                return !follower.isThrough() && follower.pos(x, y);
            }, this);
        });
    override(Game_Follower.prototype,
        function actor(actor) {
            const battleMembers = $gameParty.battleMembers();
            return (
                battleMembers[this._memberIndex] ||
                $gameParty.nonBattleMembers()[this._memberIndex - battleMembers.length]);
        })
})();

// Additional input names
(function () {
    const directions = {
        6: "right",
        4: "left",
        2: "down",
        8: "up"
    };
    override(Input,
        function isPressed(isPressed, keyName) {
            switch (keyName) {
                case "forward":
                    return isPressed.call(this, directions[$gamePlayer.direction()]);
                default:
                    return isPressed.call(this, keyName);
            }
        })
})();

// Map name display adjustments
(function () {
    let lastDisplayedMapName = null;
    override(Scene_Title.prototype,
        function start(start) {
            start.call(this);
            lastDisplayedMapName = null;
        });

    override(Window_MapName.prototype,
        function open(open) {
            if (lastDisplayedMapName !== $gameMap.displayName()) {
                open.call(this);
            }
            lastDisplayedMapName = $gameMap.displayName();
        });
})();

// Hot-loading utilities
(function () {

    window.reloadMap = function reloadMap() {
        $gamePlayer.reserveTransfer($gameMap.mapId(), $gamePlayer.x, $gamePlayer.y);
        $gamePlayer.requestMapReload();
        if ($gameMap._interpreter.eventId() > 0) {
            $gameMap.unlockEvent($gameMap._interpreter.eventId());
            $gameMap._interpreter.clear();
        }
    };

    window.reloadBattle = function reloadBattle() {
        if (!$gameParty.inBattle()) {
            return;
        }
        BattleManager.initMembers();
        $gameTroop.setup($gameTroop._troopId);
        $gameScreen.onBattleStart();
        BattleManager.makeEscapeRatio();
    };

    window.reloadData = function reloadData(file) {
        const entry = DataManager._databaseFiles.find(entry =>
            entry.name.includes(file) || entry.src.includes(file));
        if (entry) {
            const xhr = new XMLHttpRequest();
            const url = 'data/' + entry.src;
            xhr.open('GET', url);
            xhr.overrideMimeType('application/json');
            xhr.onload = function() {
                if (xhr.status < 400) {
                    window[entry.name] = JSON.parse(xhr.responseText);
                    DataManager.onLoad(window[entry.name]);
                }
            };
            xhr.onerror = this._mapLoader || function() {
                DataManager._errorUrl = DataManager._errorUrl || url;
            };
            xhr.send();
        }
    };

    window.saveTemp = function saveTemp() {
        DataManager.saveGame("__temp__");
    };

    window.clearTemp = function clearTemp() {
        StorageManager.remove("__temp__");
    };

    override(Scene_Boot.prototype,
        function start(start) {
            if (StorageManager.exists("__temp__")) {
                Scene_Base.prototype.start.call(this);
                SoundManager.preloadImportantSounds();
                const json = StorageManager.load("__temp__");
                DataManager.createGameObjects();
                DataManager.extractSaveContents(JsonEx.parse(json));
                SoundManager.playLoad();
                this.fadeOutAll();
                if ($gameSystem.versionId() !== $dataSystem.versionId) {
                    $gamePlayer.reserveTransfer($gameMap.mapId(), $gamePlayer.x, $gamePlayer.y);
                    $gamePlayer.requestMapReload();
                }
                SceneManager.goto(Scene_Map);
                $gameSystem.onAfterLoad();
            } else {
                start.call(this);
            }
        });
})();

// Additional weather
(function () {
    override(Weather.prototype,
        function _createBitmaps(_createBitmaps) {
            _createBitmaps.call(this);
            this._sandstormBitmap = ImageManager.loadPicture("Sandstorm");
            this._sandstormSprite = new TilingSprite(this._sandstormBitmap);
            this._sandstormSprite.blendMode = PIXI.BLEND_MODES.MULTIPLY;
        },
        function _updateAllSprites(_updateAllSprites) {
            if (this.type === "sandstorm") {
                while (this._sprites.length) {
                    this._removeSprite();
                }
                this._sandstormSprite.origin.x += this.power;
                this._sandstormSprite.origin.y += this.power / 6;
                this._sandstormSprite.move(0, 0, Graphics.width, Graphics.height);
                this._sandstormSprite.opacity = (this.power / 9) * 255;
                if (!this._sandstormSprite.added) {
                    this._sandstormSprite.added = true;
                    this.addChild(this._sandstormSprite);
                }
            } else {
                if (this._sandstormSprite.added) {
                    this._sandstormSprite.added = false;
                    this.removeChild(this._sandstormSprite);
                }
                _updateAllSprites.call(this);
            }
        });
})();

// Huds
(function () {
    const COLOR_GRAYSCALE = window.COLOR_GRAYSCALE = 0;
    override(Bitmap.prototype,
        function rotateHue(rotateHue, offset) {
            if (!(this.width > 0 && this.height > 0)) {
                return;
            }
            if (Array.isArray(offset)) {
                var context = this._context;
                var imageData = context.getImageData(0, 0, this.width, this.height);
                var pixels = imageData.data;
                switch (offset[0]) {
                    case COLOR_GRAYSCALE:
                        for (var i = 0; i < pixels.length; i += 4) {
                            rgbToHsl(pixels, i);
                            pixels[i + 1] *= (1 - offset[1]);
                            hslToRgb(pixels, i);
                        }
                        break;
                }
                context.putImageData(imageData, 0, 0);
                this._setDirty();
            } else {
                rotateHue.call(this, offset);
            }
        });

    override(Input,
        function press(_, buttonName) {
            this._currentState[buttonName] = true;
        },
        function release(_, buttonName) {
            this._currentState[buttonName] = false;
        });
    function Window_HUD() {
        this.initialize.apply(this, arguments);
    }

    Window_HUD.prototype = Object.create(Window_Base.prototype);
    Window_HUD.prototype.constructor = Window_HUD;

    const
        VERTICAL = 0,
        SPACE = 1,
        HORIZONTAL = 2,
        CHARACTER = 3,
        TEXT = 4,
        ANIM_CHARACTER = 5,
        CLICK = 6;

    const ANIM_STEPS = [1, 0, 1, 2];
    const COLORS = [
        "rgba(255, 0, 0, 0.2)",
        "rgba(0, 255, 0, 0.2)",
        "rgba(0, 0, 255, 0.2)",
        "rgba(255, 255, 0, 0.2)",
        "rgba(255, 0, 255, 0.2)",
        "rgba(0, 255, 255, 0.2)"
    ];

    const huds = {
        move:
            [HORIZONTAL,
                [CLICK,
                    [VERTICAL,
                        [CHARACTER, "ActorUIUI", 1, 0, [COLOR_GRAYSCALE, 1]],
                        [TEXT, "s,down"]],
                    () => Input.press("down"),
                    () => Input.release("down")
                ],
                [SPACE, 32],
                [CLICK,
                    [VERTICAL,
                        [CHARACTER, "ActorUIUI", 1, 1, [COLOR_GRAYSCALE, 1]],
                        [TEXT, "a,left"]],
                    () => Input.press("left"),
                    () => Input.release("left")],
                [SPACE, 32],
                [CLICK,
                    [VERTICAL,
                        [CHARACTER, "ActorUIUI", 1, 2, [COLOR_GRAYSCALE, 1]],
                        [TEXT, "d,right"]],
                    () => Input.press("right"),
                    () => Input.release("right")],
                [SPACE, 32],
                [CLICK,
                    [VERTICAL,
                        [CHARACTER, "ActorUIUI", 1, 3, [COLOR_GRAYSCALE, 1]],
                        [TEXT, "w,up"]],
                    () => Input.press("up"),
                    () => Input.release("up")],
                [SPACE, 32],
                [SPACE, 32],
                [SPACE, 32],
                [SPACE, 32],
                [CLICK,
                    [VERTICAL,
                        [ANIM_CHARACTER, "ActorUIUI", 1, 0, [COLOR_GRAYSCALE, 1]],
                        [TEXT, "enter,space,z"]],
                    () => Input.press("ok"),
                    () => Input.release("ok")]]
    }

    override(Window_HUD.prototype,
        function initialize(initialize) {
            initialize.call(this, 0, Graphics.height - 160, Graphics.width, 160);
            this.opacity = 0;
            this.contentsOpacity = 0;
            this.step = 0;
            this.animIdx = 0;
            this._type = null;
            this._touchZones = [];
            this._touchedZone = null;
        },
        function update(update) {
            update.call(this);
            if ($gameMap.hud !== this._type) {
                this._type = $gameMap.hud;
            }
            this.targetOpacity = this._type && !$gameMessage.hasText() ? 255 : 0;
            this.contentsOpacity = this.contentsOpacity * 0.75 + this.targetOpacity * 0.25;
            if (!(this.step = (this.step + 1) % 10)) {
                this.animIdx++;
                this.refresh();
            }
            let touchedZoneIdx = -1;
            if (this.contentsOpacity > 200 && TouchInput.isPressed()) {
                const x = this.canvasToLocalX(TouchInput.x) - this.padding;
                const y = this.canvasToLocalY(TouchInput.y) - this.padding;
                for (let i = 0; i < this._touchZones.length; i += 5) {
                    const zx = this._touchZones[i + 0];
                    const zy = this._touchZones[i + 1];
                    const zw = this._touchZones[i + 2];
                    const zh = this._touchZones[i + 3];
                    if (x >= zx && x <= zx + zw && y >= zy && y <= zy + zh) {
                        touchedZoneIdx = i;
                        break;
                    }
                }
            }
            if (this._touchedZone && this._touchedZone !== this._touchZones[touchedZoneIdx + 4]) {
                this._touchedZone[3]();
                this._touchedZone = null;
                this.setCursorRect(0, 0, 0, 0);
            }

            if (touchedZoneIdx >= 0 && !this._touchedZone) {
                const zx = this._touchZones[touchedZoneIdx + 0];
                const zy = this._touchZones[touchedZoneIdx + 1];
                const zw = this._touchZones[touchedZoneIdx + 2];
                const zh = this._touchZones[touchedZoneIdx + 3];
                const zarg = this._touchZones[touchedZoneIdx + 4];
                this._touchedZone = zarg;
                SoundManager.playCursor();
                this.setCursorRect(zx, zy, zw, zh);
                zarg[2]();
            }
        },
        function refresh() {
            const hud = huds[this._type];
            if (hud) {
                this._touchZones.length = 0;
                this.contents.clear();
                Window_MapName.prototype.drawBackground.call(this,
                    this.padding,
                    this.margin,
                    this.width - this.padding * 2,
                    this.height - this.margin * 2);
                this.render(hud, this.width / 2, this.height / 2);
            }
        },
        function size(_, arg, dir) {
            if (dir in arg) {
                return arg[dir];
            }
            let size = 0;
            switch(arg && arg[0]) {
                case VERTICAL:
                case HORIZONTAL:
                    for (let i = 1; i < arg.length; i++) {
                        const childSize = this.size(arg[i], dir);
                        if (dir === (arg[0] === VERTICAL ? "w" : "h")) {
                            if (arg[i][0] !== SPACE) {
                                size = Math.max(size, childSize);
                            }
                        } else {
                            size += childSize;
                        }
                    }
                    break;
                case SPACE:
                    size = arg[1];
                    break;
                case ANIM_CHARACTER:
                case CHARACTER:
                    const characterName = arg[1];
                    const bitmap = ImageManager.loadCharacter(characterName);
                    const big = ImageManager.isBigCharacter(characterName);
                    const pw = bitmap.width / (big ? 3 : 12);
                    const ph = bitmap.height / (big ? 4 : 8);
                    size = dir === "w" ? pw : ph;
                    break;
                case TEXT:
                    size = dir === "w" ? 48 : this.lineHeight() * 0.75;
                    break;
                case CLICK:
                    size = this.size(arg[1], dir);
                    break;
            }
            arg[dir] = size;
            return size;
        },
        function render(_, arg, x, y) {
            const w = this.size(arg, "w");
            const h = this.size(arg, "h");
            // For testing
            // this.contents.fillRect(x - w/2, y - h/2, w, h, COLORS[arg[0]]);
            switch(arg && arg[0]) {
                case VERTICAL:
                    y -= h / 2;
                    for (let i = 1; i < arg.length; i++) {
                        const ih = this.size(arg[i], "h");
                        y += ih / 2;
                        this.render(arg[i], x, y);
                        y += ih / 2;
                    }
                    break;
                case HORIZONTAL:
                    x -= w / 2;
                    for (let i = 1; i < arg.length; i++) {
                        const iw = this.size(arg[i], "w");
                        x += iw / 2;
                        this.render(arg[i], x, y);
                        x += iw / 2;
                    }
                    break;
                case ANIM_CHARACTER:
                case CHARACTER:
                    const characterName = arg[1];
                    const characterIndex = arg[2];
                    const directionIndex = arg[3];
                    const bitmap = ImageManager.loadCharacter(characterName, arg[4]);
                    const big = ImageManager.isBigCharacter(characterName, arg[4]);
                    const pw = bitmap.width / (big ? 3 : 12);
                    const ph = bitmap.height / (big ? 4 : 8);
                    const n = characterIndex;
                    const step = arg[0] === ANIM_CHARACTER ? ANIM_STEPS[(this.animIdx) % 4] : 1;
                    const sx = (n % 4 * 3 + step) * pw;
                    const sy = (directionIndex + Math.floor(n / 4) * 4) * ph;
                    this.contents.blt(bitmap, sx, sy, pw, ph, x - w / 2, y - h / 2);
                    break;
                case TEXT:
                    this.contents.fontSize = this.standardFontSize() - 12;
                    this.drawText(arg[1], x - 200, y - h / 2, 400, "center");
                    break;
                case CLICK:
                    this._touchZones.push(
                        x - w / 2 - this._margin,
                        y - h / 2 - this._margin,
                        w + this._margin * 2,
                        h + this._margin * 2,
                        arg);
                    this.render(arg[1], x, y);
                    break;
            }
        });

    override(Scene_Map.prototype,
        function createAllWindows(createAllWindows) {
            this._hudWindow = new Window_HUD();
            this.addWindow(this._hudWindow);
            createAllWindows.call(this);
        });
})();

// Preserve bgs in battle
(function () {
    override(Scene_Map.prototype,
        function stopAudioOnBattleStart() {
            if (!AudioManager.isCurrentBgm($gameSystem.battleBgm())) {
                AudioManager.stopBgm();
            }
            AudioManager.stopMe();
            AudioManager.stopSe();
        });

    override(BattleManager,
        function saveBgmAndBgs() {
            this._mapBgm = AudioManager.saveBgm();
        },
        function playBattleBgm() {
            AudioManager.playBgm($gameSystem.battleBgm());
        },
        function replayBgmAndBgs() {
            if (this._mapBgm) {
                AudioManager.replayBgm(this._mapBgm);
            } else {
                AudioManager.stopBgm();
            }
        });
})();

// Counter attacks should not prevent damage
(function () {
    override(Game_BattlerBase.prototype,
        function counterSkillId() {
            for (const stateId of this._states) {
                const state = $dataStates[stateId];
                if (state && state.counterSkillId) {
                    return state.counterSkillId;
                }
            }
            // TODOOOO
            return this.attackSkillId();
        });

    override(BattleManager,
        function invokeAction(invokeAction, subject, target) {
            this._logWindow.push('pushBaseLine');
            if (Math.random() < this._action.itemCnt(target)) {
                this.invokeCounterAttack(subject, target);
            }
            if (Math.random() < this._action.itemMrf(target)) {
                this.invokeMagicReflection(subject, target);
            } else {
                this.invokeNormalAction(subject, target);
            }
            subject.setLastTarget(target);
            this._logWindow.push('popBaseLine');
            this.refreshStatus();
        },
        function invokeCounterAttack(_, subject, target) {
            const action = new Game_Action(target);
            action.setSkill(target.counterSkillId());
            action.apply(subject);
            this._logWindow.displayCounter(target);
            this._logWindow.displayActionResults(target, subject);
        });
})();
