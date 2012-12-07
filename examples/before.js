one().then(function (dataA) {
    two(dataA).then(function (dataB) {
        return three(dataB);
    });
});
