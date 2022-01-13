function setUserScriptProperty(){
  let doc = SpreadsheetApp.openById(SCRIPT_PROP.getProperty("key"));
  let sheet = doc.getSheetByName(USER_SHEET_UPDATE);
  
  let users = sheet.getRange(2,1, getLastRow(sheet), 5).getValues();
  let userObjs = {};
  //for each row in the 2d array from getValues();
  for(user of users){
    let userOb = {};
    userOb.name=user[1];
    userOb.cat=user[2];
    userOb.mvmnts=user[3];
    if(user[4]!= ''){
      userOb.txtOn=user[4];
    }

    userObjs[user.shift()]=userOb;
  }

  SCRIPT_PROP.setProperty("users", JSON.stringify(userObjs));
}

function getUser(phone){
  let users = JSON.parse(SCRIPT_PROP.getProperty('users'));
  let user = users[phone];
  user.phone = phone;

  if(typeof user == 'undefined'){
    user = false;
  }

  return user;
}
