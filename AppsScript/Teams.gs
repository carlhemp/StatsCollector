function setTeamsScriptProperty(){
  let doc = SpreadsheetApp.openById(SCRIPT_PROP.getProperty("key"));
  let sheet = doc.getSheetByName(TEAM_SHEET);

  let teams = sheet.getRange(2,1,getLastRow(sheet) - 2,sheet.getLastColumn()).getValues();
  let teamObjs = {};
  //for each row in the 2d array from getValues();
  for(team of teams){
    let teamOb = {};
    teamOb.name=team[1];
    teamOb.teamQ1=team[2];
    teamOb.teamQ2=team[3];
    teamOb.teamQ3=team[4];

    teamObjs[team.shift()]=teamOb;
  }

  SCRIPT_PROP.setProperty("teams", JSON.stringify(teamObjs));
}

function getTeams(teamsList) {
  let teams = JSON.parse(SCRIPT_PROP.getProperty('teams'));
  let object = {};
  
  for(team of teamsList){
    object[team] = teams[team]
  }
  
  return object;
}
