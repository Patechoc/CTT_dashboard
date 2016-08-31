var MDB = require('monetdb')();
var lodash = require('lodash');

var output = lodash.without([1,2,3], 1)
console.log("Testing lodash");
console.log(output);


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


// List of devices that send data to TTN
var devices = [
  {
    'id': '02032201',
    'name': 'Elgeseter gate',
    'color': '#03A9F4',
    'hightlightColor': '#58CBFF',
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
    'color': '#56A05F',
    'hightlightColor': '#59D468',
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
    'id': 'IN_TEMP',
    'name': 'Internal board temperature',
    'unit': 'C'
  },
  {
    'id': 'GP_CO',
    'name': 'CO',
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
    'unit': '%RH'
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
            var value = frame[metric];

            // Make values coarse enough that they makes sense in a chart
            if (metric === 'snr') {
              value = Math.round(value)
            }
            if (metric === 'rssi') {
              value = Math.round(value / 10) * 10
            }

            if (device['meta'][metric][value] === undefined) {
              device['meta'][metric][value] = 1;
            } else {
              device['meta'][metric][value] += 1;
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

    data = {
      labels: [],
      datasets: [
        {
          label: metric,
          fillColor: device['color'],
          strokeColor: "rgba(0, 0, 0, 0.2)",
          highlightFill: device['hightlightColor'],
          highlightStroke: "rgba(0, 0, 0, 0.1)",
          data: []
        }
      ]
    };
    $.each(device['meta'][metric], function(value, count) {
      data['labels'].push(value);
      data['datasets'][0]['data'].push(count);
    });

    data['labels'].sort(sortNumber);

    var ctx = $('#'+chartID).get(0).getContext("2d");
    var options = {
      barStrokeWidth : 1
    }
    new Chart(ctx).Bar(data, options);
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

function sortNumber(a,b) {
    return a - b;
}
