var realtimeGraph;
var base_url = "http://thethingsnetwork.org/api/v0/nodes/";
var devices = [
  {'id': '02032201', 'position': {'lat': 63.433297, 'lon': 10.395755}},
];
var ttnData = [];

function getHistoricalTTNData() {
  $.each( devices, function(i, device) {
    console.log("Getting data from node: " + device['id']);
    $.get( base_url + device['id'])
      .done(function( data ) {
        console.log("Got some data from node: " + device['id'] + "!");

        if ($.isEmptyObject(data)) {
          console.log("Data from node "+device['id']+" was empty, skipping..");
          return;
        }

        $.each(data, function(k, value) {
          // DEV only put data from one node in the dygraph!
          if (device['id'] === '02032201') {
            var date = new Date(value['time'])
            var encodedData = value['data'] // Data is base64 encoded
            var decodedData = atob(encodedData); // atob() is a built in Base64 decoding function
            var re = /GP_CO2:(.*?)(?=#)/;
            var match = re.exec(decodedData)
            ttnData.push( [date, match[1]] )
          }
        });
        
        // ttnData.push( [new Date("Feb 28 2016 10:00:01"), 700] )
        // ttnData.push( [new Date("Feb 27 2016 10:00:01"), 750] )
        // ttnData.push( [new Date("Feb 26 2016 10:00:01"), 700] )
        // ttnData.push( [new Date("Feb 25 2016 10:00:01"), 710] )
        // ttnData.push( [new Date("Feb 24 2016 10:00:01"), 710] )
        // ttnData.push( [new Date("Feb 23 2016 10:00:01"), 710] )
        // ttnData.push( [new Date("Feb 22 2016 10:00:01"), 710] )
        // ttnData.push( [new Date("Feb 21 2016 10:00:01"), 710] )
        ttnData.reverse();
        drawRealTimeGraph();
      })
      .fail(function() {
        console.log("TTN get failed!");
      })
      .always(function() {
        // do something?
      });
  });
}

function getNewTTNData() {
  $.each( devices, function(i, device) {
    console.log("Getting data from node: " + device['id']);
    $.get( base_url + device['id'])
      .done(function( data ) {
        console.log("Got some data from node: " + device['id'] + "!");
        var date = new Date(data[0]['time'])
        var latestStoredDate = new Date(ttnData[ttnData.length - 1][0]);
        console.log(latestStoredDate)
        console.log(date)
        console.log(latestStoredDate.getTime())
        console.log(date.getTime())
        if ( date.getTime() === latestStoredDate.getTime() ) {
          console.log('Timestamp is same as previously fetched. So no new value.');
        }
        else {
          console.log("Timestamps don't match. New value!");
          var encodedData = data[0]['data'] // Data is base64 encoded
          var decodedData = atob(encodedData); // atob() is a built in Base64 decoding function
          var re = /GP_CO2:(.*?)(?=#)/;
          var match = re.exec(decodedData)
          ttnData.push( [date, match[1]] )
          g.updateOptions( { 'file': ttnData } );
        }
      })
      .fail(function() {
        console.log("TTN get failed!");
      })
      .always(function() {
        // do something?
      });
  });
}

function drawRealTimeGraph() {
  var graphDOMElement = document.getElementById('real-time-graph');

  realtimeGraph = new Dygraph(graphDOMElement, ttnData,
    {
      title: 'CO2-nivå Fjordgata',
      color: 'green',
      legend: 'always',
      fillGraph: true,
      animatedZooms: true,
      // stepPlot: true,
      drawPoints: true,
      // drawGapEdgePoints: true,
      showRoller: true,
      // valueRange: [0, 1000],
      labels: ['Time', 'Node 02032201'],
      ylabel: 'CO2 (ppm)'
    });
}

$(document).ready(function () {
  getHistoricalTTNData();
  setInterval(getNewTTNData, 60000);
});
