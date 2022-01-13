function setMovementsScriptProperty(){
  let doc = SpreadsheetApp.openById(SCRIPT_PROP.getProperty("key"));
  let sheet = doc.getSheetByName(MOVEMENT_SHEET);
  
  let movements = sheet.getRange(2,1,getLastRow(sheet) - 2,sheet.getLastColumn()).getValues();
  let moveObjs = {};
  //for each row in the 2d array from getValues();
  for(movement of movements){
    let moveOb = {};
    moveOb.tID=movement[1];
    moveOb.strat=movement[2];
    moveOb.name=movement[3];
    moveOb.fb=movement[4];
    moveOb.g1=movement[5];
    moveOb.g2=movement[6];
    moveOb.g3=movement[7];

    moveObjs[movement.shift().toString()]=moveOb;
  }

  SCRIPT_PROP.setProperty("movements", JSON.stringify(moveObjs));
}

function getMovements(movementsList, purpose) {
  if(purpose == 'summary'){ //need this to be fresh - otherwise we're good.
    setMovementsScriptProperty();
  }
  let movements = JSON.parse(SCRIPT_PROP.getProperty("movements"));
  movementsList = movementsList.map(mvmnt => mvmnt.toString());

  let object = [];
  for(mvmntIn of movementsList){
    if(purpose == 'summary'){                    //we want everything
      let mvmnt = movements[mvmntIn];
      mvmnt.id = mvmntIn;
      object.push(mvmnt);
    } else {                                    //we only need the id, name, and strategy
      let mvmnt = {};
      mvmnt.id = mvmntIn;                         //id
      mvmnt.name = movements[mvmntIn].name;       //name
      mvmnt.strat = movements[mvmntIn].strat;  //strategy
      object.push(mvmnt);
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
