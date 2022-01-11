//  Enter sheet name where data is to be written below
        var RESPONSE_SHEET = "Responses";
//  Enter sheet name where Movements are
        var MOVEMENT_SHEET = "Movements";
//  Enter sheet name where Teams are
        var TEAM_SHEET = "Teams";
//  Enter sheet name where Strategies are
        var STRATEGY_SHEET = "Strategies";
//  Enter sheet name where Users are
        var USER_SHEET = "Users";
//  Enter sheet name where Users are
        var USER_SHEET_UPDATE = "Users";
//  Enter sheet name where Question Relatioships are
        var QUESTION_RELS = "QuestionRels";

var SCRIPT_PROP = PropertiesService.getScriptProperties(); // new property service


function setup() {
    var doc = SpreadsheetApp.getActiveSpreadsheet();
    SCRIPT_PROP.setProperty("key", doc.getId());
}

function updateScriptProperties(){
  setMovementsScriptProperty();
  setStrategiesScriptProperty();
  setQuestionRelsScriptProperty();
  setUserScriptProperty();
  setTeamsScriptProperty();

  // Get multiple script properties in one call, then log them all.
  var scriptProperties = PropertiesService.getScriptProperties();
  var data = scriptProperties.getProperties();
  var store_size = 0;
  for (var key in data) {
    Logger.log('Key: %s, Value: %s', key, data[key].length);
    store_size += data[key].length
  }
  Logger.log(store_size);
  if(store_size > 480000){
    GmailApp.sendEmail('carl.hempel@cru.org','Server script properties are at 480kb!','You should check it out: \n\nhttps://docs.google.com/spreadsheets/d/'+SCRIPT_PROP.getProperty("key"));
  }
}
