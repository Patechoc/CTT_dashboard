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
  // {
  //   'id': '02032200',
  //   'name': 'Udbyes gate',
  //   'color': 'orange',
  //   'position': {
  //     'lat': 63.440186,
  //     'lon': 10.402685
  //   }
  // },
  {
    'id': '02032222',
    'name': 'Udbyes gate',
    'color': '#009900',
    'position': {
      'lat': 63.418838,
      'lon': 10.394769
    }
  }
];

var baseURL = "http://129.241.209.185:1880/api/";
var ttnData = {};
var graphs = {};
var updateInterval = 30000;

$(document).ready(function () {
  getHistoricalTTNData();
  setInterval(updateTTNData, updateInterval);
});

function getHistoricalTTNData() {
  $.each( devices, function(i, device) {
    var deviceID = device['id'];

    var $loadingDOMElement = $( '<div>' )
                            .attr('id', 'loading-' + deviceID)
                            .attr('class', 'loading-placeholder')
                            .html('<i class="fa fa-spinner fa-spin"></i>');

    $( '#graph-container' ).append( $loadingDOMElement );

    console.log(deviceID + ": GET request sent");
    $.get( baseURL + deviceID)
      .done(function( result ) {
        console.log(deviceID + ": Data received");

        if ($.isEmptyObject(result)) {
          console.log(deviceID + ": Empty result. Skipping this device");
          return;
        }

        // Add device to data obejct
        ttnData[deviceID] = [];

        // Store latest values
        var latestDate, latestValue, latestBatteryLevel;

        $.each(result, function(k, value) {
          var date = new Date(value['time'])
          var encodedData = value['data'] // Data is base64 encoded
          var decodedData = atob(encodedData); // atob() is a built in Base64 decoding function
          var re = /GP_CO2:(.*?)(?=#)/;
          var match = re.exec(decodedData)
          if (match) {
            var value = parseFloat(match[1], 10)
            // if (value === 0.000) {
            //   console.log(deviceID + ": Value was 0.000. Skip it")
            //   return;
            // }

            ttnData[deviceID].push( [date, value] );
          }

          if (k == result.length - 1) {
            latestDate = date;
            latestValue = value;

            // Add battery level
            re = /BAT:(.*?)(?=#)/;
            match = re.exec(decodedData);
            latestBatteryLevel = parseInt(match[1]);
          }
        });
        
        // Newest data is now at index 0, we want it to be at latest index,
        // so we can add new data to the end and present it as a series in the graph
        // ttnData[deviceID].reverse();

        // Draw the graph
        drawGraph(deviceID, latestDate, latestValue, latestBatteryLevel);
      })
      .fail(function() {
        console.log(deviceID + ": TTN get failed!");
      })
      .always(function() {
        $('#loading-'+deviceID).remove();
      });
  });
}

function updateTTNData() {
  $.each( devices, function(i, device) {
    var deviceID = device['id'];
    console.log(deviceID + ": GET request sent");
    $.get( baseURL + deviceID)
      .done(function( result ) {
        console.log(deviceID + ": Data received");

        if ($.isEmptyObject(result)) {
          console.log(deviceID + ": Empty result. Skipping this device");
          return;
        }

        var date = new Date(result[result.length - 1]['time'])
        var latestStoredDate = new Date(ttnData[deviceID][ttnData[deviceID].length - 1][0]);
        if ( date.getTime() === latestStoredDate.getTime() ) {
          console.log(deviceID + ': No new value');
        }
        else {
          console.log(deviceID + ": New value!");
          var encodedData = result[result.length - 1]['data']; // Data is base64 encoded
          var decodedData = atob(encodedData); // atob() is a built in Base64 decoding function
          var re = /GP_CO2:(.*?)(?=#)/;
          var match = re.exec(decodedData);
          if (match) {
            var value = parseFloat(match[1], 10)
            // if (value === 0.000) {
            //   console.log(deviceID + ": Value was 0.000. Skip it")
            //   return;
            // }

            ttnData[deviceID].push( [date, value] );

            // Add battery level
            re = /BAT:(.*?)(?=#)/;
            match = re.exec(decodedData)
            var batteryLevel = parseInt(match[1]);

            graphs[deviceID].updateOptions( { 'file' : ttnData[deviceID] } );
            $( '#latest-value-' + deviceID ).html(date.toLocaleString('nn') + ': <b>' + value + '</b><br />\
                                                  (Battery level: <b>' + batteryLevel + '%</b>)')

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

function drawGraph(deviceID, latestDate, latestValue, latestBatteryLevel) {
  if (ttnData[deviceID].length === 0) {
    console.log(deviceID + ": Data set is empty, don't make graph");
    return;
  }

  // Create an element for the graph
  var $graphDOMElement = $( '<div>' )
                          .attr('class', 'graph')
                          .attr('id', 'graph-' + deviceID);

  latestDate = latestDate.toLocaleString('nn');
  var $latestValueDOMElement = $( '<p>' )
                                .attr( 'id', 'latest-value-' + deviceID)
                                .html(latestDate + ': <b>' + latestValue + '</b><br />\
                                  (Battery level: <b>' + latestBatteryLevel + '%</b>)');

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
      drawPoints: true,
      yRangePad: 50,
      // includeZero: true,
      // stepPlot: true,
      // drawGapEdgePoints: true,
      showRoller: true,
      // valueRange: [0, 420],
      labels: ['Time', 'Node ' + deviceID],
      ylabel: 'CO2 (ppm)'
    });

  // Keep track of graphs so we can update them at a later point
  graphs[deviceID] = graph;
}
