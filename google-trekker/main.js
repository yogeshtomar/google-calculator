/*
Copyright (C) 2006 Google Inc.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

     http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

/**
 * @fileoverview Main JS file of Trekker gadget. Manages planet animation,
 * StarDate conversions, the gadget's context menu and options, and initiates
 * retrieval of the RSS feeds.
 *
 * This file is meant to run as part of the Trekker Google Desktop gadget,
 * in Google Desktop version 4 OOB (6/27) or later.
 */

// Total number of planet images, named planet0.png through planet(N-1).png
var UI_NUM_PLANETS = 9;

// StarDate traits (algorithm parameters) for two popular types of StarDates
var STARDATE_TRAITS = [
  { // TNG: The Next Generation
    'name' : strings.DATE_TYPE_TNG,
    'epoch' : new Date(2323, 0, 1).getTime(),
    'unit' : 31556952, // ms/date
    'issue' : 21,
    'width' : 5,
    'modulus' : 100000
  },
  { // TOS: The Original Series
    'name' : strings.DATE_TYPE_TOS,
    'epoch' : new Date(2162, 0, 4).getTime(),
    'unit' : 17280000, // ms/date
    'issue' : 0,
    'width' : 4,
    'modulus' : 10000
  }
];

// Interval for cycling to a new planet texture.
var UI_NEW_PLANET_INTERVAL = 4000;

// Duration of planet to planet fade animation. Don't set this too high
// because CPU usage maxes out during this time.
var UI_PLANET_ANIMATION_DURATION = 1000;

// Default options
options.defaultValue('sd_type') = 0; // TNG
options.defaultValue('sd_with_issue') = false;
options.defaultValue('sd_with_time') = true;

// Custom plugin context menu
pluginHelper.onAddCustomMenuItems = MAIN_menuAddCustomItems;

/**
 * Creates a function that, when called, sets a particular option and refreshes
 * the gadget UI. The returned function's signature is suitable for the last
 * argument of menu.AddItem.
 *
 * @param {String} name The name (key) of the option to be set
 * @param {Variant} value The value to assign to the option
 * @return {Function} Closure that sets a particular option and refreshes the UI
 */
function MAIN_createOptionSetter(name, value) {
  return function () {
    options.PutValue(name, value);
    MAIN_dateUpdate();
    RSS_updateDisplay();
  };
}

/**
 * Handler that generates the gadget's context menu.
 *
 * @param {Object} menu Menu object provided by Google Desktop
 */
function MAIN_menuAddCustomItems(menu) {
  var menuDateType = menu.AddPopup(strings.MENU_DATE_TYPE);
  var sdType = options.GetValue('sd_type');
  for(var i = 0; i < STARDATE_TRAITS.length; i++) {
    menuDateType.AddItem(STARDATE_TRAITS[i].name,
        sdType == i ? gddMenuItemFlagChecked : 0,
        // Force closure to reference a copy of the _current_ i
        MAIN_createOptionSetter('sd_type', i));
  }
  menu.AddItem('', 0x800 /* MF_SEPARATOR */, null);
  menu.AddItem(strings.MENU_WITH_ISSUE,
      options.GetValue('sd_with_issue') ? gddMenuItemFlagChecked : 0,
      MAIN_createOptionSetter('sd_with_issue',
        !options.GetValue('sd_with_issue')));
  menu.AddItem(strings.MENU_WITH_TIME,
      options.GetValue('sd_with_time') ? gddMenuItemFlagChecked : 0,
      MAIN_createOptionSetter('sd_with_time',
        !options.GetValue('sd_with_time')));
  menu.AddItem('', 0x800 /* MF_SEPARATOR */, null);
  menu.AddItem(strings.MENU_GOOGLE_SEARCH, 0, function () {
        new ActiveXObject('WScript.Shell').
          Run('http://www.google.com/intl/xx-klingon/');
      } );
}

/**
 * Handler for the view::onopen event. Initializes the UI, starts background
 * timers for planet animation, date updates and RSS feeds.
 *
 * Name is prefixed with "_" because function is referenced in main.xml.
 */
function _MAIN_viewOnOpen() {
  view.setInterval(MAIN_planetCycle, UI_NEW_PLANET_INTERVAL);
  view.setInterval(MAIN_dateUpdate, 1000);
  MAIN_dateUpdate();
  
  // Start retrieving RSS feeds
  RSS_start();
}

// Index of current planet image
var MAIN_planetIndex = 0;

/**
 * Timer handler for skipping to the next planet image.
 */
function MAIN_planetCycle() {
  // Prepare overlay with next image
  MAIN_planetIndex = (MAIN_planetIndex + 1) % UI_NUM_PLANETS;
  planet_overlay.src = 'planet' + MAIN_planetIndex + '.jpg';
  planet_overlay.opacity = 0;
  
  // Begin fading in the overlay
  view.beginAnimation(MAIN_planetFade, 0, 255, UI_PLANET_ANIMATION_DURATION);
}

/**
 * Animation handler for smoothly transitionning between planet images.
 */
function MAIN_planetFade() {
  // Set overlay opacity
  planet_overlay.opacity = event.value;
  
  // If finished...
  if (event.value == 255) {
    // Prepare regular image
    planet.src = planet_overlay.src;
    
    // Hide the overlay
    planet_overlay.opacity = 0;
  }
}

/**
 * Utility function for padding a string with 0's to the left to a specified
 * length.
 *
 * @param {String} str The string to pad
 * @param {Integer} length Length goal
 * @return {String} The padded string
 */
function MAIN_zeroPadString(str, length) {
  while (str.length < length) {
    str = '0' + str;
  }
  return str;
}

/**
 * Utility function to generate a StarDate string from a Date object.
 *
 * @param {Date} now The date object to format as a StarDate
 * @param {String} timeSep The string to use as a time separator
 * @param {String} lineSep The string to use as a line separator
 * @return {String} The formatted StarDate
 */
function MAIN_starDate(now, timeSep, lineSep) {
  // Get traits based on user's preferences
  var traits = STARDATE_TRAITS[options.GetValue('sd_type')];
  
  // Calculate number of ms since SD epoch
  var rawSD = (now.getTime() - traits.epoch) / traits.unit;
  
  // Cache modulus used by this type of SD (i.e., largest SD + 1)
  var mod = traits.modulus;
  
  // Calculate SD issue
  var issue = traits.issue + Math.floor(rawSD / mod);

  // Calculate SD part
  var sd = rawSD % mod;
  if (sd < 0) {
    sd += mod;
  }
  
  // Stringify based on user's preferences
  var issue = options.GetValue('sd_with_issue') ?
      '[' + issue + ']' + lineSep : '';
  var stardate = MAIN_zeroPadString(sd.toFixed(2), traits.digits + 3);
  var time = options.GetValue('sd_with_time') ? lineSep +
      MAIN_zeroPadString(now.getHours().toString(), 2) + timeSep +
      MAIN_zeroPadString(now.getMinutes().toString(), 2) : '';
  
  return issue + stardate + time;
}

var MAIN_timeSep = '';

/**
 * Timer handler for updating the date shown above the planet.
 */
function MAIN_dateUpdate() {
  // Alternate time separator
  MAIN_timeSep = (MAIN_timeSep == ':') ? String.fromCharCode(160) : ':';
  
  // Display StarDate according to user's preferences
  var sd = MAIN_starDate(new Date(), MAIN_timeSep, '\r\n');
  date.innerText = sd;
  date_below.innerText = sd;
}
