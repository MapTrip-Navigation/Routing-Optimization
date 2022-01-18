let map;
document.addEventListener("DOMContentLoaded", function() {

    document.getElementById('current-year').innerHTML = (new Date()).getFullYear();
    // Create the map object
    map = new IWMap(document.getElementById('map'));
    let mapType = map.getOptions().getMapTypeByName('vector');
    let mapContainer = document.getElementById('map-container')
    map.getOptions().setAutoResize(true, mapContainer);
    map.setCenter(new IWCoordinate(7.1408879, 50.70150837, IWCoordinate.WGS84), 12, mapType);
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

    let renderer = new IWMapRenderer(map);



    FileAPI.event.on(fileInput, 'change', function(evt) {
        var files = FileAPI.getFiles(evt); // Retrieve file list
        if (files[0].type == "text/plain" || files[0].type == "application/vnd.ms-excel") {
            clearRoutingInfomationContainer();
            openDataFromFile(files, map, renderer);
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


    IWEventManager.addListener(geocoder, 'ongeocode', function(event) {
        if (event.status == "OK") {
            AddressToCoords(event, map, renderer);
        } else {}
    });

    IWEventManager.addCustomListener(IWRoutingManager, 'onroute', function(event) {});

    $("#opti-btn").click(function() {
        let loading = document.getElementById('load')
        loading.classList.add("loading");
        // optimizeRouting(ConvertCoords, map);
        getOptimizeRouting(ConvertCoords, map, renderer);
    });

    $("#download-btn").click(function() {
        var hiddenElement = document.createElement('a');
        hiddenElement.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(createCSVFile());
        hiddenElement.target = '_blank';
        hiddenElement.download = 'FMeOptimierteRoute.csv';
        hiddenElement.click();
    });


    $('#infoModal').modal('show');

    $('input:radio[name=inlineRadioOptions]').change(function() {
        if (this.value == 'oneway') {
            routingWayOption = "oneway";
            if (uploadConditions === true) {
                showMarker(ConvertCoords, map);
                showRoute(ConvertCoords, renderer, map);
                uploadConditions = true;
            } else if (uploadConditions === false) {}
        } else if (this.value == 'roundtrip') {
            routingWayOption = "roundtrip";
            if (uploadConditions === true) {
                showMarker(ConvertCoords, map);
                showRoute(ConvertCoords, renderer, map);
                uploadConditions = true;
            } else if (uploadConditions === false) {}
        }
    });

});

Number.prototype.toRad = function() {
    return this * Math.PI / 180;
}

Number.prototype.toDeg = function() {
    return this * 180 / Math.PI;
}



let optimizeExample = [];
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
let routingWayOption = "oneway"

let addressObjects = [];
let errorWrongWriting = [];
let errorMissData = [];
let ConvertCoords = [];
let uploadConditions = false;

function openDataFromFile(files, map, renderer) {
    FileAPI.readAsText(files[0], "utf-8", function(evt) {
        if (evt.type == 'load') {
            if (evt.target.type == "text/plain") {
                var text = evt.result;
                let firstCharFromText = text.charAt(0);
                if (reg.test(firstCharFromText)) {
                    lines = text.split("\r\n"), output = [];
                    splitLinesFromTextFile(lines);
                    checkCoordsBeforeStart(ConvertCoords);
                    if (ConvertCoords.length <= 200) {
                        if (distanceFromMaxandMinLat < boundsDistance && distanceFromMaxandMinLong < boundsDistance) {
                            $('#errorContainer').remove();
                            showMarker(ConvertCoords, map);
                            showRoute(ConvertCoords, renderer, map);
                            uploadConditions = true;
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
                            showRoute(ConvertCoords, renderer, map);
                            uploadConditions = true;
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
            geocoder.geocodeAddress(address, 1)
        });
    }


}


function AddressToCoords(event, map, renderer) {


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
                showRoute(ConvertCoords, renderer, map);
                uploadConditions = true;
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

    } else {}
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



function showRoute(array, renderer, map) {
    let ConvertedCoordinates = array;
    let waypoints = "";


    if (routingWayOption === "oneway") {
        let startCoordsOneWay = new IWCoordinate(array[0][1], array[0][0], IWCoordinate.WGS84);
        let destinationCoordsOneWay = new IWCoordinate(array[array.length - 1][1], array[array.length - 1][0], IWCoordinate.WGS84);

        for (let i = 0; i < ConvertedCoordinates.length; i++) {
            if (i === 0 || i === ConvertedCoordinates.length - 1) {

            } else {
                let wayCoord = ConvertedCoordinates[i][0] + "%2C" + ConvertedCoordinates[i][1] + ";"
                waypoints += wayCoord;
            }
        }

        $.ajax({
            // url: "https://api.maptrip.de/v1/route?provider=TomTom&from=50.73270%2C7.09630&to=50.94212%2C6.95781&waypoints=50.8382171%2C7.0917674%2C500&startTime=2021-07-06T17%3A02%3A00%2B02%3A00&vehicle=car&type=fastest&traffic=false&alternatives=0&avoidToll=false&avoidFerries=false&avoidHighways=false&width=0&height=0&length=0&weight=0&axles=0&axleLoad=0&hazardousGoods=false&explosiveMaterials=false&materialsHarmfulToWater=false&tunnelRestrictionCode=tunnelRestrictionCode_example&joinGeometry=true",
            url: "https://api.maptrip.de/v1/route?provider=TomTom&from=" + startCoordsOneWay.getY().toString() + "%2C" + startCoordsOneWay.getX().toString() + "&to=" + destinationCoordsOneWay.getY().toString() + "%2C" + destinationCoordsOneWay.getX().toString() + "&waypoints=" + waypoints + "&startTime=NOW&vehicle=car&type=fastest&traffic=false&alternatives=0&avoidToll=false&avoidFerries=false&avoidHighways=false&width=0&height=0&length=0&weight=0&axles=0&axleLoad=0&hazardousGoods=false&explosiveMaterials=false&materialsHarmfulToWater=false&tunnelRestrictionCode=tunnelRestrictionCode_example&joinGeometry=true",
            beforeSend: function(xhr) {
                xhr.setRequestHeader("accept", "application/json");
                xhr.setRequestHeader("Authorization", "Bearer eyJhbGciOiJIUzUxMiJ9.eyJzdWIiOiJzYWxlaEBpbmZvd2FyZS5kZSIsImF1dGgiOiJST0xFX1VTRVIiLCJpZCI6ODY5MDEsImV4cCI6MTY0NDE1NDQxMX0.z8Qr5auhVW3L5MCf3Wq87c8l2NkA3v9iCxzxMLVZdZEZEgBxBQJzMgDVVDKThkF3qU_1vXEAYM7ftDlK-cm5fw");
                xhr.setRequestHeader("Content-Type", "application/json");

            },
            success: function(data) {
                showRouteonMap(data, map, renderer)
                routingInfomation(data);
            }
        })
    } else if (routingWayOption === "roundtrip") {
        let startCoordsOneWay = new IWCoordinate(array[0][1], array[0][0], IWCoordinate.WGS84);
        let destinationCoordsOneWay = new IWCoordinate(array[0][1], array[0][0], IWCoordinate.WGS84);

        for (let i = 0; i < ConvertedCoordinates.length; i++) {
            if (i === 0 || i === ConvertedCoordinates.length - 1) {} else {
                let wayCoord = ConvertedCoordinates[i][0] + "%2C" + ConvertedCoordinates[i][1] + ";"
                waypoints += wayCoord;
            }
        }

        $.ajax({
            // url: "https://api.maptrip.de/v1/route?provider=TomTom&from=50.73270%2C7.09630&to=50.94212%2C6.95781&waypoints=50.8382171%2C7.0917674%2C500&startTime=2021-07-06T17%3A02%3A00%2B02%3A00&vehicle=car&type=fastest&traffic=false&alternatives=0&avoidToll=false&avoidFerries=false&avoidHighways=false&width=0&height=0&length=0&weight=0&axles=0&axleLoad=0&hazardousGoods=false&explosiveMaterials=false&materialsHarmfulToWater=false&tunnelRestrictionCode=tunnelRestrictionCode_example&joinGeometry=true",
            url: "https://api.maptrip.de/v1/route?provider=TomTom&from=" + startCoordsOneWay.getY().toString() + "%2C" + startCoordsOneWay.getX().toString() + "&to=" + destinationCoordsOneWay.getY().toString() + "%2C" + destinationCoordsOneWay.getX().toString() + "&waypoints=" + waypoints + "&startTime=NOW&vehicle=car&type=fastest&traffic=false&alternatives=0&avoidToll=false&avoidFerries=false&avoidHighways=false&width=0&height=0&length=0&weight=0&axles=0&axleLoad=0&hazardousGoods=false&explosiveMaterials=false&materialsHarmfulToWater=false&tunnelRestrictionCode=tunnelRestrictionCode_example&joinGeometry=true",
            beforeSend: function(xhr) {
                xhr.setRequestHeader("accept", "application/json");
                xhr.setRequestHeader("Authorization", "Bearer eyJhbGciOiJIUzUxMiJ9.eyJzdWIiOiJzYWxlaEBpbmZvd2FyZS5kZSIsImF1dGgiOiJST0xFX1VTRVIiLCJpZCI6ODY5MDEsImV4cCI6MTY0NDE1NDQxMX0.z8Qr5auhVW3L5MCf3Wq87c8l2NkA3v9iCxzxMLVZdZEZEgBxBQJzMgDVVDKThkF3qU_1vXEAYM7ftDlK-cm5fw");
                xhr.setRequestHeader("Content-Type", "application/json");

            },
            success: function(data) {
                showRouteonMap(data, map, renderer)
                routingInfomation(data);
            }
        })
    }

}

function showRouteWithOptimizeCoords(array, renderer, map) {
    let ConvertedCoordinates = array;
    let waypoints = "";


    if (routingWayOption === "oneway") {
        let startCoordsOneWay = new IWCoordinate(array[0][1], array[0][0], IWCoordinate.WGS84);
        let destinationCoordsOneWay = new IWCoordinate(array[array.length - 1][1], array[array.length - 1][0], IWCoordinate.WGS84);

        for (let i = 0; i < ConvertedCoordinates.length; i++) {
            if (i === 0 || i === ConvertedCoordinates.length - 1) {

            } else {
                let wayCoord = ConvertedCoordinates[i][0] + "%2C" + ConvertedCoordinates[i][1] + ";"
                waypoints += wayCoord;
            }
        }

        $.ajax({
            url: "https://api.maptrip.de/v1/route?provider=TomTom&from=" + startCoordsOneWay.getY().toString() + "%2C" + startCoordsOneWay.getX().toString() + "&to=" + destinationCoordsOneWay.getY().toString() + "%2C" + destinationCoordsOneWay.getX().toString() + "&waypoints=" + waypoints + "&startTime=NOW&vehicle=car&type=fastest&traffic=false&alternatives=0&avoidToll=false&avoidFerries=false&avoidHighways=false&width=0&height=0&length=0&weight=0&axles=0&axleLoad=0&hazardousGoods=false&explosiveMaterials=false&materialsHarmfulToWater=false&tunnelRestrictionCode=tunnelRestrictionCode_example&joinGeometry=true",
            beforeSend: function(xhr) {
                xhr.setRequestHeader("accept", "application/json");
                xhr.setRequestHeader("Authorization", "Bearer eyJhbGciOiJIUzUxMiJ9.eyJzdWIiOiJzYWxlaEBpbmZvd2FyZS5kZSIsImF1dGgiOiJST0xFX1VTRVIiLCJpZCI6ODY5MDEsImV4cCI6MTY0NDE1NDQxMX0.z8Qr5auhVW3L5MCf3Wq87c8l2NkA3v9iCxzxMLVZdZEZEgBxBQJzMgDVVDKThkF3qU_1vXEAYM7ftDlK-cm5fw");
                xhr.setRequestHeader("Content-Type", "application/json");

            },
            success: function(data) {
                showRouteonMap(data, map, renderer)
                optimizeRoutingInfomation(data)
                exportAllCoordinates(optimizeResult, data);
                getRouteCoordsWith30mDistance(filterInterstaionsWithRouteCoords, map);
            }
        })
    } else if (routingWayOption === "roundtrip") {
        let startCoordsOneWay = new IWCoordinate(array[0][1], array[0][0], IWCoordinate.WGS84);
        let destinationCoordsOneWay = new IWCoordinate(array[array.length - 1][1], array[array.length - 1][0], IWCoordinate.WGS84);

        for (let i = 0; i < ConvertedCoordinates.length; i++) {
            if (i === 0 || i === ConvertedCoordinates.length - 1) {} else {
                let wayCoord = ConvertedCoordinates[i][0] + "%2C" + ConvertedCoordinates[i][1] + ";"
                waypoints += wayCoord;
            }
        }

        $.ajax({
            url: "https://api.maptrip.de/v1/route?provider=TomTom&from=" + startCoordsOneWay.getY().toString() + "%2C" + startCoordsOneWay.getX().toString() + "&to=" + destinationCoordsOneWay.getY().toString() + "%2C" + destinationCoordsOneWay.getX().toString() + "&waypoints=" + waypoints + "&startTime=NOW&vehicle=car&type=fastest&traffic=false&alternatives=0&avoidToll=false&avoidFerries=false&avoidHighways=false&width=0&height=0&length=0&weight=0&axles=0&axleLoad=0&hazardousGoods=false&explosiveMaterials=false&materialsHarmfulToWater=false&tunnelRestrictionCode=tunnelRestrictionCode_example&joinGeometry=true",
            beforeSend: function(xhr) {
                xhr.setRequestHeader("accept", "application/json");
                xhr.setRequestHeader("Authorization", "Bearer eyJhbGciOiJIUzUxMiJ9.eyJzdWIiOiJzYWxlaEBpbmZvd2FyZS5kZSIsImF1dGgiOiJST0xFX1VTRVIiLCJpZCI6ODY5MDEsImV4cCI6MTY0NDE1NDQxMX0.z8Qr5auhVW3L5MCf3Wq87c8l2NkA3v9iCxzxMLVZdZEZEgBxBQJzMgDVVDKThkF3qU_1vXEAYM7ftDlK-cm5fw");
                xhr.setRequestHeader("Content-Type", "application/json");

            },
            success: function(data) {
                showRouteonMap(data, map, renderer)
                optimizeRoutingInfomation(data)
                exportAllCoordinates(optimizeResult, data);
                getRouteCoordsWith30mDistance(filterInterstaionsWithRouteCoords, map);
            }
        })
    }

}

function showRouteonMap(data, map, renderer) {

    renderer.clearContainer();

    let iwRouteCoords = [];


    let min = data[0].summary.boundingBox.min;
    let max = data[0].summary.boundingBox.max;

    let bound1 = new IWCoordinate(min.lon, min.lat, IWCoordinate.WGS84)
    let bound2 = new IWCoordinate(max.lon, max.lat, IWCoordinate.WGS84)

    var bounds = new IWBounds(bound1, bound2);

    map.setCenter(bounds.getCenter(), map.getBoundsZoomlevel(bounds) - 1);

    data[0].geometry.features[0].geometry.coordinates.forEach((element) => {
        let newCoords = new IWCoordinate(element[0], element[1], IWCoordinate.WGS84);
        iwRouteCoords.push(newCoords);
    });

    renderer.drawPolyline(iwRouteCoords, { stroke: 'rgb(0, 170, 255)', strokeWidth: 5 });
    polylineIsDraw = true;
    renderer.render();
}

function splitLinesFromTextFile(lines) {
    fileCoords = []
    for (var i = 0; i < lines.length; i++) {
        if (lines[i] === "") {} else {
            ConvertCoords.push(lines[i].split(";"));
        }
    }
}

function sendRequest(arrayCoords, renderer) {

    let datawaypoints = "";

    if (routingWayOption === "oneway") {
        let start = {
            'coordinate': {
                'lat': arrayCoords[0][0],
                'lon': arrayCoords[0][1]
            },
            'name': "First",
            'start': true
        }
        let desti = {
            'coordinate': {
                'lat': arrayCoords[arrayCoords.length - 1][0],
                'lon': arrayCoords[arrayCoords.length - 1][1]
            },
            'name': "Last",
            'destination': true
        }
        datawaypoints += JSON.stringify(start).concat(",");
        for (let i = 0; i < arrayCoords.length; i++) {

            if (i === 0 || i === arrayCoords.length - 1) {

            } else {
                let points = {
                    'coordinate': {
                        'lat': arrayCoords[i][0],
                        'lon': arrayCoords[i][1]
                    },
                    'name': i.toString(),
                }
                datawaypoints += JSON.stringify(points).concat(",");
            }
        }
        datawaypoints += JSON.stringify(desti)
    } else if (routingWayOption === "roundtrip") {

        let start = {
            'coordinate': {
                'lat': arrayCoords[0][0],
                'lon': arrayCoords[0][1]
            },
            'name': "First",
            'start': true,
            'destination': true
        }
        datawaypoints += JSON.stringify(start).concat(",");
        for (let i = 0; i < arrayCoords.length; i++) {
            if (i === 0) {} else {
                let points = {
                    'coordinate': {
                        'lat': arrayCoords[i][0],
                        'lon': arrayCoords[i][1]
                    },
                    'name': i.toString(),
                }
                if (i === arrayCoords.length - 1) {
                    datawaypoints += JSON.stringify(points);
                } else {
                    datawaypoints += JSON.stringify(points).concat(",");
                }
            }
        }
    }


    var url = "https://api.maptrip.de/v1/optimize/stops?provider=TomTom&startTime=2021-07-06T17%3A02%3A00%2B02%3A00&vehicle=car&type=fastest&traffic=false" +
        "&width=0&height=0&length=0&weight=0&axles=0&axleLoad=0&hazardousGoods=false&explosiveMaterials=false&materialsHarmfulToWater=false" +
        "&tunnelRestrictionCode=tunnelRestrictionCode_example";

    var xhr = new XMLHttpRequest();
    xhr.open("POST", url);

    xhr.setRequestHeader("accept", "application/json");
    xhr.setRequestHeader("Authorization", "Bearer eyJhbGciOiJIUzUxMiJ9.eyJzdWIiOiJzYWxlaEBpbmZvd2FyZS5kZSIsImF1dGgiOiJST0xFX1VTRVIiLCJpZCI6ODY5MDEsImV4cCI6MTY0NDE1NDQxMX0.z8Qr5auhVW3L5MCf3Wq87c8l2NkA3v9iCxzxMLVZdZEZEgBxBQJzMgDVVDKThkF3qU_1vXEAYM7ftDlK-cm5fw");
    xhr.setRequestHeader("Content-Type", "application/json");

    xhr.onload = function(e) {
        if (xhr.readyState === 4) {
            if (xhr.status === 202) {
                let myobj = JSON.parse(xhr.responseText);
                getOptimizeData(myobj.id, renderer)
            } else {
                console.log("Error")
            }
        }
    };

    xhr.onerror = function(e) {
        console.error(xhr.statusText);
    };

    let data = "[" + datawaypoints + "]";
    xhr.send(data);
}

function getOptimizeData(id, renderer) {

    optimizeCoords = [];

    var url = "https://api.maptrip.de/v1/optimize/stops/" + id.toString() + "";
    $.ajax({
            url: url,
            beforeSend: function(xhr) {
                xhr.setRequestHeader("accept", "application/json");
                xhr.setRequestHeader("Authorization", "Bearer eyJhbGciOiJIUzUxMiJ9.eyJzdWIiOiJzYWxlaEBpbmZvd2FyZS5kZSIsImF1dGgiOiJST0xFX1VTRVIiLCJpZCI6ODY5MDEsImV4cCI6MTY0Mzk4NjU5NX0.sKcj24AkHnBCi7KZok7rR6p2IMGsF1yIR7QjxcgFpt5Vt0qTRMPKewbjvq5tzBjm5o36k3wuZfDvJsslhSBB3w");
                xhr.setRequestHeader("Content-Type", "application/json");
            }
        })
        .done(function(data) {
            if (data.status === "Running") {
                getOptimizeData(id.toString(), renderer)
            } else if (data.status === "Done") {
                removeLoadingView();
                $('#list-table').empty();
                let tmp = [];
                let tmp1 = [];
                for (let i = 0; i < data.stops.length; i++) {
                    tmp = []
                    tmp1 = []
                    tmp.push(data.stops[i].coordinate.lat.toString())
                    tmp.push(data.stops[i].coordinate.lon.toString())
                    let tmpCoord = new IWCoordinate(data.stops[i].coordinate.lat, data.stops[i].coordinate.lon, IWCoordinate.WGS84).toMercator();
                    tmp1.push(tmpCoord._x.toString().split(".")[0])
                    tmp1.push(tmpCoord._y.toString().split(".")[0])
                    showCoordsInTheTableforCoords(data.stops[i].coordinate.lat.toString(), data.stops[i].coordinate.lon.toString())
                    optimizeCoords.push(tmp)
                    optimizeResult.push(tmp1)
                }
                showMarker(optimizeCoords, map);
                showRouteWithOptimizeCoords(optimizeCoords, renderer, map)
            }
        });
}

function removeLoadingView() {
    let loading = document.getElementById('load')
    loading.classList.remove("loading");
}

function getOptimizeRouting(fileCoords, map, renderer) {
    sendRequest(fileCoords, renderer)
}


function exportAllCoordinates(optimizeResult, event) {

    if (optimizeResult.length != 0) {
        let routeIWCoords = [];
        let optimizeIWCoords = [];
        let routeWithWaypoints = [];
        filterInterstaionsWithRouteCoords = [];

        let routeCoords = event[0].geometry.features[0].geometry.coordinates

        let tmp = [];
        optimizeCoords.forEach(function(element) {
            let createOptimizeIwCoords = new IWCoordinate(element[1], element[0], "WGS84")
            tmp.push(createOptimizeIwCoords);
            optimizeIWCoords.push(tmp);
            tmp = []
        })

        let tmp1 = []
        routeCoords.forEach(function(element) {
            let createIwCoords = new IWCoordinate(element[0], element[1], "WGS84")
            tmp1.push(createIwCoords);
            routeIWCoords.push(tmp1);
            tmp1 = []
        })

        for (let i = 0; i < routeIWCoords.length; i++) {

            for (let k = 0; k < optimizeIWCoords.length; k++) {
                if (routeIWCoords[i][0].equals(optimizeIWCoords[k][0]) === true) {
                    if (k === 0) {
                        routeIWCoords[i].splice(0, 1, optimizeIWCoords[k][0]);
                        routeIWCoords[i].splice(2, 0, "SAMMELN");
                        optimizeIWCoords.shift();
                    } else {}
                } else {

                }

            }
            routeWithWaypoints.push(routeIWCoords[i])
        }

        routeWithWaypoints.forEach(function(element) {
            if (element.length === 2) {
                let tmp = []
                tmp.push(element[0])
                tmp.push(element[1])
                filterInterstaionsWithRouteCoords.push(tmp)
            } else {
                let coordToWGS84 = element[0]
                filterInterstaionsWithRouteCoords.push(coordToWGS84);
            }
        })

    } else {

    }
}

function routingInfomation(data) {
    let routeLength = data[0].summary.length;
    let km = routeLength / 1000;
    let drivingTime = data[0].summary.drivingTime
    let drivingTimeinFormat = new Date(drivingTime * 1000).toISOString().substr(11, 5);
    let beforeRouteddiv = document.getElementById("before-optimize");
    let text = "Eine Route wurde berechnet, die Routenlänge beträgt " + km.toFixed(1) + "KM und die geschätzte Fahrtzeit beträgt " + drivingTimeinFormat + " Stunden.";
    beforeRouteddiv.innerHTML = text


}

function optimizeRoutingInfomation(data) {
    let routeLength = data[0].summary.length;
    let km = routeLength / 1000;
    let drivingTime = data[0].summary.drivingTime
    let drivingTimeinFormat = new Date(drivingTime * 1000).toISOString().substr(11, 5);
    let afterRouteddiv = document.getElementById("after-optimize");
    let text = "Eine Optimierte Route wurde berechnet, die Routenlänge beträgt " + km.toFixed(1) + "KM und die geschätzte Fahrtzeit beträgt " + drivingTimeinFormat + " Stunden.";
    afterRouteddiv.innerHTML = text;
}


function clearRoutingInfomationContainer() {
    $('#before-optimize').empty();
    $('#after-optimize').empty();
}

function getRouteCoordsWith30mDistance(array, map) {

    routeCoordsWithInterstaionsWith30MetersDistance = [];

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

        // routeCoordsWithInterstaionsWith30MetersDistance.push(array[0][0]);

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

function createCSVFile() {
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