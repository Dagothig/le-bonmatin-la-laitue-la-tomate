/*
The MIT License (MIT)

Copyright (c) 2017 Tor Damian Lorentzen

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/
var Imported = Imported || {}; Imported.TDDP_PreloadManager = true;
var TDDP = TDDP || {}; TDDP.PreloadManager = { config: {
startupPreload: [ // !! Do not edit this line !!
//-----------------------------------------------------------------------------
// Files to preload upon startup
//-----------------------------------------------------------------------------
// "audio/se/001-System01.ogg", // Individual files
//	"img/sv_actors",            // Folders too; no trailing slash
], // !! Do not edit this line !!
//-----------------------------------------------------------------------------
// Files to preload upon startup that will NEVER be unloaded from memory
//-----------------------------------------------------------------------------
startupPreloadPermanent: [ // TODO Not yet implemented
  // "audio/se/002-System02.ogg",
],
//-----------------------------------------------------------------------------
// Folders to index when testing your game
//-----------------------------------------------------------------------------
foldersToIndex: [
  "audio",
  "img"
],
//-----------------------------------------------------------------------------
// IGNORED FILES
// - Files that should not be indexed
//-----------------------------------------------------------------------------
ignoredFiles: [
  ".DS_Store", // OSX files often automatically generated
  "_index.json", // Created by TDDP_MouseSystemEx
],
//-----------------------------------------------------------------------------
// IGNORED FILE EXTENSIONS
// - File types that should not be indexed
//-----------------------------------------------------------------------------
ignoredExtensions: [
  "txt",
],
//-----------------------------------------------------------------------------
// Index filename
// - The index file that gets generated
//-----------------------------------------------------------------------------
indexFilename: "TDDP_PM.index",
}};
//=============================================================================
/*:
 * @plugindesc 2.0.0-RC7 Preload resources on scene/map load as well as game startup for a smoother gameplay experience.          id:TDDP_PreloadManager
 *
 * @author Tor Damian Design / Galenmereth
 *
 * @param System Audio Boot Preload
 * @desc Preload all audio files specified in the Database's System tab on game start? Default: true
 * @default true
 *
 * @param System Images Boot Preload
 * @desc Preload all default image files in the img/Systems directory on game start? Default: true
 * @default true
 *
 * @param Image Cache Limit
 * @desc The total size limit of the image cache in MB. When exceeded the least used cached files will be purged
 * @default 500
 *
 * @param Audio Cache Limit
 * @desc The total size limit of the audio cache in MB. When exceeded the least used cached files will be purged
 * @default 200
 *
 * @param Simulate Latency
 * @desc Create latency between file loads to simulate a slow connection. Value in milliseconds.
 * @default 0
 *
 * @param Print Debug to Console
 * @desc If you want to see debug information in the console (F8) set this to true. Default: true
 * @default true
 *
 * @param Print Debug Level
 * @desc The type of debug output you like to see in the console. From most to least: debug | info | warn | error
 * @default debug
 *
 * @param Startup Preload 1
 * @desc File or folder path you wish to preload on game start. All subfolders of a given folder will be preloaded too.
 * @default
 *
 * @param Startup Preload 2
 * @desc File or folder path you wish to preload on game start. All subfolders of a given folder will be preloaded too.
 *
 * @param Startup Preload 3
 * @desc File or folder path you wish to preload on game start. All subfolders of a given folder will be preloaded too.
 *
 * @param Startup Preload 4
 * @desc File or folder path you wish to preload on game start. All subfolders of a given folder will be preloaded too.
 *
 * @param Startup Preload 5
 * @desc File or folder path you wish to preload on game start. All subfolders of a given folder will be preloaded too.
 *
 * @param Startup Preload 6
 * @desc File or folder path you wish to preload on game start. All subfolders of a given folder will be preloaded too.
 *
 * @param Startup Preload 7
 * @desc File or folder path you wish to preload on game start. All subfolders of a given folder will be preloaded too.
 *
 * @param Startup Preload 8
 * @desc File or folder path you wish to preload on game start. All subfolders of a given folder will be preloaded too.
 *
 * @param Startup Preload 9
 * @desc File or folder path you wish to preload on game start. All subfolders of a given folder will be preloaded too.
 *
 * @param Startup Preload 10
 * @desc File or folder path you wish to preload on game start. All subfolders of a given folder will be preloaded too.
 *
 * @param Startup Preload 11
 * @desc File or folder path you wish to preload on game start. All subfolders of a given folder will be preloaded too.
 *
 * @param Startup Preload 12
 * @desc File or folder path you wish to preload on game start. All subfolders of a given folder will be preloaded too.
 *
 * @param Startup Preload 13
 * @desc File or folder path you wish to preload on game start. All subfolders of a given folder will be preloaded too.
 *
 * @param Startup Preload 14
 * @desc File or folder path you wish to preload on game start. All subfolders of a given folder will be preloaded too.
 *
 * @param Startup Preload 15
 * @desc File or folder path you wish to preload on game start. All subfolders of a given folder will be preloaded too.
 */
(function($) {
  "use strict";
  //=============================================================================
  // Setting up parameters
  //=============================================================================
  $.settings = {}; // Setup settings namespace object
  // Static
  $.settings.logLevels = ["error", "warn", "info", "debug"];
  $.settings.booleanCheck = function(param){return Boolean($.settings.parameters[param] === 'true' || false)};
  // Dynamic from plugin settings
  $.settings.parameters          = $plugins.filter(function(p){return p.description.contains("id:TDDP_PreloadManager")})[0].parameters;
  $.settings.preloadSystemAudio  = $.settings.booleanCheck('System Audio Boot Preload');
  $.settings.preloadSystemImages = $.settings.booleanCheck('System Images Boot Preload');
  $.settings.imageCacheLimit     = parseInt($.settings.parameters['Image Cache Limit'], 10) * 1000 * 1000; // Convert to bytes
  $.settings.audioCacheLimit     = parseInt($.settings.parameters['Audio Cache Limit'], 10) * 1000 * 1000; // Convert to bytes
  $.settings.printDebug          = $.settings.booleanCheck('Print Debug to Console');
  $.settings.logLevel            = $.settings.logLevels.indexOf(String($.settings.parameters['Print Debug Level']));
  $.settings.simulateLatency     = parseInt($.settings.parameters['Simulate Latency'], 10);
  // Startup preload aggregation
  for (var i = 1; i <= 15; i++) {
    var path = $.settings.parameters['Startup Preload ' + i];
    if (path) $.config.startupPreload.push(path);
  }
  //=============================================================================
  // asEventDispatcher functional mixin
  //=============================================================================
  $.mixins = {
    /**
     * Required instance params when mixed in
     * @param eventListeners {Array} To hold event listeners per instance
     */
    asEventDispatcher: function() {
      /**
       * Add an event listener
       * @param type {String}
       * @param eventHandler {Function}
       * @return {Integer} The listener id
       */
      this.addEventListener = function(type, eventHandler, onlyOnce) {
        var eventListener = Object();
        eventListener.type = type;
        eventListener.onlyOnce = onlyOnce;
        eventListener.eventHandler = eventHandler;

        this.eventListeners.push(eventListener);
        eventListener.id = this.eventListeners.length - 1;

        return eventListener.id;
      }
      /**
       * Remove a registered event listener tied to an event type and handler
       * @param type {String} Event type
       * @param eventHandler {Function}
       */
      this.removeEventListener = function(listenerId) {
        this.eventListeners.splice(listenerId, 1);
      }
      /**
       * Dispatch an event
       * @param event {String} Type of event to dispatch
       *
       * This uses filter and then a forEach to counter the problem where calling
       * removeEventListener whilst dispatchEvent is looping through array causes it to
       * possibly "skip" a valid event.
       */
      this.dispatchEvent = function(event) {
        this.eventListeners.filter(function(eventListener) {
          return eventListener.type == event.type;
        }.bind(this)).forEach(function(eventListener) {
          eventListener.eventHandler(event);
          if (eventListener.onlyOnce) this.eventListeners.splice(eventListener.id, 1);
        }.bind(this));
      }
    }
  };
  //=============================================================================
  // Array extension
  // Credits: http://stackoverflow.com/a/5306832
  //=============================================================================
  Array.prototype.move = function (old_index, new_index) {
    if (new_index >= this.length) {
        var k = new_index - this.length;
        while ((k--) + 1) {
            this.push(undefined);
        }
    }
    this.splice(new_index, 0, this.splice(old_index, 1)[0]);
    return this; // for testing purposes
  };
  //=============================================================================
  // Noinit_Spriteset_Battle extension
  // Used to get battleback names dynamically but without instantiating load
  //=============================================================================
  function Noinit_Spriteset_Battle() {this.initialize.apply(this, arguments);}
  Noinit_Spriteset_Battle.prototype = Object.create(Spriteset_Battle.prototype);
  Noinit_Spriteset_Battle.prototype.constructor = Spriteset_Battle;
  Noinit_Spriteset_Battle.prototype.initialize = function(){};
  //=============================================================================
  // Helper methods
  //=============================================================================
  $.helper = {
    /**
     * Get the current full project path
     * @static
     * @return {String}
     */
    projectPath: function() {
      if(!this.projectPathVar) {
        var path = window.location.pathname.replace(/\/[^\/]*$/, "/");
        if (path.match(/^\/([A-Z]\:)/)) {
            path = path.slice(1);
        }
        this.projectPathVar = decodeURIComponent(path);
      }
      return this.projectPathVar;
    },
    /**
     * Get the full path to the index file
     * @static
     * @return {String}
     */
    indexFilePath: function() {
      if (!this.indexFilePathVar) {
        this.indexFilePathVar = $.config.indexFilename;
      }
      return this.indexFilePathVar;
    },
    /**
     * Transform bytes to mB
     * @param bytes {Integer}
     * @return {Integer}
     */
    toMB: function(bytes) {
      return Math.floor(this.toKB(bytes) / 1000);
    },
    /**
     * Transform bytes to kB
     * @param bytes {Integer}
     * @return {Integer}
     */
    toKB: function(bytes) {
      return Math.floor(bytes / 1000);
    },
    /**
    * Log helper with check whether printDebug is enabled in plugin settings
    * @static
    * @return Void
    */
    log: function() {
      var args = Array.prototype.slice.call(arguments, 0)

      var logIndex = $.settings.logLevels.indexOf(args[0]);
      if (logIndex >= 0) {
        args.shift(); // Delete log level if present
      } else {
        logIndex = 3;
      }
      if ($.settings.logLevel < logIndex) return;

      if ($.settings.printDebug) console.log( ["PreloadManager " + ($.settings.logLevels[logIndex].slice() + "     ").substring(0, 5) + " ›"].concat(args).join(" ") )
    },
    /**
    * Helper to check whether preloading should be skipped depending on environment
    * @static
    * @return {Boolean}
    */
    skipPreloading: function() {
      if (DataManager.isEventTest()) return true;
    },
    /**
     * Check if in dev mode
     * @static
     * @return {Boolean}
     */
    isDevMode: function() {
      return (StorageManager.isLocalMode() && Utils.isOptionValid('test'));
    },
    /**
     * Check if in prod mode
     * @static
     * @return {Boolean}
     */
    isProdMode: function() {
      return !this.isDevMode();
    },
    /**
     * Transform a local project path to a full path
     * @static
     * @return {String} Full path
     */
    localToFullPath: function(localPath) {
      return [this.projectPath(), localPath].join("/");
    },
  };

  //=============================================================================
  // Skip preloading if flags are true
  //=============================================================================
  if ($.helper.skipPreloading()) return;
  //=============================================================================
  // Development only functionality
  //=============================================================================
  $.dev = {
    /**
    * Provides node filesystem access if in local dev mode
    * @static
    * @var fs
    */
    fs: $.helper.isDevMode() ? require("fs") : false,
    /**
    * Check the existence of a given file
    * @static
    * @param folder {String} The folder path with trailing /
    * @param filename {String} The filename without file extension
    * @param extension {String} The file extension including .
    * @return {Boolean}
    */
    controlFileExistence: function(folder, filename, extension) {
      var path = this.helper.projectPath() + folder + filename + extension;
      return $.dev.fs.existsSync(path);
    },
    /**
     * Crawl and write folder contents to an index object
     * @static
     * @param localPath {String} The full local path to the folder/file, i.e audio/bgm
     * @param index {Object} The object to write the index to
     * @return {Object} Returns the index object
     */
    crawlAndGetFolderContents: function(localPath, index) {
      var fullPath = $.helper.localToFullPath(localPath);

      // Get list of files / folders filtered
      var list = $.dev.fs.readdirSync(fullPath).filter(function(f) {
        return $.dev.validFile(f);
      });

      // Separate files and folders
      var folders = [];
      list.forEach(function(f) {
        var _localPath = [localPath, f].join("/");
        var _fullPath = [fullPath, f].join("/");
        var stats = $.dev.fs.statSync(_fullPath);

        if (stats.isDirectory()) {
          index[f] = index[f] || {};
          var subfolderFiles = $.dev.crawlAndGetFolderContents(_localPath, index[f]);
        } else if (stats.isFile()) {
          index[f] = stats.size;
        }
      })

      return index;
    },
    /**
     * @static
     * @param f {String} File path to check for validity for indexing
     * @return {Boolean}
     */
    validFile: function(f) {
      return $.config.ignoredFiles.indexOf(f) < 0 &&
        $.config.ignoredExtensions.indexOf(f.split(".").slice(-1)[0].toLowerCase()) < 0;
    },
    /**
     * Crawl and index assets
     * @static
     */
    crawlAndIndexAllAssets: function() {
      $.helper.log("info", "====== Crawling assets and generating index file ======")
      $.helper.log("The project root path is resolved to:", $.helper.projectPath());
      $.helper.log("Directories to index:", $.config.foldersToIndex.join(", "))

      var index = {};
      $.config.foldersToIndex.forEach(function(folder) {
        $.helper.log("Crawling:", folder);
        index[folder] = {};
        $.dev.crawlAndGetFolderContents(folder, index[folder]);
      });
      $.helper.log("All crawls successful");

      // Save index file
      $.dev.fs.writeFileSync($.helper.localToFullPath($.helper.indexFilePath()), JSON.stringify(index));
      $.helper.log("Index file saved:", [$.helper.projectPath(), $.config.indexFilename].join(""));
    },
  };
  //=============================================================================
  // Queue object
  //=============================================================================
  $.queue = { // Queue specific functions and vars
    /**
     * The queue of preloadObjects
     * @static
     * @var {Array}
     */
    preloadObjects: [],
    /**
     * The total queued filesize to load (in Bytes)
     * @static
     * @var {Integer}
     */
    sizeTotal: 0,
    /**
     * The loaded filesize so far (in Bytes)
     * @static
     * @var {Integer}
     */
    sizeLoaded: 0,
    /**
     * Reset queue
     * @static
     */
    reset: function() {
      this.preloadObjects = [];
      this.sizeTotal      = 0;
      this.sizeLoaded     = 0;
    }
  };
  //=============================================================================
  // Cache object
  //=============================================================================
  $.cache = {
    /**
     * @static
     * @var preloadedObjects {Array} The cache array
     */
    preloadedObjects: [],
    /**
     * @static
     * @var audioBytesTotal {Integer} The bytes total of audio objects in cache
     */
    audioBytesTotal: 0,
    /**
     * @static
     * @var imageBytesTotal {Integer} The bytes total of image objects in cache
     */
    imageBytesTotal: 0,
    /**
     * Add a given PreloadObject to the cache
     * @static
     * @param preloadObject {PreloadObject}
     */
    addPreloadObject: function(preloadObject) {
      if (preloadObject.isAudio()) {
        this.audioBytesTotal += preloadObject.fileSize;
      } else {
        this.imageBytesTotal += preloadObject.fileSize;
      }
      this.preloadedObjects.unshift(preloadObject);
    },
    /**
     * Remove a given PreloadObject from the cache
     * @static
     * @param preloadObject {PreloadObject}
     * @return {PreloadObject} or {Boolean} if false
     */
    removePreloadObject: function(preloadObject) {
      var index = this.preloadedObjects.indexOf(preloadObject);
      if (!preloadObject.garbageCollectable) return false;
      if (index >= 0) {
        if (preloadObject.isAudio()) {
          this.audioBytesTotal -= preloadObject.fileSize;
        } else {
          this.imageBytesTotal -= preloadObject.fileSize;
        }
        return this.preloadedObjects.splice(index, 1);
      } else {
        return false;
      }
    },
    /**
     * Check if a given file path is in the cache
     * @static
     * @return {Boolean}
     */
    hasPath: function(localPath) {
      return $.cache.retrieveFromPath(localPath) != null;
    },
    /**
     * Retrieve cache object (if exists) from a given local path. Also moves it to
     * the front of the array for freshness™
     * @static
     * @return {PreloadObject} or {null}
     */
    retrieveFromPath: function(localPath) {
      var localPath = decodeURIComponent(localPath);
      for (var i = 0; i < this.preloadedObjects.length; i++) {
        if (this.preloadedObjects[i].path == localPath) {
          this.preloadedObjects.move(i, 0);
          return this.preloadedObjects[0];
        }
      }
      return null;
    },
    /**
     * Retrieve audio objects in cache
     * @return {Array} of {PreloadObject}s
     */
    retrieveAudioObjects: function() {
      return this.preloadedObjects.filter(function(preloadObject) {
        return preloadObject.isAudio();
      });
    },
    /**
     * Retrieve image objects in cache
    * @return {Array} of {PreloadObject}s
     */
    retrieveImageObjects: function() {
      return this.preloadedObjects.filter(function(preloadObject) {
        return preloadObject.isImage();
      });
    },
  }
  //=============================================================================
  // Main functionality
  //=============================================================================
  $.mixins.asEventDispatcher.call($); // Act as EventDispatcher
  /**
   * Event listeners attached. Required for asEventDispatcher mixin
   * @static
   * @var eventListeners {Array}
   */
  $.eventListeners = [];
  /**
   * List of events this object can dispatch
   * @static
   * @var events {Object}
   */
  $.events = {
    onPreloadStart:    "preloadStart",
    onPreloadLoad:     "preloadLoad",
    onPreloadProgress: "preloadProgress",
    onPreloadError:    "preloadError",
    onPreloadAbort:    "preloadAbort",
    onIndexLoad:       "indexLoad",
  }
  /**
  * @static
  * @private
  * @var _preloadActive {Boolean}
  */
  $._preloadActive = false;
  /**
   * Get indexed data for a given file path
   * @static
   * @param path {String} Local path to file
   */
  $.getFileIndexData = function(path) {
    var split = path.split("/");
    var fileData = $.indexFile;
    var valid = true;
    split.forEach(function(element) {
      try {
        fileData = fileData[element];
      }
      catch (e) {
        valid = false;
      }
    });
    if (valid) {
      return fileData;
    } else {
      return false;
    }
  }
  /**
   * Perform the boot/startup preload procedure
   * @static
   */
  $.preloadBoot = function() {
    if (!$dataSystem) return setTimeout($.preloadBoot.bind(this), 5);
    $.helper.log("info", "====== Indexing startup files ======");
    // Default system preloads if enabled
    if ($.settings.preloadSystemImages) {
      ["Window",
      "IconSet",
      "Balloon",
      "Shadow1",
      "Shadow2",
      "Damage",
      "States",
      "Weapons1",
      "Weapons2",
      "Weapons3",
      "ButtonSet"].forEach(function(image) {
        $.queueImageFileForPreload("system", image);
      });
    };
    // Preload all System audio if enabled
    if ($.settings.preloadSystemAudio) {
      $dataSystem.sounds.forEach(function(sound) {
        if (sound.name) $.queueAudioFileForPreload("se", sound.name);
      })
    }
    // User config
    $.queueFilesForPreload($.config.startupPreload);
    $.queueFilesForPreload($.config.startupPreloadPermanent, false);
    // Preload system data
    if ($dataSystem.title1Name) $.queueImageFileForPreload("titles1", $dataSystem.title1Name);
    if ($dataSystem.title2Name) $.queueImageFileForPreload("titles2", $dataSystem.title2Name);
    if ($dataSystem.titleBgm.name) $.queueAudioFileForPreload("bgm", $dataSystem.titleBgm.name);
    // Perform
    $.performPreload();
  }
  /**
   * Queues an array of file paths for preload
   * @static
   * @param filesArray {Array} Array of strings
   * @param garbageCollectable {Boolean}
   */
  $.queueFilesForPreload = function(filesArray, garbageCollectable) {
    var fileIndexData = null;
    filesArray.forEach(function(path) {
      fileIndexData = $.getFileIndexData(path);
      if (fileIndexData) {
        if (isNaN(fileIndexData)) {
          // If folder, add folder contents
          var files = Object.keys(fileIndexData).map(function(f) {
            return [path, f].join("/");
          });
          $.queueFilesForPreload(files, garbageCollectable);
        } else {
          $.queueFileForPreload(path, garbageCollectable);
        }
      }
    });
  };
  /**
   * Queue a path to a file for preload
   * @static
   * @param localPath {String}
   * @param garbageCollectable {Boolean}
   * @return {PreloadObject} or {null}
   */
  $.queueFileForPreload = function(localPath, garbageCollectable) {
    garbageCollectable = typeof garbageCollectable !== 'undefined' ? garbageCollectable : true;
    var localPath = decodeURIComponent(localPath);
    var fileIndexData = $.getFileIndexData(localPath);
    if (fileIndexData) {
      return $.addToPreloadQueue(new PreloadObject(
        localPath,
        $.getFileIndexData(localPath),
        garbageCollectable
      ));
    } else {
      $.helper.log("warn", "File not found in index:", localPath);
      return null;
    }
  }
  /**
   * Queue audio file for preload.
   * @static
   * @param type {String} Type of audio. Corresponds to subfolders in audio/
   * @param title {String} The audio file without extension
   * @param garbageCollectable {Boolean}
   * @return {PreloadObject}
   */
  $.queueAudioFileForPreload = function(type, title, garbageCollectable) {
    return $.queueFileForPreload(["audio", type, title].join("/") + AudioManager.audioFileExt(), garbageCollectable);
  }
  /**
   * Queue image file for preload.
   * @static
   * @param type {String} Type of image. Corresponds to subfolders in img/
   * @param title {String} The image file without extension
   * @param garbageCollectable {Boolean}
   * @return {PreloadObject}
   */
  $.queueImageFileForPreload = function(type, title, garbageCollectable) {
    return $.queueFileForPreload(["img", type, title].join("/") + ".png", garbageCollectable);
  }
  /**
   * Queue tileset images for preload by a given tileset id
   * @static
   * @param id {Integer} Tileset id
   * @param garbageCollectable {Boolean}
   */
  $.queueTilesetsForPreloadById = function(id, garbageCollectable) {
    var tileset = $dataTilesets[id];
    if (!tileset) return $.helper.log("warn", "Tileset id", id, "referenced in event but not found in database. Skipping!");
    var files = [];
    tileset.tilesetNames.forEach(function(file) {
      files.push("img/tilesets/" + file + ".png");
    });
    $.queueFilesForPreload(files, garbageCollectable);
  }
  /**
   * Queue animation images and audio for preload by a given animation id
   * @static
   * @param id {Integer} Animation id
   * @param garbageCollectable {Boolean}
   */
  $.queueAnimationForPreload = function(id, garbageCollectable) {
    var animation = $dataAnimations[id];
    if (!animation) return $.helper.log("warn", "Animation id", id, "referenced in event but not found in database. Skipping!");
    if (animation.animation1Name) $.queueImageFileForPreload("animations", animation.animation1Name, garbageCollectable);
    if (animation.animation2Name) $.queueImageFileForPreload("animations", animation.animation2Name, garbageCollectable);
    animation.timings.forEach(function(timing) {
      if (timing.se) $.queueAudioFileForPreload("se", timing.se.name, garbageCollectable);
    });
  }
  /**
   * Queue a sideview weapon image collection for preload by a given wtypeId
   * @static
   * @param wtypeId {Integer} Weapon type ID
   * @param garbageCollectable {Boolean}
   */
  $.queueWeaponTypeForPreload = function(wtypeId, garbageCollectable) {
    var pageId = Math.floor((wtypeId - 1) / 12) + 1;
    if (pageId >= 1) $.queueImageFileForPreload("system", "Weapons" + pageId, garbageCollectable);
  };
  /**
   * Perform preload of all queued PreloadObjects
   * @static
   */
  $.performPreload = function() {
    if (!$.hasAnyInPreloadQueue()) return $.dispatchEvent(new Event($.events.onPreloadLoad));
    $.dispatchEvent(new Event($.events.onPreloadStart));
    $.helper.log("info", "====== Starting preload", "(" + $.queue.preloadObjects.length,  "files /", $.helper.toKB($.queue.sizeTotal), "kB)", "======")
    // $.helper.log("debug", "Total data size queued for preload:", $.helper.toKB($.queue.sizeTotal), "kB");
    $._preloadLooper();
  }
  /**
   * Remove the oldest cached objects if memory limits are exceeded
   * @static
   */
  $.pruneMemoryUse = function() {
    // Audio
    if ($.settings.audioCacheLimit > 0 && $.cache.audioBytesTotal > $.settings.audioCacheLimit) {
      $.helper.log("info", "====== Pruning audio cache:", $.helper.toKB($.cache.audioBytesTotal), "kB /", $.helper.toKB($.settings.audioCacheLimit), "kB used ======");
      var originalAudioBytesTotal = $.cache.audioBytesTotal;
      var files = 0;
      $.cache.retrieveAudioObjects().reverse().some(function(preloadObject) {
        if ($.cache.removePreloadObject(preloadObject)) files += 1;
        return $.cache.audioBytesTotal <= $.settings.audioCacheLimit;
      });
      $.helper.log("Pruned", files, "audio files for a total of", $.helper.toKB(originalAudioBytesTotal - $.cache.audioBytesTotal), "kB");
    }
    // Images
    if ($.settings.imageCacheLimit > 0 && $.cache.imageBytesTotal > $.settings.imageCacheLimit) {
      $.helper.log("info", "====== Pruning image cache:", $.helper.toKB($.cache.imageBytesTotal), "kB /", $.helper.toKB($.settings.imageCacheLimit), "kB used ======");
      var originalImageBytesTotal = $.cache.imageBytesTotal;
      var files = 0;
      $.cache.retrieveImageObjects().reverse().some(function(preloadObject) {
        if ($.cache.removePreloadObject(preloadObject)) files += 1;
        return $.cache.imageBytesTotal <= $.settings.imageCacheLimit;
      });
      $.helper.log("Pruned", files, "image files for a total of", $.helper.toKB(originalImageBytesTotal - $.cache.imageBytesTotal), "kB");
    }
  }
  /**
  * Add a given preloadObject to the preload queue
  * @static
  * @param preloadObject {PreloadObject}
  * @return {PreloadObject}
  */
  $.addToPreloadQueue = function(preloadObject) {
    if (!$.existsInPreloadQueue(preloadObject.path) && !$.cache.retrieveFromPath(preloadObject.path)) {
      $.queue.sizeTotal += preloadObject.fileSize;
      $.helper.log("Adding to queue:", preloadObject.path);
      $.queue.preloadObjects.push(preloadObject);
    }
    return preloadObject;
  }
  /**
   * Control whether there are any {PreloadObject}s queued
   * @static
   */
  $.hasAnyInPreloadQueue = function() {
    return $.queue.preloadObjects.length > 0;
  }
  /**
   * Control whether a given local path exists in preload queue
   * @static
   * @return {Boolean}
   */
  $.existsInPreloadQueue = function(localPath) {
    return $.queue.preloadObjects.filter(function(preloadObject) {
      return preloadObject.path == localPath;
    }).length > 0
  }
  /**
   * Preload a given file immediately and add to cache
   * @static
   * @return {PreloadObject}
   */
   $.loadImmediately = function(localPath) {
     var localPath = decodeURIComponent(localPath);
     var fileIndexData = $.getFileIndexData(localPath);
     if (fileIndexData) {
       var preloadObject = new PreloadObject(
         localPath,
         fileIndexData
       );
       $.cache.addPreloadObject(preloadObject);
       preloadObject.load();
       return preloadObject;
     } else {
       $.helper.log("warn", "File not found in index:", localPath);
       return null;
     }
   }
  /**
   * Load the index file
   * @static
   */
  $.preloadCurrentMap = function() {
    $.helper.log("info", "====== Indexing map:", $.mapInfo().name, "========");
    // Preload system vehicles
    if ($dataSystem.airship.characterName) $.queueImageFileForPreload("characters", $dataSystem.airship.characterName);
    if ($dataSystem.boat.characterName)    $.queueImageFileForPreload("characters", $dataSystem.boat.characterName);
    if ($dataSystem.ship.characterName)    $.queueImageFileForPreload("characters", $dataSystem.ship.characterName);
    // Preload map specific data
    if ($dataMap.bgs.name)        $.queueAudioFileForPreload("bgs", $dataMap.bgs.name);
    if ($dataMap.parallaxName)    $.queueImageFileForPreload("parallaxes", $dataMap.parallaxName);
    if ($dataMap.tilesetId)       $.queueTilesetsForPreloadById($dataMap.tilesetId);
    if ($dataMap.bgm.name && !AudioManager.shouldUseHtml5Audio()) $.queueAudioFileForPreload("bgm", $dataMap.bgm.name);
    // Battlebacks
    $.indexBattlebacks();
    // Load party
    $.indexGameParty($gameParty._actors)
    // Cycle events and load appropriate resources
    $dataMap.events.forEach(function(event) {
      if (event) {
        $.helper.log("debug", "~ Crawling event id:", event.id, "| Name:", event.name);
        $.indexEventPages(event.pages);
      };
    });
    $.performPreload();
  }
  /**
   * Preload the current battle scene
   */
  $.preloadBattle = function() {
    var dataTroop = $dataTroops[$gameTroop._troopId];
    $.helper.log("info", "====== Indexing battle:", dataTroop.name, "========");
    // Battlebacks
    $.indexBattlebacks();
    // Index different data structures
    $.indexEventPages(dataTroop.pages);
    $.indexBattleMembers(dataTroop.members);
    $.indexGameActors();
    // Perform
    $.performPreload();
  }
  /**
   * Index battlebacks
   * @static
   */
  $.indexBattlebacks = function() {
    var tempSpritesetBattle = new Noinit_Spriteset_Battle();
    for (var i = 1; i <= 2; i++) {
      if (tempSpritesetBattle["battleback" + i + "Name"]()) {
        $.queueImageFileForPreload("battlebacks" + i, tempSpritesetBattle["battleback" + i + "Name"]());
      } else if (!BattleManager.isBattleTest() && tempSpritesetBattle["normalBattleback" + i + "Name"]()) {
        $.queueImageFileForPreload("battlebacks" + i, tempSpritesetBattle["normalBattleback" + i + "Name"]());
      } else if (tempSpritesetBattle["terrainBattleback" + i + "Name"]()) {
        $.queueImageFileForPreload("battlebacks" + i, tempSpritesetBattle["terrainBattleback" + i + "Name"]())
      };
    }
  }
  /**
   * Index $gameParty object
   * @static
   */
  $.indexGameParty = function() {
    $gameParty._actors.forEach(function(id) {
      $.indexGameActor($gameActors._data[id]);
    })
  }
  /**
   * Index $gameActors object
   * @static
   */
  $.indexGameActors = function() {
    $gameActors._data.forEach(function(gameActor) {
      $.indexGameActor(gameActor);
    });
  }
  /**
   * Index a Game_Actor object
   * @param gameActor {Game_Actor}
   * @static
   */
  $.indexGameActor = function(gameActor) {
    if (!gameActor) return;
    if ($gameSystem.isSideView()) {
      if (gameActor._battlerName)   $.queueImageFileForPreload("sv_actors", gameActor._battlerName);
    }
    if (gameActor._characterName) $.queueImageFileForPreload("characters", gameActor._characterName);
    if (gameActor._faceName)      $.queueImageFileForPreload("faces", gameActor._faceName);

    gameActor._animations.forEach(function(animationId) {
      $.queueAnimationForPreload(animationId);
    });

    gameActor._skills.forEach(function(skillId) {
      $.queueAnimationForPreload($dataSkills[skillId].animationId);
    })

    gameActor._equips.forEach(function(gameItem) {
      if (gameItem._dataClass && gameItem._itemId > 0) {
        var itemData = gameItem._dataClass ==  "weapon" ? $dataWeapons : $dataArmors;
        var item = itemData[gameItem._itemId];
        if (item.animationId) $.queueAnimationForPreload(item.animationId);
        if ($gameSystem.isSideView()) {
          $.queueWeaponTypeForPreload(item.wtypeId);
        }
      }
    });
  }
  /**
   * Index Move Route
   * @param moveRoute {Object}
   * @static
   */
  $.indexMoveRoute = function(moveRoute) {
    moveRoute.list.forEach(function(listEntry) {
      var p = listEntry.parameters;
      switch (listEntry.code) {
        // Change Image
        case 41:
          if (p[0]) $.queueImageFileForPreload("characters", p[0]);
          break;
        // Play SE
        case 44:
          if (p[0]) $.queueAudioFileForPreload("se", p[0].name);
          break;
      }
    });
  }
  /**
   * Index given event pages
   * @param pages {Array} Array of event page objects
   * @static
   */
  $.indexEventPages = function(pages) {
    pages.forEach(function(page) {
      if (page.moveRoute && page.moveType == 3) $.indexMoveRoute(page.moveRoute); // If not 3, the page moveRoute is disabled
      if (page.image && page.image.characterName) $.queueImageFileForPreload("characters", page.image.characterName);
      $.indexEventList(page.list);
    });
  }
  /**
   * Index an event list
   * @param list {Object} A list of event entries
   * @static
   */
  $.indexEventList = function(list) {
    list.forEach(function(listEntry) {
      var p = listEntry.parameters;
      switch(listEntry.code) {
        // Common Event
        case 117:
          var commonEvent = $dataCommonEvents[p[0]];
          if (commonEvent) $.indexEventList(commonEvent.list)
          break;
        // Move Route
        case 205:
        case 505:
          if (p[1]) $.indexMoveRoute(p[1]);
          break;
        // Show Picture
        case 231:
          if (p[1]) $.queueImageFileForPreload("pictures", p[1]);
          break;
        // Play / Change BGM
        case 132:
        case 241:
          if (p[0]) $.queueAudioFileForPreload("bgm", p[0].name);
          break;
        // Play BGS
        case 245:
          if (p[0]) $.queueAudioFileForPreload("bgs", p[0].name);
          break;
        // Play ME
        case 249:
          if (p[0]) $.queueAudioFileForPreload("me", p[0].name);
          break;
        // Play SE
        case 250:
          if (p[0]) $.queueAudioFileForPreload("se", p[0].name);
          break;
        // Change Parallax
        case 284:
          if (p[0]) $.queueImageFileForPreload("parallax", p[0]);
          break;
        // Show Text
        case 101:
          if (p[0]) $.queueImageFileForPreload("faces", p[0]);
          break;
        // Show Animation
        case 212:
          if (p[1]) $.queueAnimationForPreload(p[1]);
          break;
      }
    });
  }
  /**
   * Index given battle members
   * @param members {Array} Array of battle member objects
   */
  $.indexBattleMembers = function(members) {
    var prefix = $gameSystem.isSideView() ? "sv_" : "";
    members.forEach(function(member) {
      $.queueImageFileForPreload(prefix + "enemies", $dataEnemies[member.enemyId].battlerName);
    });
  }
  /**
   * Accessor for curent map info
   * @return {Object} The map info for the current active map id
   */
  $.mapInfo = function() {
    return $dataMapInfos[$.currentMapId];
  }
  /**
   * Get percentage of queued files currently loaded
   * @static
   */
  $.percentLoaded = function() {
    var num = $.sizeLoaded() / $.sizeTotal();
    if (isNaN(num)) return 0;
    if (num > 1) return 100; // Sometimes sizeLoaded is larger because... Reasons
    return Math.floor(num * 100);
  };
  /**
   * Get size total of queued files (in Bytes)
   * @static
   * @return {Integer}
   */
  $.sizeTotal = function() {
    return this.queue.sizeTotal || 0;
  }
  /**
   * Get size of loaded data (in Bytes)
   * @static
   * @return {Integer}
   */
  $.sizeLoaded = function() {
    return this.queue.sizeLoaded || 0;
  }
  /**
   * Check if currently loading data
   * @return {Boolean}
   */
  $.isLoading = function() {
    return this._preloadActive && this.sizeLoaded() != this.sizeTotal();
  }
  /**
   * Retrieve and remove the first {PreloadObject} in queue
   * @private
   * @static
   */
  $._getAndRemoveFirstInPreloadQueue = function() {
    return $.queue.preloadObjects.shift();
  }
  /**
   * Load the index file
   * @static
   */
  $.loadIndexFile = function() {
    var xhr = new XMLHttpRequest();
    var url = $.helper.indexFilePath();
    xhr.open('GET', url);
    xhr.overrideMimeType('application/json');
    xhr.onload = function() {
      if (xhr.status < 400) {
        $.indexFile = JSON.parse(xhr.responseText);
        $.helper.log("Successfully loaded index file.");
        $.dispatchEvent(new Event($.events.onIndexLoad));
      }
    };
    xhr.onerror = function() {
        throw new Error("Could not load TDDP.PreloadManager index file.");
    };
    xhr.send();
  }
  /**
   * Preload loop function
   * @private
   * @static
   */
  $._preloadLooper = function() {
    if ($._preloadActive) return; // Only one queue at a time
    $._preloadActive = true;
    if ($.hasAnyInPreloadQueue()) {
      var loadedAccu = 0;
      var preloadObject = $._getAndRemoveFirstInPreloadQueue();
      // Tick loaded
      var tickLoaded = function(evt) {
        var loaded = evt.loaded - loadedAccu; if (loaded < 0) loaded = 0;
        $.queue.sizeLoaded += loaded;
        loadedAccu += evt.loaded;
      }
      // Progress
      preloadObject.addEventListener(PreloadObject.events.onProgress, function(evt) {
        tickLoaded(evt);
        $.helper.log("debug", "Progress", [("   " + $.percentLoaded()).slice(-3), "% (", $.helper.toKB($.sizeLoaded()), " / ", $.helper.toKB($.sizeTotal()), " kB)"].join(""));
        // Fire off progress event
        $.dispatchEvent(new Event($.events.onPreloadProgress));
      });
      // On finished loading
      preloadObject.addEventListener(PreloadObject.events.onLoad, function(evt) {
        tickLoaded(evt);
        $.cache.addPreloadObject(preloadObject);
        // Load next object if any
        $._preloadActive = false;
        setTimeout($._preloadLooper.bind(this), $.settings.simulateLatency);
      });
      // Start
      preloadObject.load();
    } else {
      $._preloadActive = false;
      $.helper.log("info", "====== Preload done ======");
      // Make sure we just set sizeLoaded to total
      $.queue.sizeLoaded = $.queue.sizeTotal;
      // Fire off load event
      $.dispatchEvent(new Event($.events.onPreloadLoad));
      // All done
      $.queue.reset();
      // Perform memory prune
      $.pruneMemoryUse();
    }
  }
  //=============================================================================
  // PreloadObject
  //=============================================================================
  function PreloadObject() {
    this.initialize.apply(this, arguments);
  }
  PreloadObject.prototype = Object.create(Object.prototype);
  PreloadObject.constructor = PreloadObject;

  $.mixins.asEventDispatcher.call(PreloadObject.prototype); // Act as EventDispatcher
  /**
   * List of events this object can dispatch
   * @static
   * @var events {Object}
   */
  PreloadObject.events = {
    onLoad:     "load",
    onProgress: "progress",
    onError:    "error",
    onAbort:    "abort",
  }
  /**
   * @param path {String} Local file path
   * @param fileSize {Integer} The size of the file
   * @param garbageCollectable {Boolean}
   */
  PreloadObject.prototype.initialize = function(path, fileSize, garbageCollectable) {
    this.path               = path;
    this.garbageCollectable = garbageCollectable;
    this.fileSize           = fileSize;
    // Events
    this.onProgress         = null;
    this.onLoad             = null;
    this.onError            = null;
    this.eventListeners     = [];
    // Initialize data depending on fileType
    this._initializeData();
  };
  /**
   * Initialize loading of data object
   */
  PreloadObject.prototype.load = function() {
    switch (this.fileType) {
      case "image":
        this._loadImage();
        break;
      case "audio":
        this._loadAudio();
        break;
    }
  }
  /**
   * @return {Boolean}
   */
  PreloadObject.prototype.isAudio = function() {
    return this.fileType == "audio";
  }
  /**
   * @return {Boolean}
   */
  PreloadObject.prototype.isImage = function() {
    return this.fileType == "image";
  }
  Object.defineProperty(PreloadObject.prototype, 'data', {
    get: function() {
      return this._data;
    }
  })
  /**
   * The file extension with no leading punctuation
   * @property fileExtension
   * @type String
   */
  Object.defineProperty(PreloadObject.prototype, 'fileExtension', {
    get: function() {
      if (!this._fileExtension) {
        if (this.path.includes("audio")) {
          this._fileExtension = AudioManager.audioFileExt().slice(-3).toLowerCase();
        } else {
          this._fileExtension = this.path.split(".").slice(-1)[0].toLowerCase(); // Get last after split
        }
      };

      return this._fileExtension;
    }
  });
  /**
   * The file extension with no leading punctuation
   * @property filename
   * @type String
   */
  Object.defineProperty(PreloadObject.prototype, 'filename', {
    get: function() {
      if (!this._filename) {
        this._filename = this.path.split("/").slice(-1)[0].toLowerCase(); // Get last after split
      };
      return this._filename;
    }
  });
  /**
   * Type of file
   * @return {String} "audio" | "image" | "unknown"
   */
  Object.defineProperty(PreloadObject.prototype, 'fileType', {
    get: function() {
      if (!this._fileType) {
        switch(this.fileExtension) {
          case "ogg":
          case "m4a":
            this._fileType = "audio";
            break;
          case "png":
          case "jpg":
          case "bmp":
            this._fileType = "image";
            break;
          default:
            this._fileType = "unknown";
        }
      };

      return this._fileType;
    }
  });
  /**
   * Initialize data types
   * @private
   */
  PreloadObject.prototype._initializeData = function() {
    switch (this.fileType) {
      case "image":
        this._data = new Bitmap();
        this._data._isLoading = true;
        break;
      case "audio":
        this._data = new WebAudio(this.path, false);
        break;
    }
  }
  /**
   * Check whether Html5Audio should be used
   * @private
   * @return {Boolean}
   */
  PreloadObject.prototype._useHtml5Audio = function() {
    return Utils.isAndroidChrome() && this.path.incldes("bgm");
  }
  /**
   * Load image file
   * This requires some hackery because the Image object does not support progress
   * events. So what we do is we load the image data as a blob and then update the
   * image source directly using an xhr request. Voila, progress and bytes loaded
   * becomes available.
   * @private
   */
  PreloadObject.prototype._loadImage = function() {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', this.path, true);
    xhr.responseType = 'arraybuffer';

    xhr.onload = function(evt) {
      var mimeType = "image/" + this.fileExtension;
      var blob = new Blob([xhr.response], {type: mimeType});
      this._data._image = new Image();
      this._data._url = this.path;
      this._data._image.onload = Bitmap.prototype._onLoad.bind(this._data);
      this._data._image.onerror = Bitmap.prototype._onError.bind(this._data);
      this._data._image.src = window.URL.createObjectURL(blob);
      this.dispatchEvent(evt);
    }.bind(this);

    xhr.onprogress = this.dispatchEvent.bind(this); // Forwards evt from Bitmap
    xhr.onerror = this.dispatchEvent.bind(this); // Forwards evt from Bitmap

    xhr.send();
  }
  /**
   * Load audio file
   * @private
   */
  PreloadObject.prototype._loadAudio = function() {
    this._data.addEventListener("progress", this.dispatchEvent.bind(this));
    this._data.addEventListener("load", this.dispatchEvent.bind(this));
    this._data.addEventListener("error", this.dispatchEvent.bind(this));
    this._data._load(this.path);
  }
  //=============================================================================
  // Scene_Boot extension / overwrites
  //=============================================================================
  /**
   * Extend to perform boot preloading
   */
  var Scene_Boot_prototype_create = Scene_Boot.prototype.create;
  Scene_Boot.prototype.create = function() {
    this.__isPreloaded = false; // Needed for compatibility and waiting for DataManager
    $.addEventListener($.events.onIndexLoad, function() {
      Scene_Boot_prototype_create.call(this);
      $.preloadBoot();
    }.bind(this), true);
    $.addEventListener($.events.onPreloadLoad, function() {
      this.__isPreloaded = true;
    }.bind(this), true);
    $.loadIndexFile();
  };
  /**
   * Overwrite as preloadBoot() handles this now by user settings
   */
  Scene_Boot.prototype.loadSystemImages = function() {
    return;
  };
  /**
   * Extend to also check if preloading is completed.
   */
  var Scene_Boot_prototype_isReady = Scene_Boot.prototype.isReady;
  Scene_Boot.prototype.isReady = function() {
    return this.__isPreloaded && Scene_Boot_prototype_isReady.call(this);
  }
  //=============================================================================
  // Scene_Base extensions
  //=============================================================================
  /**
   * Extend to return false if PreloadManager is loading
   */
  var Scene_Base_prototype_isReady = Scene_Base.prototype.isReady;
  Scene_Base.prototype.isReady = function() {
    return !$.isLoading() && !$.hasAnyInPreloadQueue() && Scene_Base_prototype_isReady.call(this); // Extend so that during preloading the scene is not determined as ready
  }
  /**
   * Extend to call ImageManager.clear() on scene creation
   */
  var Scene_Base_prototype_create = Scene_Base.prototype.create;
  Scene_Base.prototype.create = function() {
    ImageManager.clear(); // Clear image hue rotation cache between scenes.
    Scene_Base_prototype_create.call(this);
  };
  //=============================================================================
  // Scene_Battle extensions
  //=============================================================================
  var Scene_Battle_prototype_create = Scene_Battle.prototype.create;
  Scene_Battle.prototype.create = function() {
    this.__isPreloaded = false; // Needed for compatibility and waiting for DataManager
    $.addEventListener($.events.onPreloadLoad, function() {
      this.__isPreloaded = true;
      Scene_Battle_prototype_create.call(this);
    }.bind(this));
    $.preloadBattle();
  }
  Scene_Battle.prototype.isReady = function() {
    return this.__isPreloaded && Scene_Base.prototype.isReady.call(this);
  }
  //=============================================================================
  // DataManager extensions
  //=============================================================================
  /**
   * Extend to provide PreloadManager with the current map id and to set a var
   * for preload completion
   */
  var DataManager_loadMapData = DataManager.loadMapData;
  DataManager.loadMapData = function(mapId) {
    this._isPreloadComplete = false;
    $.currentMapId = mapId;
    DataManager_loadMapData.call(this, mapId);
  }
  /**
   * Extend to proceed with map preload only after map JSON has been loaded
   */
  var DataManager_onLoad = DataManager.onLoad;
  DataManager.onLoad = function(object) {
    DataManager_onLoad.call(this, object);
    if (object === $dataMap) {
      $.addEventListener($.events.onPreloadLoad, function() {
        DataManager._isPreloadComplete = true;
      })
      $.preloadCurrentMap(object);
    }
  }
  /**
   * Add check for preload complete var
   */
  var DataManager_isMapLoaded = DataManager.isMapLoaded;
  DataManager.isMapLoaded = function() {
      return DataManager_isMapLoaded.call(this) && this._isPreloadComplete;
  };
  //=============================================================================
  // AudioManager extension
  //=============================================================================
  /**
   * Extended so that we return cached objects (or load to cache if cache miss)
   */
  AudioManager.createBuffer = function(folder, name) {
    var ext = this.audioFileExt();
    var url = decodeURIComponent(this._path + folder + '/' + name + ext);
    if (this.shouldUseHtml5Audio() && folder === 'bgm') {
      Html5Audio.setup(url);
      return Html5Audio;
    } else {
      var cachedPreloadObject = $.cache.retrieveFromPath(url);
      if (cachedPreloadObject) {
        $.helper.log("Cache hit:", url);
        return cachedPreloadObject.data;
      } else {
        $.helper.log("Cache miss (fetching):", url);
        var preloadObject = $.loadImmediately(url);
        if (preloadObject) {
          return preloadObject.data;
        } else {
          $.helper.log("error", "File not found:", url);
          return null;
        }
      }
    }
  };
  //=============================================================================
  // Bitmap extension
  //=============================================================================
  /**
   * Extended to use PreloadManager cache for smarter handling of bitmaps,
   * returning dupes from cache using bltImage with minimal memory footprint
   * due to MV's internal ImageManager caching
   *
   * @static
   * @method load
   * @param {String} url The image url of the texture
   * @return Bitmap
   */
  var Bitmap_load = Bitmap.load;
  Bitmap.load = function(url) {
    var url = decodeURIComponent(url);
    var cachedPreloadObject = $.cache.retrieveFromPath(url);

    var copy = function(src, target) {
      target.bltImage(src, 0, 0, src.width, src.height, 0, 0)
    }

    var dupe = function(src) {
      var target = new Bitmap(src.width, src.height);
      copy(src, target);
      return target;
    }

    if (cachedPreloadObject) {
      $.helper.log("Cache hit:", url);
      return dupe(cachedPreloadObject.data);
    } else {
      $.helper.log("Cache miss (fetching):", url);
      var preloadObject = $.loadImmediately(url);
      if (preloadObject) {
        var dupeBitmap = new Bitmap(preloadObject.data.width, preloadObject.data.height);
        preloadObject.data.addLoadListener(function() {
          copy(preloadObject.data, dupeBitmap);
        }.bind(this))
        return dupeBitmap;
      } else {
        throw new Error("File not found: " + url);
      }
    }
  };
  //=============================================================================
  // WebAudio extensions
  //=============================================================================
  /**
   * Extend the asEventDispatcher mixin to provide event listener and dispatcher
   * functionality.
   */
  $.mixins.asEventDispatcher.call(WebAudio.prototype);
  /**
   * Override so it doesn't always immediately start loading
   */
  WebAudio.prototype.initialize = function(url, loadImmediately) {
    this.eventListeners = []; // For asEventDispatcher

    loadImmediately = typeof loadImmediately !== 'undefined' ? loadImmediately : true;
    if (!WebAudio._initialized) {
      WebAudio.initialize();
    }
    this.clear();
    if (loadImmediately) this._load(url);
    this._url = url;
  };
  /**
   * Extend _load to dispatch events outwards using the asEventDispatcher interface
   * @method _load
   * @param {String} url
   * @private
   */
  WebAudio.prototype._load = function(url) {
    var url = decodeURIComponent(url);
    if (WebAudio._context) {
      var xhr = new XMLHttpRequest();
      xhr.open('GET', url);
      xhr.responseType = 'arraybuffer';
      xhr.onload = function(evt) {
        if (xhr.status < 400) {
          this._onXhrLoad(xhr);
          this.dispatchEvent(evt); // New
        }
      }.bind(this);
      xhr.onerror = function(evt) {
        this._hasError = true;
        this.dispatchEvent(evt); // New
      }.bind(this);
      xhr.onprogress = this.dispatchEvent.bind(this); // New
      xhr.send();
    }
  };
  //=============================================================================
  // Indexing and development procedures
  //=============================================================================
  if ($.helper.isDevMode()) {
    $.dev.crawlAndIndexAllAssets();
  }
})(TDDP.PreloadManager)
