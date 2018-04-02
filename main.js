// OpenWeatherMap API key
const owmKey = 'f3d6f2a6b982e54dac88b113dea5a4a1';
// Google Maps Geolocation API key
const googleKey = 'AIzaSyBvb70mxfZjBoP_joLTFt_vWR-cDS1vuT4';

// getLocalTime has to be global variable to reset setInterval in the future
let getLocalTime;
let offsets;
const date = new Date();
const timeStamp = date.getTime()/1000 + date.getTimezoneOffset() * 60;
let unit = 'metric';
let tempC;
let tempF;
let windMs;
let windMph;
let fiveDaysHours;
let fiveDaysTemp;


// HTML Elements
const search = document.getElementById('search');
const button = document.getElementById('button');
const form = document.getElementById('form');
const checkbox = document.getElementById('unit');
const city = document.getElementById('city');
const cond = document.getElementById('condition');
const icon = document.getElementById('icon');
const temp = document.getElementById('temperature');
const sunrise = document.getElementById('sunrise');
const sunset = document.getElementById('sunset');
const humidity = document.getElementById('humidity');
const wind = document.getElementById('wind');
const time = document.getElementById('time');
const daily = document.getElementById('daily');


// Display the infrormation obtained from API calls inside HTML elements
function addContent(json) {
    const sunriseUnix = json.sys.sunrise * 1000;
    const sunsetUnix = json.sys.sunset * 1000;

    tempC = Math.round(json.main.temp) + '&deg;';
    tempF = Math.round(json.main.temp * 9 / 5 + 32) + '&deg;';
    windMs = 'Wind: ' + json.wind.speed + ' m/s';
    windMph = 'Wind: ' + Math.round(json.wind.speed * 2.2369363) + ' mph';    
    
    city.innerHTML = json.name + ', ' + json.sys.country;
    cond.innerHTML = json.weather[0].main;
    icon.src = 'icons/' + json.weather[0].icon + '.png';
    temp.innerHTML = tempC;
    sunrise.innerHTML = 'Sunrise: ' + moment(sunriseUnix).format('MMMM Do, hh:mm A');
    sunset.innerHTML = 'Sunset: ' + moment(sunsetUnix).format('MMMM Do, hh:mm A');
    humidity.innerHTML = 'Humidity: ' + json.main.humidity + '%';
    wind.innerHTML = windMs;
}


// Call Google Maps Timezone API
async function getTimezone(latitude, longitude) {
    try {
        let url = 'https://maps.googleapis.com/maps/api/timezone/json?location=';
        let uri = url + latitude + ',' + longitude + '&timestamp=' + timeStamp + '&key=' + googleKey;
        let response = await fetch(uri);
        
        if (response.ok) {
            let json = await (response.json());
            const newDate = new Date();

            // Get DST and time zone offsets in milliseconds
            offsets = json.dstOffset * 1000 + json.rawOffset * 1000;
            // Date object containing current time
            const localTime = new Date(timeStamp * 1000 + offsets); 
            // Calculate time between dates
            const timeElapsed = newDate - date;
            // Update localTime to account for any time elapsed
            moment(localTime).valueOf(moment(localTime).valueOf() + timeElapsed);

            getLocalTime = setInterval(() => {
                localTime.setSeconds(localTime.getSeconds() + 1)
                time.innerHTML = moment(localTime).format('dddd hh:mm A');
            }, 1000);

            getWeather(latitude, longitude);

            return json;
        }
    } catch (error) {
        console.log(error);
    }
}


// Call weather API 
async function getWeather(latitude, longitude) {
    try {
        let url = 'https://api.openweathermap.org/data/2.5/weather';
        let uri = url + '?lat=' + latitude + '&lon=' + longitude + '&units=' + unit + '&appid=' + owmKey;
        let response = await fetch(uri);
        
        if (response.ok) {
            let json = await (response.json());

            forecast(json.id);
            addContent(json);

            return json;
        }
    } catch (error) {
        console.log(error);
    }
}


// 5 day weather forecast
async function forecast(id) {
    try {
        let url = 'https://api.openweathermap.org/data/2.5/forecast?id=';
        let uri = url + id + '&units=' + unit + '&appid=' + owmKey;
        let response = await fetch(uri);
        
        if (response.ok) {
            let json = await (response.json());
            let timeProperty = [];
            let tempProperty = [];

            // Get hours and temperature for 5 day forecast
            for (let i = 0; i < json.list.length; i++) {
                let forecastTemp = Math.round(json.list[i].main.temp);
                let forecastTime = json.list[i].dt;
                // Change UTC according to the city we searched for
                timeProperty.push(moment((forecastTime + date.getTimezoneOffset() * 60) * 1000 + offsets).format('hh A'));
                tempProperty.push(forecastTemp);

                // The OpenWeatherMap doesn't provide min/max temperature for the whole day, so I decided to display 12 PM weather 
                // for next 5 day forecast, you can change the hours later by changing 12 to desired integer in .setHours()
                if (moment(json.list[i].dt_txt).format('HH:mm') == moment(new Date().setHours(12, 0)).format('HH:mm')) {
                    const group = document.createElement('div');
                    const day = document.createElement('p');
                    const icon = document.createElement('img');
                    const temp = document.createElement('p');
                    group.classList.add('group');
                    
                    day.innerHTML = moment(json.list[i].dt_txt).format('ddd');
                    icon.src = 'icons/' + json.list[i].weather[0].icon + '.png';
                    temp.innerHTML = forecastTemp + '&deg;';
                    group.innerHTML += day.outerHTML + icon.outerHTML + temp.outerHTML;
                    daily.appendChild(group);                    
                }
            }
            
            // This function divides an array into smaller parts
            function splitArray(array, size) {
                let splitArr = [];
                let noOfArrays = Math.ceil(array.length / size);
                // Then pushes divided chunks of arrays into a new array
                for (let i = 0; i < noOfArrays; i++){
                    splitArr.push(array.slice(i * size, (i + 1) * size));
                }
                return splitArr;
            }

            // Split arrays
            fiveDaysHours = splitArray(timeProperty, 8);
            fiveDaysTemp = splitArray(tempProperty, 8);  

            // Right now the line Chart only displays first 8 hours from array, meaning next 24 hours
            drawChart(fiveDaysHours[0], fiveDaysTemp[0]);

            return json;
        }
    } catch (error) {
        console.log(error);
    }
}


// Search by city name
async function searchWeather() {
    try {
        let url = 'https://api.openweathermap.org/data/2.5/weather';
        let search = document.getElementById('search');
        let uri = url + '?q=' + search.value + '&units=' + unit + '&appid=' + owmKey;
        let response = await fetch(uri);
        
        if (response.ok) {
            let json = await (response.json());
            let newLat = json.coord.lat;
            let newLng = json.coord.lon;

            getTimezone(newLat, newLng);

            return json;
        }
    } catch (error) {
        console.log(error);
    }
}


// Call Google Maps Geolocation API
(async function getGeolocation() {
    try {
        let url = 'https://www.googleapis.com/geolocation/v1/geolocate?key=';
        let uri = url + googleKey;
        let response = await fetch(uri, {method: 'POST'});
        
        if (response.ok) {
            let json = await (response.json());
            let lat = json.location.lat;
            let lng = json.location.lng;
 
            getTimezone(lat, lng);

            return json;
        }
    } catch (error) {
        console.log(error);
    }
})();


// Convert from metric to Imperial and vice versa, according to checkbox status
function convert() {
    if (!checkbox.checked) {
        temp.innerHTML = tempC;
        wind.innerHTML = windMs;
    } else {
        temp.innerHTML = tempF;
        wind.innerHTML = windMph;
    }
}
checkbox.addEventListener('click', convert);


// Call weather API when on form submit
function searchCity() {
    searchWeather();
    search.value = '';
    // Reset local time
    clearInterval(getLocalTime);
}

form.addEventListener('submit', e => {
    e.preventDefault();
    searchCity;
    daily.innerHTML = '';
}, false);


// Google places autompletion
const autocomplete = new google.maps.places.Autocomplete(search, {types: ['(cities)']});

google.maps.event.addListener(autocomplete, 'place_changed', () => {
    const place = autocomplete.getPlace();
    // Submit form if clicked on any result from suggestions
    searchCity();
    daily.innerHTML = '';
});


// Draw line chart using chart.js
function drawChart(fiveDaysHours, fiveDaysTemp) {
    const ctx = document.getElementById("chart");
    const chart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: fiveDaysHours,
            datasets: [{
                data: fiveDaysTemp,
                backgroundColor: 'rgba(64,196,255, .3)',
                borderColor: 'rgba(64,196,255, 1)',
                borderWidth: 2,
                pointRadius: 2,
                pointBorderColor: 'rgba(0,188,212, 1)',
                pointBackgroundColor: 'rgba(0,188,212, 1)',
                pointHoverRadius: 2
            }]
        },
        options: {
            maintainAspectRatio: false,
            layout: {
                padding: {
                    top: 30
                }
            },
            scales: {
                yAxes: [{
                    ticks: {
                        display: false,
                    },
                    gridLines: {
                        display:false,
                        drawBorder: false
                    }
                }],
                xAxes: [{
                    ticks: {
                        autoSkip: false,
                        maxRotation: 0,
                        minRotation: 0
                    },
                    gridLines: {
                        display:false
                    }
                }]
            },
            legend:{
                display: false
            },
            tooltips: {
                enabled: false
            }
        },
        plugins: [{
            afterDatasetsDraw: function(chart) {
                const ctx = chart.ctx;
                chart.data.datasets.forEach(function(dataset, index) {
                    const datasetMeta = chart.getDatasetMeta(index);
                    if (datasetMeta.hidden) return;
                    datasetMeta.data.forEach(function(point, index) {
                        const value = dataset.data[index],
                            x = point.getCenterPoint().x,
                            y = point.getCenterPoint().y,
                            radius = point._model.radius,
                            fontSize = 12,
                            fontFamily = 'Roboto',
                            fontColor = '#455A64',
                            fontStyle = 'normal';
                        ctx.save();
                        ctx.textBaseline = 'middle';
                        ctx.textAlign = 'center';
                        ctx.font = fontStyle + ' ' + fontSize + 'px' + ' ' + fontFamily;
                        ctx.fillStyle = fontColor;
                        ctx.fillText(value, x, y - radius - fontSize);
                        ctx.restore();
                    });
                });
            }
        }]
    });
}