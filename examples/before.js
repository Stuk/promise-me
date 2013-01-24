getDetails("Bob", function (err, details) {
    getLongLat(details.address, details.country, function(err, longLat) {
        getNearbyBars(longLat, function(err, bars) {
            // Note the captured `details` variable
            console.log("The closest bar to " + details.address + " is: " + bars[0]);
        });
    });
});
