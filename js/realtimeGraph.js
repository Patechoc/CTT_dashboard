// List of devices that send data to TTN
var devices = [
  {
    'id': '02032201',
    'name': 'Elgeseter gate',
    'color': '#23A4DF',
    'position': {
      'lat': 63.419290,
      'lon': 10.395936
    },
    'sensors': {},
    'meta': {}
  },
  {
    'id': '02032222',
    'name': 'Mobile Waspmote (inside/outside)',
    'color': '#009900',
    'position': {
      'lat': 63.418838,
      'lon': 10.394769
    },
    'sensors': {},
    'meta': {}
  }
];

// List of sensor data we are interested in
var sensorMap = [
  {
    'id': 'GP_CO2',
    'name': 'CO2',
    'unit': 'ppm'
  },
  {
    'id': 'GP_TC',
    'name': 'Temperature',
    'unit': 'C'
  },
  {
    'id': 'GP_HUM',
    'name': 'Humidity',
    'unit': '%'
  },
  {
    'id': 'BAT',
    'name': 'Battery',
    'unit': '%'
  },
];

// List of metadata we are interested in
var metaMap = ['rssi', 'dataRate', 'snr', 'frequency'];

var baseURL = "http://129.241.209.185:1880/api/";
var graphs = {};
var updateInterval = 30000;

$(document).ready(function () {
  Chart.defaults.global.responsive = true;
  getHistoricalSensorData();
  setInterval(updateSensorData, updateInterval);
});

function getHistoricalSensorData() {
  $.each( devices, function(i, device) {
    var deviceID = device['id'];

    // Create spinning icon to indicate something is happening
    var $loadingDOMElement = $( '<div>' )
      .attr('id', 'loading-' + deviceID)
      .attr('class', 'loading-placeholder six columns')
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

        $.each(result, function(j, frame) {
          var date = new Date(frame['time'])
          var encodedData = frame['data'] // Data is base64 encoded
          var decodedData = atob(encodedData); // atob() is a built in Base64 decoding function

          $.each( sensorMap, function(k, sensor) {
            var sensorField = sensor['name'].toLowerCase();
            var sensorID = sensor['id']; // ID used in frame
            var sensorUnit = sensor['unit'];

            var re = new RegExp(sensorID + ':(.*?)(?=#)');
            var match = re.exec(decodedData)
            if (match) {
              if (device['sensors'][sensorField] === undefined) {
                console.log(deviceID + ": Creating list to store " + sensorField + " values");
                device['sensors'][sensorField] = {};
                device['sensors'][sensorField]['id'] = sensorID;
                device['sensors'][sensorField]['unit'] = sensorUnit;
                device['sensors'][sensorField]['data'] = [];
              }

              var value = parseFloat(match[1], 10)
              device['sensors'][sensorField]['data'].push([date, value])
            }
          })

          // Store metadata
          if (j === 0) {
            console.log(deviceID + ": Creating metadata metrics");
            $.each(metaMap, function(l, metric) {
              device['meta'][metric] = {};
            })
          }

          $.each(metaMap, function(l, metric) {
            if (device['meta'][metric][frame[metric]] === undefined) {
              device['meta'][metric][frame[metric]] = 1;
            } else {
              device['meta'][metric][frame[metric]] += 1;
            }
          })

          // Keep track of latest measurement device made
          if (j === result.length - 1) {
            device['latestMeasurement'] = date;
          }
        })

        drawGraph(device);
        drawMetaChart(device);
      })
      .fail(function() {
        console.log(deviceID + ": GET request failed!");
      })
      .always(function() {
        $('#loading-'+deviceID).remove();
      });
  });
}

function updateSensorData() {
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
        console.log(deviceID + ": " + date + " vs.")
        console.log(deviceID + ": "+ device['latestMeasurement'])
        if ( date.getTime() === device['latestMeasurement'].getTime() ) {
          console.log(deviceID + ': No new value');
        }
        else {
          console.log(deviceID + ": ### New value! Update latestMeasurement field");
          device['latestMeasurement'] = date;

          var encodedData = result[result.length - 1]['data']; // Data is base64 encoded
          var decodedData = atob(encodedData); // atob() is a built in Base64 decoding function

          $.each( device['sensors'], function(k, sensor) {
            var sensorID = sensor['id']; // ID used in frame
            var graphID = sensor['graphID'];

            var re = new RegExp(sensorID + ':(.*?)(?=#)');
            var match = re.exec(decodedData)
            if (match) {
              var value = parseFloat(match[1], 10)
              sensor['data'].push([date, value])
            }
            
            graphs[graphID].updateOptions( { 'file' : sensor['data'] } );
          })
        }
      })
      .fail(function() {
        console.log(deviceID + ": GET request failed!");
      })
      .always(function() {
        $('#loading-'+deviceID).remove();
      });
  });
}

function drawMetaChart(device) {
  var data;

  $container = $( '#chart-container' );
  $container.append('<div class="twelve columns"><h1>Meta for '+device['id'] +'</h1></div>');

  $.each(device['meta'], function(metric, values) {
    var chartID = 'chart-' + device['id'] + '-' + metric;

    // Create an element for the chart
    var $chartDOMElement = $( '<canvas>' )
      .attr('class', 'chart')
      .attr('id', chartID);
    
    // Add the element to the chart container
    $innerContainer = $('<div class="three columns"></div>');
    $innerContainer.append('<h3>'+metric+'</h3>')
    $container.append( $innerContainer.append( $chartDOMElement ) );

    data = [];
    $.each(device['meta'][metric], function(value, count) {
      data.push({
        label: value,
        value: count
      });
    });

    var ctx = $('#'+chartID).get(0).getContext("2d");
    new Chart(ctx).Pie(data);
  });
}

function drawGraph(device) {
  $.each(device['sensors'], function(key, sensor) {
    if ($.isEmptyObject(sensor['data'])) {
      console.log(deviceID + ": Data set for "+key+" is empty, don't make graph");
      return false;
    }

    var graphID = 'graph-' + device['id'] + '-' + key;
    sensor['graphID'] = graphID;

    // Create an element for the graph
    var $graphDOMElement = $( '<div>' )
      .attr('class', 'graph')
      .attr('id', graphID);
    
    // Add the elements to the graph container
    $( '#graph-container' ).append( $('<div class="six columns"></div>').append( $graphDOMElement ) );
    
    // Create a Dygraph
    var graph = new Dygraph($graphDOMElement.get(0), sensor['data'],
      {
        title: key + ' levels at ' + device['name'],
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
        labels: ['Time', 'Node ' + device['id']],
        ylabel: key + ' (' + sensor['unit'] + ')'
      });

    // Keep track of graphs so we can update them at a later point
    graphs[graphID] = graph;
  })
}
