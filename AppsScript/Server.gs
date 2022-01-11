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
      let questionRels = getQuestionRels();
      let strategies = getStrategies([...new Set(user[2].map(mvmt => mvmt.strategy))]); //get's the unique strategies as a list
      return ContentService
            .createTextOutput(JSON.stringify({"result":"success", "user": {'phone':user[0],'name':user[1],'movements':user[2],'movementStrategies': strategies,'questionRels': questionRels,'lastUpdate':user[3]}}))
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
      setUserScriptProperty();
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
        setUserScriptProperty();
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

    lock.releaseLock();

    setUserScriptProperty();

    //Get the results from our movements to send to the summary page
    SpreadsheetApp.flush();
    let movements = e.parameters.movementId;
    let groupNum = summarizeMovements(movements);
    
    // return json success results
    return ContentService
    .createTextOutput(JSON.stringify({"result":"success", "number": e.parameters.movementId.length,"groupNum": groupNum,'orig_request':e}))
          .setMimeType(ContentService.MimeType.JSON);
  } catch(error){
    lock.releaseLock();

    // if error return this
    return ContentService
          .createTextOutput(JSON.stringify({"result":"error", "error": error,'data': e}))
          .setMimeType(ContentService.MimeType.JSON);
  } finally { //release lock
    lock.releaseLock();
  }
}

