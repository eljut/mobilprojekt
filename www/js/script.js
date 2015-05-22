var name = "Awwyeah";
var roomID = 0;
var score = 0;
var addedScore = 0;

var loading = $("#loading");
var newUsernameInput = $("#new-username");
var homeScreen = $("#home-screen");
var enterRoomScreen = $("#enter-room-screen");
var room = $("#room");
var backBtn = $("#back-button");
var startBtn = $("#start-button");
var createRoomBtn = $("#create-room");
var enterRoomBtn = $("#enter-room");
var enterGeoRoomBtn = $("#enter-geo-room");
var enterBtn = $("#enter-button");

var roomIdInput = $("#room-id-input");
var johninfo = $("#john-info");
var nonjohninfo = $("#non-john-info"); 
var yourScore = $("#your-score"); 

var yawDiv = $("#yaw");
var pitchDiv = $("#pitch");
var rollDiv = $("#roll");
var distanceDiv = $("#distance");

var yawBG = $("#yawBG");
var pitchBG = $("#pitchBG");
var rollBG = $("#rollBG");
var distanceBG = $("#distanceBG");

var dir = 0;
var tiltFB = 0;
var tiltLR = 0;
var distance = 0;

var oldCoords = {};
var newCoords = {};

var yawCheck = false;
var rollCheck = false;
var pitchCheck = false;
var distanceCheck = false;

var roundStarted = false;
var johnState = null;
var iWasJohn = false;
var iAmJohn = false;

if (window.hyper && window.hyper.log) { console.log = hyper.log }

// Wait for device API libraries to load
document.addEventListener("deviceready", onDeviceReady, false);

// device APIs are available
function onDeviceReady() {
	// Throw an error if no update is received every 4 seconds
	var options = { timeout: 4000 };
    watchID = navigator.geolocation.watchPosition(setNewCoords, positionErrorHandler, options);

    document.addEventListener('backbutton', function () {
    	if (homeScreen.hasClass("page-active") || $("#start-screen").hasClass("page-active")) {
    		navigator.app.exitApp();
    	} else {
    		goToHomeScreen();
    	}
	}, false);

    // Device orientation
	if (window.DeviceOrientationEvent) {
		if (navigator.userAgent.match(/(iPad|iPhone|iPod)/g)) {
			var deviceOrientation = FULLTILT.getDeviceOrientation({'type': 'world'});

			deviceOrientation.then(
				function(orientationData) {
					orientationData.listen(function() {
						// Use 'orientationData' object to interact with device orientation sensors
						var screenAdjustedEvent = orientationData.getFixedFrameEuler();

						dir = Math.round(screenAdjustedEvent.alpha);
						yawDiv.text(dir);

						tiltFB = Math.round(screenAdjustedEvent.beta);
			    		pitchDiv.text(tiltFB);

						tiltLR = Math.round(screenAdjustedEvent.gamma);
			    		rollDiv.text(tiltLR);

			    		distance = calculateDistance(
			    			oldCoords.latitude,
			    			oldCoords.longitude,
			    			newCoords.latitude,
			    			newCoords.longitude);
			    		distanceDiv.text(distance);

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
		    rollDiv.text(tiltLR);

		    // beta is the front-to-back tilt in degrees, where front is positive
		    tiltFB = Math.round(event.beta);
		    pitchDiv.text(tiltFB);

		    // alpha is the compass direction the device is facing in degrees
	       	dir = Math.round(event.alpha);
		    yawDiv.text(dir);

		    if (roundStarted) {
	    		compareState(johnState);
	    	}
		  }, false);
		}
	}
}

// Set newCoords to position.coords
var setNewCoords = function(position) {
	newCoords = position.coords;
	$("#no-position").addClass("hidden");
}

// Set oldCoords to position.coords
var setOldCoords = function(position) {
	//console.log("oldCoords set");
	oldCoords = position.coords;
}

// Error handler for geolocation position
var positionErrorHandler = function(error) {
	console.log("no position");
	//$("#no-position").removeClass("hidden");
}

// Calculates the distance in meters between position (Lat1, Lon1) and position (Lat2, Lon2)
// http://www.movable-type.co.uk/scripts/latlong.html
function calculateDistance(lat1, lon1, lat2, lon2) {
	var R = 6371*1000; // mean radius of earth
	var dLat = (lat2 - lat1).toRad();
	var dLon = (lon2 - lon1).toRad(); 
	var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
		Math.cos(lat1.toRad()) * Math.cos(lat2.toRad()) * 
		Math.sin(dLon / 2) * Math.sin(dLon / 2); 
	var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)); 
	var d = R * c;
	return Math.round(d);
}

// Number method for converting degrees to radians
Number.prototype.toRad = function() {
	return this * Math.PI / 180;
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
console.log("username: "+username);

newUsernameInput.on('keydown', function(e) {
	if (newUsernameInput.val().length > 0 && (e.keyCode === 9 || e.keyCode === 13)) {
		setName(newUsernameInput.val());
	}
});

$("#new-username-button").on('click', function() {
	if (newUsernameInput.val().length > 0) {
		setName(newUsernameInput.val());
	}
});

// Set the user's name and go to home-screen
var setName = function(newName) {
	name = newName;
	$("#home-screen .username").text(name);
	$("#start-screen").removeClass("page-active");
	homeScreen.addClass("page-active");
}

backBtn.on('click', function() {
	goToHomeScreen();
});

startBtn.on('click', function() {
	// Get starting coords
	navigator.geolocation.getCurrentPosition(setOldCoords, positionErrorHandler);
	$("#room-info").addClass("hidden");
	$("#game").removeClass("hidden");
	johninfo.addClass("hidden");
	poseTimer(5);
});

// Timer for posing, time is how many seconds are left
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

// For use when John's timer has ended
// Sets John's state in pubnub so other players can follow his pose
var startGame = function() {
	distance = calculateDistance(oldCoords.latitude,
  				oldCoords.longitude,
  				newCoords.latitude,
  				newCoords.longitude);
	console.log("distance: "+distance);
	console.log("yaw "+dir);
	console.log("pitch "+tiltFB);
	console.log("roll "+tiltLR);
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
  			roll: tiltLR,
  			distance: distance
		},
		callback: function(m){console.log(JSON.stringify(m))}
	});
	roundEnded(true);
}

// Creates a game room that other players can enter
var createRoom = function(){
	score = 0; //Reset score
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
	enterRoomScreen.removeClass("page-active");
	backBtn.removeClass("hidden");
	$("#room-id").text(roomID);
	nonjohninfo.addClass("hidden");
	startBtn.addClass("hidden");
	johninfo.removeClass("hidden");
	$("#enter-error").text("");
}

createRoomBtn.on('click', function() {
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
	createRoom();
});

enterRoomBtn.on('click', function() {
	homeScreen.removeClass("page-active");
	enterRoomScreen.addClass("page-active");
	$('#user-list').empty();
	backBtn.removeClass("hidden");
});

enterBtn.on('click', function() {
	enterRoom(roomIdInput.val());
});

roomIdInput.on('keydown', function(e) {
	if (e.keyCode === 9 || e.keyCode === 13) {
		e.preventDefault();
		enterRoom(roomIdInput.val());
	}
});

// Tries to enter the newID room, newID is a number between 0000-9999
var enterRoom = function(newID) {
	roomID = newID;
	if (roomID.length == 4) {
		checkRoom(false);
	} else {
		$("#enter-error").html("Room ID is always<br>between 0000-9999.");
	}
}

// Check if room exists, subscribes to it if exists
// If you are checking using geohashing, it creates a new room if it doesn't exist
var checkRoom = function(isGeohash) {
	pubnub.here_now({
		channel : "mirrorRoom" + roomID,
		callback : function(m) {
			loading.addClass("hidden");
			var numUsers = m.occupancy;
			console.log("numUsers: "+numUsers)
			if (numUsers < 1 || numUsers === undefined) {
				if(isGeohash) {
					createRoom();
				} else {
			    	console.log("No one here");
			    	$("#enter-error").text(roomID+" does not exist.");
			    }
			} else {
				enterRoomScreen.removeClass("page-active");
				room.addClass("page-active");
				$("#room-id").text(roomID);
				subscribeToRoom();
				$("#enter-error").text("");
			}
		}
	});
}

enterGeoRoomBtn.on('click', function() {
	homeScreen.removeClass("page-active");
	loading.removeClass("hidden");
	$('#user-list').empty();
	backBtn.removeClass("hidden");
	getLocation();
});

// Get geolocation and enter geohash room
function getLocation() {
	if (navigator.geolocation) {
	    navigator.geolocation.getCurrentPosition(usePosition);
	} else {
	    console.log("Geolocation is not supported by this browser.");
	}
}

// Enter geohash room
function usePosition(pos) {
	roomID = geohash( pos.coords.latitude, 1 ) + '' + geohash( pos.coords.longitude, 1 );
	console.log("Geo RoomID",roomID)
	checkRoom(true);
}

// Function for getting geohash
function geohash( coord, resolution ) {
	var rez = Math.pow( 10, resolution || 0 ); 
	return Math.floor(coord * rez) / rez; 
}

// Function to check if current user is the new John
// If true change state
var checkMessage = function(m){
	console.log(m)
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
	console.log("presence: "+message);

	setTimeout(checkPeople,200);
	// check state updates
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
				navigator.geolocation.getCurrentPosition(setOldCoords, positionErrorHandler);
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
		yourScore.text(addedScore);
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
	nonjohninfo.removeClass("hidden");
	startBtn.addClass("hidden");
	johninfo.addClass("hidden");
}

// Compare user's orientation and distance traveled to those of John
var compareState = function(state) {
	// Compare yaw-angles
	if (angleBetween(dir,state.yaw-25,state.yaw+25,360)) {
		yawBG.css("background-color", "lime");
		yawCheck = true;
	} else {
		yawBG.css("background-color", "#dddddd");
		yawCheck = false;
	}

	// Compare pitch-angles
	if (angleBetween(tiltFB+180,state.pitch-10+180,state.pitch+10+180,360)) {
		pitchBG.css("background-color", "lime");
		pitchCheck = true;
	} else {
		pitchBG.css("background-color", "#dddddd");
		pitchCheck = false;
	}

	// Compare roll-angles
	if (angleBetween(tiltLR+90,state.roll-10+90,state.roll+10+90,180)) {
		rollBG.css("background-color", "lime");
		rollCheck = true;
	} else {
		rollBG.css("background-color", "#dddddd");
		rollCheck = false;
	}

	// Compare distance traveled
	distance = calculateDistance(oldCoords.latitude,
  				oldCoords.longitude,
  				newCoords.latitude,
  				newCoords.longitude);
	if (distance-state.distance < 20 && distance-state.distance > -20) {
		distanceBG.css("background-color", "lime");
		distanceCheck = true;
		distanceDiv.text(state.distance);
	} else {
		distanceBG.css("background-color", "#dddddd");
		distanceCheck = false;
		distanceDiv.text(distance-state.distance);
		console.log("difference: "+distance-state.distance);
	}

	colorYPR(state);
}

// Set color of yaw, pitch and roll Divs
var colorYPR = function(state){
	var pitchAlpha = 1-(smallestAngle(tiltFB, state.pitch, 180)/180);
	var rollAlpha =	1-(smallestAngle(tiltLR, state.roll, 90)/90);
	var yawAlpha = 1-(smallestAngle(dir, state.yaw, 360)/180);

	pitchDiv.css("background-color", "rgba(0,255,0,"+pitchAlpha+")");
	rollDiv.css("background-color", "rgba(0,255,0,"+rollAlpha+")");
	yawDiv.css("background-color", "rgba(0,255,0,"+yawAlpha+")");
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
var angleBetween = function(n, a, b, maxangle) {
	n = (maxangle + (n % maxangle)) % maxangle;
	a = (maxangle * 10000 + a) % maxangle;
	b = (maxangle * 10000 + b) % maxangle;

	if (a < b) {
		return n >= a && n <= b;
	} else {
		return n >= a || n <= b;
	}
}

// Used for adding to or subtracting from total score
var scoreCount = function(check) {
	if (check == true){
		return 1
	} else {
		return -1
	}
}

// Updates user's total score
var checkPose = function() {
	addedScore = 0;

	addedScore += scoreCount(yawCheck);
	addedScore += scoreCount(pitchCheck);
	addedScore += scoreCount(rollCheck);
	addedScore += scoreCount(distanceCheck);

	score += addedScore;
	roundEnded(false);
}

// Checks how many users there are in the current room
// Shows start button for John if there is at least another player in the room
// Adds users to user-list
var checkPeople = function(){
	pubnub.here_now({
	    channel : "mirrorRoom" + roomID,
	    callback : function(m){

	    	if (iAmJohn && m.occupancy>1){
	    		startBtn.removeClass("hidden");
	    	}

	    	$('#user-list').empty();
	    	for(i=0; i<m.uuids.length; i++){
	    		if(m.uuids[i].state.name == name){
	    			$('#user-list').append('<tr><td><strong>'+m.uuids[i].state.name+'</strong></td><td>'+m.uuids[i].state.score+'</td></tr>');
	    		}
	    		else{
	    			$('#user-list').append('<tr><td>'+m.uuids[i].state.name+'</td><td>'+m.uuids[i].state.score+'</td></tr>');
	    		}
	    	}
	    },
	    state : true
	});
}

function randomIntFromInterval(min,max) {
    return Math.floor(Math.random()*(max-min)+min);
}

var getRandomUuid = function(len,selfPos) {
	if(selfPos == 0){
		randomJohn = randomIntFromInterval(selfPos+1,len);
	}
	else{
		randomJohn = randomIntFromInterval(0,selfPos);
	}

	return randomJohn

}

// Ends user's round
// If current user was John last round a new John is selected
var roundEnded = function(amIJohn){
	navigator.notification.vibrate(400);
	console.log("roundEnded")
	roundStarted = false;
	$("#room-info").removeClass("hidden");
	$("#game").addClass("hidden");
	yourScore.text(addedScore);

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
		    	newJohn = m.uuids[randomJohn];
		    	console.log("newJohn ",newJohn)

				iAmJohn = false;
				iWasJohn = true;

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
				    	console.log(m)
				    	setTimeout(checkPeople,200);
				    },
				    error    : function(m){console.log(m)}
				});

				pubnub.publish({
					channel : "mirrorRoom" + roomID,
					message : {user: newJohn}
				});
		    }
		});

		nonjohninfo.removeClass("hidden");
		startBtn.addClass("hidden");
		johninfo.addClass("hidden");
	}
	else{
		console.log('I was not John')

		 pubnub.state({
		   channel  : "mirrorRoom" + roomID,
		   uuid     : username,
		   callback : function(m){
		   		console.log(m)
		   		console.log("checking if im john ", username)
		   		if (m.john == true){
		   			console.log("I am new john")
		   			nonjohninfo.addClass("hidden");
					johninfo.removeClass("hidden");
					startBtn.removeClass("hidden");
					iWasJohn = true;
					iAmJohn = true;
		   		}
		   		else{
		   			console.log("I am not new john")
		   			nonjohninfo.removeClass("hidden");
		   			startBtn.addClass("hidden");
					johninfo.addClass("hidden");
					iAmJohn = false;
		   		}

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
				    	console.log(m)
				    	setTimeout(checkPeople,200);
				    },
				    error    : function(m){console.log(m)}
				});
		   },
		   error    : function(m){console.log(m)}
		 });
	}
}

var goToHomeScreen = function() {
	enterRoomScreen.removeClass("page-active");
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
	roundStarted = false;
	johnState = null;
	iWasJohn = false;
	iAmJohn = false;
	nonjohninfo.removeClass("hidden");
	johninfo.addClass("hidden");
	startBtn.addClass("hidden");
}
