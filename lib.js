window.indicatorAppURL = "https://script.google.com/macros/s/AKfycbwMab5-vIt3iyu7LxbswCpgsrAkgUU5-wLsiMjVJr425L9thAGPlHVMNHE3YMn4lTDo/exec";

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
    scope: './StatsCollector/'
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
  return JSON.parse(localStorage.getItem('SC_user'));
}
function setUser(user){
  localStorage.setItem('SC_user', JSON.stringify(user));
  return;
}

async function loadMovements(listOfMovementIDs){
  startSpin();
  var jqxhr = await $.ajax({
    url: window.indicatorAppURL,
    method: "GET",
    dataType: "json",
    data: "movements="+listOfMovementIDs
  }).done(function(data){
    console.log(data);
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
    setUser(data.user);
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
    setUser(data.user);
  });
  stopSpin();
  return jqxhr;
}
async function requestUser(userPhone, spin=true){
  if(spin) {startSpin();}
  var jqxhr = await $.ajax({
    url: window.indicatorAppURL,
    method: "GET",
    dataType: "json",
    data: "requestUser=true&userPhone="+userPhone
  }).done(function(data){
    console.log(data);
    let user = data.user;
    setUser(user);
    window.user = user;
    $('#startDate').val(user.lastUpdate);
    $('.startDate').text(user.lastUpdate);
  });
  if(spin) {stopSpin();}
  return jqxhr;
}

//ADD EVENT LISTENERS HASHCHANGE, AND setup variables
document.addEventListener("DOMContentLoaded", function(){
  window.addEventListener("hashchange", hashchanged, false);
  hashchanged();

  window.formSubs = {};

  //setup form listeners.
  var form = document.getElementById('onboard-form');
  if (form.attachEvent) {
      form.attachEvent("submit", processOnboardForm);
  } else {
      form.addEventListener("submit", processOnboardForm);
  }

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

//HASHCHANGE AND LOAD MOVEMENT LIST INTO MEMORY
async function hashchanged(){
  var hash = location.hash;
  let projector = document.getElementById('projector');

  //RESET CODE
  if(hash.startsWith('#reset')) {
    if(confirm('reset your local data?  You can still log back into your account afterward')){
      localStorage.removeItem('SC_user');
      location.hash = '#';
      location.reload();
    }
    else{
      location.hash = '#';
    }
    return;
  }

  //Make sure we've got a user.
  let local_user = getUser();
  if(local_user){
    if(!window.user){ //first time opening the website - let's check for changes to the user.
      console.log('requesting user', local_user.phone);
      await requestUser(local_user.phone);
    }
  }
  else if(!hash.startsWith('#onboarding')){
    console.log('redirecting to onboarding b/c no user exists');
    location.hash = "#onboarding";
    return;
  }

//IF BLANK WE START HERE>
  if(hash == ''){
    location.hash = '#locations/0/'+window.user.movements[0].id;
  }
//ONBOARDING!-----------------------------------------------------------------
  else if(hash.startsWith('#onboarding')){
    if(window.user){
      $('#notification').remove();
      $('#locations').prepend('<div id="notification">You visited an onboarding link. Click <a onclick="delete window.user; localStorage.removeItem(\'SC_user\'); $(\'#notification\').remove();" href="'+hash+'">here</a> to set up!</div>');
      location.hash = "";
      return;
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
      let movementsList = await loadMovements(movements);
      for(movement of movementsList) {
        $('#movements').append('<input id="n'+movement.id+'" name="'+movement.id+'" type="checkbox" ><label for="n'+movement.id+'" >'+movement.name+'</label>');
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
    let movement_num = parseInt(hash.split('/')[1]);

    //if we fail, redirect to first location
    try {
      if(user.movements.length == movement_num + 1){
        $('#movementNext').addClass('hideLeft');
        $('#movementSkip').text('Reset');
        $('#movementSubmit').text('Submit').removeClass('white');
      }
      else{
        $('#movementNext').removeClass('hideLeft');
        $('#movementSkip').text('Skip');
        $('#movementSubmit').text('Submit').addClass('white');
      }

      var movement = user.movements[movement_num];
      let strategy = user.movementStrategies[movement.strategy];
      $('.put_name').text(user.name);

      document.getElementById('strategyWelcomeText').innerHTML = strategy.welcomeText;
      document.documentElement.style.setProperty('--main-color', strategy.primaryColor);

      let statsListContent='';
      for(question of strategy.questions){
       statsListContent += `<div>
          <label for="${question.id}">${question.name}</label>
          <span rel="tooltip" title="${question.description.replace(/"/g,"'")}">i</span>
        </div>
        <div>
          <span class="dec button">-</span>
          <input id="${question.id}" name="${question.id}" type="number" min="0" max="100" step="1" inputmode="numeric" value="0">
          <span class="inc button">+</span>
        </div>`;
      }

      document.getElementById('statsList').innerHTML = statsListContent;
      setToolTips();

      let prefix = '';
      if(user.movements.length > 1){
        prefix = (movement_num + 1)+"/"+user.movements.length+" ";
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

      projector.classList = 'locations';
      window.document.title = "Enter Stats for "+movement.name;
    }
    catch(error){
      console.log(error);
      window.location.hash = '#locations/0/'+user.movements[0].id;
    }
  }
//SUMMARY!-----------------------------------------------------------------
  else if(hash.startsWith('#summary')) {
    if(window.groupNum){
      $('#personalEvangSum').text(window.groupNum.personalEvang+(window.groupNum.personalEvang != 1 ? ' people' : ' person' ));
      $('#holySpiritPresSum').text(window.groupNum.holySpiritPres+(window.groupNum.holySpiritPres != 1 ? ' people' : ' person' ));
      $('#personalEvangDecSum').text(window.groupNum.personalEvangDec+(window.groupNum.personalEvangDec != 1 ? ' people' : ' person' ));
      projector.classList = 'summary';
      window.document.title = "Stats Summary";
      window.groupNum = null;
    }
    else {
      location.hash = '#';
    }
  }
  else {
    location.hash = '#';
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
      return;
    }

    //we send in and add a new user
    if(register){
      let result = await registerUser(user.name, user.phone, user.locations);
      if(result.result != "success"){
        alert("I'm sorry that phone number is already registered with a name, if it's yours, try unchecking register, and click Setup Device");
        return;
      }
    }
    //OR we overwrite the existing.
    else {
      let result = await updateUser(user.phone, user.locations);
      if(result.result == "success"){
        console.log(result)
      }
      else {
        alert("I'm sorry that phone number is not yet registered! Go ahead and check 'Register as new user' and enter your name. \n\n OR if you entered your number wrong, please try again :)")
        return;
      }
    }
  }
  //attempt to load information from db
  else {
    console.log(user.phone);
    let result = await requestUser(user.phone);
    if(result.result == "success"){
      console.log('got the user from db');
    }
    else {
      alert("I'm sorry, that phone number is not registered.  Either you entered your number wrong, or you need to register.  To do so  please register using the custom link you were sent.")
      return
    }
  }

  //after all that we set the user and return
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
  window.formSubs[document.getElementById('movementId').value] = form.serialize();
  disabled.attr('disabled','disabled');

  let movement_num = parseInt(location.hash.split('/')[1]);

  //advance the location if we're at the end let's submit!
  if(!submit && user.movements.length != movement_num + 1){
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

  //submit everything - we can do this in one go.
  var jqxhr = await $.ajax({
    url: url,
    method: "GET",
    dataType: "json",
    data: Object.values(window.formSubs).join('+')
  }).done(function(data){
    console.log(data);
    window.groupNum = data.groupNum;
    location.hash = "#summary";
  });
  window.user.lastUpdate = new Date().toLocaleString().split(',')[0];
  window.formSubs = {}; //reset window.formSubs
  setUser(window.user);
  //THen change the location
  stopSpin();
}

function goToNextMovement() {
  $('input[type="number"]').val(0);

  $('#slideable').addClass('transition');
  setTimeout(function(){
    $('#slideable').removeClass("transition");
  }, 250);
  //$('#location-form').show( { direction: "right" }, 200);
  let movement_num = parseInt(location.hash.split('/')[1]);
  if(window.user.movements.length == movement_num + 1){
    movement_num = 0;
    window.formSubs = {};
  }
  else{
    movement_num += 1;
  }
  location.hash = "#locations/"+movement_num+"/"+user.movements[movement_num].id;
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
$( setToolTips());

function setToolTips() {
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
};
