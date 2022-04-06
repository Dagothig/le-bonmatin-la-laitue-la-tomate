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

function aaa_map_switch(name, value) {
    if (typeof value === "undefined") {
        return window[$gameMap._mapId + ":" + name];
    }
    window[$gameMap._mapId + ":" + name] = value;
    $gameMap.requestRefresh();
}

function aaa_jump(e, x, y, h) {
    e.jump(x, y);
    e._jumpPeak += h;
    e._jumpCount = e._jumpPeak * 2;
}

(function () {
    var aaaExtend = /\[aaa_extend (.*)\]/;
    var original_onLoad = DataManager.onLoad;
    DataManager.onLoad = function (object) {
        original_onLoad.call(DataManager, object);
        if (object === $dataStates) {
            for (const state of object) {
                if (state) {
                    const extStr = (state.note.match(aaaExtend) || [])[1];
                    const ext = JSON.parse(extStr || "{}");
                    Object.assign(state, ext);
                }
            }
        }
    };

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

    var MOVE = "startMove", WIGGLE = "startWiggle", PARABOLA = "startParabola", WAIT = "startWait";

    function aaa_anim(args) {
        var i = parseInt(args[0]) || 0;
        var anim = args[1];
        var sprite = $gameTroop.members()[i]._sprite;
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
                sprite.pushMove([MOVE, -30, 0, 12]);
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
                sprite.pushMove([MOVE, -5, 30, 12]);
                break;
            case "lunge":
                sprite.pushMove([PARABOLA, 20, 0, -10, 8]);
                sprite.pushMove([MOVE, 0, 0, 3]);
                break;
        }
    }

    var original_pluginCommand = Game_Interpreter.prototype.pluginCommand;
    Game_Interpreter.prototype.pluginCommand = function (command, args) {
        original_pluginCommand.call(this, command, args);

        if (command === "aaa_anim") {
            aaa_anim(args);
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

    var noteRegexp = /\[aaa_anim (.*)\]/;
    var original_performActionStart = Game_Enemy.prototype.performActionStart;
    Game_Enemy.prototype.performActionStart = function (action) {
        original_performActionStart.call(this, action);
        var item = action.item();
        var note = item && item.note || "";
        var match = note.match(noteRegexp);
        var args = match && match[1];
        if (args) {
            args = args.split(" ");
            switch (args[0]) {
                case "self":
                    args[0] = action._subjectEnemyIndex;
                    break;
                case "target":
                    args[0] = action._targetIndex;
                    break;
            }
            aaa_anim(args);
        }
    }
})();
