function setTeamsScriptProperty(){
  let doc = SpreadsheetApp.openById(SCRIPT_PROP.getProperty("key"));
  let sheet = doc.getSheetByName(TEAM_SHEET);
  let teams = sheet.getRange(2,1,sheet.getLastRow() - 2,sheet.getLastColumn()).getValues();

  SCRIPT_PROP.setProperty("teams", JSON.stringify(teams));
}

