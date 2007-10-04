/***

Copyright 2007 Google Inc.

Licensed under the Apache License, Version 2.0 (the "License"); you
may not use this file except in compliance with the License. You may
obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or
implied. See the License for the specific language governing
permissions and limitations under the License.

***/

var gDisplayToken = 0;
var gAnimationToken = 0;
var gNavToken = 0;
var gHeadlines = new Array();
var gHeadline = -1;
var gCurrentDisplay;
var gLastDisplay;
var gAnimating = false;
var gLastUpdate = null;

/**
 * Global constants
 */
var cFeedInterval = 300000;
var cDisplayInterval = 15000;
var cFeedUrl = "http://news.google.com/nwshp?hl=en&tab=wn&q=cricket&num=50&output=atom"
var cImageHeight = 80;

/**
 * Headline object to store a headline item
 */
function Headline() {
  this.image;
  this.title;
  this.source;
  this.time;
  this.link;
}

/**
 * Class object display box
 */
function DisplayBox(div) {
  this.div = div;
  this.imageShadow = div.appendElement('<img src="images\\thumbnail_shadow.png"/>');
  this.imageBox = div.appendElement('<div background="#fafafa"/>');
  this.link = div.appendElement('<a/>');
  this.textLink = div.appendElement('<a/>');
  this.image = div.appendElement('<img x="5"/>');
  this.title = div.appendElement('<label x="1" wordWrap="true" height="60" width="120" trimming="word-ellipsis" valign="bottom" size="8" color="#ffffff"/>');
  this.time = div.appendElement('<label name="headlineTime" align="right" size="8" color="#c69c6d"/>');
  this.source = div.appendElement('<label trimming="character-ellipsis" size="8" color="#c69c6d"/>');

  // Initialize sizing
  this.source.x = 1;
  this.source.y = view.height - 32;
  this.source.width = 76;

  this.time.x = 1;
  this.time.y = view.height - 32;
  this.time.width = view.width - 26;
}

/**
 * Start routines to update news feed and rotate displayed headline.
 */
function view_onOpen() {
  // Call initial setup functions
  gCurrentDisplay = new DisplayBox(headlineBox1);
  gLastDisplay = new DisplayBox(headlineBox2);
  setLayout();
  var backdate = new Date();
  backdate.setFullYear(2000);
  gLastUpdate = backdate.toString();
  updateFeed();

  // Set intervals for continued updates
  gDisplayToken = setInterval(function() { displayHeadline('next', true); }, cDisplayInterval);
}

/**
 * Set up initial layout
 */
function setLayout() {
  background.width = view.width;
  background.height = view.height;
  headlineBox1.width = view.width;
  headlineBox1.height = view.height;
  headlineBox2.width = view.width;
  headlineBox2.height = view.height;
}

/**
 * Navigation buttons appear when gadget is moused over
 */
function view_onMouseOver() {
  //clearInterval(gNavToken);
  //gNavToken = beginAnimation(animateNav, 0, 255, 150);
}

function view_onMouseOut() {
  //clearInterval(gNavToken);
  //gNavToken = beginAnimation(animateNav, 255, 0, 150);
}

/**
 * Animate the mouseover navigation buttons
 */
function animateNav() {
  navigation.opacity = event.value;
}

/**
 * Restart slideshow timer on manual navigate
 */
function navigate(dir) {
  if (!gAnimating && gHeadlines.length > 0) {
    gAnimating = true;
    setTimeout(function() { gAnimating = false; }, 300);
    clearInterval(gDisplayToken);
    gDisplayToken = setInterval(function() { displayHeadline('next', true); }, cDisplayInterval);
    debug.trace("display token: " + gDisplayToken);
    displayHeadline(dir, true);
  }
}

/**
 * Update local copy of news feed
 */
function updateFeed() {
  if (error_fetching_videos_msg.visible == true)
    loading_msg.visible = true;
  error_fetching_videos_msg.visible = false;
  
  setTimeout(updateFeed, cFeedInterval + Math.random() * 10000 - 5000);

  try {
    var http = new XMLHttpRequest();
    http.onreadystatechange = HTTPData;
    http.open("GET", cFeedUrl, true);
    if (gLastUpdate) {
      debug.trace("last update: " + gLastUpdate);
      http.setRequestHeader("If-modified-since", gLastUpdate);
    }
    http.send(null);
  }
  catch(err) {
    debug.error("cannot connect / no update");
    if (gHeadlines.length == 0) {
      displayDisconnected();
    }
    return;
  }

  function HTTPData() {
    var feed;

    if (http.readyState == 4) {
      loading_msg.visible = false;
      var s = http.responseText;
      var a = s.split('<');
      debug.trace("http request status: " + http.status);
      debug.trace("*response len* " + a.length);
      //var fso = new ActiveXObject("Scripting.FileSystemObject");
      //var a = fso.CreateTextFile("c:\\xmldump." + new Date().getTime() + ".xml", true);
      //a.Write(http.responseText);

      gLastUpdate = new Date().toString();
      useNewFeed(http.responseXML);
    } else {
      return;
    }
  }
}

/**
 * Load an image from a url
 */
function loadImage(url) {
  try {
    var http = new XMLHttpRequest();
    http.open("GET", url, false);
    http.onreadystatechange = HTTPData;
    http.send(null);
  } catch(err) {
    debug.error("can't get image");
    formatDisplay();
    return;
  }

  function HTTPData() {
    if (http.readyState == 4) {
      try {
        gCurrentDisplay.image.src = http.responseStream;
        formatDisplay();
      } catch(e) {
        debug.error("error fetching/setting .jpg");
        formatDisplay();
      }
    }
  }
}

/**
 * Take action on receiving new feed
 */
function useNewFeed(feed) {
  debug.trace("updated news feed");
  displayOff = (gHeadlines.length == 0);
  getHeadlines(feed);
  if (displayOff && gHeadlines.length > 0) {
    gHeadline = -1;
    displayHeadline('next', true);
  } else if (gHeadlines.length == 0) {
    displayDisconnected();
  }
}

/**
 * Turn an rss news feed into a collection of headlines
 */
function getHeadlines(feed) {
  var headlines = new Array();
  debug.trace("parsing xml: " + feed.childNodes.length);
  var newsItems = feed.getElementsByTagName("entry");
  debug.trace(newsItems.length + " headlines found");
  if (newsItems.length == 0) {
    debug.trace("feed empty... don't use new feed");
    return;
  }
  for (var i = 0; i < newsItems.length; i++) {
    var item = formatHeadline(newsItems[i]);
    if (item.image != "")
      headlines.push(item);
  }

  // if there is new news, update the headlines
  gHeadlines = headlines;
}

/**
 * Format an rss news item into a headline object
 */
function formatHeadline(feedItem) {
  var headline = new Headline();
  headline.title = unescape(getTitle(feedItem));
  headline.image = unescape(getImage(feedItem));
  headline.source = unescape(getSource(feedItem));
  headline.time = getTime(feedItem);
  headline.link = unescape(getLink(feedItem));
  return headline;
}

/**
 * Replace html escape codes with respective text
 */
function unescape(s) {
  s = s.replace(/&apos;/g, "'");
  s = s.replace(/&#39;/g, "'");
  s = s.replace(/&amp;/g, '&');
  s = s.replace(/&lt;/g, '<');
  s = s.replace(/&gt;/g, '>');
  s = s.replace(/&quot;/g, '"');
  return s;
}

/** 
 * Various functions to get headline info from an rss item
 */
function getTitle(feedItem) {
  var header = feedItem.getElementsByTagName("title")[0].text;
  try {
    var i = header.lastIndexOf(" - ");
    var title = header.substring(0, i);
    return title;
  } catch(e) {
    return "";
  }
}

function getImage(feedItem) {
  try {
    var desc = feedItem.getElementsByTagName("content")[0].text;
    var i = desc.indexOf("<img src=");
    var j = desc.indexOf(".jpg");
    var link = (i != -1 && j >= i) ? desc.substring(i + 9, j + 4) : "";
    return link;
  } catch(e) {
    return "";
  }
}

function getSource(feedItem) {
  var header = feedItem.getElementsByTagName("title")[0].text;
  try {
    var i = header.lastIndexOf(" - ");
    var source = header.substring(i + 3, header.length);
    return source;
  } catch(e) {
    return "";
  }
}

function getTime(feedItem) {
  var pubDate = feedItem.getElementsByTagName("issued")[0].text;
  var feedTime = new Date();
  try {
    var date = pubDate.substring(0, pubDate.indexOf("T"));
    date = date.split("-");
    feedTime.setUTCFullYear(date[0]);
    feedTime.setUTCMonth(date[1] - 1);
    feedTime.setUTCDate(date[2]);
    var time = pubDate.substring(pubDate.indexOf("T") + 1, pubDate.indexOf("+"));
    time = time.split(":");
    feedTime.setUTCHours(time[0]);
    feedTime.setUTCMinutes(time[1]);
    feedTime.setUTCSeconds(time[2]);
  } catch(e) {
    return new Date();
  }
  return feedTime;
}

function getLink(feedItem) {
  var link = feedItem.getElementsByTagName("link")[0].getAttribute("href");
  return link;
}


/**
 * Update the display with a new headline
 */
function displayHeadline(dir, animate) {
  debug.trace("updating display!");
  var displayHolder = gLastDisplay;
  gLastDisplay = gCurrentDisplay;
  gCurrentDisplay = displayHolder;

  var headline = getHeadline(dir);
  if (headline) {
    gCurrentDisplay.image.src = "";
    loadImage(headline.image);
    gCurrentDisplay.image.tooltip = headline.title;
    gCurrentDisplay.title.innerText = headline.title;
    gCurrentDisplay.title.tooltip = headline.title;
    gCurrentDisplay.source.innerText = headline.source;
    gCurrentDisplay.source.tooltip = headline.source;
    gCurrentDisplay.time.innerText = timeDiff(headline.time);
    gCurrentDisplay.link.href = headline.link;
    gCurrentDisplay.textLink.href = headline.link;
  } else {
    displayDisconnected();
    return;
  }
  if (animate) {
    gAnimating = true;
    setTimeout(function() { gAnimating = false; }, 300);
    gCurrentDisplay.div.opacity = 0;
    gAnimationToken = beginAnimation(animateDisplay, 0, 355, 250);
  } else {
    gLastDisplay.div.opacity = 0;
    gCurrentDisplay.div.opacity = 255;
  }
}

/**
 * Animate between last display and current display
 */
function animateDisplay() {
  if (event.value > 100) {
    gCurrentDisplay.div.opacity = event.value - 100;
  }
  if (event.value <= 255) {
    gLastDisplay.div.opacity = 255 - event.value;
  } else {
    gLastDisplay.div.opacity = 0;
  }
}

/**
 * Format the display after the image loads (or fails)
 */
function formatDisplay() {
  // Arrange appropriately
  gCurrentDisplay.title.y = 92;
  gCurrentDisplay.title.height = 24;
  if (gCurrentDisplay.image.srcHeight > 0) {
    //var imageScale = cImageHeight / headlineImage.srcHeight;
    //headlineImage.setSrcSize(Math.floor(headlineImage.srcWidth * imageScale), cImageHeight);
    gCurrentDisplay.image.width = gCurrentDisplay.image.srcWidth;
    gCurrentDisplay.image.height = gCurrentDisplay.image.srcHeight;
    gCurrentDisplay.image.y = 47 - (gCurrentDisplay.image.height / 2);
    gCurrentDisplay.image.x = (view.width / 2) - (gCurrentDisplay.image.width / 2) - 6;
    gCurrentDisplay.imageShadow.width = gCurrentDisplay.image.width + 10;
    gCurrentDisplay.imageShadow.height = gCurrentDisplay.image.height + 10;
    gCurrentDisplay.imageShadow.x = gCurrentDisplay.image.x - 5;
    gCurrentDisplay.imageShadow.y = gCurrentDisplay.image.y - 5;
    gCurrentDisplay.imageBox.width = gCurrentDisplay.image.width + 2;
    gCurrentDisplay.imageBox.height = gCurrentDisplay.image.height + 2;
    gCurrentDisplay.imageBox.x = gCurrentDisplay.image.x - 1;
    gCurrentDisplay.imageBox.y = gCurrentDisplay.image.y - 1;
    gCurrentDisplay.link.width = gCurrentDisplay.imageBox.width;
    gCurrentDisplay.link.height = gCurrentDisplay.imageBox.height;
    gCurrentDisplay.link.x = gCurrentDisplay.imageBox.x;
    gCurrentDisplay.link.y = gCurrentDisplay.imageBox.y;
    gCurrentDisplay.textLink.width = gCurrentDisplay.title.width;
    gCurrentDisplay.textLink.height = gCurrentDisplay.title.height;
    gCurrentDisplay.textLink.x = gCurrentDisplay.title.x;
    gCurrentDisplay.textLink.y = gCurrentDisplay.title.y;
  } else {
    debug.trace("no image");
    gCurrentDisplay.imageShadow.width = 0;
    gCurrentDisplay.imageShadow.height = 0;
    gCurrentDisplay.image.width = 0;
    gCurrentDisplay.image.height = 0;
    gCurrentDisplay.imageBox.width = 0;
    gCurrentDisplay.imageBox.height = 0;
    gCurrentDisplay.textLink.width = gCurrentDisplay.title.width;
    gCurrentDisplay.textLink.height = gCurrentDisplay.title.height;
    gCurrentDisplay.textLink.x = gCurrentDisplay.title.x;
    gCurrentDisplay.textLink.y = gCurrentDisplay.title.y;
    gCurrentDisplay.link.width = 0;
    gCurrentDisplay.link.height = 0;
  }
  //gCurrentDisplay.title.y = gCurrentDisplay.image.y + gCurrentDisplay.image.height + 5;
  //gCurrentDisplay.title.height = gCurrentDisplay.div.height - gCurrentDisplay.title.y - 26;
  //gCurrentDisplay.title.y += gCurrentDisplay.title.height % 12;
  //gCurrentDisplay.title.height -= gCurrentDisplay.title.height % 12;
}

/**
 * Grab the next headline to display and incriment counter
 */
function getHeadline(dir) {
  if (dir == "next") {
    gHeadline++;
  } else if (dir == "last") {
    gHeadline--;
  }
  if (gHeadline >= gHeadlines.length) {
    gHeadline = 0;
  } else if (gHeadline < 0) {
    gHeadline = gHeadlines.length - 1;
  }
  return gHeadlines[gHeadline];
}

/**
 * Display a default disconnected state
 */
function displayDisconnected() {
  debug.trace("turning off display");
  gCurrentDisplay.div.opacity = 0;
  gLastDisplay.div.opacity = 0;
  loading_msg.visible = false;
  error_fetching_videos_msg.visible = true;
}

/**
 * Get the time passed since the given time string
 */
function timeDiff(headlineTime) {
  var headlineDate = headlineTime.getTime();
  var currentDate = new Date().getTime();
  var time;
  var diff = currentDate - headlineDate;
  diff = Math.floor(diff / 1000);
  diff = Math.floor(diff / 60);
  if (diff < 60) {
    time = diff + " min ago";
  } else {
    diff = Math.floor(diff / 60);
    if (diff < 24) {
      time = diff + " hr ago";
    } else {
      diff = Math.floor(diff / 24);
      if (diff > 1) {
        time = diff + " days ago";
      } else {
        time = diff + " day ago";
      }
    }
  }
  return time;
}