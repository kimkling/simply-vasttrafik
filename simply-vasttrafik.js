var env;
var baseUrl = "http://api.vasttrafik.se/bin/rest.exe/";
var date;
var latestPos;
var nearbyStops;
var closestStopData;

var init = function(){
	simply.scrollable(true);
	simply.style('small');
	env = require('environment.js');

	simply.on('singleClick', function(e){
		if(e.button === "select"){
			loadNearestStop();
		}
	});
	loadNearestStop();
}

var drawNearestStop = function(stopData, departureObj, pos){
	
	var closestStop = stopData;
	var departures = departureObj.DepartureBoard.Departure;

	// Sorting to show shortest time left, first.
	departures.sort(function(a, b){
		var aDiffNow = getDiffHourMin(a.rtTime);
		var bDiffNow = getDiffHourMin(b.rtTime);

		var diff1 = (aDiffNow.hour-bDiffNow.hour) * 60;
		var diff2 = aDiffNow.minute-bDiffNow.minute;
		return diff1 + diff2;
	});

	// Creating a position object, to measure distance in getDistance()
	var closestPosition = {coords: {}};
	closestPosition.coords.longitude = parseFloat(closestStop.lon);
	closestPosition.coords.latitude = parseFloat(closestStop.lat);

	var distance = getDistance(closestPosition, pos);
	var distanceString = '';
	// Distance is calculated in km. If more than one km, keep km but round to two decimals. If lower than one km, display as meters
	if(distance > 1){
		distanceString = (Math.round(distance*100) / 100) + 'km';
	}else{
		distanceString = Math.round(distance*1000) + 'm';
	}

	var stopName = closestStop.name.split(", ")[0];
	var subTitleText = 'Distance: ' + distanceString + '\n'; /*Updated: ' + date.hour + ':' + date.minute + ':' + date.second; Show update time, for debugging. */

	var bodyText = "";
	// Show at most 10 entries. If stop has fewer than 10 to list, use that amount.
	var nrEntries = Math.min(departures.length, 10);
	for (var i = 0; i < nrEntries; i++) {
		var timeDiff = getDiffHourMin(departures[i].rtTime);
		bodyText += departures[i].name + ' (' + departures[i].direction + '):\n' + (timeDiff.hour !== 0 ? timeDiff.hour + ' h ' : '') + timeDiff.minute + ' min\n';
	};
	
	// Display and vibe.
	simply.text({
		title: stopName,
		subtitle: '',
		body: subTitleText + bodyText
	}, true);
	simply.vibe('short');
}

// Starts all AJAX requests.
var loadNearestStop = function(){
	simply.text({
		title: "Vasttrafik",
		body: "Wait while we fetch your closest stop..."
	}, true);

	navigator.geolocation.getCurrentPosition(function(pos){
		latestPos = pos;

		ajax({
			url: baseUrl + composeNearbyStopsString(latestPos.coords.longitude, latestPos.coords.latitude),
			type: "json"
		}, function(data1){
			date = getDateTime();
			nearbyStops = data1;

			ajax({
				url: baseUrl + composeNextDeparture(nearbyStops.LocationList.StopLocation[0].id),
				type: "json"
			}, function(data2){

				closestStopData = data2;
				drawNearestStop(nearbyStops.LocationList.StopLocation[0], data2, latestPos);
			});
			
		});

	});
}

// Creates string to add in all AJAX requests. Conatins format and your API key.
var composeAlwaysString = function(){
	return '&format=json&authKey=' + env.vasttrafikApiKey;
}

// Takes lat & lon and creates vasttrafik API call to get nearby stops.
var composeNearbyStopsString = function(lon, lat){
	return 'location.nearbystops?originCoordLong=' + lon + '&originCoordLat=' + lat + composeAlwaysString();
}

// Creates API call to get next departures from a stop. Shows from all tracks.
var composeNextDeparture = function(stopId){
	var strippedTrack = (parseInt(stopId) / 1000) * 1000;
	return 'departureBoard?id=' + strippedTrack +'&date=' + date.year + '-' + date.month + '-' + date.day + '&time=' + date.hour + ':' + date.minute + composeAlwaysString();
}

// Calculate differences in time from a given string on the format 12:34
var getDiffHourMin = function(string){
	var change = {};
	var time = string.split(':');
	change.hour = parseFloat(time[0]) - parseFloat(date.hour);
	change.minute = parseFloat(time[1]) - parseFloat(date.minute);
	if(change.minute < 0){
		change.hour -= 1;
		change.minute += 60;
	}
	return change;
}

/* Calculates the current time and sets them as a attribute on a returning object. Returns date formated with two digits (except year which has four).
 * Note: These attributes may be strings.
 * Modified version of http://stackoverflow.com/a/19176102/1797874
 */
var getDateTime = function() {
	var currentDate = {};

    var now     = new Date(); 
    currentDate.year    = now.getFullYear();
    currentDate.month   = now.getMonth()+1; 
    currentDate.day     = now.getDate();
    currentDate.hour    = now.getHours();
    currentDate.minute  = now.getMinutes();
    currentDate.second  = now.getSeconds();

    if(currentDate.month.toString().length == 1) {
        currentDate.month = '0' + currentDate.month;
    }
    if(currentDate.day.toString().length == 1) {
        currentDate.day = '0' + currentDate.day;
    } 
    if(currentDate.hour.toString().length == 1) {
        currentDate.hour = '0' + currentDate.hour;
    }
    if(currentDate.minute.toString().length == 1) {
        currentDate.minute = '0' + currentDate.minute;
    }
    if(currentDate.second.toString().length == 1) {
        currentDate.second = '0' + currentDate.second;
    }
    return currentDate;
}

/*
 * Calculation taken from http://www.movable-type.co.uk/scripts/latlong.html. Thank you.
 */
var getDistance = function(pos1, pos2){
	var lat1 = pos1.coords.latitude;
	var lat2 = pos2.coords.latitude;
	var lon1 = pos1.coords.longitude;
	var lon2 = pos2.coords.longitude;

	var R = 6371; // km
	var deltaLat = Math.abs(lat2-lat1);
	var deltaLon = Math.abs(lon2-lon1);
	var dLat = deltaLat.toRad();
	var dLon = deltaLon.toRad();
	var lat1 = lat1.toRad();
	var lat2 = lat2.toRad();

	var a = Math.sin(dLat/2) * Math.sin(dLat/2) +
	        Math.sin(dLon/2) * Math.sin(dLon/2) * Math.cos(lat1) * Math.cos(lat2); 
	var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
	var d = R * c;

	return d;
}

if (typeof(Number.prototype.toRad) === "undefined") {
	Number.prototype.toRad = function() {
		return this * Math.PI / 180;
  }
}

init();