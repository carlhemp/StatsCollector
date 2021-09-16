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
//  Enter sheet name where Users are
        var USER_SHEET = "Users";
//  Enter sheet name where Users are
        var USER_SHEET_UPDATE = "UsersLastUpdate";

var SCRIPT_PROP = PropertiesService.getScriptProperties(); // new property service

function getMovements(extended=false) {
  let col = 5;
  if(extended){
    col = 9;
  }
  let doc = SpreadsheetApp.openById(SCRIPT_PROP.getProperty("key"));
  let sheet = doc.getSheetByName(MOVEMENT_SHEET);
  let movements = sheet.getRange(2,1,sheet.getLastRow() - 1,sheet.getLastColumn()).getValues();
  
  let object = {};
  if(!extended){
    for(movement of movements){
      object[movement[0]] = movement[5];  //Movement ID and Movemement Name
    }
  }
  else {
    for(movement of movements){
      object[movement[0]] = [movement[5],movement[6],movement[7],movement[8],movement[9]];
    } 
  }      
  return object;
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
    }
  }
  user[3] = Utilities.formatDate(user[3], "GMT+1", "M/d/yyyy");
  return user;
}

//SENDING list of movements
function sendMovements(e) {
  try {
    let object = getMovements();
      
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
      return ContentService
      .createTextOutput(JSON.stringify({"result":"success", "user": {'userPhone':user[0],'userName':user[1],'userIds':user[2],'userLastUpdate':user[3]}}))
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
            .createTextOutput(JSON.stringify({"result":"success", "user": {'userPhone':user[0],'userName':user[1],'userIds':user[2],'userLastUpdate':user[3]}}))
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
              .createTextOutput(JSON.stringify({"result":"success", "user": {'userPhone':user[0],'userName':user[1],'userIds':user[2],'userLastUpdate':user[3]}}))
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
    
    for(h in e.parameters.movementId){
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
          row.push(e.parameters[headers[i]][h]);
        }
      }
      // more efficient to set values as [][] array than individually
      sheet.getRange(nextRow, 1, 1, row.length).setValues([row]);
    }
    //Get the results from our movements to send to the summary page
    SpreadsheetApp.flush();
    let movements = e.parameters.movementId;
    let object = getMovements(true);
    let groupNum = {};
    groupNum.spiritualConvo   = 0;
    groupNum.personalEvang    = 0;
    groupNum.personalEvangDec = 0;
    groupNum.holySpiritPres   = 0;
    
    for(movement of movements){
      let stats = object[movement];
      groupNum.spiritualConvo   += stats[1];
      groupNum.personalEvang    += stats[2];
      groupNum.personalEvangDec	+= stats[3];
      groupNum.holySpiritPres   += stats[4];
    }
    
    // return json success results
    return ContentService
    .createTextOutput(JSON.stringify({"result":"success", "number": e.parameters.movementId.length,"groupNum": groupNum}))
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

function setup() {
    var doc = SpreadsheetApp.getActiveSpreadsheet();
    SCRIPT_PROP.setProperty("key", doc.getId());
}
