var MDB = require('monetdb')();
var lodash = require('lodash');

var output = lodash.without([1,2,3], 1)
console.log("Testing lodash");
console.log(output);


var base_url = "http://129.241.209.185:1880/api/";
var devices = [
  {'id': '02032201', 'position': {'lat': 63.419290, 'lon': 10.395936}},
  // {'id': '02032200', 'position': {'lat': 63.427297, 'lon': 10.410000}},
  {'id': '02032222', 'position': {'lat': 63.418838, 'lon': 10.394769}}
];
var data_from_ttn = [];
var markers = [];



function map_labels_entry(labels, nodeMsg) {
    return lodash.zipObject(labels, nodeMsg);
}

function map_labels_entries(labels, arr_nodeMsg) {
    obj = []
    lodash.map(arr_nodeMsg, function( arr, i ) {
        obj[i] = map_labels_entry(labels, arr);
    });
    return obj;
}

function fetch_data(days, nodes=[]) {
    var data = [];
    var options = {
	host     : '129.241.107.186',
	port     : 50000,
	dbname   : 'ctt',
	user     : 'co2',
	password : 'ctt',
	// GMT+02:00
	timezoneOffset: 120
    };
    var conn = new MDB(options);
    conn.connect();

    var labels_nodeMsg = ["id","node_eui","gateway_eui","timestring","datarate",
			  "frequency","snr","rssi","serial_id","waspmote_id","sequence_num",
			  "sensor_bat", "sensor_gp_co2","sensor_gp_no2","sensor_gp_tc",
			  "sensor_gp_hum","sensor_str","sensor_pm10","sensor_pm2_5",
			  "sensor_pm1","server_time","gateway_time","latitude",
			  "sensor_opc_pm2_5","lsnr","port","sensor_opc_pm1","crc","counter",
			  "longitude","payload","modulation","channel","dev_eui","rfchain",
			  "sensor_opc_pm10","altitude","codingrate","sensor_gp_pres"];
    
    data = conn.query("SELECT " + labels_nodeMsg + " FROM co2.node_msg WHERE timestamptz >= '2016-08-22T10:13:00' AND timestamptz <= '2016-08-22T10:14:23'").then(function(result) {
	// Do something with the result
	console.log(map_labels_entries(['a', 'b'], [[1, 2],[3, 4]]));
    });
    conn.close();
    return data;
}


function getTTNData1() {
  $.each( devices, function(i, device) {
    console.log("Getting data from node: " + device['id']);
    $.get( base_url + device['id'])
      .done(function( data ) {
        console.log("Got some data from node: " + device['id'] + "!");

        if ($.isEmptyObject(data)) {
          console.log("Data from node "+device['id']+" was empty, skipping..");
          return;
        }
        var lat = device['position']['lat']
        var lon = device['position']['lon']
        var timestamp = new Date(data[data.length - 1]['time']);
        var encodedData = data[data.length - 1]['data'] // Data is base64 encoded
        var decodedData = atob(encodedData); // atob() is a built in Base64 decoding function
        var result;
        var sensorDataFormatted = "";
        var color = 'green';

        var re = /([^#].*?)(?=#)/g;
        while((result = re.exec(decodedData)) !== null) {
          var name = result[0].split(":")[0]
          var value = result[0].split(":")[1]

          if (value === undefined ) {
            continue
          }

          if (name === 'GP_CO2') {
            sensorDataFormatted += "<b>CO2</b>: "+value+ " ppm<br />";
          }
          else if (name === 'BAT') {
            sensorDataFormatted += "<b>Battery level</b>: "+value+ "%<br />";
          }
          else {
            sensorDataFormatted += "<b>"+name+"</b>: "+value+ "<br />";
          }

          // Set color based on CO2 level
          if (name === 'GP_CO2') {
		        if (parseInt(value) > 450) {
		          color = 'red';
				}else if (parseInt(value) > 350) {
		          color = 'orange';
				}else {
		          color = 'green';
				}
          }
        }

        var marker = L.circleMarker([lat, lon],
          {
            color: color,
            radius: 15
          })
          .addTo(map)
          .bindPopup("<b>"+device['id']+"'s latest measurements</b><br>\
                     <b>Time</b>: " + timestamp.toLocaleString("nn") + "<br>"+
            sensorDataFormatted);
        markers.push(marker);
          // TODO add each data point to a graph
        // $.each(data, function(k, v) {
        //   // DEV only put data from one node in the dygraph!
        //   if (device === '02032200') {
        //     var date = new Date(this['time'])
        //     var value = Math.floor(Math.random() * 700) + 300 // this['data_plain'] OR this[data_something]
        //     // TODO make sure we retrieve a number from the sensor. If not number, something is probably wrong, notify someone somehow
            
        //     // console.log(date)

        //     // if ( (k == data.length - 1) && (value > 700) ) {
        //     //   console.log(k + " this is last element and value was higher than 300")
        //     //   var circle = L.circle([lat, lon], 200, {
        //     //     color: 'red',
        //     //     fillColor: '#f03',
        //     //     fillOpacity: 0.5
        //     //   }).addTo(map);
        //     //   warningCircleDrawn = true;
        //     // }

        //     // data_from_ttn.push( [date, value] )
        //     data_from_ttn.push( [date, value] )
        //   }
        //   // console.log(this['data_plain'] + ': ' + k)
        //   // $('#result').append('<p>#' + k + ': ' + this['data_plain'] + ' (' + this['time'] + ')</p>')
        //     /// do stuff
        // });
      })
      .fail(function() {
        console.log("TTN get failed!");
      })
      .always(function() {
        // do something
      });
  });
}

function getTTNData() {


  $.each( devices, function(i, device) {
    console.log("Getting data from node: " + device['id']);
    $.get( base_url + device['id'])
      .done(function( data ) {
        console.log("Got some data from node: " + device['id'] + "!");

        if ($.isEmptyObject(data)) {
          console.log("Data from node "+device['id']+" was empty, skipping..");
          return;
        }
        var lat = device['position']['lat']
        var lon = device['position']['lon']
        var timestamp = new Date(data[data.length - 1]['time']);
        var encodedData = data[data.length - 1]['data'] // Data is base64 encoded
        var decodedData = atob(encodedData); // atob() is a built in Base64 decoding function
        var result;
        var sensorDataFormatted = "";
        var color = 'green';

        var re = /([^#].*?)(?=#)/g;
        while((result = re.exec(decodedData)) !== null) {
          var name = result[0].split(":")[0]
          var value = result[0].split(":")[1]

          if (value === undefined ) {
            continue
          }

          if (name === 'GP_CO2') {
            sensorDataFormatted += "<b>CO2</b>: "+value+ " ppm<br />";
          }
          else if (name === 'BAT') {
            sensorDataFormatted += "<b>Battery level</b>: "+value+ "%<br />";
          }
          else {
            sensorDataFormatted += "<b>"+name+"</b>: "+value+ "<br />";
          }

          // Set color based on CO2 level
          if (name === 'GP_CO2') {
		        if (parseInt(value) > 450) {
		          color = 'red';
				}else if (parseInt(value) > 350) {
		          color = 'orange';
				}else {
		          color = 'green';
				}
          }
        }

        var marker = L.circleMarker([lat, lon],
          {
            color: color,
            radius: 15
          })
          .addTo(map)
          .bindPopup("<b>"+device['id']+"'s latest measurements</b><br>\
                     <b>Time</b>: " + timestamp.toLocaleString("nn") + "<br>"+
            sensorDataFormatted);
        markers.push(marker);
          // TODO add each data point to a graph
        // $.each(data, function(k, v) {
        //   // DEV only put data from one node in the dygraph!
        //   if (device === '02032200') {
        //     var date = new Date(this['time'])
        //     var value = Math.floor(Math.random() * 700) + 300 // this['data_plain'] OR this[data_something]
        //     // TODO make sure we retrieve a number from the sensor. If not number, something is probably wrong, notify someone somehow
            
        //     // console.log(date)

        //     // if ( (k == data.length - 1) && (value > 700) ) {
        //     //   console.log(k + " this is last element and value was higher than 300")
        //     //   var circle = L.circle([lat, lon], 200, {
        //     //     color: 'red',
        //     //     fillColor: '#f03',
        //     //     fillOpacity: 0.5
        //     //   }).addTo(map);
        //     //   warningCircleDrawn = true;
        //     // }

        //     // data_from_ttn.push( [date, value] )
        //     data_from_ttn.push( [date, value] )
        //   }
        //   // console.log(this['data_plain'] + ': ' + k)
        //   // $('#result').append('<p>#' + k + ': ' + this['data_plain'] + ' (' + this['time'] + ')</p>')
        //     /// do stuff
        // });
      })
      .fail(function() {
        console.log("TTN get failed!");
      })
      .always(function() {
        // do something
      });
  });
}


$(document).ready(function() {
  getTTNData();
  // TODO: keep track of markers and update the popup content every 1 minute or so
  //setInterval(getTTNData, 10000);
});
