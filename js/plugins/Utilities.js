function aaa_fireplace(eventId, strength = 100) {
    var vmin = 0, vmax = 90, pmin = 0, pmax = 100;
    var tmin = [0, 0, 0, 0], tmax = [24, 12, 0, 0];
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

function aaa_jump_forward(e, d, h) {
    var x = $gameMap.xWithDirection(0, e.direction()) * d;
    var y = $gameMap.yWithDirection(0, e.direction()) * d;
    e.jump(x, y);
    e._jumpPeak += h;
    e._jumpCount = e._jumpPeak * 2;
}

function aaa_jump(e, x, y, h) {
    e.jump(x, y);
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

var MOVE = "startMove", WIGGLE = "startWiggle", PARABOLA = "startParabola", WAIT = "startWait";

function aaa_anim(target, anim, delay) {
    var sprite = target._sprite;
    sprite._aaaX = sprite._aaaX || 0;
    sprite._aaaY = sprite._aaaY || 0;
    delay = delay || 0;
    if (delay) {
        sprite.pushMove([WAIT, delay]);
    }
    switch (anim) {
        case "jump_in":
        default:
            sprite.pushMove([MOVE, -100, 50, 0]);
            sprite.pushMove([PARABOLA, -20, 0, -60, 12]);
            sprite.pushMove([PARABOLA, 0, 0, -10, 4]);
            break;
        case "wiggle":
            sprite.pushMove([WIGGLE, -5, -2, 5, 0, 30]);
            break;
        case "step_back":
            sprite._aaaX -= 30;
            sprite._aaaY += 0;
            sprite.pushMove([MOVE, sprite._aaaX, sprite._aaaY, 12]);
            break;
        case "step_forward":
            sprite._aaaX += 30;
            sprite._aaaY += 0;
            sprite.pushMove([MOVE, sprite._aaaX, sprite._aaaY, 12]);
            break;
        case "shuffle":
            sprite.pushMove([WAIT, 4]);
            sprite.pushMove([PARABOLA, 10, -10, -20, 12]);
            sprite.pushMove([WAIT, 8]);
            sprite.pushMove([PARABOLA, -15, 10, -30, 12]);
            sprite.pushMove([WAIT, 6]);
            sprite.pushMove([PARABOLA, -30, 0, -10, 12]);
            break;
        case "step_down":
            sprite._aaaX += -5;
            sprite._aaaY += 30;
            sprite.pushMove([MOVE, sprite._aaaX, sprite._aaaY, 12]);
            break;
        case "lunge":
            sprite._aaaX += 20;
            sprite.pushMove([PARABOLA, sprite._aaaX, sprite._aaaY, -10, 8]);
            sprite._aaaX = 0;
            sprite._aaaY = 0;
            sprite.pushMove([MOVE, sprite._aaaX, sprite._aaaY, 3]);
            break;
    }
}

(function () {
    var original_var_initialize = Game_Variables.prototype.initialize;
    Game_Variables.prototype.initialize = function() {
        original_var_initialize.call(this);
        this.byKey = {};
        var self = this;
        for (var i = 0; i < $dataSystem.variables.length; i++) {
            const key = $dataSystem.variables[i].trim();
            if (key) {
                const variableId = i;
                Object.defineProperty(this.byKey, key, {
                    get() {
                        return self.value(variableId);
                    },
                    set(value) {
                        return self.setValue(variableId, value);
                    }
                })
            }
        }
    };

    var original_sw_intialize = Game_Switches.prototype.initialize;
    Game_Switches.prototype.initialize = function() {
        original_sw_intialize.call(this);
        this.byKey = {};
        var self = this;
        for (var i = 0; i < $dataSystem.switches.length; i++) {
            const key = $dataSystem.switches[i].trim();
            if (key) {
                const switchId = i;
                Object.defineProperty(this.byKey, key, {
                    get() {
                        return self.value(switchId);
                    },
                    set(value) {
                        return self.setValue(switchId, value);
                    }
                });
            }
        }
    };

    Object.defineProperties(window, {
        $gvars: {
            get() {
                return $gameVariables.byKey;
            }
        },
        $gsw: {
            get() {
                return $gameSwitches.byKey;
            }
        }
    });

    var original_makeSaveContents = DataManager.makeSaveContents;
    DataManager.makeSaveContents = function() {
        var contents = original_makeSaveContents.call(this);
        contents.mapSwitches = $gameMapSwitches;
        return contents;
    };

    var original_extractSaveContents = DataManager.extractSaveContents;
    DataManager.extractSaveContents = function(contents) {
        original_extractSaveContents.call(this);
        $gameMapSwitches = contents.mapSwitches || {};
    }

    var original_setupPage = Game_Event.prototype.setupPage;
    Game_Event.prototype.setupPage = function() {
        this._hasRun = false;
        original_setupPage.call(this);
    }

    var original_meetsConditions = Game_Event.prototype.meetsConditions;
    Game_Event.prototype.meetsConditions = function (page) {
        var cmd = page.list && page.list[0] && page.list[0];
        if (cmd && cmd.code === 356) { // Plugin command lol
            if (cmd.parameters[0] === "aaa_condition") {
                if (!eval(page.list[1].parameters[0]))
                    return false;
            }
        }
        return original_meetsConditions.apply(this, arguments);
    };
})();

function eval_fn_expr(expr, args) {
    expr = expr.trim();
    if (!expr.startsWith("{")) {
        expr = "{ return " + expr + " }";
    }
    expr = "(function(" + (args || "") + ") " + expr + ")";
    try {
        return eval(expr);
    } catch(err) {
        console.error(expr);
        throw err;
    }
}

// Extendoooooo
(function () {
    var aaaExtend = /\<<aaa_extend (.*)\>>/;
    var targetsRegexp = /\<<aaa_targets ([\s\S]*?)\>>/;
    var actionRegexp = /\<<aaa_action ([\s\S]*?)\>>/;
    var setupRegexp = /\<<aaa_setup ([\s\S]*?)\>>/;
    var original_onLoad = DataManager.onLoad;
    DataManager.onLoad = function (object) {
        original_onLoad.call(DataManager, object);
        switch (object) {
            case $dataStates:
                for (const state of object) {
                    if (!state)
                        continue;
                    const extStr = (state.note.match(aaaExtend) || [])[1];
                    const ext = JSON.parse(extStr || "{}");
                    Object.assign(state, ext);
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
                }
                break;
            case $dataEnemies:
                for (const enemy of object) {
                    if (!enemy)
                        continue;
                    const note = enemy && enemy.note || "";
                    const actionMatch = note.match(actionRegexp);
                    enemy._customAction = actionMatch && actionMatch[1] && eval_fn_expr(actionMatch[1], "actionList, ratingZero");
                    const setupMatch = note.match(setupRegexp);
                    enemy._customSetup = setupMatch && setupMatch[1] && eval_fn_expr(setupMatch[1], "enemyId, x, y");
                }
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
                return this.traitsSum(Game_BattlerBase.TRAIT_SPARAM, 1);
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
    Game_Map.prototype.setupParallax = function() {
        original_setupParallax.call(this);
        this._parallaxPosX = 0;
        this._parallaxPosY = 0;
    }

    var original_changeParallax = Game_Map.prototype.changeParallax;
    Game_Map.prototype.changeParallax = function(name, loopX, loopY, sx, sy, x, y) {
        original_changeParallax.call(this, name, loopX, loopY, sx, sy);
        this._parallaxPosX = x || 0;
        this._parallaxPosY = y || 0;
    }

    var original_parallaxOx = Game_Map.prototype.parallaxOx;
    Game_Map.prototype.parallaxOx = function() {
        if (Number.isFinite(this._parallaxPosX)) {
            return 256 - this.adjustX(this.parallaxPX() + 0.5) * this.tileWidth();
        }
        return original_parallaxOx.call(this);
    };

    var original_parallaxOy = Game_Map.prototype.parallaxOy;
    Game_Map.prototype.parallaxOy = function() {
        if (Number.isFinite(this._parallaxPosY)) {
            return 256 - this.adjustY(this.parallaxPY() + 0.5) * this.tileWidth();
        }
        return original_parallaxOy.call(this);
    };

    Game_Map.prototype.parallaxPX = function() {
        return this._parallaxPosX;
    };

    Game_Map.prototype.parallaxPY = function() {
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
        }
    }

    var original_initMembers = Sprite_Battler.prototype.initMembers;
    Sprite_Battler.prototype.initMembers = function () {
        original_initMembers.call(this);
        this._moves = [];
    }

    Sprite_Battler.prototype.dequeueMove = function () {
        while (!this.isMoving() && this._moves.length) {
            var nextMove = this._moves.shift();
            var type = nextMove.shift();
            this[type].apply(this, nextMove);
        }
    };

    Sprite_Battler.prototype.pushMove = function (args) {
        this._moves.push(args);
        this.dequeueMove();
    }

    var original_onMoveEnd = Sprite_Battler.prototype.onMoveEnd;
    Sprite_Battler.prototype.onMoveEnd = function () {
        original_onMoveEnd.call(this);
        switch (this._moveType) {
            case WIGGLE:
            case PARABOLA:
                this._offsetX = this._targetOffsetX;
                this._offsetY = this._targetOffsetY;
        }

        this.dequeueMove();
    };

    var original_startMove = Sprite_Battler.prototype.startMove;
    Sprite_Battler.prototype.startMove = function (x, y, duration) {
        this._moveType = MOVE;
        original_startMove.call(this, x, y, duration);
    };

    Sprite_Battler.prototype.startWiggle = function (mx, my, Mx, My, duration) {
        this._moveType = WIGGLE;
        this._targetOffsetX = this._offsetX;
        this._targetOffsetY = this._offsetY;
        this._wiggleX = mx;
        this._wiggleDX = Mx - mx;
        this._wiggleY = my;
        this._wiggleDY = My - my;
        this._movementDuration = duration;
    };

    Sprite_Battler.prototype.startParabola = function (x, y, h, duration) {
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
        this._movementDuration = duration;
    }

    Sprite_Battler.prototype.startWait = function (duration) {
        this._movementDuration = duration;
    };

    var original_updateMove = Sprite_Battler.prototype.updateMove;
    Sprite_Battler.prototype.updateMove = function () {
        if (this._moveType === MOVE)
            return original_updateMove.call(this);
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
                break;
        }
        this._movementDuration--;
        if (this._movementDuration === 0) {
            this.onMoveEnd();
        }
    };

    var original_sceneBattleStart = Scene_Battle.prototype.start;
    Scene_Battle.prototype.start = function() {
        original_sceneBattleStart.call(this);
        window.$btl = {};
    };

    var original_enemySetup = Game_Enemy.prototype.setup;
    Game_Enemy.prototype.setup = function(enemyId, x, y) {
        original_enemySetup.call(this, enemyId, x, y);
        var enemy = this.enemy();
        enemy._customSetup && enemy._customSetup.call(this, enemyId, x, y);
    }

    var original_selectAction = Game_Enemy.prototype.selectAction;
    Game_Enemy.prototype.selectAction = function(actionList, ratingZero) {
        var enemy = this.enemy();
        return (
            enemy._customAction && enemy._customAction.call(this, actionList, ratingZero) ||
            original_selectAction.call(this, actionList, ratingZero));
    }

    var animRegexp = /\<<aaa_anim (.*)\>>/;
    var original_performActionStart = Game_Enemy.prototype.performActionStart;
    Game_Enemy.prototype.performActionStart = function (action) {
        original_performActionStart.call(this, action);
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
    }

    var originalTargetsForOpponents = Game_Action.prototype.targetsForOpponents;
    Game_Action.prototype.targetsForOpponents = function() {
        var item = this.item();
        var customTargets = item._customTargets && item._customTargets.call(this);
        return customTargets || originalTargetsForOpponents.call(this);
    }

    var original_actionApply = Game_Action.prototype.apply;
    Game_Action.prototype.apply = function(target) {
        original_actionApply.call(this, target);
        var item = this.item();
        item._customAction && item._customAction.call(this, target);
    }
})();

// Ding!
(function() {
    var original_actionApply = Game_Action.prototype.apply;
    Game_Action.prototype.apply = function(target) {
        original_actionApply.call(this, target);
        target.result().blocked =
            target.result().isHit() &&
            target.isGuard() &&
            target.result().hpAffected &&
            target.result().hpDamage >= 0 &&
            target.result().hpDamage < 5 &&
            !target.result().drain;
    }

    const ding = { name: "Ding", volume: 90, pitch: 100 };
    var original_displayDamage = Window_BattleLog.prototype.displayDamage;
    Window_BattleLog.prototype.displayDamage = function(target) {

        if (target.result().blocked) {
            AudioManager.playSe(ding);
        }

        original_displayDamage.call(this, target);
    };
})();

// Display target in log
(function() {
    Window_BattleLog.prototype.startAction = function(subject, action, targets) {
        var item = action.item();
        this.push('clear');
        this.push('performActionStart', subject, action);
        this.push('waitForMovement');
        this.push('performAction', subject, action);
        this.push('showAnimation', subject, targets.clone(), item.animationId);
        this.displayAction(subject, item, targets);
    };

    var original_battleLogDisplayAction = Window_BattleLog.prototype.displayAction;
    Window_BattleLog.prototype.displayAction = function(subject, item, targets) {
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
})();
