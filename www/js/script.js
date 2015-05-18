var name = "lol";
var roomID = 0;
var score = 0;
var newUsernameInput = $("#new-username");
var homeScreen = $("#home-screen");
var room = $("#room");
var backBtn = $("#back-button");
var startBtn = $("#start-button");
var createRoomBtn = $("#create-room");
var enterRoomBtn = $("#enter-room");
var enterBtn = $("#enter-button");
var roomIdInput = $("#room-id-input");
var vibrateBtn = $("#vibrate");
var johninfo = $("#john-info");
var nonjohninfo = $("#non-john-info"); 
var yourScore = $("#your-score"); 

var yawSpan = $("#yaw");
var pitchSpan = $("#pitch");
var rollSpan = $("#roll");

var dir = 0;
var tiltFB = 0;
var tiltLR = 0;

var oldCoords = {};
var newCoords = {};

var yawCheck = false;
var rollCheck = false;
var pitchCheck = false;

var roundStarted = false;
var johnState = null;
var iWasJohn = false;
var iAmJohn = false;

if (window.hyper && window.hyper.log) { console.log = hyper.log }

// Wait for device API libraries to load
document.addEventListener("deviceready", onDeviceReady, false);

// device APIs are available
function onDeviceReady() {
	// Throw an error if no update is received every 2.5 seconds
	var options = { timeout: 2500 };
    watchID = navigator.geolocation.watchPosition(setCoords, positionErrorHandler, options);
}

var setCoords = function(position) {
	console.log("Latitude: "+position.coords.latitude)
	console.log("Longitude: "+position.coords.longitude)
	newCoords = position.coords;
	oldCoords = {
		latitude: position.coords.latitude+0.0001,
		longitude: position.coords.longitude+0.0001
	};
	var distance = calculateDistance(oldCoords.latitude, oldCoords.longitude,
		newCoords.latitude, newCoords.longitude);
	console.log("distance: "+distance);
}

var positionErrorHandler = function(error) {
	alert('code: '    + error.code    + '\n' +
		'message: ' + error.message + '\n');
}

function calculateDistance(lat1, lon1, lat2, lon2) {
	var R = 6371; // km
	var dLat = (lat2 - lat1).toRad();
	var dLon = (lon2 - lon1).toRad(); 
	var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
		Math.cos(lat1.toRad()) * Math.cos(lat2.toRad()) * 
		Math.sin(dLon / 2) * Math.sin(dLon / 2); 
	var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)); 
	var d = R * c;
	// return in meters
	return d*1000;
}

Number.prototype.toRad = function() {
	return this * Math.PI / 180;
}

if (window.DeviceOrientationEvent) {
	if (navigator.userAgent.match(/(iPad|iPhone|iPod)/g)) {
		var deviceOrientation = FULLTILT.getDeviceOrientation({'type': 'world'});

		deviceOrientation.then(
			function(orientationData) {
				orientationData.listen(function() {
					// Use `orientationData` object to interact with device orientation sensors
					var screenAdjustedEvent = orientationData.getFixedFrameEuler();

					dir = Math.round(screenAdjustedEvent.alpha);
					yawSpan.text(dir);

					tiltFB = Math.round(screenAdjustedEvent.beta);
		    		pitchSpan.text(tiltFB);

					tiltLR = Math.round(screenAdjustedEvent.gamma);
		    		rollSpan.text(tiltLR);

		    		if (roundStarted) {
		    			compareState(johnState);
		    		}
		    	});
			}).catch(function(message) {
				// Device Orientation Events are not supported
	    }
	  );
	} else {
		window.addEventListener('deviceorientation', function(event) {
	    // gamma is the left-to-right tilt in degrees, where right is positive
	    tiltLR = Math.round(event.gamma);
	    rollSpan.text(tiltLR);

	    // beta is the front-to-back tilt in degrees, where front is positive
	    tiltFB = Math.round(event.beta);
	    pitchSpan.text(tiltFB);

	    // alpha is the compass direction the device is facing in degrees
	    if(event.webkitCompassHeading) {
        // Apple works only with this, alpha doesn't work
        dir = Math.round(event.webkitCompassHeading);
      } else {
        dir = Math.round(event.alpha);
      }
	    yawSpan.text(dir);

	    if (roundStarted) {
    		compareState(johnState);
    	}
	  }, false);
	}
}

// get/create/store username
var username = PUBNUB.db.get('session') || (function(){ 
	var uuid = PUBNUB.uuid(); 
	PUBNUB.db.set('session', uuid); 
	return uuid; 
})();

// initiate pubnnub with username
var pubnub = PUBNUB.init({
	publish_key   : "pub-c-c5851931-b8a6-414a-97c8-292c78141e1a",
	subscribe_key : "sub-c-7786f29c-e506-11e4-bb49-0619f8945a4f",
	origin        : 'pubsub.pubnub.com',
	ssl           : true,
	uuid          : username
});
console.log("username:",username);

newUsernameInput.on('keydown', function(e) {
	if (newUsernameInput.val().length > 0 && (e.keyCode === 9 || e.keyCode == 13)) {
		setName(newUsernameInput.val());
	}
});

$("#new-username-button").on('click', function() {
	if (newUsernameInput.val().length > 0) {
		setName(newUsernameInput.val());
	}
});

var setName = function(newName) {
	name = newName;
	// var stateObj = { page: "home-screen" };
	// history.pushState(stateObj, "home-screen", "#home-screen");
	$("#home-screen .username").text(name);
	$("#start-screen").removeClass("page-active");
	homeScreen.addClass("page-active");
}

vibrateBtn.on('click', function() {
	if (navigator.userAgent.match(/(iPad|iPhone|iPod)/g)) {
		navigator.notification.vibrate(200);
	} else {
		navigator.notification.vibrate([100,200,50,200,100]);
	}
});

backBtn.on('click', function() {
	goToHomeScreen();
});

createRoomBtn.on('click', function() {
	var name = $("new-username").val();
	score = 0; //Reset score
	roomID = Math.floor(Math.random() * 10000); // A random 4 digit number as channel name
	if (roomID < 1000) {
		if (roomID > 99) {
			roomID = "0"+roomID;
		} else if (roomID > 9) {
	  		roomID = "00"+roomID;
	  	} else {
	  		roomID = "000"+roomID;
	  	}
	}
	pubnub.subscribe({
	  	channel   : "mirrorRoom" + roomID,
	  	timetoken : new Date().getTime(),
	  	message: checkMessage,
	  	presence: checkPresence,
	  	state: {
	  		name : name,
	  		john : true,
	  		go: false,
	  		score : score
	  	},
	    heartbeat: 6
	});
	iWasJohn = true;
	iAmJohn = true;
	homeScreen.removeClass("page-active");
	room.addClass("page-active");
	backBtn.removeClass("hidden");
	$("#room-id").text(roomID);
	startBtn.removeClass("hidden");
	johninfo.removeClass("hidden");
});

startBtn.on('click', function() {
	$("#room-info").addClass("hidden");
	$("#game").removeClass("hidden");
	johninfo.addClass("hidden");
	poseTimer(5);
});

var poseTimer = function(time) {
	if (time > 0) {
		$("#timer").addClass("timerAnimation")
		setTimeout(function() {poseTimer(time-1)}, 1000);
		$("#timer").text(time);
		if (time <= 3) {
			$("#timer").addClass("rednumbers");
		}
	} else if (time < 1 && roundStarted == false) {
		startGame();
		$("#timer").removeClass("rednumbers");
		$("#timer").removeClass("timerAnimation");
		$("#timer").text("Wait...");
	} else if (time < 1 && roundStarted == true) {
		$("#timer").removeClass("rednumbers");
	 	$("#timer").removeClass("timerAnimation");
	 	$("#timer").text("Wait...");
	 	checkPose();
	}
}

var startGame = function() {
	console.log("yaw");console.log(dir);
	console.log("pitch");console.log(tiltFB);
	console.log("roll");console.log(tiltLR);
	pubnub.state({
		channel: "mirrorRoom" + roomID,
		uuid: username,
		state: {
			name: name,
			score: score,
  			john: true,
  			go: true,
  			yaw: dir,
  			pitch: tiltFB,
  			roll: tiltLR
		},
		callback: function(m){console.log(JSON.stringify(m))}
	});
	roundEnded(true);
}

enterRoomBtn.on('click', function() {
	$("#room-buttons-container").addClass("hidden");
	$("#enter-room-container").removeClass("hidden");
	backBtn.removeClass("hidden");
});

enterBtn.on('click', function() {
	enterRoom();
});

roomIdInput.on('keydown', function(e) {
	if (e.keyCode === 9 || e.keyCode === 13) {
		e.preventDefault();
		enterRoom();
	}
});

var enterRoom = function() {
	roomID = roomIdInput.val();
	if (roomID.length == 4) {
		checkRoom();
	} else {
		$("#enter-error").html("Room ID is always<br>between 0000-9999.");
	}
}

// Check if room exists, subscribes to it if exists
var checkRoom = function() {
	pubnub.here_now({
		channel : "mirrorRoom" + roomID,
		callback : function(m) {
			var numUsers = m.occupancy;
			console.log("numUsers:",numUsers)
			if (numUsers < 1) {
		    console.log("No one here");
		    $("#enter-error").text(roomID+" does not exist.");
			} else {
				homeScreen.removeClass("page-active");
				room.addClass("page-active");
				$("#room-id").text(roomID);
				subscribeToRoom();
				$("#enter-error").text("");
			}
		}
	});
}

var checkMessage = function(m){

	console.log(m)
	console.log("NEW MESSAGE MUTFAFAKACA")
	if (m.user == username){
		iAmJohn = true;
		pubnub.state({
		    channel  : "mirrorRoom" + roomID,
		    uuid: username, 
		    state    : {
		     	name : name,
				go: false,
				john: iAmJohn,
				score : score
		 	},
		    callback : function(m){console.log(m)},
		    error    : function(m){console.log(m)}
		});
	}
}

var checkPresence = function(message){
	console.log("presence",message);
	nonjohninfo.removeClass("hidden");
	// // check state updates
	if (message.action == "state-change") {
		console.log("STATE CHANGE!");
		var stateChange = message.data;
		if (iWasJohn == false){
			if (stateChange.john == true && stateChange.go == true) {

				pubnub.state({
				   channel  : "mirrorRoom" + roomID,
				   state : {
				   	name : name,
					go: false,
					john: iAmJohn,
					score : score
				   },
				   error    : function(m){console.log(m)}
				});


				$("#room-info").addClass("hidden");
				$("#game").removeClass("hidden");
				nonjohninfo.addClass("hidden");
				roundStarted = true;
				poseTimer(10);
				johnState = stateChange;
			}
		}
		else{
			iWasJohn = false;
		}
	}
	else{
		console.log(message.occupancy);
		$("#num-users").text(message.occupancy);
		yourScore.text(score);
	}
}

// Subscribe to an existing room
var subscribeToRoom = function() {
	score = 0; //Reset score
	console.log("entering room");
	pubnub.subscribe({
  	channel   : "mirrorRoom" + roomID,
  	timetoken : new Date().getTime(),
  	message: checkMessage,
  	presence: checkPresence,
  	state: {
			name : name,
			john : false,
			go: false,
			score : score
		},
    heartbeat: 6
  });
}

// Compare user's orientation to those of John
var compareState = function(state) {
	if (angleBetween(dir,state.yaw-25,state.yaw+25)) {
		yawSpan.text("YEAH!");
		yawCheck = true;
	} else {
		yawSpan.text(":(");
		yawCheck = false;
	}

	if (angleBetween(tiltFB+180,state.pitch-10+180,state.pitch+10+180)) {
		pitchSpan.text("YEAH!");
		pitchCheck = true;
	} else {
		pitchSpan.text(":(");
		pitchCheck = false;
	}

	if (angleBetweenRoll(tiltLR+90,state.roll-10+90,state.roll+10+90)) {
		rollSpan.text("YEAH!");
		rollCheck = true;
	} else {
		rollSpan.text(":(");
		rollCheck = false;
	}
	colorYPR(state);
	// console.log("yawCheck:", yawCheck);
	// console.log("pitchCheck:", pitchCheck);
	// console.log("rollCheck:", rollCheck);
}

var colorYPR = function(state){
	var pitchAlpha = 1-(smallestAngle(tiltFB, state.pitch, 180)/180);
	var rollAlpha =	1-(smallestAngle(tiltLR, state.roll, 90)/90);
	var yawAlpha = 1-(smallestAngle(dir, state.yaw, 360)/180);

	pitchSpan.css("background-color", "rgba("+(255-(pitchAlpha*255))+","+(pitchAlpha*255)+",0,1");
	rollSpan.css("background-color", "rgba("+(255-(rollAlpha*255))+","+(rollAlpha*255)+",0,1)");
	yawSpan.css("background-color", "rgba("+(255-(yawAlpha*255))+","+(yawAlpha*255)+",0,1)");
}

var smallestAngle = function(a, b, maxangle) {
	var angle1 = Math.abs(a - b);

	if (a < 0) {
		a += maxangle*2;
	}
	if (b < 0) {
		a += maxangle*2;
	}

	if(maxangle === 360){
		if (a > 180) {
		a -= 360;
		}
		if (b > 180) {
		a -= 360;
		}
		var angle2 = Math.abs(a - b);
	} else {
		var angle2 = Math.abs(a - b);
	}

	
	if (angle1 < angle2) {
		return angle1
	} else {
		return angle2
	}
}

// Check if angle "n" is between a and b
// Angles should be between 0-360
var angleBetween = function(n, a, b) {
	n = (360 + (n % 360)) % 360;
	a = (3600000 + a) % 360;
	b = (3600000 + b) % 360;

	if (a < b) {
		return n >= a && n <= b;
	} else {
		return n >= a || n <= b;
	}
}

// Check if angle "n" is between a and b
// Angles should be between 0-180
var angleBetweenRoll = function(n, a, b) {
	n = (180 + (n % 180)) % 180;
	a = (1800000 + a) % 180;
	b = (1800000 + b) % 180;

	if (a < b) {
		return n >= a && n <= b;
	} else {
		return n >= a || n <= b;
	}
}

var checkPose = function() {

	if (yawCheck == true && pitchCheck == true && rollCheck == true) {
		$("#timer").text("Good job!");
		score += 1;
	} else {
		$("#timer").text("Ooops, so close!");
		//navigator.notification.vibrate(200);
		score -= 1;
	}
	roundEnded(false);
}

var checkPeople = function(){
	pubnub.here_now({
	    channel : "mirrorRoom" + roomID,
	    callback : function(m){
	    	//console.log('Here now: ',JSON.stringify(m))
	    	$('#user-list').empty();
	    	for(i=0; i<m.uuids.length; i++){
	    		//console.log(m.uuids[i].state.name)
	    		$('#user-list').append('<li>'+m.uuids[i].state.name+' Scr: '+m.uuids[i].state.score+'</li>');
	    	}
	    },
	    state : true
	});
}

var getRandomUuid = function(len,selfPos){

	randomJohn = Math.floor(Math.random()*len);

	if(selfPos == randomJohn){
		return getRandomUuid(len,selfPos)
	}
	else{
		return randomJohn
	}
}

var roundEnded = function(amIJohn){

	console.log("roundEnded")
	roundStarted = false;
	$("#room-info").removeClass("hidden").delay(500);
	$("#game").addClass("hidden").delay(500);
	nonjohninfo.removeClass("hidden").delay(500);
	yourScore.text(score);

	if(amIJohn){
		console.log("I was John")
		var randomJohn;
		var newJohn;

		pubnub.here_now({
		    channel : "mirrorRoom" + roomID,
		    callback : function(m){
		    	console.log(m)
		    	var selfPos;

		    	for(i = 0; i < m.uuids.length; i++){
		    		if(m.uuids[i] == username){
		    			selfPos = i;
		    		}
		    	}

		    	randomJohn = getRandomUuid(m.uuids.length,selfPos);
		    	console.log("randomJohn ",randomJohn)
		    	newJohn = m.uuids[randomJohn];
		    	console.log("newJohn ",newJohn)

				if (username == newJohn){
					console.log("I became john again!")
					startBtn.removeClass("hidden");
					johninfo.removeClass("hidden");
				}
				else{
					iAmJohn = false;

					pubnub.state({
					    channel  : "mirrorRoom" + roomID,
					    uuid: username, 
					    state    : { 
					    	name : name,
					  		john : iAmJohn,
					  		go: false,
					  		score : score
					    },
					    callback : function(m){
					    	checkPeople();
					    	console.log(m)
					    },
					    error    : function(m){console.log(m)}
					});

					pubnub.publish({
						channel : "mirrorRoom" + roomID,
						message : {user: newJohn}
					});

					startBtn.addClass("hidden");
					johninfo.addClass("hidden");
				}
		    }
		});
	}
	else{
		console.log('I was not John')

		 pubnub.state({
		   channel  : "mirrorRoom" + roomID,
		   uuid     : username,
		   callback : function(m){
		   		console.log(m)
		   		console.log("checking if im john", username)
		   		if (m.john == true){
		   			console.log("I am new john")
					johninfo.removeClass("hidden");
					startBtn.removeClass("hidden");
					iWasJohn = true;
					iAmJohn = true;
		   		}
		   		checkPeople();
		   },
		   error    : function(m){console.log(m)}
		 });
	}

}

var goToHomeScreen = function() {
	$("#enter-room-container").addClass("hidden");
	$("#room-buttons-container").removeClass("hidden");
	backBtn.addClass("hidden");
	room.removeClass("page-active");
	homeScreen.addClass("page-active");
	$("#game").addClass("hidden");
	$("#room-info").removeClass("hidden");
	setTimeout(function() {
		pubnub.unsubscribe({
			channel: "mirrorRoom" + roomID
		});
		console.log("goodbye");
	},100);
}
