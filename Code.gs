// original from: http://mashe.hawksey.info/2014/07/google-sheets-as-a-database-insert-with-apps-script-using-postget-methods-with-ajax-example/
// original gist: https://gist.github.com/willpatera/ee41ae374d3c9839c2d6 

function doGet(e){
  //SEND movments list
  if(e.parameter.movements){
    return sendMovements(e);
  }
  //SEND onboarding - receives phone number; return movements, name, last date || error - user not found
  else if(e.parameter.requestUser){
    return sendUserInfo(e);
  }
  //SAVE new user - receives phone number, name, movements; returns success || error - already registered.
  else if(e.parameter.registerUser){
    return saveUser(e);
  }
  //SAVE over existing user - receives phone number, movements; returns success, name || error no user found
  else if(e.parameter.updateUser){
    return updateUser(e);
  }
  //SAVE submitted form - recieves data; return summary of movement stats
  else {
    return saveForm(e);
  }
}

//  Enter sheet name where data is to be written below
        var RESPONSE_SHEET = "Responses";
//  Enter sheet name where Movements are
        var MOVEMENT_SHEET = "Movements";
//  Enter sheet name where Strategies are
        var STRATEGY_SHEET = "Strategies";
//  Enter sheet name where Users are
        var USER_SHEET = "Users";
//  Enter sheet name where Users are
        var USER_SHEET_UPDATE = "UsersLastUpdate";

var SCRIPT_PROP = PropertiesService.getScriptProperties(); // new property service

function getMovements(movementsList, purpose) {
  let doc = SpreadsheetApp.openById(SCRIPT_PROP.getProperty("key"));
  let sheet = doc.getSheetByName(MOVEMENT_SHEET);
  let movements = sheet.getRange(2,1,sheet.getLastRow() - 1,sheet.getLastColumn()).getValues();
  movementsList = movementsList.map(mvmnt => parseInt(mvmnt));
  Logger.log(movementsList);

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
function getCru(){
  getStrategies(['Cru','High School']);
}
function getStrategies(strategiesList) {
  let doc = SpreadsheetApp.openById(SCRIPT_PROP.getProperty("key"));
  let sheet = doc.getSheetByName(STRATEGY_SHEET);
  let strategies = sheet.getRange(1,2,sheet.getLastRow(),sheet.getLastColumn()).getValues();
  Logger.log(strategiesList);

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

function getCarl(){
  Logger.log(JSON.stringify(getUser(8453320550)));
}

function getUser(phone){
  // next set where we write the data - you could write to multiple/alternate destinations
  var doc = SpreadsheetApp.openById(SCRIPT_PROP.getProperty("key"));
  var sheet = doc.getSheetByName(USER_SHEET_UPDATE);
  
  //for each item in list of users, check if it is the same as the one we received.
  let users = sheet.getRange(2,1, sheet.getLastRow(), 4).getValues();
  let user = false;     
  for(i in users){
    if(users[i][0] == phone) {
      user = users[i];
      break;
    }
  }
  if(user){
    user[2] = getMovements(user[2].split(','),'user_info');
    user[3] = Utilities.formatDate(user[3], "GMT+1", "M/d/yyyy");
  }
  return user;
}

//SENDING list of movements
function sendMovements(e) {
  try {
    let object = getMovements(e.parameter.movements.split(','),'onboard');
      
    return ContentService
          .createTextOutput(JSON.stringify(object))
          .setMimeType(ContentService.MimeType.JSON);
  } 
  catch(e) {
    // if error return this
    return ContentService
          .createTextOutput(JSON.stringify({"result":"error", "error": e}))
          .setMimeType(ContentService.MimeType.JSON);
  }
}

//SENDING User's movements, last entered date, name || Not found
function sendUserInfo(e) {
  try {
    let user = getUser(e.parameter.userPhone);
    
    if(user){
      let strategies = getStrategies([...new Set(user[2].map(mvmt => mvmt.strategy))]); //get's the unique strategies as a list
      return ContentService
            .createTextOutput(JSON.stringify({"result":"success", "user": {'phone':user[0],'name':user[1],'movements':user[2],'movementStrategies': strategies,'lastUpdate':user[3]}}))
            .setMimeType(ContentService.MimeType.JSON);
    }
    else {
      return ContentService
            .createTextOutput(JSON.stringify({'result':'failure', 'text':'That phone number is not registered'}))
            .setMimeType(ContentService.MimeType.JSON);
    }
  } catch(e){
    // if error return this
    return ContentService
          .createTextOutput(JSON.stringify({"result":"error", "error": e}))
          .setMimeType(ContentService.MimeType.JSON);
  }
}

//SAVE new User - receives phone number, name, movements; returns success || error if already registered.
function saveUser(e) {
  var lock = LockService.getPublicLock();
  lock.waitLock(30000);  // wait 30 seconds before conceding defeat.
  
  try {
    // next set where we write the data - you could write to multiple/alternate destinations
    var doc = SpreadsheetApp.openById(SCRIPT_PROP.getProperty("key"));
    var sheet = doc.getSheetByName(USER_SHEET);

    
    //CHECK TO BE SURE PHONE NUMBER IS NOT Already registered.  NEED TO VALIDATE PHONE NUMBER client side and here.
    function validateNumber(number) {
      return number;
    }
    //for each item in list of users, check if it is the same as the one we received.
    let users = sheet.getRange(2,1, sheet.getLastRow(), 3).getValues();
    let newUser = true;     
    for(i in users){
      if(users[i][0] == e.parameter.userPhone) {
        newUser = false;
      }
    }    
   
    if(newUser){   
      // we'll assume header is in row 1 but you can override with header_row in GET/POST data
      var headRow = e.parameter.header_row || 1;
      var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
      var nextRow = sheet.getLastRow()+1; // get next row
      var row = []; 
      // loop through the header columns
      for (i in headers){
        if (headers[i] == "Timestamp"){ // special case if you include a 'Timestamp' column
          row.push(new Date());
        } else { // else use header name to get data
          row.push(e.parameter[headers[i]]);
        }
      }
      // more efficient to set values as [][] array than individually
      sheet.getRange(nextRow, 1, 1, row.length).setValues([row]);
      SpreadsheetApp.flush();
      let user = getUser(e.parameter.userPhone);
      return ContentService
            .createTextOutput(JSON.stringify({"result":"success", "user": {'phone':user[0],'name':user[1],'movements':user[2],'lastUpdate':user[3]}}))
            .setMimeType(ContentService.MimeType.JSON);
    }
    else {
      return ContentService
            .createTextOutput(JSON.stringify({'result':'failure', 'text':'That phone number is already registered'}))
            .setMimeType(ContentService.MimeType.JSON);
    }
  } catch(e){
    // if error return this
    return ContentService
          .createTextOutput(JSON.stringify({"result":"error", "error": e}))
          .setMimeType(ContentService.MimeType.JSON);
  } finally { //release lock
    lock.releaseLock();
  }
}

//SAVE over existing user - receives phone number, movements; returns success, name || error no user found
function updateUser(e) {
  var lock = LockService.getPublicLock();
  lock.waitLock(30000);  // wait 30 seconds before conceding defeat.
  
  try {
    // next set where we write the data - you could write to multiple/alternate destinations
    var doc = SpreadsheetApp.openById(SCRIPT_PROP.getProperty("key"));
    var sheet = doc.getSheetByName(USER_SHEET);

    
    //CHECK TO SEE IF PHONE NUMBER IS Already registered.  NEED TO VALIDATE PHONE NUMBER client side and here.
    function validateNumber(number) {
      return number;
    }
    //for each item in list of users, check if it is the same as the one we received.
    let users = sheet.getRange(2,1, sheet.getLastRow(), 3).getValues();
    
    for(i in users){
      if(users[i][0] == e.parameter.userPhone) {
        //we found the user, let's update this puppy.
        
        //if this is a txtReminderUpdate
        if(e.parameter.txtReminderTime){
          sheet.getRange(Number(i)+2, 4, 1, 1).setValue(e.parameter.txtReminderTime);
          return ContentService
              .createTextOutput(JSON.stringify({"result":"success","data": "txt reminder set"},))
              .setMimeType(ContentService.MimeType.JSON);
        }
        
        // we'll assume header is in row 1 but you can override with header_row in GET/POST data
        var headRow = e.parameter.header_row || 1;
        var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
        var nextRow = sheet.getLastRow()+1; // get next row
        var row = []; 
        // loop through the header columns
        for (j in headers){
          if (headers[j] == "Timestamp"){ // special case if you include a 'Timestamp' column
            row.push(new Date());
          } 
          else if(headers[j] == "userName"){ //keep name in place.
            row.push(users[i][1]);
          }
          else { // else use header name to get data
            row.push(e.parameter[headers[j]]);
          }
        }
        // more efficient to set values as [][] array than individually
        sheet.getRange(Number(i)+2, 1, 1, row.length).setValues([row]);
        SpreadsheetApp.flush();
        let user = getUser(e.parameter.userPhone);
        return ContentService
              .createTextOutput(JSON.stringify({"result":"success", "user": {'phone':user[0],'name':user[1],'movements':user[2],'lastUpdate':user[3]}}))
              .setMimeType(ContentService.MimeType.JSON);        
      }
    }
    return ContentService
          .createTextOutput(JSON.stringify({'result':'failure', 'text':'That phone number is not already registered'}))
          .setMimeType(ContentService.MimeType.JSON);
  } catch(e){
    // if error return this
    return ContentService
          .createTextOutput(JSON.stringify({"result":"error", "error": e}))
          .setMimeType(ContentService.MimeType.JSON);
  } finally { //release lock
    lock.releaseLock();
  }
}

//SAVE form data to Responses, return summary for included movements
function saveForm(e) {
  // shortly after my original solution Google announced the LockService[1]
  // this prevents concurrent access overwritting data
  // [1] http://googleappsdeveloper.blogspot.co.uk/2011/10/concurrency-and-google-apps-script.html
  // we want a public lock, one that locks for all invocations
  var lock = LockService.getPublicLock();
  lock.waitLock(30000);  // wait 30 seconds before conceding defeat.
  
  try {
    // next set where we write the data - you could write to multiple/alternate destinations
    var doc = SpreadsheetApp.openById(SCRIPT_PROP.getProperty("key"));
    var sheet = doc.getSheetByName(RESPONSE_SHEET);

    let formSubs = e.queryString.split('+').map(form => form.split('&').map(param => [param.split('=')[0],decodeURIComponent(param.split('=')[1])]))

    for(sub of formSubs){
      let headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
      let param_ob = {};
      
      //create param_ob and add headers if missing
      let missing_params = [];
      for(param of sub){
        if(!headers.includes(param[0])){ //we need to add this to the headers row.
          missing_params.push(param[0]);
        }
        param_ob[param[0]] = param[1];
      }

      //set new headers and regen the headers var
      if(missing_params.length != 0){
        sheet.getRange(1,sheet.getMaxColumns()+1,1,missing_params.length).setValues([missing_params]);
        headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
      }

      var nextRow = sheet.getLastRow()+1; // get next row
      var row = [];
      // loop through the header columns
      for (i in headers){
        if (headers[i] == "Timestamp"){ // special case if you include a 'Timestamp' column
          row.push(new Date());
        } else { // else use header name to get data
          row.push(param_ob[headers[i]]);
        }
      }
      // more efficient to set values as [][] array than individually
      sheet.getRange(nextRow, 1, 1, row.length).setValues([row]);
    }
    //Get the results from our movements to send to the summary page
    SpreadsheetApp.flush();
    let movements = e.parameters.movementId;
    let groupNum = summarizeMovements(movements);
    
    // return json success results
    return ContentService
    .createTextOutput(JSON.stringify({"result":"success", "number": e.parameters.movementId.length,"groupNum": groupNum,'orig_request':e}))
          .setMimeType(ContentService.MimeType.JSON);
  } catch(error){
    // if error return this
    return ContentService
          .createTextOutput(JSON.stringify({"result":"error", "error": error,'data': e}))
          .setMimeType(ContentService.MimeType.JSON);
  } finally { //release lock
    lock.releaseLock();
  }
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

function setup() {
    var doc = SpreadsheetApp.getActiveSpreadsheet();
    SCRIPT_PROP.setProperty("key", doc.getId());
}
