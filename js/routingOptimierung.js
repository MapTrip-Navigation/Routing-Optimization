document.addEventListener("DOMContentLoaded", function() {

    document.getElementById('current-year').innerHTML = (new Date()).getFullYear();
    // Create the map object
    var map = new IWMap(document.getElementById('map'));
    let mapType = map.getOptions().getMapTypeByName('vector');
    let mapContainer = document.getElementById('map-container')
    map.getOptions().setAutoResize(true, mapContainer);
    map.setCenter(new IWCoordinate(7.1408879, 50.70150837, IWCoordinate.WGS84), 12, mapType);
    let renderer = new IWMapRenderer(map);
    IWRoutingManager.initialize(map);



    let fileInput = document.getElementById("inputFile");

    // fileInput.addEventListener('change', (event) => {
    //     if (filterInterstaionsWithRouteCoords != 0) {
    //         optimizeResult = [];
    //         optimizeCoords = [];
    //         filterInterstaionsWithRouteCoords = [];
    //         interstationsForFMexport = [];
    //         routeCoordsWithInterstaionsWith30MetersDistance = [];
    //         koordMap = {};
    //     } else {

    //     }
    //     clearRoutingInfomationContainer();
    //     const fileList = event.target.files;
    //     loadTextFile(fileList[0], map);

    // });

    geocoder = new IWGeocoderClient();

    FileAPI.event.on(fileInput, 'change', function(evt) {
        var files = FileAPI.getFiles(evt); // Retrieve file list
        if (files[0].type == "text/plain" || files[0].type == "application/vnd.ms-excel") {
            clearRoutingInfomationContainer();
            openDataFromFile(files, map);
        } else {
            $('#invalidFile').modal('show')
        }

        optimizeResult = [];
        optimizeCoords = [];
        filterInterstaionsWithRouteCoords = [];
        interstationsForFMexport = [];
        routeCoordsWithInterstaionsWith30MetersDistance = [];
        koordMap = {};
        addressObjects = [];
        errorWrongWriting = [];
        errorMissData = [];
        ConvertCoords = [];

    });


    geocoder = new IWGeocoderClient();
    IWEventManager.addListener(geocoder, 'ongeocode', function(event) {
        if (event.status == "OK") {
            //   console.log("okay");
            AddressToCoords(event, map);
        } else {
            //   console.log("Status: false")
            // console.log(event);
        }
    });

    IWEventManager.addCustomListener(IWRoutingManager, 'onroute', function(event) {
        if (event.success) {
            exportAllCoordinates(optimizeResult, event);
            getRouteCoordsWith30mDistance(filterInterstaionsWithRouteCoords, map);
            showRoutingInfomationBeforeOptimize(event);
            showRoutingInfomationafterOptimize(event);
        } else {
            console.log('Route calculation failed');
        }
    });

    $("#opti-btn").click(function() {
        let loading = document.getElementById('load')
        loading.classList.add("loading");
        optimizeRouting(ConvertCoords, map);
    });

    $("#download-btn").click(function() {
        var hiddenElement = document.createElement('a');
        hiddenElement.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(exportToCsVFile());
        hiddenElement.target = '_blank';
        hiddenElement.download = 'FMeOptimierteRoute.csv';
        hiddenElement.click();
    });


    $('#infoModal').modal('show');
});

Number.prototype.toRad = function() {
    return this * Math.PI / 180;
}

Number.prototype.toDeg = function() {
    return this * 180 / Math.PI;
}




let fileCoords = [];
let optimizeCoords = [];
let optimizeResult = [];
let routeCoordsWithInterstaionsWith30MetersDistance = [];
let filterInterstaionsWithRouteCoords = [];
let interstationsForFMexport = [];
let lines;
let marker = null;
let exportfields = ["lat", "long", "EVT_TYPE", "EVT_DESCR"];
let koordMap = {};
let nextMarkerAt = 0;
var nextPoint = null;
let isCurrentInterstation = false;
let distanceFromMaxandMinLat;
let distanceFromMaxandMinLong;
let boundsDistance = 200000;
let donwloadButton = document.getElementById('download-btn');
let optimizedButton = document.getElementById('opti-btn');
let reg = new RegExp('^[0-9]+$');

let addressObjects = [];
let errorWrongWriting = [];
let errorMissData = [];
let ConvertCoords = [];

function openDataFromFile(files, map) {
    FileAPI.readAsText(files[0], "utf-8", function(evt) {
        if (evt.type == 'load') {
            if (evt.target.type == "text/plain") {
                var text = evt.result;
                let firstCharFromText = text.charAt(0);
                if (reg.test(firstCharFromText)) {
                    lines = text.split("\n"), output = [];
                    splitLinesFromTextFile(lines);
                    checkCoordsBeforeStart(ConvertCoords);
                    if (ConvertCoords.length <= 200) {
                        if (distanceFromMaxandMinLat < boundsDistance && distanceFromMaxandMinLong < boundsDistance) {
                            $('#errorContainer').remove();
                            showMarker(ConvertCoords, map);
                            showRoute(ConvertCoords, map);
                            enableButtons();
                        } else {
                            $('#errorContainer').remove();
                            errorMessageForCoordsThatAreFarFromEachOther();
                            disabledButtons();
                            RemoveMarkerAndRoute(map);
                        }

                    } else {
                        $('#errorContainer').remove();
                        errorMessageForMoreThen200Coords();
                        disabledButtons();
                        RemoveMarkerAndRoute(map);
                    }
                } else {
                    lines = text.split("\r\n");
                    for (let i = 0; i < lines.length; i++) {
                        createObjectAndCheckForEachLine(lines[i], i);
                    }
                }

            } else if (evt.target.type == "application/vnd.ms-excel") {
                var text = evt.result;
                let firstCharFromText = text.charAt(0);
                if (reg.test(firstCharFromText)) {
                    lines = text.split("\n"), output = [];
                    splitLinesFromTextFile(lines);
                    if (ConvertCoords.length <= 200) {
                        if (distanceFromMaxandMinLat < boundsDistance && distanceFromMaxandMinLong < boundsDistance) {
                            $('#errorContainer').remove();
                            showMarker(ConvertCoords, map);
                            showRoute(ConvertCoords, map);
                            enableButtons();
                        } else {
                            $('#errorContainer').remove();
                            errorMessageForCoordsThatAreFarFromEachOther();
                            disabledButtons();
                            RemoveMarkerAndRoute(map);
                        }

                    } else {
                        $('#errorContainer').remove();
                        errorMessageForMoreThen200Coords();
                        disabledButtons();
                        RemoveMarkerAndRoute(map);
                    }
                } else {
                    lines = text.split("\n");
                    for (let i = 0; i < lines.length; i++) {
                        createObjectAndCheckForEachLine(lines[i], i);
                    }
                }

            } else {}


            // Success
            if (checkListofErrors(errorWrongWriting, errorMissData)) {
                // console.log("Ab hier kann der Geocoder gestart werden");
                processArray(addressObjects);
            } else {
                // console.log("Fehler in der Datei")
                RemoveMarkerAndRoute(map)
                errorMessageForMissAndWrongWriting(errorWrongWriting, errorMissData)
                    // Fehler in der TextDatei;
            }

        } else if (evt.type == 'progress') {
            var pr = evt.loaded / evt.total * 100;

        } else if (evt.type == 'error') {
            console.log("error");
        } else {
            // Error
        }

    })
}



function delay() {
    return new Promise(resolve => setTimeout(resolve, 300));
}

async function delayedLog(item) {
    let loading = document.getElementById('load')
    loading.classList.add("loading");
    // notice that we can await a function
    // that returns a promise
    await delay();
    let address = new IWAddress;
    address.setStreet(item.street);
    address.setHouseNumber(item.number);
    address.setZipCode(item.citycode);
    address.setCity(item.city);
    address.setCountryCode("D");
    geocoder.geocodeAddress(address, 1);
}

async function processArray(array) {
    let loading = document.getElementById('load')
    for (const item of array) {
        await delayedLog(item);
    }
    // console.log('Done!');
    loading.classList.remove("loading");
}

function errorMessageForMissAndWrongWriting(errorWrongWriting, errorMissData) {

    let errorContainer = document.getElementById('errorInFileContainer');


    errorContainer.innerHTML = "";


    if (errorMissData != 0) {
        let span1 = document.createElement('div');
        let span2 = document.createElement('div');
        let span3 = document.createElement('div');

        span1.innerText = "Unvollständige Eingaben in den folgenden Zeilen:";

        errorContainer.appendChild(span1);

        errorMissData.forEach(element => {
            // console.log(element);
            let showErrorMissData = document.createElement('div')
            showErrorMissData.className = "mt-1 mb-1 text-decoration-underline";
            showErrorMissData.innerHTML = "Zeile " + element[0] + "  :  " + element[1];
            errorContainer.appendChild(showErrorMissData);
        });

        /*
        span2.innerText = "Die gültige Formatierung lautet";
        span3.innerText = "Straße; Hausnummer; Postleitzahl; Stadt"; 

        errorContainer.appendChild(span2);
        errorContainer.appendChild(span3); */
    } else {

    }

    if (errorWrongWriting != 0) {
        let span4 = document.createElement('div');

        span4.innerText = "Straßen ausschreiben in den folgenden Zeilen:"

        errorContainer.appendChild(span4);

        errorWrongWriting.forEach(element => {
            let showErrorWrongWriting = document.createElement('div')
            showErrorWrongWriting.className = "mt-1 mb-1 text-decoration-none text-decoration-underline";
            showErrorWrongWriting.innerHTML = "Zeile " + element[0] + "  :  " + element[1];
            errorContainer.appendChild(showErrorWrongWriting);
        });
    } else {

    }



    $('#invalidData').modal('show');
}

function checkListofErrors(arr1, arr2) {
    if (arr1.length === 0 && arr2.length === 0) {
        return true;
    } else {

    }

}

function createObjectAndCheckForEachLine(lines, index) {
    // console.log(index);
    let addresses = {
        street: null,
        number: null,
        citycode: null,
        city: null
    }
    let seperateLines = lines.split(";");
    let streetName = seperateLines[0];
    let housenumberInt = seperateLines[1];
    let cityzip = seperateLines[2];
    let city = seperateLines[3];
    let temp = [];

    if (seperateLines.length === 4) {
        if (streetName.includes('.')) {
            // console.log("Fehler Bitte schreiben sie Straße aus.")
            temp.push(index + 1);
            temp.push(lines);
            errorWrongWriting.push(temp)
            temp = [];
        } else {}
    } else {
        // console.log(index + " " + lines + " FEHLER")
        temp.push(index + 1);
        temp.push(lines);
        errorMissData.push(temp);
        temp = [];
    }

    let tmpAdress = addresses;

    tmpAdress.street = streetName;
    tmpAdress.number = housenumberInt;
    tmpAdress.citycode = cityzip;
    tmpAdress.city = city;
    addressObjects.push(tmpAdress);


}


function geocodeEachAddress(array) {
    if (array != null) {

        array.forEach(element => {
            let address = new IWAddress;
            address.setStreet(element.street);
            address.setHouseNumber(element.number);
            address.setZipCode(element.citycode);
            address.setCity(element.city);
            address.setCountryCode("D");
            // console.log(address);
            //    geocoder.geocodeAddressString(address,'D', 1);
            geocoder.geocodeAddress(address, 1)
        });
    }


}


function AddressToCoords(event, map) {


    let temp = []
    let coordX = event.results[0].getAddress().getCoordinate().toWGS84().getX();
    let coordY = event.results[0].getAddress().getCoordinate().toWGS84().getY();
    temp.push(coordY.toString());
    temp.push(coordX.toString());
    ConvertCoords.push(temp);
    temp = [];


    if (ConvertCoords.length == addressObjects.length) {
        checkCoordsBeforeStart(ConvertCoords);
        if (ConvertCoords.length <= 200) {
            if (distanceFromMaxandMinLat < boundsDistance && distanceFromMaxandMinLong < boundsDistance) {
                $('#errorContainer').remove();
                showMarker(ConvertCoords, map);
                showRoute(ConvertCoords, map);
                enableButtons();
            } else {
                $('#errorContainer').remove();
                errorMessageForCoordsThatAreFarFromEachOther();
                disabledButtons();
                RemoveMarkerAndRoute(map);
            }

        } else {
            $('#errorContainer').remove();
            errorMessageForMoreThen200Coords();
            disabledButtons();
            RemoveMarkerAndRoute(map);
        }

    } else {
        // console.log("not same");
    }
}

function errorMessageForCoordsThatAreFarFromEachOther() {
    $("#list-table").css("height", "1px");
    let listTableContainer = document.getElementById('list-table-container');
    let errorMessageContainer = document.createElement('div')
    errorMessageContainer.classList.add("error-container")
    errorMessageContainer.id = "errorContainer";

    let errorMesageTitle = document.createElement('p');
    errorMesageTitle.classList.add("error-title")
    let titleText = "Fehler!"
    errorMesageTitle.innerHTML = titleText;

    let errorMessageText = document.createElement("p")
    errorMessageText.classList.add("error-text")
    let text = "Sie können keine Optimierung durchführen , weil Ihre Koordinaten zu weit voneinander liegen."
    errorMessageText.innerHTML = text;
    errorMessageContainer.appendChild(errorMesageTitle);
    errorMessageContainer.appendChild(errorMessageText);
    listTableContainer.appendChild(errorMessageContainer);
}

function errorMessageForMoreThen200Coords() {
    $("#list-table").css("height", "1px");
    let listTableContainer = document.getElementById('list-table-container');
    let errorMessageContainer = document.createElement('div')
    errorMessageContainer.classList.add("error-container")
    errorMessageContainer.id = "errorContainer";

    let errorMesageTitle = document.createElement('p');
    errorMesageTitle.classList.add("error-title")
    let titleText = "Fehler!"
    errorMesageTitle.innerHTML = titleText;

    let errorMessageText = document.createElement("p")
    errorMessageText.classList.add("error-text")
    let text = "Sie können keine Optimierung durchführen , weil Ihre CSV Datei mehr als 200 Koordinaten beinhaltet."
    errorMessageText.innerHTML = text;
    errorMessageContainer.appendChild(errorMesageTitle);
    errorMessageContainer.appendChild(errorMessageText);
    listTableContainer.appendChild(errorMessageContainer);
}

function disabledButtons() {
    donwloadButton.disabled = true;
    optimizedButton.disabled = true;
}

function enableButtons() {
    donwloadButton.disabled = false;
    optimizedButton.disabled = false;
}

function RemoveMarkerAndRoute(map) {
    $('#list-table').empty();
    IWRoutingManager.removeRoute();
    map.getOverlayManager().getLayer(0).removeAllOverlays();
    map.panTo(new IWCoordinate(7.1408879, 50.70150837, IWCoordinate.WGS84));
    map.zoom(12);
}

function checkCoordsBeforeStart(ConvertCoords) {
    let AlllongFromFile = [];
    let AlllatFromFile = [];
    let maxLatLong;
    let minLatLong;
    let maxLongLat;
    let minLongLat;
    // let maxLat = 0;
    // let minLat = ConvertCoords[0][0];
    // let maxLong = 0;
    // let minLong = ConvertCoords[0][1];

    let allLat = [];
    let allLong = [];

    ConvertCoords.forEach(element => {
        allLat.push(element[0]);
        allLong.push(element[1]);
    });


    let maxLat = Math.max.apply(null, allLat);
    let minLat = Math.min.apply(null, allLat);
    let maxLong = Math.max.apply(null, allLong);
    let minLong = Math.min.apply(null, allLong);

    ConvertCoords.forEach(element => {
        if (element[1] == maxLong) {
            maxLongLat = element;
        }

        if (element[1] == minLong) {
            minLongLat = element;
        }

        if (element[0] == maxLat) {
            maxLatLong = element;
        }

        if (element[0] == minLat) {
            minLatLong = element;
        }


    });

    /*   ConvertCoords.forEach(function(element) {
           if (element[0] > maxLat) {
               maxLat = element[0];
               maxLatLong = element;

           }
           if (element[0] <= minLat) {
               console.log("Yes");
               minLat = element[0];
               minLatLong = element;
               console.log(minLat);
           }

           if (element[1] > maxLong) {
               maxLong = element[1];
               maxLongLat = element;
           }

           if (element[1] < minLong) {
               minLong = element[1];
               minLongLat = element;
           }
       }); */

    let newCoordMaxLat = new IWCoordinate(maxLatLong[1], maxLatLong[0], IWCoordinate.WGS84);
    let newCoordMinLat = new IWCoordinate(minLatLong[1], minLatLong[0], IWCoordinate.WGS84);

    let newCoordMaxLong = new IWCoordinate(maxLongLat[1], maxLongLat[0], IWCoordinate.WGS84);
    let newCoordMinLong = new IWCoordinate(minLongLat[1], minLongLat[0], IWCoordinate.WGS84);

    distanceFromMaxandMinLat = parseInt(newCoordMaxLat.distanceFrom(newCoordMinLat));
    distanceFromMaxandMinLong = parseInt(newCoordMaxLong.distanceFrom(newCoordMinLong));

}

function getMinMaxOf2DIndex(arr, idx) {
    return {
        min: Math.min.apply(null, arr.map(function(e) {
            return e[idx]
        })),
        max: Math.max.apply(null, arr.map(function(e) {
            return e[idx]
        }))
    }
}


function showAddressAndCoordsInTableForAddress(elementOne, elementTwo, array) {
    let ol = document.getElementById('list-table');
    $("#list-table").css("height", "363px");
    ol.classList.add("list-overflow");
    let li = document.createElement('li');
    let liDiv1 = document.createElement('div');
    let liDiv2 = document.createElement('div');
    let span1 = document.createElement('div');
    let span2 = document.createElement('div');
    let addressString = array.street + ", " + array.number + ", " + array.citycode + ", " + array.city;
    liDiv1.innerHTML = addressString;
    span1.innerHTML = "lat: " + elementTwo;
    span2.innerHTML = "long: " + elementOne;
    liDiv2.appendChild(span1);
    liDiv2.appendChild(span2);
    li.className = "list-group-item koordinaten";
    li.appendChild(liDiv1);
    li.appendChild(liDiv2);
    ol.appendChild(li);
}

function showCoordsInTheTableforCoords(elementOne, elementTwo) {
    let ol = document.getElementById('list-table');
    $("#list-table").css("height", "363px");
    ol.classList.add("list-overflow");
    let li = document.createElement('li')
    let liDiv1 = document.createElement('div');
    let span1 = document.createElement('div');
    let span2 = document.createElement('div');
    span1.innerHTML = "lat: " + elementTwo;
    span2.innerHTML = "long: " + elementOne;
    li.className = "list-group-item koordinaten";
    liDiv1.appendChild(span1);
    liDiv1.appendChild(span2);
    li.appendChild(liDiv1);
    ol.appendChild(li);

}

function showMarker(ConvertCoords, map) {
    $('#list-table').empty();
    if (marker == null) {} else {
        map.getOverlayManager().getLayer(0).removeAllOverlays();
    }
    for (let i = 0; i < ConvertCoords.length; i++) {
        if (addressObjects == 0) {
            showCoordsInTheTableforCoords(ConvertCoords[i][1], ConvertCoords[i][0])
        } else {
            showAddressAndCoordsInTableForAddress(ConvertCoords[i][1], ConvertCoords[i][0], addressObjects[i])
        }

        let coords = new IWCoordinate(ConvertCoords[i][1], ConvertCoords[i][0], IWCoordinate.WGS84);
        marker = IWMarkerFactory.createMarker(map, coords, {
            markerColor: '#4d98fa',
            style: 'marker-circle',
            label: '' + (i + 1),
            height: 35,
        });
        map.getOverlayManager().getLayer(0).addOverlay(marker);
    }

}

function showRoute(ConvertCoords) {
    let tempInterstations = [];
    IWRoutingManager.removeRoute();
    let startCoords = new IWCoordinate(ConvertCoords[0][1], ConvertCoords[0][0], IWCoordinate.WGS84);
    let destiCoords = new IWCoordinate(ConvertCoords[ConvertCoords.length - 1][1], ConvertCoords[ConvertCoords.length - 1][0], IWCoordinate.WGS84)
    start = new IWAddress()
    start.setCoordinate(startCoords);
    IWRoutingManager.updateStart(start);
    tempInterstations = [];
    for (let i = 1; i < ConvertCoords.length; i++) {
        let intCoords = new IWCoordinate(ConvertCoords[i][1], ConvertCoords[i][0], IWCoordinate.WGS84);
        let interstation = new IWAddress();
        interstation.setCoordinate(intCoords)
        tempInterstations.push(interstation);
    }

    IWRoutingManager.setInterstations(tempInterstations);
    destination = new IWAddress();
    destination.setCoordinate(startCoords);
    IWRoutingManager.updateDestination(destination);

}

function splitLinesFromTextFile(lines) {
    fileCoords = []
    for (var i = 0; i < lines.length; i++) {
        if (lines[i] === "") {} else {
            ConvertCoords.push(lines[i].split(";"));
        }
    }
}

function optimizeRouting(fileCoords, map) {
    let tempCoords = []
    optimizeCoords = [];
    optimizeResult = [];
    //  console.log(fileCoords);
    fileCoords.forEach(element => {
        let coordsInMercator = new IWCoordinate(element[1], element[0], IWCoordinate.WGS84).toMercator();

        let stringX = coordsInMercator._x.toString().split(".")[0];
        let stringY = coordsInMercator._y.toString().split(".")[0];

        let coordinates = 'coordinates=' + stringX + ';' + stringY;
        tempCoords.push(coordinates)
    });

    let start = 0;
    let destination = fileCoords.length - 1;



    let url = "https://maps.infoware.de/MapSuiteBackend/tour.json";
    let data = 'vnr=0&pnr=0&routeType=Speed&mobilityProfile=types_fast.txt' + '&' + $.makeArray(tempCoords).join('&');
    $.getJSON(url, data, function(result) {
        let loading = document.getElementById('load')
        if (result.success === true) {
            loading.classList.remove("loading");
        } else {
            loading.classList.remove("loading");
        }

        $('#list-table').empty();
        let temp = [];
        let tempElement = []
            // console.log(result.tour.stations);
        let getResultStations = result.tour.stations;
        // console.log(result);
        result.tour.stations.forEach(function(element, index) {
            if (index != getResultStations.length - 1) {
                let optimizeCoordinates = new IWCoordinate(element.x, element.y).toWGS84();
                showCoordsInTheTableforCoords(optimizeCoordinates._x, optimizeCoordinates._y)
                temp.push(optimizeCoordinates._y.toString());
                temp.push(optimizeCoordinates._x.toString());
                tempElement.push(element.y.toString());
                tempElement.push(element.x.toString());
                optimizeResult.push(tempElement);
                tempElement = [];
                optimizeCoords.push(temp);
                temp = [];
            }
        });
        showMarker(optimizeCoords, map);
        showRoute(optimizeCoords, map);
    });
}

function exportAllCoordinates(optimizeResult, event) {
    if (optimizeResult.length != 0) {

        let tempInterstaionsWithTheDirectionsCoords = [];
        let tempAllDirectons = [];
        let routeCoords = event.route.getCoordinates();

        let temp = [];
        // console.log(routeCoords);
        routeCoords.forEach(element => {
            let iwcoords = new IWCoordinate(element._x, element._y);
            temp.push(iwcoords._y.toString());
            temp.push(iwcoords._x.toString());
            tempAllDirectons.push(temp);
            temp = [];
        });



        // console.log(tempAllDirectons);


        for (let i = 0; i < tempAllDirectons.length; i++) {

            for (let k = 0; k < optimizeResult.length; k++) {

                if (tempAllDirectons[i][0] === optimizeResult[k][0] && tempAllDirectons[i][1] === optimizeResult[k][1]) {

                    tempAllDirectons[i].splice(2, 0, "SAMMELN");
                } else {

                }

            }
            tempInterstaionsWithTheDirectionsCoords.push(tempAllDirectons[i]);
        }



        tempInterstaionsWithTheDirectionsCoords.forEach(coords => {
            let temp = [];
            if (coords.length >= 3) {
                const key = coords[0] + " - " + coords[1];
                if (koordMap.hasOwnProperty(key)) {} else {
                    koordMap[key] = true;
                    let newCoords = new IWCoordinate(coords[1], coords[0]).toWGS84();
                    temp.push(newCoords);
                    temp.push(coords[2]);
                    filterInterstaionsWithRouteCoords.push(temp);
                    temp = [];
                }
            } else {
                let newCoords = new IWCoordinate(coords[1], coords[0]).toWGS84();
                filterInterstaionsWithRouteCoords.push(newCoords);
            }
        });



    } else {

    }
}

function showRoutingInfomationBeforeOptimize(event) {
    if (optimizeResult.length != 0) {

    } else {
        let beforeRouteddiv = document.getElementById("before-optimize");
        let routeLengthinKm = event.routes[0].getRouteLength().toString();
        let str = routeLengthinKm.slice(0, -3);
        let routeLengthinKmGetParsed = parseInt(str);
        let text = "Eine Route wurde berechnet, die Routenlänge beträgt " + routeLengthinKmGetParsed + "KM und die geschätzte Fahrtzeit beträgt " + event.routes[0].getFormattedDrivingTime() + " Stunden.";

        beforeRouteddiv.innerHTML = text;
    }

}

function showRoutingInfomationafterOptimize(event) {
    if (optimizeResult.length != 0) {
        let afterRouteddiv = document.getElementById("after-optimize");
        let routeLengthinKm = event.routes[0].getRouteLength().toString();
        let str = routeLengthinKm.slice(0, -3);
        let routeLengthinKmGetParsed = parseInt(str);
        let text = "Eine Optimierte Route wurde berechnet, die Routenlänge beträgt " + routeLengthinKmGetParsed + "KM und die geschätzte Fahrtzeit beträgt " + event.routes[0].getFormattedDrivingTime() + " Stunden.";
        afterRouteddiv.innerHTML = text;
    } else {

    }
}

function clearRoutingInfomationContainer() {
    $('#before-optimize').empty();
    $('#after-optimize').empty();
}

function getRouteCoordsWith30mDistance(array, map) {

    if (array != 0) {

        nextMarkerAt = 0


        array.forEach(ele => {
            if (Array.isArray(ele)) {
                interstationsForFMexport.push(ele);
            }
        });


        routeCoordsWithInterstaionsWith30MetersDistance.push(interstationsForFMexport[0]);
        interstationsForFMexport.shift();

        while (true) {

            nextPoint = moveAlongPath(array, nextMarkerAt);
            if (nextPoint) {

                routeCoordsWithInterstaionsWith30MetersDistance.push(nextPoint);
                nextMarkerAt += 30;
            } else {
                break;
            }
        }

        routeCoordsWithInterstaionsWith30MetersDistance.push(array[0][0]);

    } else {


    }



}

IWCoordinate.prototype.moveTowards = function(point, distance) {
    var lat1 = this.getY().toRad();
    var lon1 = this.getX().toRad();
    var lat2 = point.getY().toRad();
    var lon2 = point.getX().toRad();
    var dLon = (point.getX() - this.getX()).toRad();

    // Find the bearing from this point to the next.
    var brng = Math.atan2(Math.sin(dLon) * Math.cos(lat2),
        Math.cos(lat1) * Math.sin(lat2) -
        Math.sin(lat1) * Math.cos(lat2) *
        Math.cos(dLon));

    var angDist = distance / 6371000; // Earth's radius.

    // Calculate the destination point, given the source and bearing.
    lat2 = Math.asin(Math.sin(lat1) * Math.cos(angDist) +
        Math.cos(lat1) * Math.sin(angDist) *
        Math.cos(brng));

    lon2 = lon1 + Math.atan2(Math.sin(brng) * Math.sin(angDist) *
        Math.cos(lat1),
        Math.cos(angDist) - Math.sin(lat1) *
        Math.sin(lat2));

    if (isNaN(lat2) || isNaN(lon2)) return null;

    return new IWCoordinate(lon2.toDeg(), lat2.toDeg(), IWCoordinate.WGS84);
}

function moveAlongPath(points, distance, index) {
    index = index || 0; // Set index to 0 by default.
    let firstCoord;
    let secondCoord;
    let isSecondInterstation = false;


    if (index < points.length) {


        if (Array.isArray(points[index])) {
            isCurrentInterstation = true;
            firstCoord = points[index][0];
            if (interstationsForFMexport.length != 0) {
                if (firstCoord === interstationsForFMexport[0][0]) {
                    routeCoordsWithInterstaionsWith30MetersDistance.push(interstationsForFMexport.shift());
                } else {

                }

            } else {

            }
        } else {
            isCurrentInterstation = false;
            firstCoord = points[index];

        }

        if (points[index + 1]) {
            if (Array.isArray(points[index + 1])) {
                secondCoord = points[index + 1][0];
                // isSecondInterstation = true;
            } else {
                secondCoord = points[index + 1];
            }
        } else {
            return null;
        }


        let polyline = firstCoord.distanceFrom(secondCoord);
        let distanceToNextPoint = polyline;



        if (distance <= distanceToNextPoint) {


            return firstCoord.moveTowards(secondCoord, distance);
        } else {
            return moveAlongPath(points,
                distance - distanceToNextPoint,
                index + 1);

        }



    } else {

        return null;
    }
}

function exportToCsVFile() {
    var csvStr = exportfields.join(";") + "\n";
    routeCoordsWithInterstaionsWith30MetersDistance.forEach(element => {
        if (element.length >= 2) {
            let lat = element[0]._y.toString();
            let long = element[0]._x.toString();
            let eVT_TYPE = "1";
            let eVT_DESCR = "SAMMELN";

            csvStr += lat + ';' + long + ';' + eVT_TYPE + ';' + eVT_DESCR + "\n";
        } else {
            let lat = element._y.toString();
            let long = element._x.toString();
            let eVT_TYPE = "";
            let eVT_DESCR = "";

            csvStr += lat + ';' + long + ';' + eVT_TYPE + ';' + eVT_DESCR + "\n";
        }
    })
    return csvStr;


}