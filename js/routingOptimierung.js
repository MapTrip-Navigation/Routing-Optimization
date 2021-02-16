document.addEventListener("DOMContentLoaded", function () {

    document.getElementById('current-year').innerHTML = (new Date()).getFullYear();
    // Create the map object
    var map = new IWMap(document.getElementById('map'));

    let mapType = map.getOptions().getMapTypeByName('vector');

    map.setCenter(new IWCoordinate(7.1408879, 50.70150837, IWCoordinate.WGS84), 12, mapType);

    IWRoutingManager.initialize(map);
    let fileInput = document.getElementById("inputGroupFile03");

    fileInput.addEventListener('change', (event) => {
        if (finalResult != 0) {
            optimizeResult = [];
            optimizeCoords = [];
            finalResult = [];
            tempAllDirectons = [];
        } else {

        }
        clearRoutingInfomationContainer();
        const fileList = event.target.files;
        loadTextFile(fileList[0], map);

    });

    IWEventManager.addCustomListener(IWRoutingManager, 'onroute', function (event) {
        exportAllCoordinates(optimizeResult, event);
        if (event.success) {
            showRoutingInfomationBeforeOptimize(event);
            showRoutingInfomationafterOptimize(event);
        }
        else {
            console.log('Route calculation failed');
        }
    });


    $("#opti-btn").click(function () {
        let loading = document.getElementById('load')
        loading.classList.add("loading");
        optimizeRouting(fileCoords, map);
    });

    $("#download-btn").click(function () {
        var hiddenElement = document.createElement('a');
        hiddenElement.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(exportToCsVFile());
        hiddenElement.target = '_blank';
        hiddenElement.download = 'followmeExport.csv';
        hiddenElement.click();
    });


});

let fileCoords = [];
let optimizeCoords = [];
let optimizeResult = [];
let tempAllDirectons = [];
let finalResult = [];
let lines;
let marker = null;
let tempInterstations = [];
let exportfields = ["lat", "long", "EVT_TYPE", "EVT_DESCR"];
const koordMap = {};




function loadTextFile(file, map) {
    var reader = new FileReader();
    reader.onload = function (loadedEvent) {
        // result contains loaded file.
        let contents = loadedEvent.target.result;
        lines = contents.split("\n"), output = [];
        splitLinesFromTextFile(lines);
        showMarker(fileCoords, map);
        showRoute(fileCoords, map)
    }
    reader.readAsText(file);
}


function showCoordsInTheTable(elementOne, elementTwo) {
    let ol = document.getElementById('list-table');
    ol.classList.add("list-overflow");
    let li = document.createElement('li')
    li.className = "koordinaten";
    li.innerHTML = "lat: " + elementTwo + "   long: " + elementOne;
    ol.appendChild(li);

}

function showMarker(fileCoords, map) {
    $('#list-table').empty();
    if (marker == null) {
    } else {
        map.getOverlayManager().getLayer(0).removeAllOverlays();
    }
    for (let i = 0; i < fileCoords.length; i++) {
        showCoordsInTheTable(fileCoords[i][1], fileCoords[i][0])
        let coords = new IWCoordinate(fileCoords[i][1], fileCoords[i][0], IWCoordinate.WGS84);
        marker = IWMarkerFactory.createMarker(map, coords, {
            markerColor: '#4d98fa',
            style: 'marker-circle',
            label: '' + (i + 1),
            height: 35,
        });
        map.getOverlayManager().getLayer(0).addOverlay(marker);
    }

}

function showRoute(fileCoords, map) {

    IWRoutingManager.removeRoute();
    let startCoords = new IWCoordinate(fileCoords[0][1], fileCoords[0][0], IWCoordinate.WGS84);
    let destiCoords = new IWCoordinate(fileCoords[fileCoords.length - 1][1], fileCoords[fileCoords.length - 1][0], IWCoordinate.WGS84)
    start = new IWAddress()
    start.setCoordinate(startCoords);
    IWRoutingManager.updateStart(start);
    tempInterstations = [];
    for (let i = 1; i < fileCoords.length; i++) {
        if (i != fileCoords.length - 1) {
            let intCoords = new IWCoordinate(fileCoords[i][1], fileCoords[i][0], IWCoordinate.WGS84);
            let interstation = new IWAddress();
            interstation.setCoordinate(intCoords)
            tempInterstations.push(interstation);

        } else {

        }
    }


    IWRoutingManager.setInterstations(tempInterstations);
    destination = new IWAddress();
    destination.setCoordinate(destiCoords);
    IWRoutingManager.updateDestination(destination);

}

function splitLinesFromTextFile(lines) {
    fileCoords = []
    for (var i = 0; i < lines.length; i++) {
        if (lines[i] === "") {
        } else {
            fileCoords.push(lines[i].split(";"));
        }
    }
}

function optimizeRouting(fileCoords, map) {
    let tempCoords = []
    optimizeCoords = [];
    optimizeResult = [];
    fileCoords.forEach(element => {
        //  let coordinates = 'coordinates=' + element[0] + ';' + element[1];
        let coordsInMercator = new IWCoordinate(element[1], element[0], IWCoordinate.WGS84).toMercator();

        let stringX = coordsInMercator._x.toString().split(".")[0];
        let stringY = coordsInMercator._y.toString().split(".")[0];


        let coordinates = 'coordinates=' + stringX + ';' + stringY;
        tempCoords.push(coordinates)
    });

    let start = 0;
    let destination = fileCoords.length - 1;



    let url = "https://maps.infoware.de/MapSuiteBackend/tour.json";
    //  var data = 'vnr=0&pnr=0' + '&routeType=' + mode + '&mobilityProfile=' + mobilityProfile + '&startId=' + start + '&destinationId=' + destination + '&' + $.makeArray(tempCoords).join('&');

    let data = 'vnr=0&pnr=0&routeType=Speed&mobilityProfile=types_fast.txt&startId=' + start + '&destinationId=' + destination + '&' + $.makeArray(tempCoords).join('&');
    $.getJSON(url, data, function (result) {
        let loading = document.getElementById('load')
        if (result.success === true) {
            loading.classList.remove("loading");
        } else {
            loading.classList.remove("loading");
        }

        $('#list-table').empty();
        let temp = [];
        let tempElement = []
        result.tour.stations.forEach(element => {
            let optimizeCoordinates = new IWCoordinate(element.x, element.y).toWGS84();
            showCoordsInTheTable(optimizeCoordinates._x, optimizeCoordinates._y)
            temp.push(optimizeCoordinates._y.toString());
            temp.push(optimizeCoordinates._x.toString());
            tempElement.push(element.y.toString());
            tempElement.push(element.x.toString());
            optimizeResult.push(tempElement);
            tempElement = [];
            optimizeCoords.push(temp);
            temp = [];
        });
        showMarker(optimizeCoords, map);
        showRoute(optimizeCoords, map);
    });
}


function exportAllCoordinates(optimizeResult, event) {
    if (optimizeResult.length != 0) {

        let filterRouteCoords = [];
        let routeCoords = event.route.getCoordinates();
        routeCoords.forEach(coords => {
            const key = coords._x + " - " + coords._y;
            if (koordMap.hasOwnProperty(key)) {
            } else {
                koordMap[key] = true;
                filterRouteCoords.push(coords);
            }
        });



        let temp = [];
        filterRouteCoords.forEach(element => {
            let iwcoords = new IWCoordinate(element._x, element._y);
            temp.push(iwcoords._y.toString());
            temp.push(iwcoords._x.toString());
            tempAllDirectons.push(temp);
            temp = [];
        });



        let tempSammlen = [];
        for (let i = 0; i < tempAllDirectons.length; i++) {

            for (let k = 0; k < optimizeResult.length; k++) {

                if (tempAllDirectons[i][0] === optimizeResult[k][0] && tempAllDirectons[i][1] === optimizeResult[k][1]) {
                    let event = "SAMMELN";
                    // tempSammlen.push(tempAllDirectons[i][0]);
                    // tempSammlen.push(tempAllDirectons[i][1]);
                    // tempSammlen.push(event);
                    //  finalResult.push(tempSammlen)
                    // tempSammlen = [];
                    tempAllDirectons[i].splice(2, 0, "SAMMELN");
                } else {

                }

            }
            finalResult.push(tempAllDirectons[i]);
        }
    } else {

    }
}


function exportToCsVFile() {
    var csvStr = exportfields.join(";") + "\n";
    finalResult.forEach(element => {
        if (element.length === 3) {
            let coords = new IWCoordinate(element[1], element[0]).toWGS84();
            let lat = coords._y.toString();
            let long = coords._x.toString();
            let eVT_TYPE = "1";
            let eVT_DESCR = "SAMMELN";

            csvStr += lat + ';' + long + ';' + eVT_TYPE + ';' + eVT_DESCR + "\n";
        } else {
            let coords = new IWCoordinate(element[1], element[0]).toWGS84();
            let lat = coords._y.toString();
            let long = coords._x.toString();
            let eVT_TYPE = "";
            let eVT_DESCR = "";

            csvStr += lat + ';' + long + ';' + eVT_TYPE + ';' + eVT_DESCR + "\n";
        }
    })
    return csvStr;


}

function showRoutingInfomationBeforeOptimize(event) {
    if (optimizeResult.length != 0) {

    } else {
        let beforeRouteddiv = document.getElementById("before-optimize");
        let routeLengthinKm = event.routes[0].getRouteLength().toString();
        let x = routeLengthinKm.replace(/\d(?=(?:\d{3})+$)/g, '$&.');
        let routeLengthinKmGetParsed = parseInt(x);
        //   let text = "A route was calculated, the estimated driving time is" + event.routes[0].getFormattedDrivingTime() + " hours";
        let text = "A Route was calculated, the Route length is " + routeLengthinKmGetParsed + "KM and the estimated driving time is " + event.routes[0].getFormattedDrivingTime() + " hours.";

        beforeRouteddiv.innerHTML = text;
    }

}

function showRoutingInfomationafterOptimize(event) {
    if (optimizeResult.length != 0) {
        let afterRouteddiv = document.getElementById("after-optimize");
        let routeLengthinKm = event.routes[0].getRouteLength().toString();
        let x = routeLengthinKm.replace(/\d(?=(?:\d{3})+$)/g, '$&.');
        let routeLengthinKmGetParsed = parseInt(x);
        //   let text = "A route was calculated, the estimated driving time is" + event.routes[0].getFormattedDrivingTime() + " hours";
        let text = "A Optimize Route was calculated, the Route length is " + routeLengthinKmGetParsed + "KM and the estimated driving time is " + event.routes[0].getFormattedDrivingTime() + " hours.";
    
        afterRouteddiv.innerHTML = text;
    }
    else {

    }
}

function clearRoutingInfomationContainer() {
    $('#before-optimize').empty();
    $('#after-optimize').empty();
}