document.addEventListener('DOMContentLoaded', function(){
    document.getElementById("regionButton").addEventListener("click", displayRegionMap);
    });


function displayRegionMap(){
    document.getElementById("map").style.display = "none";
    document.getElementById("regionMap").style.display = "block";
    
    var map = L.map('regionMap').setView([63.430515, 10.395053], 13);
    
    L.tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token={accessToken}', {            attribution: 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, <a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="http://mapbox.com">Mapbox</a>', maxZoom: 18, id: 'mapbox.emerald',
                accessToken: 'pk.eyJ1IjoiZnJlZHJpa2FudGhvbmlzZW4iLCJhIjoiY2lrcXk1cTJzMDAxM3dsa3FmOWRiejJtNyJ9.HMZmGTfUijbKOxKt7P78rQ'}).addTo(map);
    
   
}