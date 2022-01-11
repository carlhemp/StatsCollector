function setStrategiesScriptProperty(){
  let doc = SpreadsheetApp.openById(SCRIPT_PROP.getProperty("key"));
  let sheet = doc.getSheetByName(STRATEGY_SHEET);
  let strategies = sheet.getRange(1,2,sheet.getLastRow(),sheet.getLastColumn()).getValues();

  SCRIPT_PROP.setProperty("strategies", JSON.stringify(strategies));
}

function getStrategies(strategiesList) {
  let strategies = JSON.parse(SCRIPT_PROP.getProperty('strategies'));
  
  let object = {};
  Logger.log(strategies.length);
  for(j = 0; j < strategies[0].length -1; j++){ //Vertically arranged sheet, so we are iterating over the columns
    if(strategiesList.includes(strategies[0][j])){
      let questions = [];
      for(i = 3; i < 46; i+=3){
        if(strategies[i][j] != ''){
          let question = {};
          question.id = strategies[i][j];
          question.name = strategies[i+1][j];
          question.description = strategies[i+2][j];
          questions.push(question);
        }
      }
      let strategy = {};
      strategy.welcomeText = strategies[1][j];
      strategy.primaryColor = strategies[2][j];
      strategy.questions = questions;
      
      object[strategies[0][j]] = strategy;

    }
  }
  Logger.log(JSON.stringify(object));
  return object;
}