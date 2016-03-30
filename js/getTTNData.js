var base_url = "http://129.241.209.185:1880/api/";
var devices = [
  {'id': '02032201', 'position': {'lat': 63.419290, 'lon': 10.395936}},
  // {'id': '02032200', 'position': {'lat': 63.427297, 'lon': 10.410000}},
  {'id': '02032222', 'position': {'lat': 63.418838, 'lon': 10.394769}}
];
var data_from_ttn = [];
var markers = [];

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
            if (parseInt(value) > 600) {
              color = 'orange';
              if (parseInt(value) > 1000) {
                color = 'red';
              }
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
  // TODO: for scalability when number of nodes increase,
  // consider using MQTT instead of API: http://thethingsnetwork.org/wiki/Software/Overview

  getTTNData();
  // TODO: keep track of markers and update the popup content every 1 minute or so
  // setInterval(getTTNData, 10000);
});
