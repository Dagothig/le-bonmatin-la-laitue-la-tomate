const GROUND = 0;
const FLYING = 1;

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
        case "reset":
            sprite._aaaX = 0;
            sprite._aaaY = 0;
            sprite.pushMove([PARABOLA, -3, 3, -6, 12]);
            sprite.pushMove([PARABOLA, 0, 0, -4, 12]);
            break;
        case "step_back":
            sprite._aaaX -= 30;
            sprite._aaaY += 0;
            sprite.pushMove([MOVE, sprite._aaaX, sprite._aaaY, 12]);
            break;
        case "step_forward":
            sprite._aaaX += 50;
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
        case "jump":
            sprite.pushMove([PARABOLA, -3, 3, -6, 12]);
            sprite.pushMove([PARABOLA, 0, 0, -20, 12]);
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

(function () {
    override(DataManager,
        function makeSaveContents(makeSaveContents) {
            var contents = makeSaveContents.call(this);
            contents.mapSwitches = $gameMapSwitches;
            return contents;
        },
        function extractSaveContents(extractSaveContents, contents) {
            extractSaveContents.call(this, contents);
            console.log(contents);
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
                    event.movementType !== FLYING);
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
    var performActionStartRegexp = /\<<aaa_performActionStart ([\s\S]*?)\>>/;
    var setupRegexp = /\<<aaa_setup ([\s\S]*?)\>>/;
    var deathRegexp = /\<<aaa_death ([\s\S]*?)\>>/;
    var restrictedRegexp = /\<<aaa_on_restrict ([\s\S]*?)\>>/;
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
                    })
                }
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
            case $dataEnemies:
                for (const enemy of object) {
                    if (!enemy)
                        continue;
                    const note = enemy && enemy.note || "";
                    const actionMatch = note.match(actionRegexp);
                    enemy._customAction = actionMatch && actionMatch[1] && eval_fn_expr(actionMatch[1], "actionList, ratingZero");
                    const restrictedMatch = note.match(restrictedRegexp);
                    enemy._customOnRestrict = restrictedMatch && restrictedMatch[1] && eval_fn_expr(restrictedMatch[1]);
                    const setupMatch = note.match(setupRegexp);
                    enemy._customSetup = setupMatch && setupMatch[1] && eval_fn_expr(setupMatch[1], "enemyId, x, y");
                    const deathMatch = note.match(deathRegexp);
                    enemy._customDeath = deathMatch && deathMatch[1] && eval_fn_expr(deathMatch[1]);
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
        this._parallaxPosX = 0;
        this._parallaxPosY = 0;
    }

    var original_changeParallax = Game_Map.prototype.changeParallax;
    Game_Map.prototype.changeParallax = function (name, loopX, loopY, sx, sy, x, y) {
        original_changeParallax.call(this, name, loopX, loopY, sx, sy);
        this._parallaxPosX = x || 0;
        this._parallaxPosY = y || 0;
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
        this._moveType = null;
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
    Scene_Battle.prototype.start = function () {
        window.$btl = {};
        original_sceneBattleStart.call(this);
    };

    var original_enemySetup = Game_Enemy.prototype.onBattleStart;
    Game_Enemy.prototype.onBattleStart = function () {
        original_enemySetup.call(this);
        var enemy = this.enemy();
        enemy._customSetup && enemy._customSetup.call(this);
    }

    var original_enemyCollapse = Game_Enemy.prototype.performCollapse;
    Game_Enemy.prototype.performCollapse = function () {
        original_enemyCollapse.call(this);
        var enemy = this.enemy();
        enemy._customDeath && enemy._customDeath.call(this);
    }

    var original_selectAction = Game_Enemy.prototype.selectAction;
    Game_Enemy.prototype.selectAction = function (actionList, ratingZero) {
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

    override(Game_Enemy.prototype,
        function onRestrict(onRestrict) {
            onRestrict.call(this);
            if (this.isAlive()) {
                var enemy = this.enemy();
                enemy._customOnRestrict && enemy._customOnRestrict.call(this);
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
            target.isGuard() &&
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
        this.push('waitForMovement');
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
        "  uniform(1, (mardité + 5) / 100)",
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

    Window_EquipStatus.prototype.refresh = function () {
        this.contents.clear();
        if (this._actor) {
            this.drawActorName(this._actor, this.textPadding(), 0, 270);
            for (var i = 0; i < 6; i++) {
                this.drawItem(0, this.lineHeight() * (1 + i), 2 + i);
            }
        }
    };
})();

// State ameliorations
(function () {

    override(BattleManager,
        function applySubstitute(applySubstitute, target) {
            let newTarget;
            for (const state of target.states()) {
                newTarget = state._customTargetted && state._customTargetted(target);
                if (newTarget && newTarget.isAlive() && newTarget.canMove()) {
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
            if (this.isStateAffected(stateId)) {
                var state = $dataStates[stateId];
                state._customRemoved && state._customRemoved(this);
            }
            removeState.call(this, stateId);
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

    override(AudioManager,
        function updateBgmParameters(updateBgmParameters, bgm) {
            this.updateBufferParameters(
                this._bgmBuffer,
                this._bgmVolume * (this.ongoingSpeech ? 0.25 : 1),
                bgm);
        });

    function _startPlaying(_startPlaying, loop, offset) {
        if (!this._isOngoingSpeech && (this._url || "").match(speechRegexp)) {
            this._isOngoingSpeech = true;
            AudioManager.ongoingSpeech++;
        }
        return _startPlaying.call(this, loop, offset);
    }

    function stop(stop) {
        if (this._isOngoingSpeech) {
            this._isOngoingSpeech = false;
            AudioManager.ongoingSpeech--;
        }
        return stop.call(this);
    }

    override(WebAudio.prototype,
        _startPlaying,
        stop,
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
        });

    override(Html5Audio.prototype,
        _startPlaying,
        stop,
        function aaa_fade(_, duration, from, to) {
            if (this.isReady()) {
                if (this._audioElement) {
                    this._tweenTargetGain = to;
                    this._tweenGain = from;
                    this._startGainTween(duration);
                }
            } else if (this._autoPlay) {
                this.addLoadListener(function () {
                    this.fadeIn(duration);
                }.bind(this));
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
            if (regionId === 16)
                return true;
            if (regionId === 17)
                return false;
            regionId &= passableMask;
            if (!regionId) {
                return isPassable.call(this, x, y, d);
            }
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
        });
})();

Input.keyMapper[87] = "up"; // w
Input.keyMapper[83] = "down"; // s
Input.keyMapper[65] = "left"; // a
Input.keyMapper[68] = "right"; // d
