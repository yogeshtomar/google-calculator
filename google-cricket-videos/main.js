/*
Copyright (C) 2007 Google Inc.

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

var index=0;
var timer=null;
var http=null;
var gLastUpdate=null;
var snippet=""
var htmlDetailsView=null;

// choose the right URL based on the current date
var url_world_cup="http://youtube.com/rss/tag/cricket+vs+world+cup.rss";
var url_no_world_cup="http://youtube.com/rss/tag/cricket+vs.rss";
var date_before_world_cup = new Date("5 Mar 2007");
var date_after_world_cup = new Date("1 May 2007");
var cur_date = new Date();
var query_url = (cur_date < date_before_world_cup || 
  cur_date > date_after_world_cup) ? url_no_world_cup : url_world_cup;

var imageArray = new Array();
var linkArray = new Array();
var titleArray = new Array();
var descArray = new Array();
var swfArray = new Array();
var pubArray = new Array();

function replaceAll(oldStr,findStr,repStr) { //To replace characters
  var srchNdx = 0;  
  var newStr = "";  
  while (oldStr.indexOf(findStr,srchNdx) != -1) {
    newStr += oldStr.substring(srchNdx,oldStr.indexOf(findStr,srchNdx));
    newStr += repStr;
    srchNdx = (oldStr.indexOf(findStr,srchNdx) + findStr.length);            
  }
  newStr += oldStr.substring(srchNdx,oldStr.length);
  return newStr;
}

function view_onOpen() { 
  var backdate = new Date();
  backdate.setFullYear(2000);
  gLastUpdate = backdate.toString();
  
  OnTimer(query_url);
}

function showConnectionStatus(show) {
  if (show) {
    contentDiv.visible = false;
    statusMsg.innerText = ERROR_FETCHING_VIDEOS;
    statusMsg.visible = true;
  } else {
    statusMsg.visible = false;
    slide.image = null;
    contentDiv.visible = true;
  }
}

function OnTimer(url) {
  // set timer to do the query once every 30 minutes
  view.setTimeout("OnTimer(query_url)", 
    30 * 60 * 1000 + Math.random() * 10000 - 5000);

  http = new XMLHttpRequest();
  http.onreadystatechange = afterResponse;
  http.open("GET", url, true);
  if (gLastUpdate) {
    debug.trace("last update: " + gLastUpdate);
    http.setRequestHeader("If-modified-since", gLastUpdate);
  }
  http.send();

  function afterResponse() {
    if (http.readyState == 4) {
      if (http.status != 200) {
        showConnectionStatus(true);
        return;
      }

      var doc = new DOMDocument();
      
      doc.loadXML(http.responseText);
      
      Tags = doc.getElementsByTagName("item");
      
      if (Tags == null || Tags.length <= 0) {
        showConnectionStatus(true);
        return;
      }
      
      try {
        for(i = 0; i < Tags.length; i++) {
          var title ="";
          var link ="";
          var desc ="";
          var imag ="";
          var pub ="";
          
          // for each item
          for (var node = Tags[i].firstChild; node != null; node = node.nextSibling) {
            if (node.nodeName == "title"){
              title = node.firstChild.nodeValue;}
            if (node.nodeName == "link")
              link = node.firstChild.nodeValue;
            if (node.nodeName == "description"){
              desc = node.firstChild.nodeValue;
              desc = replaceAll(desc,"/results?","http://youtube.com/results?");
            }
            if(node.prefix == "media" && node.baseName == "thumbnail"){
              imag = node.attributes.getNamedItem("url").value;}
            if (node.nodeName == "enclosure"){
              swf = node.attributes.getNamedItem("url").value;
              swf = replaceAll(swf,".swf","");
            }
            if (node.nodeName == "pubDate"){
              pub = node.firstChild.nodeValue;
            }
          }
          if (!desc.match("funny")) 
          {
            imageArray.push(imag);
            titleArray.push(title);
            linkArray.push(link);
            descArray.push(desc);
            swfArray.push(swf);
            pubArray.push(pub);
          }
        }
      } catch(e) {
        showConnectionStatus(true);
        return;
      }
      
      delete http;
      delete doc;
      
      showConnectionStatus(false);

      drawItem();
      cacheImages();      
    }
  }
}

function drawItem() {
  var http = new XMLHttpRequest();
  http.onreadystatechange = afterVideoStream;  
  http.open("GET",imageArray[index], true);
  http.send();

  function afterVideoStream() {
    if (http.readyState == 4) {
      if (http.status != 200)  return;
      videoTitle.innerText = titleArray[index];
      var currentY = new Date();
      pubD.tooltip=pubArray[index];
      pubD.innerText = "Added: " + pubArray[index].substring(0, pubArray[index].indexOf(" "+currentY.getYear()));
      slide.image = http.responseStream;
      slide.tooltip = titleArray[index];
      snippet = "<div id=\"container\" style=\"position:absolute; width=\"500\"; height=\"400\" top:0; left:0; border:1px solid white; z-index:2;\">" 
        + "<object id=\"movie\" width=\"425\" height=\"350\"><param name=\"movie\" "
        + "value=\"" + swfArray[index] + "&autoplay=1\"></param><embed "
        + "src=\"" + swfArray[index] + "&autoplay=1\" name=\"movie\" type=\"application/x-shockwave-flash\" width=\"425\" "
        + "height=\"350\" bgcolor=\"#000000\"></embed></object>"
        + "<br>" + descArray[index] + "<br>"
        + "</div>";
      beginAnimation("anim()",255,0,255);
    } 
    if(http != null) delete http;
  }
}

function cacheImages() {
  for(var i=0;i<imageArray.length;i++) {
    var http = new XMLHttpRequest();
    http.onreadystatechange = afterVideoStream;  
    http.open("GET",imageArray[i],true);
    http.send();

    function afterVideoStream() { 
      if (http.readyState == 4) {
        if (http.status != 200)
          return;
      } 
      if(http != null)
        delete http;
    }
  }
}

function anim() {
  shadow.opacity = event.value;
}

//click event for the previous button. Sets the active index to index-1 if exists
function prevOnClick() {
  index--;
  if (index < 0)
    index = imageArray.length - 1;
  drawItem();
}

//click event for the next button. Sets the active index to index+1 if exists
function nextOnClick() {
  index = (index + 1) % imageArray.length;
  drawItem();
}

function changeOpacity() {
  slide.opacity=195;
  shadow.opacity=50;
}

function restoreOpacity() {
  slide.opacity=255;
  shadow.opacity=0;
}

function onSlideClick() {
  // no data shown?
  if (slide.image == null)
    return;

  var detailsHTML = "<html><head><script>window.external.window = window;</script><style type=\"text/css\"> body{font-family:arial,sans-serif; font-size: 10px; margin-left: 5px; margin-top: 5px; margin-right: 5px; margin-bottom: 5px;}</style></head><body bgcolor=\"#000000\" text=\"#FFFFFF\" link=\#FFFF00\ vlink=\#FFCC99\ alink=\#FFFF00\>";
  detailsHTML += snippet;
  detailsHTML += "<br /><br /></body></html>";

  if (htmlDetailsView != null)
    pluginHelper.closeDetailsView();

  htmlDetailsView = new DetailsView();
  htmlDetailsView.html_content = true;
  htmlDetailsView.setContent("", undefined, detailsHTML, false, 0);
  htmlDetailsView.external = {};

  // Show the details view
  pluginHelper.showDetailsView(htmlDetailsView, titleArray[index], 
    gddDetailsViewFlagToolbarOpen, onDetailsViewFeedback);
}

function onDetailsViewFeedback(detailsViewFlags) {
  // Remove the movie from DOM to make it stop playing
  var window = htmlDetailsView.external.window;
  var movie = window.document.getElementById("movie");
  if (movie != null)
    movie.parentNode.removeChild(movie);

  if (detailsViewFlags == gddDetailsViewFlagNone) {
    // User closed the details view
  } else if (detailsViewFlags == gddDetailsViewFlagToolbarOpen) {
    // User clicked on the title of the details view
    var winShell = new ActiveXObject("Shell.Application"); 
    winShell.ShellExecute(linkArray[index]); 
    winShell = null;
  }

  htmlDetailsView=null;
  CollectGarbage();
}

function view_onClose() {
  if(htmlDetailsView != null) {
    htmlDetailsView=null;
    CollectGarbage();
  }
}

