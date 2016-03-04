// List of devices that send data to TTN
var devices = [
  {
    'id': '02032201',
    'name': 'Elgeseter gate',
    'color': '#23A4DF',
    'position': {
      'lat': 63.419290,
      'lon': 10.395936
    }
  },
  {
    'id': '02032200',
    'name': 'Udbyes gate',
    'color': 'orange',
    'position': {
      'lat': 63.440186,
      'lon': 10.402685
    }
  },
  {
    'id': '02032222',
    'name': 'IoT-labben',
    'color': 'green',
    'position': {
      'lat': 63.417942,
      'lon': 10.401298
    }
  }
];

var baseURL = "http://thethingsnetwork.org/api/v0/nodes/";
var ttnData = {};
var graphs = {};

$(document).ready(function () {
  getHistoricalTTNData();
  setInterval(updateTTNData, 30000);
});

function getHistoricalTTNData() {
  $.each( devices, function(i, device) {
    var deviceID = device['id'];
    console.log(deviceID + ": GET request sent");
    $.get( baseURL + deviceID)
      .done(function( data ) {
        console.log(deviceID + ": Data received");

        if ($.isEmptyObject(data)) {
          console.log(deviceID + ": Empty data. Skipping this device");
          return;
        }

        // Add device to data obejct
        ttnData[deviceID] = [];

        $.each(data, function(k, value) {
          var date = new Date(value['time'])
          var encodedData = value['data'] // Data is base64 encoded
          var decodedData = atob(encodedData); // atob() is a built in Base64 decoding function
          var re = /GP_CO2:(.*?)(?=#)/;
          var match = re.exec(decodedData)
          if (match) {
            var value = match[1]
            ttnData[deviceID].push( [date, value] );
          }
        });
        
        // Newest data is now at index 0, we want it to be at latest index,
        // so we can add new data to the end and present it as a series in the graph
        ttnData[deviceID].reverse();

        // Draw the graph
        drawGraph(deviceID);
      })
      .fail(function() {
        console.log(deviceID + ": TTN get failed!");
      })
      .always(function() {
        // do something?
      });
  });
}

function updateTTNData() {
  $.each( devices, function(i, device) {
    var deviceID = device['id'];
    console.log(deviceID + ": GET request sent");
    $.get( baseURL + deviceID)
      .done(function( data ) {
        console.log(deviceID + ": Data received");

        if (ttnData[deviceID].length === 0) {
          console.log(deviceID + ": Device has no historical data. Don't update.");
          return;
        }

        var date = new Date(data[0]['time'])
        var latestStoredDate = new Date(ttnData[deviceID][ttnData[deviceID].length - 1][0]);
        if ( date.getTime() === latestStoredDate.getTime() ) {
          console.log(deviceID + ': No new value');
        }
        else {
          console.log(deviceID + ": New value!");
          var encodedData = data[0]['data']; // Data is base64 encoded
          var decodedData = atob(encodedData); // atob() is a built in Base64 decoding function
          var re = /GP_CO2:(.*?)(?=#)/;
          var match = re.exec(decodedData);
          if (match) {
            var value = match[1];
            ttnData[deviceID].push( [date, value] );
            graphs[deviceID].updateOptions( { 'file' : ttnData[deviceID] } );
            $( '#latest-value-' + deviceID ).html(date.toLocaleString('nn') + ': <b>' + value + '</b>')

            // Add battery level if present
            re = /BAT:(.*?)(?=#)/;
            match = re.exec(decodedData)
            var batteryLevel = match[1];

            if (match) {
              $( '#latest-value-' + deviceID ).append('<br />(Battery level: <b>' + batteryLevel + '%</b>)');
            }
          }
        }
      })
      .fail(function() {
        console.log(deviceID + ": TTN get failed!");
      })
      .always(function() {
        // do something?
      });
  });
}

function drawGraph(deviceID) {
  if (ttnData[deviceID].length === 0) {
    console.log(deviceID + ": Data set is empty, don't make graph");
    return;
  }

  // Create an element for the graph
  var $graphDOMElement = $( '<div>' )
                          .attr('class', 'graph')
                          .attr('id', 'graph-' + deviceID);

  var latestDate = ttnData[deviceID][ttnData[deviceID].length - 1][0].toLocaleString("nn");
  var latestValue = ttnData[deviceID][ttnData[deviceID].length - 1][1];
  var $latestValueDOMElement = $( '<p>' )
                                .attr( 'id', 'latest-value-' + deviceID)
                                .html(latestDate + ': <b>' + latestValue + '</b>');

  // Add the elements to the graph container
  $( '#graph-container' ).append( $graphDOMElement );
  $( '#graph-container' ).append( $('<div class="newest-value"><h5>Newest value</h5></div>').append( $latestValueDOMElement ) );

  var device = $.grep(devices, function(e){ return e.id == deviceID; })[0];

  // Create a Dygraph
  var graph = new Dygraph($graphDOMElement.get(0), ttnData[deviceID],
    {
      title: 'CO2 levels at ' + device['name'],
      color: device['color'],
      legend: 'always',
      fillGraph: true,
      animatedZooms: true,
      digitsAfterDecimal: 3,
      // stepPlot: true,
      drawPoints: true,
      // drawGapEdgePoints: true,
      // showRoller: true,
      // valueRange: [0, 420],
      labels: ['Time', 'Node ' + deviceID],
      ylabel: 'CO2 (ppm)'
    });

  // Keep track of graphs so we can update them at a later point
  graphs[deviceID] = graph;
}
