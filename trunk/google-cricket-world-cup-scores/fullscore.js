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

var jsonObj = null;
var runs;
var wickets;
var overs;
var target;
var currr;
var requestURL = "http://www.google.co.in/cricket/cricketscores?type=cricketfull&client=gd&query=";

function view_onOpen() {
  showLoadingMessage();
  getData();
}

function getData() {
  http_request = new XMLHttpRequest();
  http_request.open("GET", requestURL + detailsViewData.getValue("detailsViewMatchId"), true);
  http_request.onreadystatechange = onResponse;
  http_request.send(null);
}

function onResponse() {
  if (http_request.readyState == 4) {
    var success = false;
    if (http_request.status == 200) {
      jsonObj = eval("(" + http_request.responseText + ")");
      if (jsonObj && !jsonObj.iserror) {
        try {
          jsonObj = jsonObj.fullscore;
          parseJson();
          success = true;
        } catch (e) {
        }
      }
    }

    http_request = null;    
    if (!success)
      showErrorFetchingScores();
  }
}

function parseJson() {
  var i = 0;
  var innings = parseInt(jsonObj.crcurrentscores.crinnings.content);
  if (innings < 0)
    throw(1);

  runs = jsonObj.crcurrentscores.crbatteamruns.content;
  wickets = jsonObj.crinnings[innings].crwkts;
  overs = jsonObj.crcurrentscores.crbatteamovers.content;
  currr = jsonObj.crcurrentscores.crrunrates.crcurrentrunrate.content;

  runs_text.innerText = runs + "/" + wickets;
  overs_text.innerText = overs + " " + strOvers;
  crr.innerText = strCRR + ": " + currr;

  if (jsonObj.crcurrentscores.crtarget.content > 0)
    trgt.innerText = strTarget + ": " + jsonObj.crcurrentscores.crtarget.content;

  if (jsonObj.crcurrentscores.crrunrates.crreqdrunrate.content)
    rrr.innerText = strRRR + ": " + jsonObj.crcurrentscores.crrunrates.crreqdrunrate.content;

  var howoutstr = "";

  // batsmen
  var batsman_array = (
    jsonObj.crinnings[innings].crbatsmen &&
    jsonObj.crinnings[innings].crbatsmen.crbatsman) ?
      jsonObj.crinnings[innings].crbatsmen.crbatsman : new Array();
  for (i = 0; i < batsman_array.length; ++i) {
    for (var j = 0; j < batsman_array.length; ++j) {
      if (batsman_array[j].crorder != i)
        continue;

      var ba_index = i + 1;
      var ba_name = view.children.item("ba" + ba_index);
      var ba_status = view.children.item("st" + ba_index);
      var ba_score = view.children.item("s" + ba_index);
      var batsman = batsman_array[j];
      
      // name
      ba_name.innerText = getPlayer(batsman.crid);
      
      // how out
      switch (batsman.crhowout) {
        case "dnb":
          ba_status.innerText = strYetToBat;
          break;
        case "notout":
          ba_status.innerText = strNotOut;
          break;
        case "hitwicket":
          ba_status.innerText = strHitWicket;
          break;
        case "obstruction":
          ba_status.innerText = strObstruction;
          break;
        case "timed out":
          ba_status.innerText = strTimedOut;
          break;
        case "hit twice":
          ba_status.innerText = strHitTwice;
          break;
        case "caught":
          ba_status.innerText = 
            "c " + getPlayer(batsman.crfielder) + 
            " b " + getPlayer(batsman.crbowler);
          break;
        case "st":
        case "stumped":
          ba_status.innerText = 
            "st " + getPlayer(batsman.crfielder) + 
            " b " + getPlayer(batsman.crbowler);
          break;
        case "bowled":
        case "lbw":
          ba_status.innerText = "b " + getPlayer(batsman.crbowler);
          break;
        case "runout":
          ba_status.innerText = "runout (" + getPlayer(batsman.crfielder) + ")";
          break;
        default:
          ba_status.innerText = batsman.crhowout;
          break;
      }
        
      // runs
      var score = batsman.crruns;
      if (score != 0 || batsman.crballs != 0) {
        if (batsman.crballs != 0)
          score += " (" + batsman.crballs + ")";        
        ba_score.innerText = score;
      }
    }
  }

  // bowlers  
  d7.visible = false;
  d8.visible = false;
  d9.visible = false;
  d10.visible = false;
  var bowler_array = (
    jsonObj.crinnings[innings].crbowlers &&
    jsonObj.crinnings[innings].crbowlers.crbowler) ?
      jsonObj.crinnings[innings].crbowlers.crbowler : new Array();
  for (i = 0; i < bowler_array.length; ++i) {
    for (var j = 0; j < bowler_array.length; ++j) {
      if (bowler_array[j].crorder != i)
        continue;
        
      var bo_index = i + 1;
      var bo_name = view.children.item("bo" + bo_index);
      var bo_status = view.children.item("bs" + bo_index);
      var bowler = bowler_array[j];

      bo_name.innerText = getPlayer(bowler.crid);
      bo_status.innerText = 
        bowler.crovers + " - " + 
        bowler.crmaidens + " - " + 
        bowler.crruns + " - " + 
        bowler.crwkts;
        
      if ((i % 2) == 0) {
        var div_index = 7 + i / 2;
        var div_bg = view.children.item("d" + div_index);
        div_bg.visible = true;
      }
    }
  }

  // Fall of wickets
  var wickets_array = (
    jsonObj.crinnings[innings].crwickets &&
    jsonObj.crinnings[innings].crwickets.crwicket) ?
      jsonObj.crinnings[innings].crwickets.crwicket : new Array();
  var fow_value = "";
  for (i = 0; i < wickets_array.length; ++i) {
    if (i > 0)
      fow_value += ", ";
    
    var wicket_index = i + 1;
    fow_value += wickets_array[i].crruns + "/" + wicket_index + " (" + 
      getPlayer(wickets_array[i].crbatsman) + ", " + 
      wickets_array[i].crovers + "ov)";
  }
  fowtext.innerText = fow_value;
  
  status.visible = false;
}

function showLoadingMessage() {
  showStatusMessage("Loading full scorecard. Please wait...");
}

function showErrorFetchingScores() {
  showStatusMessage("There was a problem in retreiving the score data. Please try again later.");
}

function showStatusMessage(msg) {
  status_text.innerText = msg;
  status.visible = true;
}

function getPlayer(baid) {
  for (var t = 0; t < jsonObj.crteam.length; ++t) {
    for (var i = 0; i < jsonObj.crteam[t].crplayer.length; ++i) {
      if (baid == jsonObj.crteam[t].crplayer[i].crid)
        return jsonObj.crteam[t].crplayer[i].crname;
    }
  }
  return "";
}
