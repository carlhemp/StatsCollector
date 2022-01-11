function setMovementsScriptProperty(){
  let doc = SpreadsheetApp.openById(SCRIPT_PROP.getProperty("key"));
  let sheet = doc.getSheetByName(MOVEMENT_SHEET);
  
  //this is because .getLastRow() doesn't work when there are formulas in other columns
  let columnA = sheet.getRange("A1:A").getValues();
  let lastRow=0;
  for(cell of columnA){
    if(cell != ""){
      lastRow += 1;
    }
    else {
      break;
    }
  }
  let movements = sheet.getRange(2,1,lastRow - 2,sheet.getLastColumn()).getValues();
  let moveObjs = {};
  for(movement of movements){
    let moveOb = {};
    moveOb.teamID=movement[1];
    moveOb.teamName=movement[2];
    moveOb.strategy=movement[3];
    moveOb.name=movement[4];

    moveObjs[movement.shift()]=moveOb;
  }
  Logger.log(JSON.stringify(moveObjs));

  SCRIPT_PROP.setProperty("movements", moveObjs);
}

function getMovements(movementsList, purpose) {
  if(purpose == 'summary'){ //need this to be fresh - otherwise we're good.
    setMovementsScriptProperty();
  }
  let movements = JSON.parse(SCRIPT_PROP.getProperty("movements"));
  movementsList = movementsList.map(mvmnt => parseInt(mvmnt));

  let object = [];
  for(movement of movements){
    if(movementsList.includes(parseInt(movement[0]))){
      switch(purpose) {
        case 'onboard': {
          let mvmnt = {};
          mvmnt.id = movement[0];    //id
          mvmnt.name = movement[5];  //name
          object.push(mvmnt);
        }break;
        case 'user_info': {
          let mvmnt = {};
          mvmnt.id = movement[0];       //id
          mvmnt.name = movement[5];     //name
          mvmnt.strategy = movement[4];  //strategy
          object.push(mvmnt);
        }break;
        case 'summary':
          object.push([movement[5],movement[6],movement[7],movement[8],movement[9]]);  //summary information
      }
    }
  }
  return object;
}

function summarizeMovements(movements){
  let summaryMovements = getMovements(movements, 'summary');
  let groupNum = {};
  groupNum.spiritualConvo   = 0;
  groupNum.personalEvang    = 0;
  groupNum.personalEvangDec = 0;
  groupNum.holySpiritPres   = 0;
  
  for(movement of summaryMovements){
    groupNum.spiritualConvo   += parseInt(movement[1]);
    groupNum.personalEvang    += parseInt(movement[2]);
    groupNum.personalEvangDec += parseInt(movement[3]);
    groupNum.holySpiritPres   += parseInt(movement[4]);
  }
  return groupNum;
}
