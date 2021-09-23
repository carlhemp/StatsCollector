function toggleRegister(){
  if($('#register')[0].checked){
    $('#regUserName').prop('required',true); 
    $('#regUserName').show(); 
    $('#formSubmit span').show();
  }
  else{
    $('#regUserName').removeAttr('required'); 
    $('#regUserName').hide(); 
    $('#formSubmit span').hide();
  }
}
//SERVICE WORKER
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js', {
    scope: './'
  })
  .then((serviceWorker) => {
    console.log('service worker registration successful');
  })
  .catch((err) => {
    console.error('service worker registration failed');
    console.error(err);
  });
} else {
  console.log('service worker unavailable');
}

//HELPER FUNCTIONS FOR USER
function getUser(){
  return JSON.parse(localStorage.getItem('user'));
}
function setUser(user){
  localStorage.setItem('user', JSON.stringify(user));
  return;
}

async function loadMovements(){
  startSpin();
  var jqxhr = await $.ajax({
    url: window.indicatorAppURL,
    method: "GET",
    dataType: "json",
    data: "movements=true"
  }).done(function(data){
    window.movementsList = data;
  });
  stopSpin();
  return jqxhr;
}

async function registerUser(name, phone, locations){
  startSpin();
  var jqxhr = await $.ajax({
    url: window.indicatorAppURL,
    method: "GET",
    dataType: "json",
    data: "registerUser=true&userPhone="+phone+"&userName="+name+"&movementIds="+locations.map(loc => loc.id)
  }).done(function(data){
    console.log(data);
  });
  stopSpin();
  return jqxhr;
}
async function updateUser(phone, locations){
  startSpin();
  var jqxhr = await $.ajax({
    url: window.indicatorAppURL,
    method: "GET",
    dataType: "json",
    data: "updateUser=true&userPhone="+phone+"&movementIds="+locations.map(loc => loc.id)
  }).done(function(data){
    console.log(data);
  });
  stopSpin();
  return jqxhr;
}
async function requestUser(userPhone, spin=true){
  if(spin) {startSpin();}
  await loadMovements(); //needed for matching new locations as they're downloaded.
  var jqxhr = await $.ajax({
    url: window.indicatorAppURL,
    method: "GET",
    dataType: "json",
    data: "requestUser=true&userPhone="+userPhone
  }).done(function(data){
    console.log(data);
    let user = getUser();
    user.lastUpdate = data.user.userLastUpdate;
    user.locations = data.user.userIds.split(',').map(function(id){
        return {name: window.movementsList[id], id: id};
      });
    setUser(user);
    window.user = user;
    $('#startDate').val(user.lastUpdate);
    $('.startDate').text(user.lastUpdate);
  });
  if(spin) {stopSpin();}
  return jqxhr;
}

//INITIALIZE HASHCHANGE AND LOAD MOVEMENT LIST INTO MEMORY
document.addEventListener("DOMContentLoaded", function(){
  window.addEventListener("hashchange", hashchanged, false);
  hashchanged();

  //setup form listeners.
  var form = document.getElementById('onboard-form');
  if (form.attachEvent) {
      form.attachEvent("submit", processOnboardForm);
  } else {
      form.addEventListener("submit", processOnboardForm);
  }

  window.indicatorAppURL = "https://script.google.com/macros/s/AKfycbwMab5-vIt3iyu7LxbswCpgsrAkgUU5-wLsiMjVJr425L9thAGPlHVMNHE3YMn4lTDo/exec";


  //add +/- buttons to input[type="number"]
  $("#statsList").on("click", function(e) {
    if(e.target && e.target.classList.contains('button')){
      let $button = $(e.target);
      let oldValue = $button.parent().find("input").val();
      if ($button.text() == "+") {
        var newVal = parseFloat(oldValue) + 1;
      } else {
       // Don't allow decrementing below zero
        if (oldValue > 0) {
          var newVal = parseFloat(oldValue) - 1;
        } else {
          newVal = 0;
        }
      }
      $button.parent().find("input").val(newVal).trigger("change");
    }
  });
  $('#statsList').on("change", function(e) {
    if(e.target && e.target.nodeName == "INPUT") {
     
      //select all previous inputs and toggle on a notice/toolip if less than except for HS
      let SC = parseInt($('#spiritualConvo').val());
      let PE = parseInt($('#personalEvang').val());
      let PED = parseInt($('#personalEvangDec').val());
      if((SC < PE) || (SC < PED)){
        $('#spiritualConvo').parent().addClass('tooLow');
      } 
      else {
        $('#spiritualConvo').parent().removeClass('tooLow');
      }
      if(PE < PED){
        $('#personalEvang').parent().addClass('tooLow');
      } 
      else {
        $('#personalEvang').parent().removeClass('tooLow');
      }
    }
  });    
});

async function hashchanged(){
  var hash = location.hash;
  let projector = document.getElementById('projector');

  //Make sure we've got a user.
  let local_user = getUser();
  if(local_user){
    if(!window.user){ //first time opening the website - let's check for changes to the user.
      await requestUser(local_user.phone);
    }
  }
  else if(!hash.startsWith('#onboarding')){
    location.hash = "#onboarding";
    return
  }
  
//IF BLANK WE START HERE>
  if(hash == ''){
    location.hash = '#locations';
  }
//ONBOARDING!-----------------------------------------------------------------
  else if(hash.startsWith('#onboarding')){
    if(window.user){
      $('#notification').remove();
      $('#locations').prepend('<div id="notification">You visited an onboarding link. Click <a onclick="delete window.user; localStorage.removeItem(\'user\'); $(\'#notification\').remove();" href="'+hash+'">here</a> to set up!</div>');
      location.hash = "#locations";
      return
    }
    $('#movements').empty();
    $('input[type="checkbox"]').prop('checked', false);
    $('#regUserName').hide();
    $('#formSubmit span').hide();

    let movements = [];
    try {
      movements = hash.split('/')[1].split('&');
    }
    catch {
      movements = false; 
    }
    //then lets show our movements page
    if(movements){
      await loadMovements();
      for(movement of movements) {
        $('#movements').append('<input id="n'+movement+'" name="'+movement+'" type="checkbox" ><label for="n'+movement+'" >'+window.movementsList[movement]+'</label>');
      }
      $('.movementInfo').show();
      $('.loginInfo').hide();
    }
    //otherwise, lets login or add movements from a dropdown if/when that's added.
    else {
      $('.movementInfo').hide();
      $('.loginInfo').show();
      toggleRegister();
    }

    projector.classList = 'onboarding';
    window.document.title = "Let's get you onboarded!";
  }
//LOCATIONS!-----------------------------------------------------------------
  else if(hash.startsWith('#locations')){
    // #locations - start with current location
    let user = window.user;
    if(user.location == 0) {
      window.formSubs = [];
      requestUser(user.phone, false);
    }

    if(user.locations.length == user.location + 1){
      $('#movementNext').addClass('hideLeft');
      $('#movementSkip').text('Reset');
      $('#movementSubmit').text('Submit').removeClass('white');
    }
    else{
      $('#movementNext').removeClass('hideLeft');
      $('#movementSkip').text('Skip');
      $('#movementSubmit').text('Submit').addClass('white');
    }

    var movement = user.locations[user.location];
    $('.put_name').text(user.name); 

    let prefix = '';
    if(user.locations.length > 1){
      prefix = (user.location + 1)+"/"+user.locations.length+" ";
    }
    $('#movementName').text(prefix + movement.name);
    $('#movementId').val(movement.id); //hidden field
    $('#userName').val(user.name); //hidden field
    $('#userPhone').val(user.phone); //hidden field

    // set dates for the movement
    let endDate = new Date().toLocaleString().split(',')[0];
    let startDate = user.lastUpdate;

    $('#startDate').val(startDate);
    $('.startDate').text(startDate);
    $('#endDate').val(endDate);
    $('.endDate').text(endDate);

    // #locations/id_number - look up that id and display it - 2.0 capabilities

    projector.classList = 'locations';
    window.document.title = "Enter Stats for "+movement.name;
  }
//SUMMARY!-----------------------------------------------------------------
  else if(hash.startsWith('#summary')) {
    projector.classList = 'summary';
    window.document.title = "Stats Summary";
  }
}  
//PROCESS ONBOARDING FORM
async function processOnboardForm(e) {
  if (e.preventDefault) e.preventDefault();

  let user = {};
  let nameEl = document.getElementById('regUserName');
  let phoneEl = document.getElementById('regUserPhone');
  let register = document.getElementById('register').checked;

  user.name = nameEl.value;
  user.phone = phoneEl.value;
  user.locations = [];
  user.location = 0;


  let defaultMovements = false;
  //overwrites whatever is there... if username and phone are same, let's add new movements? If user exists, let's load the user name and phone to preload...
  try {
   defaultMovements = location.hash.split('/')[1].split('&').length > 0
  }
  catch {
    defaultMovements = false;
  }
  //we are overwriting existing movements or adding a user.
  if(defaultMovements){
    $('#movements input').each(function(){
      if(this.checked) {
        user.locations.push({name: $(this).next().text(), id: this.name})
      }
    });

    if(user.locations.length == 0) {
      alert('Select a movement friend!');
      return
    }

    //we send in and add a new user
    if(register){
      let result = await registerUser(user.name, user.phone, user.locations);
      user.lastUpdate = result.user.userLastUpdate;
      if(result.result != "success"){
        alert("I'm sorry that phone number is already registered with a name, if it's yours, try unchecking register, and click Setup Device");
        return
      }
    }
    //OR we overwrite the existing.
    else {
      let result = await updateUser(user.phone, user.locations);
      if(result.result == "success"){
        user.name = result.user.userName;
        user.lastUpdate = result.user.userLastUpdate;
      }
      else {
        alert("I'm sorry that phone number is not yet registered! Go ahead and check 'Register as new user' and enter your name. \n\n OR if you entered your number wrong, please try again :)")
        return
      }
      
    }
  }
  //attempt to load information from db
  else {
    await loadMovements();
    let result = await requestUser(user.phone);
    if(result.result == "success"){
      user.name = result.user.userName;
      user.locations = result.user.userIds.split(',').map(function(id){
        return {name: window.movementsList[id], id: id};
      });
      user.lastUpdate = result.user.userLastUpdate;
    }
    else {
      alert("I'm sorry, that phone number is not registered.  Either you entered your number wrong, or you need to register.  To do so  please register using the custom link you were sent.")
      return
    }
  }

  //after all that we set the user and return
  setUser(user);
  window.user = user;
  location.hash = "#";
  
  //clear form
  phoneEl.value = '';
  nameEl.value = '';
  $('input[type="checkbox"]').prop('checked', false);

  return false;
}

//PROCESS LOCATION FORM
function processLocationForm(submit) {
  let user = window.user;
  //save the data from the form for submittal later
  var form = $('#location-form');

  var disabled = form.find(':input:disabled').removeAttr('disabled');
  window.formSubs.push(form.serialize());
  disabled.attr('disabled','disabled');

  //advance the location if we're at the end let's submit!
  console.log(!submit, user.locations.length != user.location + 1)
  if(!submit && user.locations.length != user.location + 1){
    goToNextMovement();
  }
  
  //clear form
  $('input[type="checkbox"]').prop('checked', false);
  $('input[type="number"]').val(0);

  //clear notification
  $('#notification').remove();

}

//SUBMIT LOCATION FORM AFTER PROCESSING CURRENT PAGE
async function submitLocationForm(){
  processLocationForm(true);

  startSpin();
  var url  =  window.indicatorAppURL;
  
  //we're resetting location to 0
  window.user.location = 0;
  //submit everything - we can do this in one go.
  var jqxhr = await $.ajax({
    url: url,
    method: "GET",
    dataType: "json",
    data: window.formSubs.join('&')
  }).done(function(data){
    console.log(data);
  });
  $('#personalEvangSum').text(jqxhr.groupNum.personalEvang+(jqxhr.groupNum.personalEvang != 1 ? ' people' : ' person' ));
  $('#holySpiritPresSum').text(jqxhr.groupNum.holySpiritPres+(jqxhr.groupNum.holySpiritPres != 1 ? ' people' : ' person' ));
  $('#personalEvangDecSum').text(jqxhr.groupNum.personalEvangDec+(jqxhr.groupNum.personalEvangDec != 1 ? ' people' : ' person' ));
  window.user.lastUpdate = new Date().toLocaleString().split(',')[0];
  setUser(window.user);
  //THen change the location
  location.hash = "#summary";
  stopSpin();
}

function goToNextMovement() {
  $('input[type="number"]').val(0);

  $('#slideable').addClass('transition');
  setTimeout(function(){
    $('#slideable').removeClass("transition");
  }, 250);
  //$('#location-form').show( { direction: "right" }, 200);
  if(window.user.locations.length == user.location + 1){
    window.user.location = 0;
  }
  else{
    window.user.location = user.location + 1;
  }
  location.hash = "#locations/"+user.locations[user.location].id;
}

function startSpin() {
  document.getElementById('spin-container').classList = "spin";
}
function stopSpin() { 
  document.getElementById('spin-container').classList = "";
}

function setCalendarReminder(){
  let details = encodeURI("Time to celebrate what God is doing on your campus with your team!\n\nhttps://carlhemp.github.io/StatsSPRINT/");
  //get's the next selected date
  var d = new Date();
  d.setDate(d.getDate() + (parseInt($('input[name="weekday"]:checked').val()) + 7 - d.getDay()) % 7);

  let date = (new Date(d.getMonth()+1+'/'+d.getDate()+'/'+d.getFullYear()+' '+$('#reminderTime').val())).toISOString().replace(/-|:|\.\d\d\d/g,"");
  let title = encodeURI("Time to celebrate what God is doing on your campus with your team!");

  let url = 'https://www.google.com/calendar/render?action=TEMPLATE&text='+
    title+'&dates='+date+'/'+date+
  '&details='+details+'&recur=RRULE:FREQ=WEEKLY&location=&sf=true&output=xml'
  window.open(url);

  $('#hiddenReminder').hide();
  $('#blurBackground').hide();
}
async function setTextReminder(){
  startSpin();
  let weekMap = {0: 'Sunday', 1: 'Monday', 2: 'Tuesday', 3: 'Wednesday', 4: 'Thursday', 5: 'Friday', 6: 'Saturday'};
  let time = weekMap[parseInt($('input[name="weekday"]:checked').val())]+' '+$('#reminderTime').val();

  var jqxhr = await $.ajax({
    url: window.indicatorAppURL,
    method: "GET",
    dataType: "json",
    data: "updateUser=true&userPhone="+window.user.phone+"&txtReminderTime="+encodeURI(time+' '+Intl.DateTimeFormat().resolvedOptions().timeZone)
  }).done(function(data){
    console.log(data);
    if(data.result=="success"){
      alert('Text Reminders are set for: '+time+ '\n\nRespond to a text with "STOP" to stop at any time');
    }
    else{
      alert('Could not complete your request');
    }
    $('#blurBackground').click();
  });
  stopSpin();
}

//TOOLTIP CODE
$( function() {
  var targets = $( '[rel~=tooltip]' ), 
    target  = false,
    tooltip = false,
    title   = false;

  targets.bind( 'mouseenter', function() {
    target  = $( this );
    tip     = target.attr( 'title' );
    tooltip = $( '<div id="tooltip"></div>' );

    if( !tip || tip == '' ) {
      return false;
    }

    target.removeAttr( 'title' );
    tooltip.css( 'opacity', 0 )
           .html( tip )
           .appendTo( 'body' );

    var init_tooltip = function() {
      if( $( window ).width() < tooltip.outerWidth() * 1.5 ) {
        tooltip.css( 'max-width', $( window ).width() / 2 );
      }
      else {
        tooltip.css( 'max-width', 340 );
      }

      var pos_left = target.offset().left + ( target.outerWidth() / 2 ) - ( tooltip.outerWidth() / 2 );
      var pos_top  = target.offset().top - tooltip.outerHeight() - 20;

      if( pos_left < 0 )
      {
        pos_left = target.offset().left + target.outerWidth() / 2 - 20;
        tooltip.addClass( 'left' );
      }
      else {
        tooltip.removeClass( 'left' );
      }

      if( pos_left + tooltip.outerWidth() > $( window ).width() ) {
        pos_left = target.offset().left - tooltip.outerWidth() + target.outerWidth() / 2 + 20;
        tooltip.addClass( 'right' );
      }
      else {
        tooltip.removeClass( 'right' );
      }

      if( pos_top < 0 ) {
        var pos_top  = target.offset().top + target.outerHeight();
        tooltip.addClass( 'top' );
      }
      else {
        tooltip.removeClass( 'top' );
      }

      tooltip.css( { left: pos_left, top: pos_top } ).animate( { top: '+=10', opacity: 1 }, 50 );
    };

    init_tooltip();
    $( window ).resize( init_tooltip );

    var remove_tooltip = function() {
      tooltip.animate( { top: '-=10', opacity: 0 }, 50, function() {
        $( this ).remove();
      });

      target.attr( 'title', tip );
    };

    target.bind( 'mouseleave', remove_tooltip );
    tooltip.bind( 'click', remove_tooltip );
  });
});