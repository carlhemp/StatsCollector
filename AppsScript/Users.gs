function setUserScriptProperty(){
  let doc = SpreadsheetApp.openById(SCRIPT_PROP.getProperty("key"));
  let sheet = doc.getSheetByName(USER_SHEET_UPDATE);
  let users = sheet.getRange(2,1, sheet.getLastRow(), 4).getValues();
  
  SCRIPT_PROP.setProperty("users", JSON.stringify(users));
}

function getUser(phone){
  //for each item in list of users, check if it is the same as the one we received.
  let users = JSON.parse(SCRIPT_PROP.getProperty('users'));
  let user = false;     
  for(i in users){
    if(users[i][0] == phone) {
      user = users[i];
      break;
    }
  }
  Logger.log(JSON.stringify(user))
  if(user){
    user[2] = getMovements(user[2].split(','),'user_info');
    user[3] = Utilities.formatDate(new Date(user[3]), "GMT+1", "M/d/yyyy");
  }
  return user;
}
