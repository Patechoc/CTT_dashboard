document.addEventListener('DOMContentLoaded', function(){
                          document.getElementById("sensorPointButton").addEventListener("click", displaySensorPointMap);
                          });


function displaySensorPointMap(){
    document.getElementById("map").style.display = "block";
    document.getElementById("regionMap").style.display = "none";
}