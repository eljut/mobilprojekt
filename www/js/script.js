var roomID = 0;
var homeScreen = $("#home-screen");
var room = $("#room");
var backBtn = $("#back-button");
var startBtn = $("#start-button");
var createRoomBtn = $("#create-room");
var enterRoomBtn = $("#enter-room");
var enterBtn = $("#enter-button");
var roomIdInput = $("#room-id-input");
var vibrateBtn = $("#vibrate");

var yawSpan = $("#yaw");
var pitchSpan = $("#pitch");
var rollSpan = $("#roll");

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

vibrateBtn.on('click', function() {
	navigator.notification.vibrate(200)
});

backBtn.on('click', function() {
	goToHomeScreen();
});

createRoomBtn.on('click', function() {
	var name = $("new-username").val();
  var rand = Math.floor(Math.random() * 10000); // A random 4 digit number as channel name
  if (rand < 1000) {
  	if (rand > 99) {
  		rand = "0"+rand;
  	} else if (rand > 9) {
  		rand = "00"+rand;
  	} else {
  		rand = "000"+rand;
  	}
  }
  pubnub.subscribe({
  	channel   : "mirrorRoom" + rand,
  	timetoken : new Date().getTime(),
  	presence: function(message) {
  		console.log(message.occupancy);
  		$("#num-users").text(message.occupancy);
  	},
  	state: {
  		name : name,
  		john : true,
  		gameOn: false
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
	$("#room-id").text(rand);
	startBtn.removeClass("hidden");
});

startBtn.on('click', function() {
	$("#room-info").addClass("hidden");
	$("#game").removeClass("hidden");
	startGame();
});

var startGame = function() {
	if (window.DeviceOrientationEvent) {

		if (navigator.userAgent.match(/(iPad|iPhone|iPod)/g)) {
			var deviceOrientation = FULLTILT.getDeviceOrientation({'type': 'world'});

			deviceOrientation.then(
				function(orientationData) {
					orientationData.listen(function() {
						// Use `orientationData` object to interact with device orientation sensors
						var screenAdjustedEvent = orientationData.getFixedFrameEuler();

						var dir = Math.round(screenAdjustedEvent.alpha);
						yawSpan.text(dir);

						var tiltFB = Math.round(screenAdjustedEvent.beta);
			    	pitchSpan.text(tiltFB);

						var tiltLR = Math.round(screenAdjustedEvent.gamma);
			    	rollSpan.text(tiltLR);
			    });
				}).catch(function(message) {
					// Device Orientation Events are not supported
		    }
		  );
		} else {
			window.addEventListener('deviceorientation', function(event) {
		    // gamma is the left-to-right tilt in degrees, where right is positive
		    var tiltLR = Math.round(event.gamma);
		    rollSpan.text(tiltLR);

		    // beta is the front-to-back tilt in degrees, where front is positive
		    var tiltFB = Math.round(event.beta);
		    pitchSpan.text(tiltFB);

		    // alpha is the compass direction the device is facing in degrees
		    if(event.webkitCompassHeading) {
	        // Apple works only with this, alpha doesn't work
	        var dir = Math.round(event.webkitCompassHeading);
	      } else {
	        var dir = Math.round(event.alpha);
	      }
		    yawSpan.text(dir);

		    // call our orientation event handler
		    // deviceOrientationHandler(tiltLR, tiltFB, dir);
		  }, false);
		}
	}
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

var subscribeToRoom = function() {
	console.log("entering room");
	pubnub.subscribe({
  	channel   : "mirrorRoom" + roomID,
  	timetoken : new Date().getTime(),
  	presence: function(message) {
  		console.log(message.occupancy);
  		$("#num-users").text(message.occupancy);
  	},
  	state: {
			name : name,
			john : false,
			inGame: true
		},
  	callback  : function(message) {

    },
    heartbeat: 6
  });
}

var goToHomeScreen = function() {
	room.removeClass("page-active");
	homeScreen.addClass("page-active");
	$("#enter-room-container").addClass("hidden");
	$("#room-buttons-container").removeClass("hidden");
	$("#game").addClass("hidden");
	$("#room-info").removeClass("hidden");
	backBtn.addClass("hidden");
	pubnub.unsubscribe({
    channel: "mirrorRoom" + roomID
  });
}
