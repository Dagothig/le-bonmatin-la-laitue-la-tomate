const GROUND = 0;
const FLYING = 1;
const EMPTY_OBJ = {};
const EMPTY_ARR = [];

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
    e._jumpPeak += h;
    e._jumpCount = e._jumpPeak * 2;
    for (const follower of (e._followers || EMPTY_OBJ)._data || EMPTY_ARR) {
        follower._jumpPeak += h;
        follower._jumpCount = e._jumpPeak * 2;
    }
}

function aaa_jump_forward(e, d, h) {
    var x = $gameMap.xWithDirection(0, e.direction()) * d;
    var y = $gameMap.yWithDirection(0, e.direction()) * d;
    aaa_jump(e, x, y, h);
    e._jumpPeak += h;
    e._jumpCount = e._jumpPeak * 2;
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
var MOVE = "startMove",
    WIGGLE = "startWiggle",
    PARABOLA = "startParabola",
    WAIT = "startWait",
    PATTERN = "setPattern",
    MOTION = "startMotion",
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

function override(obj) {
    for (let i = 1; i < arguments.length; i++) {
        let fn = arguments[i];
        let original = obj[fn.name];
        obj[fn.name] = function (a, b, c, d, e, f) {
            return fn.call(this, original, a, b, c, d, e, f);
        }
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
    var actionRegexp = /\<<aaa_action ([\s\S]*?)\>>/;
    var actionsRegexp = /\<<aaa_actions ([\s\S]*?)\>>/;
    var performActionStartRegexp = /\<<aaa_performActionStart ([\s\S]*?)\>>/;
    var setupRegexp = /\<<aaa_setup ([\s\S]*?)\>>/;
    var deathRegexp = /\<<aaa_death ([\s\S]*?)\>>/;
    var restrictedRegexp = /\<<aaa_on_restrict ([\s\S]*?)\>>/;
    var tilingRegexp = /\<<aaa_tiling *(\d+)? *(\d+)? *(\[[\d+\,]*\d+\])? *(\d+|\[[\d+\,]*\d+\])?\>>/;
    var battlerIconRegexp = /\<<aaa_icon *(\d+)? *(\d+)? *(\d+)? *(\d+)? *([-_/\w]+)?\>>/;
    const actorSpriteRegexp = /\<<aaa_actor_sprite *([-_\w]+)?\>>/;
    const shadowRegexp = /\<<shadow *(\w+)? *(-?\d+)?\>>/;
    const overlayRegexp = /\<<aaa_overlay (\d+)\>>/;
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
                        get() { return $gameMapSwitches[map.id] || ($gameMapSwitches[map.id] = {}); }
                    });
                }
                break;
            case $dataMap:
                $dataMap.bgm.filters = ($dataMap.meta.bgmFilter || "").split(",").filter(i => i);
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
                    const overlayMatch = note.match(overlayRegexp);
                    overlayMatch && (state.overlay = parseInt(overlayMatch[1]) || 0);
                }
                break;
            case $dataSkills:
                for (const skill of object) {
                    if (!skill)
                        continue;
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
        }
    };

    var original_applyGuard = Game_Action.prototype.applyGuard;
    Game_Action.prototype.applyGuard = function (damage, target) {
        return damage;
    };

    var originalDef = Object.getOwnPropertyDescriptor(Game_BattlerBase.prototype, 'def');
    Object.defineProperties(Game_BattlerBase.prototype, {
        lukVar: {
            get: function () {
                return 1 + Math.random() * (this.luk - 95) / 100;
            }
        },
        grd: {
            get: function () {
                return this.traitsSum(Game_BattlerBase.TRAIT_SPARAM, 1) * 100;
            }
        },
        def: {
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

    var original_pluginCommand = Game_Interpreter.prototype.pluginCommand;
    Game_Interpreter.prototype.pluginCommand = function (command, args) {
        original_pluginCommand.call(this, command, args);

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
        }
    }

    override(Sprite_Battler.prototype,
        function initMembers(initMembers) {
            initMembers.call(this);
            this._moves = [];
        },
        function dequeueMove() {
            while (!this.isMoving() && this._moves.length) {
                var nextMove = this._moves.shift();
                var type = nextMove.shift();
                this[type].apply(this, nextMove);
            }
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

    var original_sceneBattleStart = Scene_Battle.prototype.start;
    Scene_Battle.prototype.start = function () {
        original_sceneBattleStart.call(this);
    };

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
        function performCollapse(performCollapse) {
            performCollapse.call(this);
            var enemy = this.enemy();
            enemy._customDeath && enemy._customDeath.call(this);
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
        return customTargets || originalTargetsForOpponents.call(this);
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
                    for (let i = 1, n = this._battler.statesCount(); i <= n; i++) {
                        let overlayIndex = ((this._overlayIndex || 0) + i) % n;
                        let stateId = this._battler._states[overlayIndex];
                        let state = $dataStates[stateId];
                        if (state.overlay) {
                            this._overlayIndex = state.overlay;
                            break findOverlay;
                        }
                    }
                    this._overlayIndex = 0;
                }
                this._overlayCount = 60;
            }
        });
    override(Sprite_StateIcon.prototype,
        function update(update) {
            update.call(this);
            let hue = this._hue || 0;
            let battlerHue = this._battler && this._battler.battlerHue() || 0;
            if (hue !== battlerHue) {
                this.bitmap = ImageManager.loadSystem('IconSet', -battlerHue);
                this.updateFrame();
                this._hue = battlerHue;
            }
        });

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
    var original_displayDamage = Window_BattleLog.prototype.displayDamage;
    Window_BattleLog.prototype.displayDamage = function (target) {

        if (target.result().blocked) {
            AudioManager.playSe(ding);
        }

        original_displayDamage.call(this, target);
    };
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
            var target = targets.map(t => t.name()).join(", ");
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
        var lineHeight = this.lineHeight();
        var availWidth = width - this.textPadding();
        var colWidth = (availWidth - this.standardPadding()) / 2;
        var x2 = x + this.standardPadding() + colWidth;
        this.drawActorName(actor, x, y, availWidth);
        this.drawActorClass(actor, x, y + lineHeight * 1, availWidth);
        this.drawActorIcons(actor, x, y + lineHeight * 2, colWidth);
        this.drawActorHp(actor, x, y + lineHeight * 3, colWidth);
        this.drawActorMp(actor, x2, y + lineHeight * 3, colWidth);
    };
    Window_Status.prototype.maxEquipmentLines = function () {
        return 5;
    };

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
                    var state = $dataStates[effect.dataId];
                    state._customApply && state._customApply(this, target);
                    target.addState(stateId);
                    this.makeSuccess(target);
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
                state._customApply && state._customApply(this, target);
                target.addState(effect.dataId);
                this.makeSuccess(target);
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
        function die(die) {
            for (const state of this.states()) {
                state._customRemoved && state._customRemoved(this);
            }
            die.call(this);
        },
        function performActionStart(performActionStart, action) {
            performActionStart.call(this, action);
            var item = action.item();
            if (item._customPerformActionStart) {
                item._customPerformActionStart.call(action, this);
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
            if (!Number.isFinite(se.pitch)) se.pitch = 100;
            if (!Number.isFinite(se.volume)) se.volume = 90;
            playSe.call(this, se);
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
        get() {
            return this._speechVolume;
        },
        set(value) {
            this._speechVolume = value;
        }
    });

    Object.defineProperty(ConfigManager, "masterVolume", {
        get() {
            return AudioManager.masterVolume * 100;
        },
        set(value) {
            AudioManager.masterVolume = value / 100;
        }
    });

    Object.defineProperty(ConfigManager, "speechVolume", {
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
        get: function() {
            return this._ongoingSpeech;
        },
        set: function(value) {
            var previousVolume = this._bgmBuffer && this._bgmBuffer.volume;
            this._ongoingSpeech = value;
            this.updateBgmParameters(this._currentBgm);
            var newVolume = this._bgmBuffer && this._bgmBuffer.volume;
            if (previousVolume !== newVolume) {
                this._bgmBuffer.aaa_fade(previousVolume < newVolume ? 1 : 0.25, previousVolume, newVolume);
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
                    _reverb: { wet: 1, dry: 0.5 }
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
                    gain.setValueAtTime(from, currentTime);
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
            this.startZoom(
                event && event.screenX() || 0,
                event && (event.screenY() - 24) || 0,
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

        function resetZoom(_, duration = 15) {
            this.startZoom(this._zoomX, this._zoomY, 1, duration);
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
            return this._patternType.length;
        },
        function pattern() {
            return this._patternType[this._pattern];
        },
        function resetPattern() {
            return this._pattern = this._patternReset;
        },
        function setPatternType(_, patternType) {
            this._patternType = patternType;
            this._patternReset = patternType[patternType.length - 1];
        },
        function realMoveSpeed(realMoveSpeed) {
            return realMoveSpeed.call(this) + 0.25;
        },
        function animationWait() {
            return (9 - this.realMoveSpeed()) * this._animationWaitMultiplier;
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
        });
})();

Input.keyMapper[87] = "up"; // w
Input.keyMapper[83] = "down"; // s
Input.keyMapper[65] = "left"; // a
Input.keyMapper[68] = "right"; // d

// Vehicles
(function () {
    override(Game_Vehicle.prototype,
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

// Transitiooooons
(function () {
    const CROSSFADE = 0;
    let crossfadeSprite;
    let crossfadeBitmap;
    let crossfadeRenderTexture;
    override(Graphics,
        function initialize(initialize, width, height, type) {
            initialize.call(this, width, height, type);

            crossfadeBitmap = new Bitmap(width, height);
            crossfadeRenderTexture = PIXI.RenderTexture.create(width, height);
            crossfadeSprite = new Sprite();
            crossfadeSprite.bitmap = crossfadeBitmap;
        })
    override(Scene_Map.prototype,
        function createCrossfadeSprite(_, fadein) {
            if (this._fadeSprite !== crossfadeSprite) {
                if (this._fadeSprite) {
                    this.removeChild(this._fadeSprite);
                }
                this._fadeSprite = crossfadeSprite;
                this.addChild(this._fadeSprite);
            }
            if (!fadein) {
                Graphics._renderer.render(this._spriteset, crossfadeRenderTexture);
                this.worldTransform.identity();
                let canvas = Graphics._renderer.extract.canvas(crossfadeRenderTexture);
                crossfadeBitmap._context.drawImage(canvas, 0, 0);
                crossfadeBitmap._setDirty();
            }
        },
        function createFadeSprite(createFadeSprite, white) {
            if (this._fadeSprite === crossfadeSprite) {
                this.removeChild(crossfadeSprite);
                delete this._fadeSprite;
            }
            createFadeSprite.call(this);
        },
        function startFadeIn(startFadeIn, duration, type) {
            if (type === CROSSFADE) {
                this.createCrossfadeSprite(true);
                this._fadeSign = 1;
                this._fadeDuration = duration || 30;
                this._fadeSprite.opacity = 255;
            } else {
                startFadeIn.call(this, duration, type);
            }
        },
        function startFadeOut(startFadeOut, duration, type) {
            if (type === CROSSFADE) {
                this.createCrossfadeSprite(false);
                this._fadeDuration = -1;
                this._fadeSprite.opacity = 0;
            } else {
                startFadeOut.call(this, duration, type);
            }
        },
        function fadeInForTransfer() {
            this.startFadeIn(this.fadeSpeed(), CROSSFADE);
        },
        function fadeOutForTransfer() {
            this.startFadeOut(-1, CROSSFADE);
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
