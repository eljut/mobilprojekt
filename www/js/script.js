var name = "lol";
var roomID = 0;
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

var yawSpan = $("#yaw");
var pitchSpan = $("#pitch");
var rollSpan = $("#roll");

var dir = 0;
var tiltFB = 0;
var tiltLR = 0;

var yawCheck = false;
var rollCheck = false;
var pitchCheck = false;

var roundStarted = false;
var johnState = null;

if (window.hyper && window.hyper.log) { console.log = hyper.log }

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
	if (newUsernameInput.val().length > 0 && e.keyCode == 13) {
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
	navigator.notification.vibrate(200)
});

backBtn.on('click', function() {
	goToHomeScreen();
});

createRoomBtn.on('click', function() {
	var name = $("new-username").val();
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
	  	presence: function(message) {
	  		console.log(message.occupancy);
	  		$("#num-users").text(message.occupancy);
	  	},
	  	state: {
	  		name : name,
	  		john : true
	  	},
	  	callback  : function(message) {
	  	//	console.log("hej");
	  	//	homeScreen.removeClass("page-active");
			//	room.addClass("page-active");
			//	$("#roomID").text(roomID);
	    },
	    heartbeat: 6
	});
	console.log("hej");
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
  		john: true,
  		yaw: dir,
  		pitch: tiltFB,
  		roll: tiltLR
		},
		callback: function(m){console.log(JSON.stringify(m))}
	})
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
	if (e.keyCode == 13) {
		enterRoom();
	}
});

var enterRoom = function() {
	roomID = roomIdInput.val();
	if (roomID.length == 4) {
		checkRoom();
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
			}
		}
	});
}

// Subscribe to an existing room
var subscribeToRoom = function() {
	console.log("entering room");
	pubnub.subscribe({
  	channel   : "mirrorRoom" + roomID,
  	timetoken : new Date().getTime(),
  	message: function(m){console.log(m)},
  	presence: function(message) {
  		console.log("presence",message);
  		nonjohninfo.removeClass("hidden");
  		// // check state updates
  		if (message.action == "state-change") {
  			console.log("STATE CHANGE!");
  			var stateChange = message.data;
	  		if (stateChange.john == true) {
	  			$("#room-info").addClass("hidden");
				$("#game").removeClass("hidden");
				nonjohninfo.addClass("hidden");
	  			roundStarted = true;
	  			poseTimer(10);
	  			johnState = stateChange;
	  		}
  		} else {
  			console.log(message.occupancy);
  			$("#num-users").text(message.occupancy);
  		}
  	},
  	state: {
			name : name,
			john : false
		},
  	callback  : function(message) {
    },
    heartbeat: 6
  });
}

// Compare user's orientation to those of John
var compareState = function(state) {
	if (angleBetween(dir,state.yaw-10,state.yaw+10)) {
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
	// console.log("yawCheck:", yawCheck);
	// console.log("pitchCheck:", pitchCheck);
	// console.log("rollCheck:", rollCheck);
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
	} else {
		$("#timer").text("Ooops, so close!");
		navigator.notification.vibrate(200);
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
