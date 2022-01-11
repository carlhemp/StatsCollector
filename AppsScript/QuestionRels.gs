function setQuestionRelsScriptProperty(){
  let doc = SpreadsheetApp.openById(SCRIPT_PROP.getProperty("key"));
  let questionRelsSheet = doc.getSheetByName(QUESTION_RELS);
  let questionRelsList = questionRelsSheet.getRange(2,1, questionRelsSheet.getLastRow(),2).getValues(); 
  
  SCRIPT_PROP.setProperty("questionRelsList", JSON.stringify(questionRelsList));
}

function getQuestionRels(){
  let questionRelsList = JSON.parse(SCRIPT_PROP.getProperty('questionRelsList'));
  let questionRels = {};
  for(row of questionRelsList){
    if(row[0].trim()!=""){
      questionRels[row[1]]=row[0].split(', ');
    }
  }
  Logger.log(JSON.stringify(questionRels));
  return questionRels;
}
