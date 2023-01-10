//-----------------------------------------------------------------------------
//  Animated Splash Screens, derived from Galv's (galvs-scripts.com)
//-----------------------------------------------------------------------------
//  For: RPGMAKER MV
//  AnimatedSplashScreens.js
//-----------------------------------------------------------------------------

var Imported = Imported || {};
Imported.AnimatedSplashScreens = true;

//-----------------------------------------------------------------------------
/*:
 * @plugindesc Set up animated splash screens that show before the title screen.
 *
 * @author Dagothig, Galv - galvs-scripts.com
 *
 * @help
 *   Animated Splash Screens
 * ----------------------------------------------------------------------------
 * This plugin allows you to make animated splash screens that display before
 * the title screen. All splash images used in this plugin are taken from:
 * /img/system/
 *
 * The "Splash Images" plugin setting is where you set up all your splash
 * images and you can have as many as you like.
 * Each splash image has the following required values:
 *
 * image,timer,fade,animId
 *
 * image - the image name from /img/system/ folder
 * timer - how many frames the image will remain on the screen
 * fade - the speed the image fades in/out (lower is slower)
 * animId - the animation played (from database) when image is faded in
 *
 * You can have multiple splash images separated by "|" symbol.
 * EXAMPLE:
 * image1,150,8,3|image2,150,8,2|image3,150,8,0
 * ----------------------------------------------------------------------------
 */

function Scene_SplashScreens() {
    this.initialize.apply(this, arguments);
}

(function() {
    function centerSprite(sprite) {
        sprite.x = Graphics.width / 2;
        sprite.y = Graphics.height / 2;
        sprite.anchor.x = 0.5;
        sprite.anchor.y = 0.5;
    }

    var steps = [
        ["color", [0, 0, 0]],
        ["sound", "CoffeeBlandPre"],
        ["wait", 60],
        ["img", "CoffeeBland"],
        ["color", [72, 72, 72]],
        ["fadeIn"],
        ["wait", 15],
        ["sound", "CoffeeBland"],
        ["wait", 180],
        ["break"],
        ["fadeOut"],
        ["wait", 15],
        ["color", [0, 0, 0]],
        ["img", "gabceal-9"],
        ["fadeIn"],
        ["wait", 15],
        ["sound", "Babies"],
        ["img", "gabceal-1"],
        ["wait", 3],
        ["img", "gabceal-2"],
        ["wait", 3],
        ["img", "gabceal-3"],
        ["wait", 3],
        ["img", "gabceal-4"],
        ["wait", 3],
        ["img", "gabceal-5"],
        ["wait", 3],
        ["img", "gabceal-6"],
        ["wait", 3],
        ["img", "gabceal-7"],
        ["wait", 3],
        ["img", "gabceal-8"],
        ["wait", 3],
        ["img", "gabceal-9"],
        ["wait", 15],
        ["img", "gabceal-1"],
        ["wait", 3],
        ["img", "gabceal-2"],
        ["wait", 3],
        ["img", "gabceal-3"],
        ["wait", 3],
        ["img", "gabceal-4"],
        ["wait", 3],
        ["img", "gabceal-5"],
        ["wait", 3],
        ["img", "gabceal-6"],
        ["wait", 3],
        ["img", "gabceal-7"],
        ["wait", 3],
        ["img", "gabceal-8"],
        ["wait", 3],
        ["img", "gabceal-9"],
        ["wait", 15],
        ["break"],
        ["fadeOut"]
    ];

    var _Scene_Boot_loadSystemImages = Scene_Boot.prototype.loadSystemImages;
    Scene_Boot.prototype.loadSystemImages = function() {
        _Scene_Boot_loadSystemImages.call(this);
        for (var i in steps) {
            var step = steps[i];
            var kind = step[0];
            switch (kind) {
                case "img": ImageManager.loadSystem(step[1]); break;
            }
        }
    };

    var _Scene_Boot_start = Scene_Boot.prototype.start;
    Scene_Boot.prototype.start = function() {
        if (!DataManager.isBattleTest() && !DataManager.isEventTest()) {
            SceneManager.goto(Scene_SplashScreens);
        } else {
            _Scene_Boot_start.call(this);
        }
    };

    Scene_SplashScreens.prototype = Object.create(Scene_Base.prototype);
    Scene_SplashScreens.prototype.constructor = Scene_SplashScreens;

    Scene_SplashScreens.prototype.initialize = function() {
        Scene_Base.prototype.initialize.call(this);
    };

    Scene_SplashScreens.prototype.create = function() {
        Scene_Base.prototype.create.call(this);

        this._ticker = 0;
        this._stepIndex = 0;

        this._bgSprite = new ScreenSprite();
        this._bgSprite.opacity = 255;
        this.addChild(this._bgSprite);
        this._steps = steps.map(step => {
            switch (step[0]) {
                case "img":
                    var sprite = new Sprite(ImageManager.loadSystem(step[1]));
                    sprite.opacity = 0;
                    centerSprite(sprite);
                    this.addChild(sprite);
                    return ["img", sprite];
                default:
                    return step;
            }
        });
    };

    Scene_SplashScreens.prototype.start = function() {
        Scene_Base.prototype.start.call(this);
        SceneManager.clearStack();
    };

    Scene_SplashScreens.prototype.update = function() {
        Scene_Base.prototype.update.call(this);

        if (this._fadeDuration) {
            return;
        }

        if (Input.isTriggered('ok') || TouchInput.isTriggered('pointerdown')) {
            this._skip = true;
        };

        this._ticker--;
        while (this._skip || this._ticker < 0) {
            var step = this._steps[this._stepIndex];
            if (!step) {
                this.gotoTitleOrTest();
                return;
            }
            switch (step[0]) {
                case "img":
                    this._img && (this._img.opacity = 0);
                    this._img = step[1];
                    this._img.opacity = 255;
                    break;
                case "sound":
                    AudioManager.playSe({ name: step[1], volume: 90, pitch: 100 });
                    break;
                case "wait":
                    this._ticker = step[1];
                    break;
                case "fadeIn":
                    this.startFadeIn(this.fadeSpeed(), false);
                    break;
                case "fadeOut":
                    this.startFadeOut(this.fadeSpeed(), false);
                    break;
                case "color":
                    this._bgSprite.setColor.apply(this._bgSprite, step[1]);
                    break;
                case "break":
                    this._skip = false;
                    this._ticker = -1;
                    break;
            }
            this._stepIndex++;
        }
    };

    Scene_SplashScreens.prototype.gotoTitleOrTest = function() {
        Scene_Base.prototype.start.call(this);
        SoundManager.preloadImportantSounds();
        if (DataManager.isBattleTest()) {
            DataManager.setupBattleTest();
            SceneManager.goto(Scene_Battle);
        } else if (DataManager.isEventTest()) {
            DataManager.setupEventTest();
            SceneManager.goto(Scene_Map);
        } else {
            this.checkPlayerLocation();
            DataManager.setupNewGame();
            SceneManager.goto(Scene_Title);
            Window_TitleCommand.initCommandPosition();
        }
        this.updateDocumentTitle();
    };

    Scene_SplashScreens.prototype.updateDocumentTitle = function() {
        document.title = $dataSystem.gameTitle;
    };

    Scene_SplashScreens.prototype.checkPlayerLocation = function() {
        if ($dataSystem.startMapId === 0) {
            throw new Error('Player\'s starting position is not set');
        }
    };
})();
