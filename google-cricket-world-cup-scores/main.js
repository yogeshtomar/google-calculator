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
var httpRequest = null;
var timer=null;
var requestUrl = "http://www.google.co.in/cricket/cricketscores?client=gd";
var teamA, teamB;
var matchIDs = new Array();
var matchUrls = new Array();
var scoreUpdateFailCount = 0;

function view_onOpen() {
  refreshScore();
}

function showMatchTossControls(mi, isVisible) {
  var match_div = (mi == 0 ? match1 : match2);
  var atoss_label = match_div.children("atoss_label");
  atoss_label.visible = isVisible;

  //Hiding Unwanted labels
  isVisible = !isVisible;
  match_div.children("team1").visible = isVisible;
  match_div.children("team2").visible = isVisible;
  match_div.children("sc").visible = isVisible;
}

function refreshScore() {
  httpRequest = new XMLHttpRequest();
  httpRequest.open("GET", requestUrl, true);
  httpRequest.onreadystatechange = parseJSON;
  httpRequest.send(null);
}

function parseJSON() {
  if (httpRequest.readyState == 4) {
    var nextRefreshTime = 2 * 60 * 1000;  // in error cases try after 2 min
    if (httpRequest.status == 200) {
      jsonObj = eval("(" + httpRequest.responseText + ")");
      try {
        nextRefreshTime = jsonObj.nextrefreshtime;

        if (jsonObj.iserror) {
          scoreUpdateFailCount++;
        } else {
          var numMatches = 
            (jsonObj.summaryscore ? jsonObj.summaryscore.length : 0);
          if (numMatches > 2)
            numMatches = 2;

          view.height = (numMatches < 2) ? 260 : 490;
          poweredby.y = (numMatches < 2) ? 235 : 455;
          match1.visible = (numMatches > 0);
          match2.visible = (numMatches > 1);
        
          if (numMatches == 0) {
            nextmatchtime.visible = true;
            nextmatchtime.innerText = "";
            if (jsonObj.nextmatch) {
              var nextmatch = jsonObj.nextmatch;
              var startdate = nextmatch.startdate;
              if (startdate.substring(startdate.length - 5, 
                  startdate.length).toLowerCase() == "(gmt)") {
                startdate = startdate.substring(0, startdate.length - 5) + " GMT";
              }
              startdate = new Date(startdate);
            
              nextmatchtime.innerText = "Next match: \n\n" + 
                nextmatch.team1name + " vs. " + nextmatch.team2name + "\nat " + 
                nextmatch.venue + " starts at " + startdate.toLocaleString();
            }
          } else {
            nextmatchtime.visible = false;
          }

          matchIDs = new Array();
          matchUrls = new Array();
          for (var mi = 0; mi < numMatches; ++mi) {
            var score = jsonObj.summaryscore[mi];
            teamA = score.teama.name;
            teamB = score.teamb.name;
          
            matchIDs.push(score.matchid);
            matchUrls.push(score.url);
          
            var match_div_index = mi + 1;
            var match_div = view.children("match" + match_div_index);
            var match_title = score.teama.name + " vs. " + score.teamb.name;
            match_div.children("matchtitle").innerText = match_title;
            match_div.children("matchstatus").innerText = score.matchstatus;
            
            // if matchtitle is too long reduce font size
            if (match_title.length > 25) {
              match_div.children("matchtitle").size = 10 - (match_title.length / 5 - 4);
              match_div.children("matchtitle").align = "left";
            }

            //Testing Conditions to call the required function
            if(!score.innings1) {
              showMatchTossControls(mi, true);
              afterToss(mi);
            } else {
              showMatchTossControls(mi, false);
              if (!score.innings2) {
                innings1(mi);
              } else {
                innings2(mi);
              }
            }
          }
        }
        scoreUpdateFailCount = 0;  // successfully parsed stuff
      } catch(e) {
        scoreUpdateFailCount++;
      }
    } else {
      scoreUpdateFailCount++;
    }
    httpRequest = null;

    if (timer) {
      clearInterval(timer);
      timer = null;
    }
    if (scoreUpdateFailCount < 3) {
      timer = setTimeout("refreshScore()", nextRefreshTime + 
        Math.random() * 10000 - 5000);
    } else {
      // too many failures so stop retrying
      nextmatchtime.innerText = "Error fetching latest scores from server, " +
        "please check your network connection and try again."
      nextmatchtime.visible = true;
      retry.visible = true;
      match1.visible = false;
      match2.visible = false;
    }
  }
};

function onRetryConnectClick() {
  scoreUpdateFailCount = 0;
  nextmatchtime.innerText = "Connecting...";
  retry.visible = false;
  refreshScore();
}

function afterToss(mi) {
  var score = jsonObj.summaryscore[mi];
  var match_div = (mi == 0 ? match1 : match2);
  var atoss_label = match_div.children("atoss_label");
  
  //Reading from feed
  if(0==score.tosswonteam) {
    if(0==score.tossdecision) {
      atoss_label.innerText=teamA + " won the toss and decided to bat";
    } else {
      atoss_label.innerText=teamA + " won the toss and decided to bowl";
    }
  } else {
    if(0==score.tossdecision) {
      atoss_label.innerText=teamB + " won the toss and decided to bat";
    } else {
      atoss_label.innerText=teamB + " won the toss and decided to bowl";
    }
  }
}

function innings1(mi) {
  var score = jsonObj.summaryscore[mi];
  var match_div = (mi == 0 ? match1 : match2);
  
  var inn1BowlTeam, inn1BatTeam;
  var inn1Runs = "", inn1Wickets = "", inn1Overs = "";

  if (0 == score.innings1.battingteam) {
    inn1BowlTeam = teamB;
    inn1BatTeam = teamA;
  } else {
    inn1BowlTeam = teamA;
    inn1BatTeam = teamB;  
  }

  inn1Runs = score.innings1.runs;
  inn1Wickets = score.innings1.wickets;
  inn1Overs = parseInt(score.innings1.oversinballs / 6) + "." +
    (score.innings1.oversinballs % 6);

  var team_div = match_div.children("team1");
  
  if (score.innings1.batsman1) {
    var item = score.innings1.batsman1;
    team_div.children("bat1").innerText = item.batsman.firstname;
    team_div.children("bscore1").innerText = item.runs +
      " (" + item.balls + ")";
  } else {
    team_div.children("bat1").innerText = "";
    team_div.children("bscore1").innerText = "";
  }
  if (score.innings1.batsman2) {
    var item = score.innings1.batsman2;
    team_div.children("bat2").innerText = item.batsman.firstname;
    team_div.children("bscore2").innerText = item.runs +
      " (" + item.balls + ")";
  } else {
    team_div.children("bat2").innerText = "";
    team_div.children("bscore2").innerText = "";
  }

  team_div.children("country").src = getFlag(inn1BatTeam);
  team_div.children("cl").innerText = inn1BatTeam;
  team_div.children("status").innerText = inn1Runs + "/" + inn1Wickets + " (" + inn1Overs + " overs)";
  team_div.children("target").innerText = "";
  
  team_div = match_div.children("team2");
  team_div.children("country").src = getFlag(inn1BowlTeam);
  team_div.children("cl").innerText = inn1BowlTeam;
}

function innings2(mi) {
  var score = jsonObj.summaryscore[mi];
  var match_div = (mi == 0 ? match1 : match2);
  
  var inn2BowlTeam, inn2BatTeam;
  var inn1Runs = "", inn1Wickets = "", inn1Overs = "";
  var inn2Runs = "", inn2Wickets = "", inn2Overs = "";
  
  if (0 == score.innings2.battingteam) {
    inn2BowlTeam = teamB;
    inn2BatTeam = teamA;
  } else {
    inn2BowlTeam = teamA;
    inn2BatTeam = teamB;  
  }

  inn1Runs = score.innings1.runs;
  inn1Wickets = score.innings1.wickets;
  inn1Overs = parseInt(score.innings1.oversinballs / 6) + "." +
    (score.innings1.oversinballs % 6);

  inn2Runs = score.innings2.runs;
  inn2Wickets = score.innings2.wickets;
  inn2Overs = parseInt(score.innings2.oversinballs / 6) + "." +
    (score.innings2.oversinballs % 6);

  var team_div = match_div.children("team1");
  
  if (score.innings2.batsman1) {
    var item = score.innings2.batsman1;
    team_div.children("bat1").innerText = item.batsman.firstname;
    team_div.children("bscore1").innerText = item.runs + 
      " (" + item.balls + ")";
  } else {
    team_div.children("bat1").innerText = "";
    team_div.children("bscore1").innerText = "";
  }
  if (score.innings2.batsman2) {
    var item = score.innings2.batsman2;
    team_div.children("bat2").innerText = item.batsman.firstname;
    team_div.children("bscore2").innerText = item.runs +
      " (" + item.balls + ")";
  } else {
    team_div.children("bat2").innerText = "";
    team_div.children("bscore2").innerText = "";
  }

  team_div.children("country").src = getFlag(inn2BatTeam);
  team_div.children("cl").innerText = inn2BatTeam;
  team_div.children("status").innerText = inn2Runs + "/" + inn2Wickets +
    " (" + inn2Overs + " overs)";
  team_div.children("target").innerText = "Target: " + score.innings2.targetscore;

  team_div = match_div.children("team2");
  team_div.children("country").src = getFlag(inn2BowlTeam);
  team_div.children("cl").innerText = inn2BowlTeam;
  team_div.children("status").innerText = inn1Runs + "/" + inn1Wickets + 
    " (" + inn1Overs + " overs)";
}

function removeSpaces(str) {
  var tstr = "";
  var splitstring = str.split(" ");
  for(i = 0; i < splitstring.length; i++)
    tstr += splitstring[i];
  return tstr;
}

function getFlag(team) {
  var teamname = removeSpaces(team).toLowerCase();
  if (teamname.length > 0 && teamname.substring(teamname.length - 5) == "women")
    teamname = teamname.substring(0, teamname.length - 5);
  return teamname + ".png";
}

function showMatchFullScore(index) {
  var detailsView = new DetailsView();
  if (detailsView.detailsViewData) {
    detailsView.detailsViewData.putValue("detailsViewMatchId", matchIDs[index]);
    detailsView.setContent("", undefined, "fullscore.xml", false, 0);
    var match_div = (index == 0 ? match1 : match2);
    var title = match_div.children("matchtitle").innerText;
    plugin.showDetailsView(detailsView, title, gddDetailsViewFlagNone, null);
  } else {
    detailsView = null;
    
    var v;
    v = new ActiveXObject("Shell.Application");
    v.ShellExecute(matchUrls[index]);
    v = null;
  }
}
