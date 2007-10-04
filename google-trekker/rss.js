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
 * @fileoverview RSS reader part of the Trekker gadget. It's oriented toward
 * the gadget specifically, but with a little work can be reused in other
 * contexts.
 *
 * This file is meant to run as part of the Trekker Google Desktop gadget,
 * in Google Desktop version 4 OOB (6/27) or later. With a little work, it could
 * be modified for other uses as an RSS aggregator.
 */

// Number of RSS items to display on screen
var RSS_ITEMS_DISPLAYED = 5;

// Height, in pixels, of one RSS item
var RSS_ITEM_HEIGHT = 36;

// List of RSS URLs
var RSS_FEED_URLS = [
  'http://www.startrek.com/custom/headlines/headlines.xml',
  'http://www.trektoday.com/headlines/rss.xml',
  'http://news.google.com/news?q=William+Shatner+%22Star+Trek%22&output=rss'
];

// Expression to use when trying to match dates in RSS pubDate fields
var RSS_DATE_REGEXP = /^(\d{2})\/(\d{2})\/(\d{2})$/;

// Override feed title for Google News
var GOOGLE_NEWS_URL_PREFIX = 'http://news.google.com/';
var GOOGLE_NEWS_FEED_TITLE = 'Google News';

// How often to refresh RSS feeds - 30 minutes
var RSS_REFRESH_INTERVAL = 1800000;

// The current RSS URL being polled
var RSS_currentFeed;

// The current XMLHttpRequest object
var RSS_req = null;

// A list of most recent RSS items to be displayed
var RSS_currentItems;

/**
 * Prepares required UI elements for displaying RSS headings and starts the
 * RSS retrieval cycle.
 */
function RSS_start() {
  // Create the elements that will display the RSS items
  for (var i = 0, y = 0; i < RSS_ITEMS_DISPLAYED; i++, y += RSS_ITEM_HEIGHT) {
    // Create the item <div>
    var el = news.appendElement('<div x="0" width="100%"/>');
    el.y = y;
    el.height = RSS_ITEM_HEIGHT - 2;
    
    // Create the star <img>
    el.appendElement('<img x="0" y="1" src="color_block.png"/>');
    
    // Create the title/link <a>
    el.appendElement('<a x="10" y="0" width="200" height="15"' +
      ' font="Tahoma" size="8" trimming="character-ellipsis"' +
      ' color="#000099"/>');
    
    // Create the date <label>
    el.appendElement('<label x="115" y="14" width="90" height="16"' +
      ' font="Arial Narrow" size="8" trimming="character-ellipsis"' +
      ' color="#666666" align="right" enabled="true"/>');

    // Create the feed <a>
    el.appendElement('<a x="10" y="14" width="125" height="16"' +
      ' font="Tahoma" size="8" trimming="character-ellipsis"' +
      ' color="#7777cc"/>');
  }
  
  // Kick off asynchronous RSS feed retrieval
  view.setInterval(RSS_refresh, RSS_REFRESH_INTERVAL);
  RSS_refresh();

  // No items yet, set the divs to invisible
  RSS_updateDisplay();
}

/**
 * Timer handler that resets to the first feed and starts retrieving it.
 */
function RSS_refresh() {
  // Reset contents
  RSS_currentItems = [];
  
  // Start retrieving data
  RSS_currentFeed = 0;
  RSS_startRequest();
}

/**
 * Starts retrieving the next RSS feed (as specified by RSS_currentFeed).
 */
function RSS_startRequest() {
  // Abort any pending request
  if (RSS_req !== null) {
    try {
      RSS_req.abort();
      RSS_req = null;
    } catch(e) {
    }
  }
  
  // Try to create new request objects until one succeeds
  while (RSS_currentFeed < RSS_FEED_URLS.length) {
    RSS_req = new XMLHttpRequest();
    RSS_req.onreadystatechange = RSS_onReadyStateChange;
    
    try {
      RSS_req.open('GET', RSS_FEED_URLS[RSS_currentFeed], true);
      RSS_req.send();
      
      // No exception, therefore success, wait for data to come in
      break;
    } catch(e) {
      // Just try again with next feed
      RSS_currentFeed++;
    }
  }
}

/**
 * XMLHttpRequest state change handler that passes the RSS XML document to
 * the parser and continues on to the next feed.
 */
function RSS_onReadyStateChange() {
  if (RSS_req.readyState == 4) {
    // Parse the response and destroy request object
    RSS_parse(RSS_req.responseXML);
    RSS_req = null;
    
    // Continue to next feed URL, if any
    RSS_currentFeed++;
    RSS_startRequest();
  }
}

/**
 * Utility function that extracts the value of a particular RSS field.
 *
 * @param {Object} el DOM element object of RSS heading
 * @param {String} name Name of field whose data is being requested
 * @return {String} Contents of requested field, or null on error
 */
function RSS_getChild(el, name) {
  var els = el.getElementsByTagName(name);
  return els.length > 0 ? els[0].text : null;
}

/**
 * Utility sorting function for sorting RSS items chronologically.
 */
function RSS_itemSort(a, b) {
  if (a.pubDate != b.pubDate) {
    return b.pubDate - a.pubDate;
  } else if (a.feedTitle < b.feedTitle) {
    return -1;
  } else if (a.feedTitle > b.feedTitle) {
    return 1;
  } else {
    return 0;
  }
}

/**
 * Utility function for parsing various types of dates encountered in the
 * RSS feeds specified at the top of this file.
 *
 * @param {String} str String representation of the date to be parsed.
 * @return {Date} Parsed date
 */
function RSS_parseDate(str) {
  // Try to parse some standard format
  var date = Date.parse(str);
  if (isNaN(date)) {
    // Try to parse mm.dd.yy
    var m = str.match(RSS_DATE_REGEXP);
    if (m) {
      date = new Date(2000 + Number(m[3]),
        Number(m[1]) - 1, Number(m[2])).getTime();
    } else {
      date = 0;
    }
  }
  return date;
}

/**
 * Encapsulates a single RSS item.
 *
 * @param {String} feedTitle Title of the originating feed
 * @param {String} feedLink Link to originating feed's homepage
 * @param {Object} item DOM node of RSS item
 */
function RSS_FeedItem(feedTitle, feedLink, item) {
  // Feed information
  this.feedTitle = feedTitle;
  this.feedLink = feedLink;
  
  // Item information
  this.title = RSS_getChild(item, 'title');
  this.link = RSS_getChild(item, 'link');
  this.pubDate = RSS_parseDate(RSS_getChild(item, 'pubDate'));
}

/**
 * Utility function that parses an RSS feed's XML document into the
 * RSS_currentItems global variable and truncates the list to only the top
 * few most recent items.
 *
 * @param {Object} doc DOM document object of RSS feed
 */
function RSS_parse(doc) {
  // Get feed information
  var channel = null, feedTitle = null, feedLink = null;
  
  // Make sure there's at least one channel
  var channels = doc.getElementsByTagName('channel');
  if (channels.length < 1) {
    return;
  }
  
  // Get information for first channel
  channel = channels[0];
  feedTitle = RSS_getChild(channel, 'title');
  feedLink = RSS_getChild(channel, 'link');
  
  // Must have feed info!
  if (channel == null || feedTitle === null || feedLink === null) {
    return;
  }
  
  // Override Google News feed title
  if (RSS_FEED_URLS[RSS_currentFeed].substr(0, GOOGLE_NEWS_URL_PREFIX.length)
      === GOOGLE_NEWS_URL_PREFIX) {
    feedTitle = GOOGLE_NEWS_FEED_TITLE;
  }
  
  // Collect all <item> elements into RSS_currentItems
  var e = new Enumerator(channel.getElementsByTagName('item'));
  for (e.moveFirst(); !e.atEnd(); e.moveNext()) {
    var item = e.item();
    
    // Get item properties
    RSS_currentItems.push(new RSS_FeedItem(feedTitle, feedLink, item));
  }
  
  // Sort by feed, then by date, decreasing
  RSS_currentItems.sort(RSS_itemSort);
  
  // Take only top few
  RSS_currentItems.length = RSS_ITEMS_DISPLAYED;
  
  // Update display
  RSS_updateDisplay();
}

/**
 * Refreshes the RSS item UI, i.e., transfers the data RSS_currentItems into
 * the UI.
 */
function RSS_updateDisplay() {
  var cls = news.children;
  for (var i = 0; i < RSS_ITEMS_DISPLAYED; i++) {
    var el = cls.item(i);
    var item = RSS_currentItems[i];
    
    if (item !== undefined) {
      var link = el.children.item(1);
      var title = ENT_htmlDecode(item.title);
      link.innerText = title;
      link.tooltip = title;
      link.href = item.link ? item.link : '';
      
      var date = el.children.item(2);
      if (item.pubDate) {
        var pubDate = new Date();
        pubDate.setTime(item.pubDate);
        date.innerText = MAIN_starDate(pubDate, ':', ' ');
        date.tooltip = pubDate.toLocaleString();
      } else {
        date.innerText = '';
        date.tooltip = '';
      }
      
      var feed = el.children.item(3);
      feed.innerText = item.feedTitle;
      feed.tooltip = item.feedTitle;
      feed.href = item.feedLink;
      
      el.visible = true;
    } else {
      el.visible = false;
    }
  }
}
